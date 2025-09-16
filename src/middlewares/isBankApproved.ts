import { Request, Response, NextFunction } from 'express';
import  Bank  from '../models/Bank';

/**
 * Middleware to ensure only approved banks can proceed
 */
export const isBankApproved = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as { bankId?: number }; // Typecast user object
    if (!user || !user.bankId) {
        return res.status(401).json({ message: 'Unauthorized - Bank ID missing' });
    }

    try {
        const bank = await Bank.findByPk(user.bankId);
        if (!bank || bank.status !== 'Active') {
            return res.status(403).json({ message: 'Bank not approved yet' });
        }
        next();
    } catch (error) {
        console.error('Bank approval middleware error:', error);
        return res.status(500).json({ message: 'Internal error checking bank approval' });
    }
};
