// =============================================================================
// VerificationGatewayService.ts
// =============================================================================
//
// PURPOSE
// -----------------------------------------------------------------------------
// Gateway between the Main PayVerify application and the standalone
// Verification API.
//
// Responsibilities
//  - Call Verification API
//  - Return strongly typed verification result
//  - Hide HTTP implementation from controllers
//  - Central place for retries / authentication / logging later
//
// DO NOT:
//  - Query database
//  - Talk to Paystack
//  - Know anything about invoices
//
// =============================================================================

import axios from "axios";

// -----------------------------------------------------------------------------
// Phase 1 (Current API)
// Only merchantId is required.
//
// Phase 2 (Future)
// We'll extend this request to include:
//
// - bankCode
// - routingNumber
// - institutionId
// - swift
// - accountNumber
// - invoiceId
// -----------------------------------------------------------------------------

export interface VerifyMerchantRequest {
    merchantId: number;
}

export interface VerificationResponse {

    verified: boolean;

    merchantId: number;

    merchantName: string;

    accountNumberMasked: string;

    trustScore: number;

    verificationStatus: string | null;

    verificationCount: string;

    verificationBadge: string;
}

export class VerificationGatewayService {

    private readonly baseUrl =
        process.env.VERIFICATION_API_URL ||
        "http://localhost:5001/api/v1";

    // -------------------------------------------------------------------------
    // Verify Merchant Account
    // -------------------------------------------------------------------------
    async verifyMerchant(
        payload: VerifyMerchantRequest
    ): Promise<VerificationResponse> {

        try {

            console.log("Calling Verification API:", payload);

            const response = await axios.post<VerificationResponse>(
                `${this.baseUrl}/verify`,
                {
                    merchantId: payload.merchantId
                },
                {
                    timeout: 10000,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            console.log("Verification Response:", response.data);

            return response.data;

        } catch (error: any) {

            console.error(
                "Verification API Error:",
                error?.response?.data || error.message
            );

            throw new Error(
                "Unable to verify merchant account."
            );
        }
    }
}

export default VerificationGatewayService;