// src/middlewares/isAdmin.ts
import { Request, Response, NextFunction } from 'express';

export function isAdmin(req: Request, res: Response, next: NextFunction) {
    const role = (req.user as any)?.role || (req as any)?.user?.role; // adapt to your auth
    if (String(role).toLowerCase() !== 'admin') {
        return res.status(403).json({ message: 'Admin only' });
    }
    next();
}
