// src/routes/healthRoutes.ts
import { Router } from 'express';
import sgMail from '@sendgrid/mail';
const router = Router();

router.get('/email', async (req, res) => {
    try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
        await sgMail.send({
            to: process.env.NOTIFY_FROM_EMAIL!,
            from: process.env.NOTIFY_FROM_EMAIL!,
            subject: 'PayVerify Email Health Check',
            text: 'If you received this, SendGrid is configured correctly.',
        });
        res.json({ ok: true });
    } catch (e: any) {
        console.error('Email health failed:', e?.response?.body || e?.message || e);
        res.status(500).json({ ok: false, error: e?.message });
    }
});
export default router;
