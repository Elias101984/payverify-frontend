import { Router } from 'express';
import { generateMerchantQR } from '../controllers/paymentController';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment-related endpoints
 */

/**
 * @swagger
 * /api/payments/qr:
 *   get:
 *     summary: Generate a QR code for merchant payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Merchant ID
 *       - in: query
 *         name: amount
 *         required: false
 *         schema:
 *           type: number
 *         description: Payment amount
 *       - in: query
 *         name: reference
 *         required: false
 *         schema:
 *           type: string
 *         description: Payment reference or note
 *     responses:
 *       200:
 *         description: QR code image URL returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrImageUrl:
 *                   type: string
 *                   example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *       400:
 *         description: Missing or invalid parameters
 *       404:
 *         description: Merchant not found
 *       500:
 *         description: Internal server error
 */
router.get('/qr', verifyJwtMiddleware, generateMerchantQR);

export default router;
