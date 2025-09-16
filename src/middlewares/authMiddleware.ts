// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwtUtils';
import { UserJwtPayload } from '../types/express';

/**
 * Type guard: checks that an unknown value matches UserJwtPayload.
 * This avoids unsafe casting and TS2352 errors.
 */
function isUserJwtPayload(v: unknown): v is UserJwtPayload {
    if (!v || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    return (
        typeof o.id === 'number' &&
        typeof o.email === 'string' &&
        typeof o.role === 'string'
        // name is optional; no check
    );
}

/**
 * JWT authentication middleware.
 * - Verifies "Authorization: Bearer <token>"
 * - Validates payload shape via type guard
 * - Attaches a typed `req.user`
 */
export const verifyJwtMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }

    // Extract raw token
    const token = authHeader.slice(7).trim();

    try {
        const decoded = verifyToken(token); // whatever your jwtUtils returns

        if (!isUserJwtPayload(decoded)) {
            // If your token uses different field names, map them here before failing.
            res.status(401).json({ message: 'Invalid token payload' });
            return;
        }

        // Normalize/attach (keeps only the fields we care about)
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name, // optional
        };

        next();
    } catch (err) {
        console.error('JWT verification failed:', err);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

/**
 * Optional: admin-only guard.
 * Usage: router.get('/admin', verifyJwtMiddleware, requireAdmin, handler)
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role?.toLowerCase();
    if (role !== 'admin') {
        res.status(403).json({ message: 'Forbidden: admin only' });
        return;
    }
    next();
};

/**
 * Optional: generic role guard.
 * Usage: router.get('/something', verifyJwtMiddleware, requireRoles('manager','admin'), handler)
 */
export const requireRoles =
    (...roles: string[]) =>
        (req: Request, res: Response, next: NextFunction): void => {
            const role = req.user?.role?.toLowerCase();
            if (!role || !roles.map((r) => r.toLowerCase()).includes(role)) {
                res.status(403).json({ message: 'Forbidden: insufficient role' });
                return;
            }
            next();
        };

export default verifyJwtMiddleware;
