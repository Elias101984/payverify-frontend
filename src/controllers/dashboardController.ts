import { Request, Response } from 'express';
import { Merchant } from '../models/Merchant';
import Transaction from '../models/Transaction';

/**
 * getDashboardStats
 *
 * This controller returns dashboard statistics based on the logged-in user.
 *
 * Changes:
 *  Added support for `admin` role — admin sees global stats (all merchants combined).
 *  Merchants continue to see only their own merchant stats.
 */
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // Extract user information from token middleware
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res.status(401).json({ message: 'Unauthorized: user not found or no role' });
        }

        // Default stats to 0
        let total = 0;
        let pending = 0;
        let completed = 0;
        let sum = 0;

        if (userRole === 'admin') {
            /**
             *  If the logged-in user is an admin:
             *   - Fetch ALL transactions in the system
             *   - Count totals, pending, completed, and sum amounts
             */
            total = await Transaction.count();
            pending = await Transaction.count({ where: { status: 'pending' } });
            completed = await Transaction.count({ where: { status: 'completed' } });
            sum = await Transaction.sum('amount');
        } else {
            /**
             *  If the user is a merchant:
             *   - Find their associated Merchant record by userId
             *   - Then compute stats only for their merchantId
             */
            const merchant = await Merchant.findOne({ where: { userId } });

            if (!merchant) {
                return res.status(404).json({ message: 'Merchant not found for this user' });
            }

            const merchantId = merchant.id;

            total = await Transaction.count({ where: { merchantId } });
            pending = await Transaction.count({ where: { merchantId, status: 'pending' } });
            completed = await Transaction.count({ where: { merchantId, status: 'completed' } });
            sum = await Transaction.sum('amount', { where: { merchantId } });
        }

        // Respond with calculated stats
        res.json({ total, pending, completed, sum });
    } catch (err) {
        console.error('Dashboard error', err);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
};
