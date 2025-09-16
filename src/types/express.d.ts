// src/types/express.d.ts
import 'express-serve-static-core';

export type BankStatus = 'Pending' | 'Active' | 'Rejected';

export interface BankRequestContext {
    id: number;
    email?: string;          // <-- must include this
    status?: BankStatus;     // <-- and this
}

export interface UserJwtPayload {
    role?: string;
    bankId?: number;
    id?: number;
    sub?: string;
    email?: string;
    iat?: number;
    exp?: number;
}

declare module 'express-serve-static-core' {
    interface Request {
        bank?: BankRequestContext;
        user?: UserJwtPayload;
    }
}
