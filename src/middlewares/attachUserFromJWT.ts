// src/middlewares/attachUserFromJWT.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || 'dev-secret';

export function attachUserFromJWT(req: Request & { user?: any }, res: Response, next: NextFunction) {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing Authorization header' });

    try {
        const payload = jwt.verify(token, JWT);
        req.user = payload; // should include role (e.g., { id, role, ... })
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}
