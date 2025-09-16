// src/routes/aiRoutes.ts
import { Router } from 'express';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';
import { getAiInsights } from '../controllers/analyticsController';

const router = Router();
router.get('/analytics/ai/insights', verifyJwtMiddleware, getAiInsights);
export default router;
