import { Request, Response } from 'express';
import { MerchantModel } from '../../models/Merchant';
import Transaction from '../../models/Transaction';

/**
 * Admin: Get all merchants.
 */
export const getAllMerchants = async (req: Request, res: Response) => {
    try {
        const merchants = await MerchantModel.findAll();
        res.json(merchants);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch merchants' });
    }
};

/**
 * Admin: Get transactions for a specific merchant (with pagination).
 */
export const getMerchantTransactions = async (req: Request, res: Response) => {
    try {
        const merchantId = parseInt(req.query.merchantId as string);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        if (!merchantId) {
            return res.status(400).json({ message: 'merchantId is required' });
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Transaction.findAndCountAll({
            where: { merchantId },
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        res.json({
            total: count,
            page,
            pages: Math.ceil(count / limit),
            transactions: rows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch transactions' });
    }
};
