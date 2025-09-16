import express from 'express';
import {
    validateQRCode,
    regenerateQRCode,
    downloadQRCode
} from '../controllers/qrController';
import { emailQRCode } from '../controllers/qrController';
//import { authenticate } from '../middlewares/authMiddleware';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

// -------------------------------------------------------------------
// POST /api/qr/validate
// Validates a given QR token (JWT signed)
// Body: { token: string }
// -------------------------------------------------------------------
router.post('/validate', validateQRCode);

// -------------------------------------------------------------------
// POST /api/qr/regenerate/:merchantId
// Regenerates a QR code and Cloudinary image for the given merchant
// Params: merchantId
// -------------------------------------------------------------------
router.post('/regenerate/:merchantId', verifyJwtMiddleware, regenerateQRCode);

// -------------------------------------------------------------------
// GET /api/qr/download/:merchantId
// Returns the merchant’s current QR code details
// Params: merchantId
// -------------------------------------------------------------------
router.get('/download/:merchantId', downloadQRCode);

router.post('/email', verifyJwtMiddleware, emailQRCode);

export default router;
