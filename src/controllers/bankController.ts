// src/controllers/bankController.ts
// -----------------------------------------------------------------------------
// What changed & why (this update)
// - ❌ Removed Turnstile verification: no token reading, no /siteverify call.
// - ✅ Still sends the registration email to the bank with admin BCC.
// - 🔁 approveBank / rejectBank unchanged.
// -----------------------------------------------------------------------------

import { Request, Response } from 'express';
import Bank from '../models/Bank';
import {
    sendConfirmationEmail,
    sendConfirmationEmailWithAdminBcc,
} from '../services/emailService';
import { getApprovalEmailTemplate } from '../templates/getApprovalEmailTemplate';

export const registerBank = async (req: Request, res: Response) => {
    try {
        const { bankName, contactEmail, contactPhone, contactPerson } = req.body;

        if (!bankName || !contactEmail || !contactPhone || !contactPerson) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const bank = await Bank.create({
            bankName,
            contactEmail,
            contactPhone,
            contactPerson,
            status: 'Pending',
        });

        // Email bank + silently BCC admins
        await sendConfirmationEmailWithAdminBcc({
            to: bank.contactEmail,
            subject: `PayVerify • Registration received for ${bank.bankName}`,
            title: `Thanks, ${bank.contactPerson || 'there'}!`,
            body: `We’ve received your bank registration for <strong>${bank.bankName}</strong>.<br/>
             Status: <strong>Pending approval</strong>. Our team will review and notify you once approved.
             <br/><br/><small>Ref: Bank #${bank.id} • Submitted ${new Date(
                bank.createdAt!
            ).toLocaleString()}</small>`,
            ctaUrl: `${process.env.APP_BASE_URL || ''}/bank-login`,
            ctaLabel: 'Bank Login',
        });

        return res.status(201).json({ message: 'Bank registration submitted', bank });
    } catch (error) {
        console.error('Error in registerBank:', error);
        return res.status(500).json({ error: 'Failed to register bank' });
    }
};

// Rest (unchanged)
export const getPendingBanks = async (_req: Request, res: Response) => {
    try {
        const banks = await Bank.findAll({ where: { status: 'Pending' } });
        return res.status(200).json(banks);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch pending banks' });
    }
};

export const approveBank = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const bank = await Bank.findByPk(id);
        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        bank.status = 'Active';
        await bank.save();

        await sendConfirmationEmail(
            bank.contactEmail,
            'Your Bank Has Been Approved',
            getApprovalEmailTemplate(bank.bankName, bank.contactPerson)
        );

        return res.status(200).json({ message: 'Bank approved and notified', bank });
    } catch (error) {
        console.error('Error in approveBank:', error);
        return res.status(500).json({ error: 'Error approving bank' });
    }
};

export const rejectBank = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const bank = await Bank.findByPk(id);
        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        bank.status = 'Rejected';
        await bank.save();

        const subject = 'Your Bank Registration was not Approved';
        const html = `
      <p>Hello ${bank.contactPerson},</p>
      <p>Thank you for applying to PayVerify on behalf of <strong>${bank.bankName}</strong>.
      After review, we’re unable to approve this registration at this time.</p>
      <p>If you have additional documents or questions, please reply to this email and our team will assist.</p>
      <p>— PayVerify Team</p>
    `;

        await sendConfirmationEmail(bank.contactEmail, subject, html);

        return res.status(200).json({ message: 'Bank rejected and notified', bank });
    } catch (error) {
        console.error('Error in rejectBank:', error);
        return res.status(500).json({ error: 'Error rejecting bank' });
    }
};
