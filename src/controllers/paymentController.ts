import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { Merchant } from '../models/Merchant';

/**
 * Generates a QR code for a merchant with optional amount & reference.
 * 
 *  CHANGE:
 * - Added support for admin users to generate QR codes for any merchant.
 * - Enforces ownership check unless user is admin.
 */
export const generateMerchantQR = async (
    req: Request<
        {}, // params
        {}, // response body
        {}, // request body
        { merchantId: string; amount?: string; reference?: string } // query params
    >,
    res: Response
) => {
    try {
        const user = req.user as { id: number; role: string }; // JWT middleware attaches this

        const { merchantId, amount, reference } = req.query;

        // Validate merchantId
        if (!merchantId) {
            return res.status(400).json({ message: 'merchantId query parameter is required' });
        }

        const merchantIdNum = Number(merchantId);
        if (isNaN(merchantIdNum)) {
            return res.status(400).json({ message: 'merchantId must be a number' });
        }

        // Fetch merchant from DB
        const merchant = await Merchant.findByPk(merchantIdNum);

        if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found' });
        }

        //  Enforce access control
        // Only allow the merchant owner OR admin user to generate QR
        if (merchant.userId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: you do not own this merchant' });
        }

        // Build QR payload
        const qrPayload = {
            merchantName: merchant.name,
            accountNumber: merchant.account_number,
            bankName: merchant.bank_name,
            amount,
            reference,
        };

        const qrData = JSON.stringify(qrPayload);

        // Generate QR Code as Base64 image
        const qrImageUrl = await QRCode.toDataURL(qrData);

        return res.json({ qrImageUrl });
    } catch (err) {
        console.error('Error generating QR:', err);
        return res.status(500).json({ message: 'Failed to generate QR code' });
    }
};
