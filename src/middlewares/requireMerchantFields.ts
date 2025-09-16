import { Request, Response, NextFunction } from 'express';

const REQUIRED = [
    'name',
    'cac_number',
    'tin_number',
    'bvn',
    'bank_name',
    'account_number',
    'email'
];

export function requireMerchantFields(req: Request, res: Response, next: NextFunction) {
    const b = (req.body ?? {}) as Record<string, any>;
    const missing = REQUIRED.filter((k) => !String(b[k] ?? '').trim());
    if (missing.length) {
        return res.status(400).json({ message: 'Missing required fields', missing });
    }
    next();
}
