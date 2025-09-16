// src/controllers/bankAuthController.ts
// -----------------------------------------------------------------------------
// Magic-link auth for banks
//   POST /api/bank/login/request  -> requestMagicLink
//   GET  /api/bank/login/verify   -> verifyMagicLink
//   GET  /api/bank/me             -> getBankProfile
//
// Changes:
// - Guard null/undefined token and expiresAt (fixes TS error "possibly null").
// - Use try/catch for clearer 5xx on unexpected failures.
// -----------------------------------------------------------------------------

import { Request, Response } from 'express';
import Bank from '../models/Bank';
import BankLoginToken from '../models/BankLoginToken';
import { v4 as uuidv4 } from 'uuid';
import { sendConfirmationEmail } from '../services/emailService';
import jwt from 'jsonwebtoken';

export const requestMagicLink = async (req: Request, res: Response) => {
    try {
        const { contactEmail } = req.body as { contactEmail?: string };
        if (!contactEmail) {
            return res.status(400).json({ message: 'contactEmail is required' });
        }

        const bank = await Bank.findOne({ where: { contactEmail, status: 'Active' } });
        if (!bank) {
            return res.status(404).json({ message: 'Bank not found or not approved' });
        }

        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await BankLoginToken.create({ token, bankId: bank.id, expiresAt });

        const base = (process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:5173');
        const loginLink = `${base}/bank-login?token=${token}`;

        const emailContent = `
      <p>Hello ${bank.contactPerson},</p>
      <p>Click the link below to login to your bank dashboard:</p>
      <p><a href="${loginLink}">${loginLink}</a></p>
      <p>This link expires in 15 minutes.</p>
    `;

        // Your emailService supports (to, subject, htmlBody)
        await sendConfirmationEmail(contactEmail, 'Your Magic Login Link', emailContent);

        return res.status(200).json({ message: 'Magic link sent' });
    } catch (err) {
        console.error('[requestMagicLink] error:', err);
        return res.status(500).json({ message: 'Failed to send magic link' });
    }
};

export const verifyMagicLink = async (req: Request, res: Response) => {
    try {
        // Normalize token to a single string
        const raw = req.query.token;
        const token = Array.isArray(raw) ? raw[0] : (raw ?? '').toString().trim();
        if (!token) {
            return res.status(400).json({ message: 'Missing token' });
        }

        const tokenRecord = await BankLoginToken.findOne({ where: { token, used: false } });
        if (!tokenRecord) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Guard against null expiresAt (TS-safe)
        if (!tokenRecord.expiresAt || Date.now() > tokenRecord.expiresAt.getTime()) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        tokenRecord.used = true;
        await tokenRecord.save();

        const bank = await Bank.findByPk(tokenRecord.bankId);
        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('[verifyMagicLink] Missing JWT_SECRET');
            return res.status(500).json({ message: 'Server config error' });
        }

        const authToken = jwt.sign({ id: bank.id }, secret, { expiresIn: '1h' });
        return res.status(200).json({ token: authToken, bank });
    } catch (err) {
        console.error('[verifyMagicLink] error:', err);
        return res.status(500).json({ message: 'Failed to verify token' });
    }
};

export const getBankProfile = async (req: Request, res: Response) => {
    try {
        const bankCtx = (req as any).bank;
        if (!bankCtx?.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const bank = await Bank.findByPk(bankCtx.id);
        if (!bank) {
            return res.status(404).json({ message: 'Bank not found' });
        }

        return res.json(bank);
    } catch (err) {
        console.error('[getBankProfile] error:', err);
        return res.status(500).json({ message: 'Failed to load bank profile' });
    }
};
