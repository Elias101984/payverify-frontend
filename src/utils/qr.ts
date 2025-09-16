import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

type MerchantLike = {
    id: number;
    name: string;
    cac_number: string;
    tin_number: string;
    bvn: string;
};

export async function buildMerchantQr(
    merchant: MerchantLike,
    origin: string,                // e.g. https://app.payverify.com (or from env)
    jwtSecret: string              // process.env.QR_JWT_SECRET
) {
    const payload = { sub: merchant.id, cac: merchant.cac_number, bvn: merchant.bvn };
    const qrToken = jwt.sign(payload, jwtSecret, { expiresIn: '180d' });
    const verifyUrl = `${origin}/qr/verify?token=${encodeURIComponent(qrToken)}`;

    // Data encoded in QR (use the verify URL)
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        errorCorrectionLevel: 'M',
        width: 512,
        margin: 1
    });

    return { qrToken, verifyUrl, qrDataUrl };
}
