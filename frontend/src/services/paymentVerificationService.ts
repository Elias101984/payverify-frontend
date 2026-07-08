import axios from "axios";

//export interface PaymentStartResponse {
//    trustSessionId: string;
//    verificationId: string;
//    verified: boolean;
//    status: "VERIFIED" | "NOT_VERIFIED";
//    reasonCode?: string;
//    message: string;
//    merchant?: {
//        name: string;
//        bankName?: string;
//        accountNumberMasked?: string;
//        trustScore?: number;
//        verificationCount?: number | string;
//        verificationBadge?: string;
//    };
//}

export interface PaymentStartResponse {

    trustSessionId: string;

    verificationId: string;

    verified: boolean;

    status: "VERIFIED" | "NOT_VERIFIED";

    reasonCode?: string;

    message: string;

    merchantName: string;

    bankName: string;

    accountName: string;

    accountNumberMasked: string;

    trustScore: number;

    verificationStatus: string | null;

    verificationCount: number | string;

    verificationBadge: string;

}

export interface PaymentContinueResponse {
    reference: string;
    access_code?: string;
    authorization_url?: string;
}

export const PaymentVerificationService = {
    async startPayment(invoiceId: number, email: string) {
        const res = await axios.post<PaymentStartResponse>(
            `/api/invoices/${invoiceId}/payments/start`,
            { email }
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
            `/api/invoices/${payload.invoiceId}/payments/continue`,
            payload
        );

        return res.data;
    },
};