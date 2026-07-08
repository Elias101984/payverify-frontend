// =============================================================================
// InvoicePayPage.tsx — V2 VERIFICATION-FIRST PAYMENT FLOW
// =============================================================================
//
// PURPOSE
// -----------------------------------------------------------------------------
// Public invoice payment page.
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// ✅ Removed direct call to the legacy endpoint:
//      /api/invoices/:invoiceId/paystack/initialize
//
// ✅ Pay Now now calls:
//      PaymentVerificationService.startPayment()
//
// ✅ The page now shows VerificationModal before Paystack.
//
// ✅ Paystack is only initialized after the user acknowledges the verification
//    details and clicks Continue Payment.
//
// ✅ Preserved:
//      - public invoice loading
//      - expiring link handling
//      - paid/pending badge
//      - bank/account display
//      - existing dark payment card UI
//
// WHY
// -----------------------------------------------------------------------------
// The old page redirected straight to Paystack because it directly called the
// legacy Paystack initialization endpoint. PayVerify's value proposition is
// "verify first, pay second", so this page now enforces that flow.
//
// =============================================================================

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Spinner, Badge, Form } from "react-bootstrap";
import { toast } from "react-toastify";

import api from "../services/api";
import VerificationModal, {
    type VerificationResult,
} from "../components/VerificationModal";

import {
    PaymentVerificationService,
    type PaymentStartResponse,
} from "../services/paymentVerificationService";

// =============================================================================
// Types
// =============================================================================

type Invoice = {
    id: number;
    amount: number;
    status: string;
    customer_email?: string;
    public_token?: string;
    expires_at?: string | null;
};

type BankAccount = {
    bankName?: string;
    accountNumber?: string;
} | null;

// =============================================================================
// Helpers
// =============================================================================

const formatNaira = (amount: number) =>
    `₦${Number(amount || 0).toLocaleString("en-NG")}`;

const buildVerificationModalData = (
    result: PaymentStartResponse
): VerificationResult => {

    return {

        verified: result.verified,

        merchantName: result.merchantName,

        bankName: result.bankName,

        accountName: result.accountName,

        accountNumberMasked: result.accountNumberMasked,

        trustScore: result.trustScore,

        verificationStatus: result.verificationStatus,

        verificationCount:
            typeof result.verificationCount === "string"
                ? Number(result.verificationCount)
                : result.verificationCount,

        verificationBadge: result.verificationBadge,

        reasonCode: result.reasonCode,

        message:
            result.message ||
            (result.verified
                ? "Merchant verified successfully."
                : "Merchant is not verified by PayVerify.")

    };

};
// =============================================================================
// Component
// =============================================================================

export default function InvoicePayPage() {
    const params = useParams();

    const invoiceId =
        params.invoiceId ? String(params.invoiceId) : "";

    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [continuingPayment, setContinuingPayment] =
        useState(false);

    const [invoice, setInvoice] =
        useState<Invoice | null>(null);

    const [bankAccount, setBankAccount] =
        useState<BankAccount>(null);

    const [email, setEmail] = useState("");

    const [rawVerification, setRawVerification] =
        useState<PaymentStartResponse | null>(null);

    const [modalVerification, setModalVerification] =
        useState<VerificationResult | null>(null);

    const [showVerificationModal, setShowVerificationModal] =
        useState(false);

    // =============================================================================
    // Load public invoice
    // =============================================================================

    const loadInvoice = async () => {
        try {
            if (!invoiceId) {
                toast.error("Invalid invoice link");
                return;
            }

            const res = await api.get(
                `/public/invoices/${invoiceId}`
            );

            const payload =
                res?.data?.invoice
                    ? res.data
                    : res?.data?.data
                        ? {
                            invoice: res.data.data,
                            bankAccount: null,
                        }
                        : {
                            invoice: res.data,
                            bankAccount: null,
                        };

            const loadedInvoice =
                payload.invoice || null;

            setInvoice(loadedInvoice);
            setBankAccount(payload.bankAccount || null);

            if (loadedInvoice?.customer_email) {
                setEmail(loadedInvoice.customer_email);
            }
        } catch (err: any) {
            console.error("Invoice load error:", err);

            toast.error(
                err.response?.data?.message ||
                "Failed to load invoice"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvoice();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoiceId]);

    // =============================================================================
    // STEP 1: Start payment = verification only
    // =============================================================================

    const handlePayNow = async () => {
        try {
            if (!invoice?.id) {
                toast.error("Invoice not ready");
                return;
            }

            if (!email.trim()) {
                toast.error("Please enter your email");
                return;
            }

            if (
                invoice.expires_at &&
                new Date(invoice.expires_at) < new Date()
            ) {
                toast.error("This payment link has expired");
                return;
            }

            setVerifying(true);

            const verificationResult =
                await PaymentVerificationService.startPayment(
                    invoice.id,
                    email.trim()
                );

            setRawVerification(verificationResult);
            setModalVerification(
                buildVerificationModalData(verificationResult)
            );

            setShowVerificationModal(true);
        } catch (err: any) {
            console.error("Verification start error:", err);

            toast.error(
                err.response?.data?.message ||
                "Unable to verify merchant"
            );
        } finally {
            setVerifying(false);
        }
    };

    // =============================================================================
    // STEP 2: Continue payment = initialize Paystack after acknowledgment
    // =============================================================================

    const continuePayment = async (
        acknowledgedUnverified: boolean
    ) => {
        try {
            if (!invoice?.id || !rawVerification) {
                toast.error("Verification session missing");
                return;
            }

            setContinuingPayment(true);

            const res =
                await PaymentVerificationService.continuePayment({
                    invoiceId: invoice.id,
                    email: email.trim(),
                    trustSessionId:
                        rawVerification.trustSessionId,
                    verificationId:
                        rawVerification.verificationId,
                    acknowledgedUnverified,
                });

            const {
                reference,
                access_code,
                authorization_url,
            } = res;

            setShowVerificationModal(false);

            if ((window as any).PaystackPop && access_code) {
                const handler = (window as any).PaystackPop.setup({
                    key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                    email: email.trim(),
                    amount: Math.round(invoice.amount * 100),
                    ref: reference,
                    access_code,

                    callback: () => {
                        toast.success(
                            "Payment completed. Confirming status..."
                        );
                        loadInvoice();
                    },

                    onClose: () => {
                        setContinuingPayment(false);
                    },
                });

                handler.openIframe();
                return;
            }

            if (authorization_url) {
                window.location.href = authorization_url;
                return;
            }

            toast.error("Payment link was not returned");
        } catch (err: any) {
            console.error("Payment continue error:", err);

            toast.error(
                err.response?.data?.message ||
                "Unable to continue payment"
            );
        } finally {
            setContinuingPayment(false);
        }
    };

    // =============================================================================
    // Derived state
    // =============================================================================

    const isPaid =
        invoice?.status?.toLowerCase() === "paid";

    const isExpired =
        invoice?.expires_at &&
        new Date(invoice.expires_at) < new Date();

    // =============================================================================
    // Loading state
    // =============================================================================

    if (loading) {
        return (
            <div style={pageWrap}>
                <Spinner />
            </div>
        );
    }

    // =============================================================================
    // Not found
    // =============================================================================

    if (!invoice) {
        return (
            <div style={pageWrap}>
                <h3 style={{ color: "#fff" }}>
                    Invoice not found
                </h3>
            </div>
        );
    }

    // =============================================================================
    // Expired view
    // =============================================================================

    if (isExpired && !isPaid) {
        return (
            <div style={pageWrap}>
                <div style={cardStyle}>
                    <h2 style={{ color: "#fff" }}>
                        Payment Link Expired
                    </h2>

                    <p style={{ color: "#cbd5e1" }}>
                        This invoice payment link has expired.
                        Please request a new payment link.
                    </p>
                </div>
            </div>
        );
    }

    // =============================================================================
    // Main UI
    // =============================================================================

    return (
        <div style={pageWrap}>
            <div style={cardStyle}>
                <h2 style={{ color: "#fff" }}>
                    PayVerify Invoice
                </h2>

                <Badge
                    bg={isPaid ? "success" : "warning"}
                    className="mb-3"
                >
                    {isPaid ? "Paid" : "Pending"}
                </Badge>

                <h1 style={{ color: "#4ade80" }}>
                    {formatNaira(invoice.amount)}
                </h1>

                {!isPaid && (
                    <Form.Group className="mt-3 text-start">
                        <Form.Label style={{ color: "#e5e7eb" }}>
                            Customer Email
                        </Form.Label>

                        <Form.Control
                            type="email"
                            value={email}
                            placeholder="customer@example.com"
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                        />
                    </Form.Group>
                )}

                {bankAccount && (
                    <div style={bankBox}>
                        <div>
                            <strong>Bank:</strong>{" "}
                            {bankAccount.bankName || "N/A"}
                        </div>

                        <div>
                            <strong>Account:</strong>{" "}
                            {bankAccount.accountNumber || "N/A"}
                        </div>
                    </div>
                )}

                {!isPaid && (
                    <div style={trustNote}>
                        PayVerify will verify the merchant before
                        redirecting you to Paystack.
                    </div>
                )}

                <div className="mt-4">
                    <Button
                        size="lg"
                        variant="success"
                        disabled={
                            isPaid ||
                            verifying ||
                            continuingPayment ||
                            !!isExpired
                        }
                        onClick={handlePayNow}
                    >
                        {isPaid
                            ? "Already Paid"
                            : verifying
                                ? "Verifying Merchant..."
                                : "Pay Now"}
                    </Button>
                </div>
            </div>

            {showVerificationModal && modalVerification && (
                <VerificationModal
                    show={showVerificationModal}
                    verification={modalVerification}
                    loading={continuingPayment}
                    onCancel={() =>
                        setShowVerificationModal(false)
                    }
                    onContinue={continuePayment}
                />
            )}
        </div>
    );
}

// =============================================================================
// Styles
// =============================================================================

const pageWrap: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#05060a",
    padding: 20,
};

const cardStyle: React.CSSProperties = {
    background:
        "linear-gradient(180deg,#06070a 0%,#0b2e75 100%)",
    padding: 28,
    borderRadius: 18,
    width: "100%",
    maxWidth: 520,
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 20px 55px rgba(0,0,0,0.6)",
};

const bankBox: React.CSSProperties = {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    background: "rgba(255,255,255,0.06)",
    color: "#e9f2ff",
};

const trustNote: React.CSSProperties = {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    background: "rgba(34,197,94,0.10)",
    color: "#bbf7d0",
    fontSize: 13,
};
