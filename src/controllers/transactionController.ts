import { Request, Response } from 'express';
import { Merchant } from '../models/Merchant';
import Transaction from '../models/Transaction';

/**
 * Transaction Controller
 *
 * Handles creation and retrieval of transactions
 * - Merchant users can see/create their own
 * - Admin users can see all or per-merchant
 */

/**
 * POST /api/transactions
 * Create a transaction for the logged-in merchant
 */
export const createTransaction = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;

        const { amount, status } = req.body;

        if (!amount || !status) {
            return res.status(400).json({ message: 'Amount and status are required' });
        }

        const merchant = await Merchant.findOne({ where: { userId } });
        if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found' });
        }

        const transaction = await Transaction.createForMerchant(merchant.id, amount, status);

        res.status(201).json(transaction);
    } catch (err) {
        console.error('Error creating transaction:', err);
        res.status(500).json({ message: 'Server error while creating transaction' });
    }
};

/**
 * GET /api/transactions
 * Get transactions for the logged-in merchant with pagination
 */
export const getMerchantTransactions = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;

        const limit = parseInt(req.query.limit as string, 10) || 10;
        const offset = parseInt(req.query.offset as string, 10) || 0;

        const merchant = await Merchant.findOne({ where: { userId } });
        if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found' });
        }

        const result = await Transaction.findByMerchant(merchant.id, limit, offset);

        res.json({
            count: result.count,
            rows: result.rows,
            limit,
            offset
        });
    } catch (err) {
        console.error('Error fetching merchant transactions:', err);
        res.status(500).json({ message: 'Server error while fetching transactions' });
    }
};

/**
 * GET /api/transactions/admin
 * Admin: Get all transactions with pagination
 */
export const getAllTransactions = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: admin only' });
        }

        const limit = parseInt(req.query.limit as string, 10) || 10;
        const offset = parseInt(req.query.offset as string, 10) || 0;

        const result = await Transaction.findAndCountAll({
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            count: result.count,
            rows: result.rows,
            limit,
            offset
        });
    } catch (err) {
        console.error('Error fetching all transactions:', err);
        res.status(500).json({ message: 'Server error while fetching all transactions' });
    }
};

/**
 * GET /api/transactions/admin/:merchantId
 * Admin: Get transactions for a specific merchant with pagination
 */
export const getMerchantTransactionsById = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: admin only' });
        }

        const merchantId = parseInt(req.params.merchantId, 10);

        const limit = parseInt(req.query.limit as string, 10) || 10;
        const offset = parseInt(req.query.offset as string, 10) || 0;

        const merchant = await Merchant.findByPk(merchantId);
        if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found' });
        }

        const result = await Transaction.findByMerchant(merchant.id, limit, offset);

        res.json({
            count: result.count,
            rows: result.rows,
            limit,
            offset
        });
    } catch (err) {
        console.error('Error fetching transactions by merchant:', err);
        res.status(500).json({ message: 'Server error while fetching transactions by merchant' });
    }
};
