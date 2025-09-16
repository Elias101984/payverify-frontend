// src/routes/transactionRoutes.ts

import { Router } from 'express';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';
import {
    createTransaction,
    getMerchantTransactions,
    getAllTransactions,
    getMerchantTransactionsById,
    adminCreateTransaction, // ✅ NEW: now actually exported by the controller
} from '../controllers/transactionController';

/**
 * Router for transaction endpoints.
 * CHANGES:
 * - ✅ Added POST /api/transactions/admin to allow admins to create a transaction for any merchant.
 *   This matches the new controller export and resolves the TS compile error.
 */

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Endpoints for creating and listing transactions
 */

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a transaction (merchant)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, status]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 5000
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed]
 *                 example: pending
 *     responses:
 *       201:
 *         description: Transaction created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyJwtMiddleware, createTransaction);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get logged-in user’s transactions (includes Merchant.name)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Paginated list of transactions for the user’s merchants
 *       401:
 *         description: Unauthorized
 */
router.get('/', verifyJwtMiddleware, getMerchantTransactions);

/**
 * @swagger
 * /api/transactions/admin:
 *   get:
 *     summary: Get all transactions (admin) — includes Merchant.name
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Paginated list of all transactions
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/admin', verifyJwtMiddleware, getAllTransactions);

/**
 * @swagger
 * /api/transactions/admin:
 *   post:
 *     summary: Create a transaction (admin) for any merchant
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [merchantId, amount, status]
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 example: 12
 *               amount:
 *                 type: number
 *                 example: 12000
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed]
 *                 example: completed
 *     responses:
 *       201:
 *         description: Transaction created
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/admin', verifyJwtMiddleware, adminCreateTransaction);

/**
 * @swagger
 * /api/transactions/admin/{merchantId}:
 *   get:
 *     summary: Get transactions by merchant ID (admin) — includes Merchant.name
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Paginated list of transactions for the specified merchant
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Merchant not found
 */
router.get('/admin/:merchantId', verifyJwtMiddleware, getMerchantTransactionsById);

export default router;
