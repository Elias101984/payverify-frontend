// =============================================================================
// InvoicePaymentController.ts (V2 — VERIFICATION-FIRST PAYMENT FLOW)
// =============================================================================
//
// PURPOSE
// -----------------------------------------------------------------------------
// Handles invoice payment flows and Paystack webhooks.
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// ✅ Kept legacy initializeInvoicePayment() so existing working flows do not break.
// ✅ Added startPayment() for the new verification-first flow.
// ✅ Added continuePayment() for Paystack initialization after user acknowledgment.
// ✅ Moved Paystack initialization logic for the V2 flow into PaymentInitializationService.
// ✅ Kept the existing hardened Paystack webhook logic intact.
//
// WHY
// -----------------------------------------------------------------------------
// The old endpoint verified the merchant and initialized Paystack in the same
// request. That caused the frontend to redirect to Paystack before showing the
// PayVerify verification modal.
//
// The new V2 flow is:
// 1) POST /api/invoices/:invoiceId/payments/start
// 2) Frontend shows VerificationModal
// 3) POST /api/invoices/:invoiceId/payments/continue
// 4) Paystack webhook marks invoice paid
//
// =============================================================================

import { Request, Response } from "express";
import crypto from "crypto";

import { PaystackService } from "../services/PaystackService";
import { Invoice } from "../models/Invoice";
import Payment from "../models/Payment";
import Transaction from "../models/Transaction";
import VerificationGatewayService from "../services/VerificationGatewayService";
import { PaymentInitializationService } from "../services/PaymentInitializationService";

import {
    sendInvoicePaidEmail,
    sendPaymentFailedEmail,
} from "../services/_emailService";

const paystack = new PaystackService();

const verificationGateway = new VerificationGatewayService();

const paymentInitializationService =
    new PaymentInitializationService();

// =============================================================================
// Helpers
// =============================================================================

function buildReference(invoiceId: number): string {
    return `INV_${invoiceId}_${Date.now()}`;
}

function verifyPaystackSignature(
    rawBody: Buffer,
    signature?: string
): boolean {
    const secret = process.env.PAYSTACK_SECRET_KEY || "";

    if (!signature || !secret) {
        return false;
    }

    const hash = crypto
        .createHmac("sha512", secret)
        .update(rawBody)
        .digest("hex");

    return hash === signature;
}

function extractInvoiceId(reference: string): number | null {
    try {
        const parts = reference.split("_");
        const id = Number(parts[1]);

        return Number.isFinite(id) ? id : null;
    } catch {
        return null;
    }
}

// =============================================================================
// LEGACY PAYMENT INITIALIZATION
// POST /api/invoices/:invoiceId/paystack/initialize
//
// WHY THIS STILL EXISTS
// -----------------------------------------------------------------------------
// This is the original working endpoint. We are keeping it temporarily so that
// existing flows do not break while the new verification-first V2 flow is tested.
// Once V2 is stable, this endpoint can be deprecated.
// =============================================================================

export const initializeInvoicePayment = async (
    req: Request,
    res: Response
) => {
    try {
        const invoiceId = Number(req.params.invoiceId);

        const invoice = await Invoice.findByPk(invoiceId);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found",
            });
        }

        if (invoice.status === "paid") {
            return res.status(409).json({
                success: false,
                message: "Invoice already paid",
            });
        }

        const customerEmail =
            req.body?.email ||
            invoice?.customer_email ||
            "customer@test.com";

        if (!customerEmail) {
            return res.status(400).json({
                success: false,
                message: "Customer email is required",
            });
        }

        const amountNaira = Number(invoice.amount);

        if (!amountNaira || amountNaira <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid invoice amount",
            });
        }

        let verification;

        try {
            verification = await verificationGateway.verifyMerchant({
                merchantId: invoice.merchant_id,
            });
        } catch (error) {
            console.error("Verification API unavailable:", error);

            return res.status(503).json({
                success: false,
                message: "Verification service is currently unavailable.",
            });
        }

        if (!verification.verified) {
            return res.status(400).json({
                success: false,
                message: "Merchant verification failed.",
            });
        }

        await invoice.update({
            customer_email: customerEmail,
            status: "processing",
        });

        const reference = buildReference(invoiceId);

        const transaction = await Transaction.create({
            amount: amountNaira,
            status: "pending",
            merchantId: invoice.merchant_id,
            reference,
        });

        await Payment.create({
            transactionId: transaction.id,
            bankAccountId: null,
            amount: amountNaira,
            method: "paystack",
            status: "initiated",
        });

        const callbackUrl =
            `${process.env.FRONTEND_URL}/invoice/pay/${invoiceId}`;

        const response = await paystack.initializePayment({
            email: customerEmail,
            amountNaira,
            reference,
            callback_url: callbackUrl,
            metadata: {
                invoiceId,
                source: "payverify_invoice",
            },
        });

        return res.json({
            success: true,
            reference,
            authorization_url: response.data.authorization_url,
            access_code: response.data.access_code,
            verification: {
                verified: verification.verified,
                merchantId: verification.merchantId,
                merchantName: verification.merchantName,
                trustScore: verification.trustScore,
                verificationBadge: verification.verificationBadge,
                verificationCount: verification.verificationCount,
            },
        });
    } catch (error: any) {
        console.error(
            "initializeInvoicePayment error:",
            error?.response?.data || error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to initialize payment",
        });
    }
};

// =============================================================================
// START PAYMENT (V2)
// POST /api/invoices/:invoiceId/payments/start
//
// PURPOSE
// -----------------------------------------------------------------------------
// Verify merchant only. Does NOT initialize Paystack.
// =============================================================================

export const startPayment = async (
    req: Request,
    res: Response
) => {
    try {
        const invoiceId = Number(req.params.invoiceId);

        if (!invoiceId || Number.isNaN(invoiceId)) {
            return res.status(400).json({
                success: false,
                message: "Valid invoiceId is required.",
            });
        }

        const invoice = await Invoice.findByPk(invoiceId);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found.",
            });
        }

        if (invoice.status === "paid") {
            return res.status(409).json({
                success: false,
                message: "Invoice already paid.",
            });
        }

        const customerEmail =
            String(req.body?.email || invoice.customer_email || "").trim();

        if (!customerEmail) {
            return res.status(400).json({
                success: false,
                message: "Customer email is required.",
            });
        }

        const amountNaira = Number(invoice.amount);

        if (!amountNaira || amountNaira <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid invoice amount.",
            });
        }

        let verification;

        try {
            console.log("Calling Verification API:", {
                merchantId: invoice.merchant_id,
            });

            verification = await verificationGateway.verifyMerchant({
                merchantId: invoice.merchant_id,
            });

            console.log("Verification Response:", verification);
        } catch (error) {
            console.error("Verification API unavailable:", error);

            return res.status(503).json({
                success: false,
                message: "Verification API unavailable.",
            });
        }

        return res.json({
            verified: verification.verified,

            status: verification.verified
                ? "VERIFIED"
                : "NOT_VERIFIED",

            trustSessionId: crypto.randomUUID(),

            verificationId: crypto.randomUUID(),

            reasonCode: verification.reasonCode,

            message:
                verification.message ||
                "Merchant verification completed.",

            // ==========================================================
            // Flattened verification payload
            // ==========================================================
            merchantName: verification.merchantName,

            bankName: verification.bankName,

            accountName: verification.accountName,

            accountNumberMasked: verification.accountNumberMasked,

            trustScore: verification.trustScore,

            verificationStatus: verification.verificationStatus,

            verificationCount: verification.verificationCount,

            verificationBadge: verification.verificationBadge,
        });
    } catch (error) {
        console.error("startPayment error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to start payment.",
        });
    }
};

// =============================================================================
// CONTINUE PAYMENT (V2)
// POST /api/invoices/:invoiceId/payments/continue
//
// PURPOSE
// -----------------------------------------------------------------------------
// Initialize Paystack after user reviews and acknowledges verification details.
// =============================================================================

export const continuePayment = async (
    req: Request,
    res: Response
) => {
    try {
        const invoiceId = Number(req.params.invoiceId);

        if (!invoiceId || Number.isNaN(invoiceId)) {
            return res.status(400).json({
                success: false,
                message: "Valid invoiceId is required.",
            });
        }

        const email = String(req.body?.email || "").trim();

        const trustSessionId =
            String(req.body?.trustSessionId || "").trim();

        const verificationId =
            String(req.body?.verificationId || "").trim();

        const acknowledgedUnverified =
            Boolean(req.body?.acknowledgedUnverified);

        if (!email || !trustSessionId || !verificationId) {
            return res.status(400).json({
                success: false,
                message: "Missing verification information.",
            });
        }

        console.log("Continuing invoice payment:", {
            invoiceId,
            email,
            trustSessionId,
            verificationId,
            acknowledgedUnverified,
        });

        const result =
            await paymentInitializationService.initializeInvoicePayment({
                invoiceId,
                email,
            });

        return res.json(result);
    } catch (error: any) {
        console.error("continuePayment error:", error);

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to continue payment.",
        });
    }
};

// =============================================================================
// PAYSTACK WEBHOOK
// POST /api/webhooks/paystack
// =============================================================================

export const handlePaystackWebhook = async (
    req: any,
    res: Response
) => {
    try {
        const signature = req.headers["x-paystack-signature"];
        const rawBody: Buffer = req.body;

        const isValid = verifyPaystackSignature(rawBody, signature);

        if (!isValid) {
            console.warn("❌ Invalid Paystack signature");
            return res.sendStatus(401);
        }

        const event = JSON.parse(rawBody.toString("utf8"));
        const reference = event?.data?.reference;

        if (!reference) {
            return res.sendStatus(200);
        }

        if (event.event === "charge.failed") {
            const invoiceId = extractInvoiceId(reference);

            if (invoiceId) {
                const invoice = await Invoice.findByPk(invoiceId);

                const payment = await Payment.findOne({
                    where: {
                        method: "paystack",
                        status: "initiated",
                    },
                    order: [["createdAt", "DESC"]],
                });

                if (payment) {
                    await payment.update({
                        status: "failed",
                    });
                }

                if (invoice && invoice.customer_email) {
                    await sendPaymentFailedEmail(
                        invoice.customer_email,
                        invoice.id,
                        Number(invoice.amount)
                    );
                }
            }

            return res.sendStatus(200);
        }

        if (event.event !== "charge.success") {
            return res.sendStatus(200);
        }

        const verify = await paystack.verifyTransaction(reference);

        if (verify.data.status !== "success") {
            return res.sendStatus(200);
        }

        const payment = await Payment.findOne({
            where: {
                method: "paystack",
            },
            order: [["createdAt", "DESC"]],
        });

        if (payment && payment.status !== "success") {
            await payment.update({
                status: "success",
            });
        }

        const invoiceId = extractInvoiceId(reference);

        if (invoiceId) {
            const invoice = await Invoice.findByPk(invoiceId);

            if (invoice && invoice.status !== "paid") {
                await invoice.update({
                    status: "paid",
                });

                if (invoice.customer_email) {
                    await sendInvoicePaidEmail(
                        invoice.customer_email,
                        invoice.id,
                        Number(invoice.amount),
                        `${process.env.FRONTEND_URL}/invoice/pay/${invoice.id}`
                    );
                }
            }
        }

        return res.sendStatus(200);
    } catch (error) {
        console.error("handlePaystackWebhook error:", error);

        return res.sendStatus(500);
    }
};
