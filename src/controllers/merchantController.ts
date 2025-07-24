import { Request, Response } from 'express';
import { Merchant } from '../models/Merchant';
import { User } from '../models/User'; // To validate that user exists

/**
 * GET /api/merchants
 * 
 * Returns all merchants.
 * 
 * Notes:
 * - Does not filter by user.
 * - Intended for admin use.
 */
export const getMerchants = async (req: Request, res: Response) => {
    try {
        const merchants = await Merchant.findAll();

        res.status(200).json(merchants);
    } catch (error) {
        console.error('Error fetching merchants:', error);
        res.status(500).json({ message: 'Failed to fetch merchants' });
    }
};

/**
 * POST /api/merchants
 * 
 * Creates a new merchant.
 * 
 * Notes:
 * - Validates required fields.
 * - Validates that the `userId` exists.
 * - Handles unique constraint error on `cac_number`.
 */
export const createMerchant = async (req: Request, res: Response) => {
    const {
        name,
        userId,
        cac_number,
        tin_number,
        bvn,
        account_number,
        bank_name,
        qr_code
    } = req.body;

    // Validate required fields
    if (!name || !userId || !cac_number || !account_number || !bank_name) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Check that user exists for given userId
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found for given userId' });
        }

        // Create merchant
        const newMerchant = await Merchant.create({
            name,
            userId,
            cac_number,
            tin_number,
            bvn,
            account_number,
            bank_name,
            qr_code
        });

        res.status(201).json(newMerchant);
    } catch (error: any) {
        console.error('Error creating merchant:', error);

        // Handle CAC number unique constraint error
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'CAC number must be unique' });
        }

        res.status(500).json({ message: 'Failed to create merchant' });
    }
};
