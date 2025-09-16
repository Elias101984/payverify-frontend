// src/routes/bankAuthRoutes.ts
import express from 'express';
import {
    requestMagicLink,
    verifyMagicLink,
    getBankProfile,
} from '../controllers/bankAuthController';
import { isAuthenticatedBank } from '../middlewares/isAuthenticatedBank';
import { validateTurnstile } from '../middlewares/validateTurnstile';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: BankAuth
 *   description: Magic Link Authentication for Banks
 */

/**
 * @swagger
 * /api/bank/login/request:
 *   post:
 *     summary: Request a magic login link (CAPTCHA-protected)
 *     tags: [BankAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contactEmail, captchaToken]
 *             properties:
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 example: contact@zenithbank.com
 *               captchaToken:
 *                 type: string
 *                 description: Cloudflare Turnstile token from the frontend widget
 *     responses:
 *       200:
 *         description: Magic link sent to email
 *       404:
 *         description: Bank not found or inactive
 *       400:
 *         description: Missing/invalid parameters
 */
router.post('/login/request', validateTurnstile, requestMagicLink);

/**
 * @swagger
 * /api/bank/login/verify:
 *   get:
 *     summary: Verify login token and return a signed JWT
 *     tags: [BankAuth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Login success with JWT
 *       400:
 *         description: Invalid or expired token
 */
router.get('/login/verify', verifyMagicLink);

/**
 * @swagger
 * /api/bank/me:
 *   get:
 *     summary: Get authenticated bank profile
 *     tags: [BankAuth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the bank profile
 *       401:
 *         description: Unauthorized or missing token
 */
router.get('/me', isAuthenticatedBank, getBankProfile);

export default router;
