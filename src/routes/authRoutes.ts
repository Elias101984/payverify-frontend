import { Router } from 'express';
import { login, me, register } from '../controllers/authController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new merchant and user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - cac_number
 *               - account_number
 *               - bank_name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Merchant name
 *               email:
 *                 type: string
 *                 description: User email
 *               password:
 *                 type: string
 *                 description: User password
 *               cac_number:
 *                 type: string
 *                 description: CAC number
 *               account_number:
 *                 type: string
 *                 description: Bank account number
 *               bank_name:
 *                 type: string
 *                 description: Bank name
 *               tin_number:
 *                 type: string
 *                 description: Optional TIN
 *               bvn:
 *                 type: string
 *                 description: Optional BVN
 *               qr_code:
 *                 type: string
 *                 description: Optional QR code
 *     responses:
 *       201:
 *         description: User and merchant registered successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: User already exists
 *       500:
 *         description: Server error
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and get JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info
 *       401:
 *         description: Unauthorized
 */
router.get('/me', verifyToken, me);

export default router;
