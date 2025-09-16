import { Router } from 'express';
import {
    createDispute,
    listDisputesForTransaction,
    updateDisputeStatus,
} from '../controllers/disputeController';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Full paths:
//   POST /api/transactions/:transactionId/disputes
//   GET  /api/transactions/:transactionId/disputes
//   PATCH /api/disputes/:id
router.post('/transactions/:transactionId/disputes', verifyJwtMiddleware, createDispute);
router.get('/transactions/:transactionId/disputes', verifyJwtMiddleware, listDisputesForTransaction);
router.patch('/disputes/:id', verifyJwtMiddleware, updateDisputeStatus);

export default router;
