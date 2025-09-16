// src/types/express/index.d.ts
// -------------------------------------------------------------
// Global Express type augmentation for JWT-authenticated requests
// -------------------------------------------------------------
// Why this matters:
// - Adds `req.user` and `req.bank` to Express.Request globally
// - Ensures TypeScript recognizes the augmentation by importing 'express'
//   and exporting an empty module (`export {}`) at the bottom.
// - Makes `name` optional in UserJwtPayload to match your token variance.
//
// After updating, restart your dev server AND the TypeScript server
// (VS Code: “TypeScript: Restart TS server”).
// -------------------------------------------------------------

import 'express';

/**
 * Payload for user-authenticated JWT tokens.
 * Used for admins, merchants, and general users.
 */
export interface UserJwtPayload {
    /** Unique identifier of the user */
    id: number;

    /** User's email address */
    email: string;

    /** User's role (e.g., 'admin', 'merchant') */
    role: string;

    /** User's name (optional in some tokens) */
    name?: string;

    /** JWT issued-at timestamp */
    iat?: number;

    /** JWT expiration timestamp */
    exp?: number;
}

/**
 * Payload for bank-authenticated context (magic link / OTP).
 */
export interface BankRequestContext {
    /** Bank ID from database */
    id: number;

    /** Bank contact email (used to identify login) */
    contactEmail: string;

    /** Display name of the bank */
    bankName: string;

    /** Bank approval status (e.g., Pending, Active, Rejected) */
    status: string;
}

// -------------------------------------------------------------
// Express Request Augmentation
// -------------------------------------------------------------
declare global {
    namespace Express {
        interface Request {
            /**
             * Populated when a user (admin/merchant) authenticates with JWT.
             * Set by auth middleware.
             */
            user?: UserJwtPayload;

            /**
             * Populated when a bank authenticates (magic link / OTP).
             * Set by bank auth middleware.
             */
            bank?: BankRequestContext;
        }
    }
}

// Important: make this file a module so augmentation is applied.
export { };
