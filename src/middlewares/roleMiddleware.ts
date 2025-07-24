import { Request, Response, NextFunction } from 'express';

/**
 * Middleware factory to enforce role-based authorization.
 * 
 * @param allowedRoles - Array of roles that are permitted to access the route.
 * 
 * Why: 
 * - SRP: This middleware only checks roles, not authentication.
 * - DRY: Central place to enforce roles without duplicating checks.
 * - Scalable: Supports any number of roles and can evolve with your RBAC design.
 */
export const authorizeRoles = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Ensure `req.user` is populated by previous authentication middleware.
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized: No user context' });
        }

        // Type guard: Decode `req.user` properly.
        const user = req.user as { id: number; email: string; name: string; role?: string };

        if (!user.role) {
            return res.status(403).json({ message: 'Forbidden: No role assigned' });
        }

        // Check if the user's role is in the list of allowed roles.
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }

        // User is authorized for this route.
        next();
    };
};
