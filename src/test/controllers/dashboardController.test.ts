/**
 * Unit tests for dashboardController
 *
 * SRP: Test `getDashboardStats` behavior only.
 * Mocks DB models to isolate logic from Sequelize.
 */

import { getDashboardStats } from '../../controllers/dashboardController';
import { Merchant } from '../../models/Merchant';
import Transaction from '../../models/Transaction';
import { Request, Response } from 'express';

// Mock models
jest.mock('../../models/Merchant');
jest.mock('../../models/Transaction');

describe('dashboardController.getDashboardStats', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    const mockUser = {
        id: 1,
        email: 'merchant@test.com',
        name: 'Test Merchant',
        role: 'merchant',
    };

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        req = {};
        res = {
            status: statusMock,
            json: jsonMock,
        };

        (Merchant.findOne as jest.Mock).mockReset();
        (Transaction.count as jest.Mock).mockReset();
        (Transaction.sum as jest.Mock).mockReset();
    });

    it('should return 401 if user is not authenticated', async () => {
        req.user = undefined;

        await getDashboardStats(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized: user not found' });
    });

    it('should return 404 if merchant not found for user', async () => {
        req.user = mockUser;
        (Merchant.findOne as jest.Mock).mockResolvedValue(null);

        await getDashboardStats(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Merchant not found for this user' });
    });

    it('should return dashboard stats for merchant', async () => {
        req.user = mockUser;
        (Merchant.findOne as jest.Mock).mockResolvedValue({ id: 123 });
        (Transaction.count as jest.Mock).mockResolvedValueOnce(10); // total
        (Transaction.count as jest.Mock).mockResolvedValueOnce(3);  // pending
        (Transaction.count as jest.Mock).mockResolvedValueOnce(7);  // completed
        (Transaction.sum as jest.Mock).mockResolvedValue(2500.5);

        await getDashboardStats(req as Request, res as Response);

        expect(jsonMock).toHaveBeenCalledWith({
            total: 10,
            pending: 3,
            completed: 7,
            sum: 2500.5,
        });
    });

    it('should handle server errors', async () => {
        req.user = mockUser;
        (Merchant.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

        await getDashboardStats(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Error fetching dashboard data' });
    });
});
