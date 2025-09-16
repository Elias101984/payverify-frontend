// src/middlewares/isAuthenticatedBank.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Bank from '../models/Bank';

// Shape we want available on req.bank for downstream handlers
export type BankRequestContext = {
    id: number;
    contactEmail: string;
    bankName: string;
    status: 'Pending' | 'Active' | 'Rejected';
};

// Augment Express' Request type so TypeScript knows about req.bank
declare module 'express-serve-static-core' {
    interface Request {
        bank?: BankRequestContext;
    }
}

const JWT_SECRET =
    process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || 'dev-secret';

/**
 * isAuthenticatedBank
 * ----------------------------------------------------------------------------
 * - Reads `Authorization: Bearer <jwt>` header
 * - Verifies JWT, expects a "bank" token with either { bankId } or { id }
 * - Loads the bank from DB (to get contactEmail, bankName, status, etc)
 * - Ensures bank is Active (403 otherwise)
 * - Populates req.bank with all required fields (fixes TS2739)
 */
export async function isAuthenticatedBank(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const auth = req.headers.authorization || '';
        const [, token] = auth.split(' ');

        if (!token) {
            return res.status(401).json({ message: 'Missing Authorization token' });
        }

        // Verify JWT
        const decoded = jwt.verify(token, JWT_SECRET) as
            | { role?: string; bankId?: number; id?: number; email?: string }
            | string;

        if (typeof decoded === 'string') {
            return res.status(401).json({ message: 'Invalid token payload' });
        }

        if (decoded.role !== 'bank') {
            return res.status(403).json({ message: 'Forbidden: bank token required' });
        }

        const bankId = decoded.bankId ?? decoded.id;
        if (!bankId) {
            return res.status(401).json({ message: 'Invalid bank token' });
        }

        // Load bank so we can set all fields required by BankRequestContext
        const bank = await Bank.findByPk(bankId);
        if (!bank) {
            return res.status(404).json({ message: 'Bank not found' });
        }

        if (bank.status !== 'Active') {
            return res.status(403).json({ message: `Bank status is ${bank.status}` });
        }

        // ✅ Populate ALL required fields so TypeScript is happy
        req.bank = {
            id: bank.id,
            contactEmail: bank.contactEmail,
            bankName: bank.bankName,
            status: bank.status as 'Pending' | 'Active' | 'Rejected',
        };

        next();
    } catch (err: any) {
        const code =
            err?.name === 'TokenExpiredError'
                ? 401
                : err?.name === 'JsonWebTokenError'
                    ? 401
                    : 500;
        const msg =
            err?.name === 'TokenExpiredError'
                ? 'Token expired'
                : err?.name === 'JsonWebTokenError'
                    ? 'Invalid token'
                    : 'Failed to authenticate bank';
        return res.status(code).json({ message: msg });
    }
}

export default isAuthenticatedBank;
