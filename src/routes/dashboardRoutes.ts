import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics
 */

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/dashboard', verifyJwtMiddleware, getDashboardStats);

export default router;
