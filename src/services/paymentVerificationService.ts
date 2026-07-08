import axios from "axios";

export interface PaymentStartResponse {
    trustSessionId: string;
    verificationId: string;
    verified: boolean;
    status: "VERIFIED" | "NOT_VERIFIED";
    reasonCode?: string;
    message: string;
    merchant?: {
        name: string;
        bankName?: string;
        accountNumberMasked?: string;
    };
}

export interface PaymentContinueResponse {
    reference: string;
    access_code?: string;
    authorization_url?: string;
}

export const PaymentVerificationService = {
    async startPayment(invoiceId: number, email: string) {
        const res = await axios.post<PaymentStartResponse>(
            "/api/payments/start",
            { invoiceId, email }
        );

        return res.data;
    },

    async continuePayment(payload: {
        invoiceId: number;
        email: string;
        trustSessionId: string;
        verificationId: string;
        acknowledgedUnverified?: boolean;
    }) {
        const res = await axios.post<PaymentContinueResponse>(
            "/api/payments/continue",
            payload
        );

        return res.data;
    },
};