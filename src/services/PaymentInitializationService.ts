import { Invoice } from "../models/Invoice";
import Payment from "../models/Payment";
import Transaction from "../models/Transaction";
import { PaystackService } from "./PaystackService";

const paystack = new PaystackService();

function buildReference(invoiceId: number): string {
    return `INV_${invoiceId}_${Date.now()}`;
}

export class PaymentInitializationService {
    async initializeInvoicePayment(payload: {
        invoiceId: number;
        email: string;
    }) {
        const { invoiceId, email } = payload;

        const invoice = await Invoice.findByPk(invoiceId);

        if (!invoice) {
            throw new Error("Invoice not found");
        }

        if (invoice.status === "paid") {
            throw new Error("Invoice already paid");
        }

        const amountNaira = Number(invoice.amount);

        if (!amountNaira || amountNaira <= 0) {
            throw new Error("Invalid invoice amount");
        }

        await invoice.update({
            customer_email: email,
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

        // =============================================================================
// CHANGED
// WHY:
// The callback URL must match the React route defined in App.tsx.
// App.tsx exposes:
//
//     /invoice-pay/:invoiceId
//
// NOT:
//
//     /invoice/pay/:invoiceId
// =============================================================================

const frontendUrl =
    String(
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");

const callbackUrl =
    `${frontendUrl}/invoice-pay/${invoiceId}`;

        const response = await paystack.initializePayment({
            email,
            amountNaira,
            reference,
            callback_url: callbackUrl,
            metadata: {
                invoiceId,
                source: "payverify_invoice",
            },
        });

        return {
            reference,
            authorization_url: response.data.authorization_url,
            access_code: response.data.access_code,
        };
    }
}