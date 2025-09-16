import { Router, Request, Response } from 'express';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin endpoints
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Admin dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
    '/dashboard',
    verifyJwtMiddleware,
    authorizeRoles(['admin']),
    (req: Request, res: Response) => {
        res.json({
            message: 'Welcome to the admin dashboard',
            user: req.user
        });
    }
);

export default router;
