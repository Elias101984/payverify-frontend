import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import {
    createTransaction,
    getMerchantTransactions,
    getAllTransactions,
    getMerchantTransactionsById
} from '../controllers/transactionController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Endpoints for managing transactions
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
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed]
 *     responses:
 *       201:
 *         description: Transaction created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyToken, createTransaction);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get logged-in merchant’s transactions
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
 *         description: List of transactions for the merchant
 */
router.get('/', verifyToken, getMerchantTransactions);

/**
 * @swagger
 * /api/transactions/admin:
 *   get:
 *     summary: Get all transactions (admin)
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
 *         description: List of all transactions
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/admin', verifyToken, getAllTransactions);

/**
 * @swagger
 * /api/transactions/admin/{merchantId}:
 *   get:
 *     summary: Get transactions by merchant ID (admin)
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
 *         description: List of transactions for specified merchant
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Merchant not found
 */
router.get('/admin/:merchantId', verifyToken, getMerchantTransactionsById);

export default router;
