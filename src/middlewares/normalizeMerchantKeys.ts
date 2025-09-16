import { Request, Response, NextFunction } from 'express';

function alias(b: Record<string, any>, fromKey: string, toKey: string) {
    if (b[fromKey] !== undefined && b[toKey] === undefined) b[toKey] = b[fromKey];
}

/** Tolerate snake_case and camelCase from any client */
export function normalizeMerchantKeys(req: Request, _res: Response, next: NextFunction) {
    const b = (req.body ?? {}) as Record<string, any>;

    // camel -> snake
    alias(b, 'cacNumber', 'cac_number');
    alias(b, 'tin', 'tin_number');
    alias(b, 'bankName', 'bank_name');
    alias(b, 'accountNumber', 'account_number');

    // snake -> camel (optional convenience)
    alias(b, 'cac_number', 'cacNumber');
    alias(b, 'tin_number', 'tin');
    alias(b, 'bank_name', 'bankName');
    alias(b, 'account_number', 'accountNumber');

    req.body = b;
    next();
}
