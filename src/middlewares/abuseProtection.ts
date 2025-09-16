// src/middlewares/abuseProtection.ts
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';

/**
 * Honeypot guard:
 * - If hidden fields are present and non-empty, we pretend it "worked"
 *   but do NOT create any records or fire emails.
 * - Keep response generic to avoid tipping off bots.
 */
export function honeypotGuard(req: Request, res: Response, next: NextFunction) {
    const bait = String(req.body?.companyWebsite || req.body?.hp || '').trim();
    if (bait.length > 0) {
        setTimeout(() => res.status(204).end(), 300);
        return;
    }
    next();
}

/**
 * Speed limiter: gently adds delay after X requests.
 * NOTE: express-slow-down’s new validator expects a constant or
 *       a validated function. We use a constant to avoid WRN_ESD_DELAYMS.
 */

export const registerSpeedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 10,
    delayMs: () => 500,            // function form (new API)
    validate: { delayMs: false },  // suppress warning across versions
});

/**
 * Hard limiter: caps max requests per IP per window.
 */
export const registerHardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 20,                  // 20 registrations / IP / window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});
