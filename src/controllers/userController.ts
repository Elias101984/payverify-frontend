// src/controllers/userController.ts
import { Request, Response } from 'express';
import { User } from '../models/User';
import sgMail from '@sendgrid/mail';
import jwt from 'jsonwebtoken'; // ✅ use your existing util if you prefer

async function sendWelcomeEmail(to: string): Promise<boolean> {
    const key = process.env.SENDGRID_API_KEY;
    const from = process.env.NOTIFY_FROM_EMAIL;

    if (!key || !from) {
        console.warn('Welcome email skipped: missing SENDGRID_API_KEY or NOTIFY_FROM_EMAIL');
        return false;
    }

    try {
        sgMail.setApiKey(key);
        await sgMail.send({
            to,
            from,
            subject: 'Welcome to PayVerify 🎉',
            html: `
        <h1>Welcome to PayVerify!</h1>
        <p>Your account has been created successfully.</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">Log in</a> to get started.</p>
        <p>— The PayVerify Team</p>
      `,
        });
        return true;
    } catch (err: any) {
        console.error('Welcome email failed:', err?.response?.body || err?.message || err);
        return false;
    }
}

// ⚠️ If you already have signToken in utils, use that instead of this inline logic
function signToken(payload: { id: number; email: string; role: string; name?: string }) {
    const secret = process.env.JWT_SECRET!;
    const expiresIn = '7d';
    return jwt.sign(payload, secret, { expiresIn });
}

/**
 * POST /api/users/registerUser
 * - Creates the user (password hashed via model hook)
 * - Sends welcome email (non-blocking)
 * - ✅ Returns { user, token } so the client can enter the app immediately
 */
export const registerUser = async (req: Request, res: Response) => {
    const { email, password, role } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const exists = await User.findOne({ where: { email } });
        if (exists) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        const user = await User.create({
            email,
            password,            // virtual; hashed before validate by model hook
            role: role ?? 'merchant',
        });

        // ✅ Sign JWT so /dashboard (ProtectedRoute) will allow entry
        const token = signToken({ id: user.id, email: user.email, role: user.role });

        // Fire & forget welcome email (won’t break signup if it fails)
        const emailQueued = await sendWelcomeEmail(email);

        return res.status(201).json({
            message: 'User registered successfully',
            user: { id: user.id, email: user.email, role: user.role },
            token,        // ✅ client will store this
            emailQueued,  // optional telemetry on the client
        });
    } catch (err) {
        console.error('User registration failed:', err);
        return res.status(500).json({ message: 'Failed to register user' });
    }
};
