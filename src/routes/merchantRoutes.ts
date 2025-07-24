import express from 'express';
import { getMerchants, createMerchant } from '../controllers/merchantController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Merchants
 *   description: Endpoints for managing merchants
 */

/**
 * @swagger
 * /api/merchants:
 *   get:
 *     summary: Get all merchants
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of merchants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: Test Merchant
 *                   userId:
 *                     type: integer
 *                     example: 1
 *                   cac_number:
 *                     type: string
 *                     example: CAC12345
 *                   tin_number:
 *                     type: string
 *                     example: TIN56789
 *                   bvn:
 *                     type: string
 *                     example: BVN123456
 *                   account_number:
 *                     type: string
 *                     example: 0123456789
 *                   bank_name:
 *                     type: string
 *                     example: Zenith Bank
 *                   qr_code:
 *                     type: string
 *                     example: QR12345
 *       401:
 *         description: Unauthorized - Missing or invalid JWT
 */
router.get('/merchants', verifyToken, getMerchants);

/**
 * @swagger
 * /api/merchants:
 *   post:
 *     summary: Create a new merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - userId
 *               - cac_number
 *               - account_number
 *               - bank_name
 *             properties:
 *               name:
 *                 type: string
 *                 example: New Merchant
 *               userId:
 *                 type: integer
 *                 example: 1
 *               cac_number:
 *                 type: string
 *                 example: CAC12345
 *               tin_number:
 *                 type: string
 *                 example: TIN56789
 *               bvn:
 *                 type: string
 *                 example: BVN123456
 *               account_number:
 *                 type: string
 *                 example: 0123456789
 *               bank_name:
 *                 type: string
 *                 example: Access Bank
 *               qr_code:
 *                 type: string
 *                 example: QR12345
 *     responses:
 *       201:
 *         description: Merchant created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 2
 *                 name:
 *                   type: string
 *                   example: New Merchant
 *                 userId:
 *                   type: integer
 *                   example: 1
 *                 cac_number:
 *                   type: string
 *                   example: CAC12345
 *                 tin_number:
 *                   type: string
 *                   example: TIN56789
 *                 bvn:
 *                   type: string
 *                   example: BVN123456
 *                 account_number:
 *                   type: string
 *                   example: 0123456789
 *                 bank_name:
 *                   type: string
 *                   example: Access Bank
 *                 qr_code:
 *                   type: string
 *                   example: QR12345
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized - Missing or invalid JWT
 *       409:
 *         description: Conflict - CAC number must be unique
 */
router.post('/merchants', verifyToken, createMerchant);

export default router;
