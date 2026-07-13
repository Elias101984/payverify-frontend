// src/middlewares/isAuthenticatedBank.ts
// -----------------------------------------------------------------------------
// PayVerify Bank Authentication Middleware
//
// TYPESCRIPT / RENDER BUILD FIX
// -----------------------------------------------------------------------------
//
// WHAT CHANGED:
//
// 1. REMOVED:
//      declare module 'express-serve-static-core'
//
//    WHY:
//    The Render TypeScript build could not resolve that module augmentation:
//
//      TS2664: Invalid module name in augmentation,
//      module 'express-serve-static-core' cannot be found.
//
// 2. ADDED:
//      BankAuthenticatedRequest extends Request
//
//    WHY:
//    This gives this middleware a properly typed `req.bank` property without
//    globally augmenting Express.
//
// 3. The middleware now uses:
//      req: BankAuthenticatedRequest
//
//    Because BankAuthenticatedRequest extends Express Request, it inherits:
//
//      req.headers
//      req.body
//      req.params
//      req.query
//
//    while also adding:
//
//      req.bank
//
// 4. NO authentication behavior was changed.
//    JWT verification, bank lookup, Active status validation, and req.bank
//    population all remain functionally the same.
// -----------------------------------------------------------------------------

import {
    Request,
    Response,
    NextFunction,
} from 'express';

import jwt from 'jsonwebtoken';
import Bank from '../models/Bank';


// =============================================================================
// BANK REQUEST CONTEXT
// =============================================================================
//
// Shape attached to req.bank after successful authentication.
//
// Downstream handlers can access:
//
// req.bank.id
// req.bank.contactEmail
// req.bank.bankName
// req.bank.status
// =============================================================================

export type BankRequestContext = {
    id: number;
    contactEmail: string;
    bankName: string;
    status: 'Pending' | 'Active' | 'Rejected';
};


// =============================================================================
// BANK AUTHENTICATED REQUEST
// =============================================================================
//
// Instead of globally augmenting:
//
//     express-serve-static-core
//
// we extend Express Request locally.
//
// This avoids the Render TS2664 module augmentation error while preserving
// all normal Express Request properties.
// =============================================================================

export interface BankAuthenticatedRequest extends Request {
    bank?: BankRequestContext;
}


// =============================================================================
// JWT SECRET
// =============================================================================

const JWT_SECRET =
    process.env.AUTH_JWT_SECRET ||
    process.env.JWT_SECRET ||
    'dev-secret';


// =============================================================================
// BANK AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * isAuthenticatedBank
 * -----------------------------------------------------------------------------
 *
 * Authentication flow:
 *
 * 1. Reads:
 *      Authorization: Bearer <jwt>
 *
 * 2. Verifies the JWT.
 *
 * 3. Requires:
 *      role === "bank"
 *
 * 4. Reads:
 *      bankId
 *         OR
 *      id
 *
 * 5. Loads the bank from the database.
 *
 * 6. Requires the bank status to be:
 *      Active
 *
 * 7. Attaches the bank context to:
 *      req.bank
 *
 * 8. Continues to the next middleware/controller.
 */
export async function isAuthenticatedBank(
    req: BankAuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {

    try {

        // ---------------------------------------------------------------------
        // Read Authorization header.
        //
        // Because BankAuthenticatedRequest extends Express Request,
        // req.headers is correctly available and typed.
        // ---------------------------------------------------------------------

        const authHeader = req.headers.authorization || '';

        // Expected format:
        //
        // Authorization: Bearer <token>

        const [scheme, token] = authHeader.split(' ');


        // ---------------------------------------------------------------------
        // Validate Bearer token
        // ---------------------------------------------------------------------

        if (
            scheme !== 'Bearer' ||
            !token
        ) {

            res.status(401).json({
                message: 'Missing Authorization token',
            });

            return;
        }


        // ---------------------------------------------------------------------
        // Verify JWT
        // ---------------------------------------------------------------------

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        ) as
            | {
                role?: string;
                bankId?: number;
                id?: number;
                email?: string;
            }
            | string;


        // ---------------------------------------------------------------------
        // Reject string JWT payloads
        // ---------------------------------------------------------------------

        if (typeof decoded === 'string') {

            res.status(401).json({
                message: 'Invalid token payload',
            });

            return;
        }


        // ---------------------------------------------------------------------
        // Require a bank JWT
        // ---------------------------------------------------------------------

        if (decoded.role !== 'bank') {

            res.status(403).json({
                message: 'Forbidden: bank token required',
            });

            return;
        }


        // ---------------------------------------------------------------------
        // Support either bankId or id in existing JWT payloads
        // ---------------------------------------------------------------------

        const bankId =
            decoded.bankId ??
            decoded.id;


        if (!bankId) {

            res.status(401).json({
                message: 'Invalid bank token',
            });

            return;
        }


        // ---------------------------------------------------------------------
        // Load bank from database
        // ---------------------------------------------------------------------

        const bank = await Bank.findByPk(bankId);


        if (!bank) {

            res.status(404).json({
                message: 'Bank not found',
            });

            return;
        }


        // ---------------------------------------------------------------------
        // Only Active banks may access protected bank routes
        // ---------------------------------------------------------------------

        if (bank.status !== 'Active') {

            res.status(403).json({
                message: `Bank status is ${bank.status}`,
            });

            return;
        }


        // ---------------------------------------------------------------------
        // Attach authenticated bank context to the request.
        //
        // The local BankAuthenticatedRequest interface makes this type-safe
        // without global Express module augmentation.
        // ---------------------------------------------------------------------

        req.bank = {
            id: bank.id,
            contactEmail: bank.contactEmail,
            bankName: bank.bankName,
            status:
                bank.status as
                | 'Pending'
                | 'Active'
                | 'Rejected',
        };


        // Continue request pipeline
        next();

    } catch (err: any) {

        // ---------------------------------------------------------------------
        // Normalize JWT authentication errors
        // ---------------------------------------------------------------------

        const statusCode =
            err?.name === 'TokenExpiredError'
                ? 401
                : err?.name === 'JsonWebTokenError'
                    ? 401
                    : 500;


        const message =
            err?.name === 'TokenExpiredError'
                ? 'Token expired'
                : err?.name === 'JsonWebTokenError'
                    ? 'Invalid token'
                    : 'Failed to authenticate bank';


        res.status(statusCode).json({
            message,
        });

        return;
    }
}


export default isAuthenticatedBank;