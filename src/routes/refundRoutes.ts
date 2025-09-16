// src/routes/refundRoutes.ts
import { Router } from 'express';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';
import { createRefund, listRefundsForTransaction } from '../controllers/refundController';

const router = Router();

/**
 * POST /api/transactions/:transactionId/refunds
 * GET  /api/transactions/:transactionId/refunds
 */
router.post('/transactions/:transactionId/refunds', verifyJwtMiddleware, createRefund);
router.get('/transactions/:transactionId/refunds', verifyJwtMiddleware, listRefundsForTransaction);

export default router;
