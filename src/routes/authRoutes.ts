// src/routes/authRoutes.ts
import { Router } from 'express';
import { login, me, register } from '../controllers/authController';
import {
    forgotPassword,
    resetPassword,
    changePassword,
} from '../controllers/authController'; // ✅ NEW imports
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';

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
router.get('/me', verifyJwtMiddleware, me);

/* ------------------------------------------------------------------
 * ✅ NEW: Password reset / change endpoints
 * ------------------------------------------------------------------*/

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     description: Always returns 200 to avoid email enumeration. If the email exists, a one-time reset token is created and emailed.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: If that email exists, a reset link has been sent.
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a one-time token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password has been reset successfully
 *       400:
 *         description: Invalid or expired token, or missing fields
 *       500:
 *         description: Server error
 */
router.post('/reset-password', resetPassword);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password for the logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Missing fields or weak password
 *       401:
 *         description: Unauthorized or incorrect current password
 *       500:
 *         description: Server error
 */
router.post('/change-password', verifyJwtMiddleware, changePassword); // ✅ protected

export default router;
