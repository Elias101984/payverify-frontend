import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce role-based authorization.
 * 
 * Usage:
 * router.get('/admin', verifyToken, authorize('admin'), adminHandler);
 * 
 * Reason: Protects routes by ensuring the authenticated user's role
 * matches one of the allowed roles.
 */
export const authorize =
    (...allowedRoles: string[]) =>
        (req: Request, res: Response, next: NextFunction) => {
            // If no user is attached to the request, reject
            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized: no user' });
            }

            // If role is missing in token payload, reject
            if (!req.user.role) {
                return res.status(403).json({ message: 'Forbidden: no role found' });
            }

            // If role is not one of the allowed roles, reject
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Forbidden: insufficient privileges' });
            }

            // All good — user is authorized
            next();
        };
