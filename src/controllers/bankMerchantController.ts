// src/controllers/bankMerchantController.ts
import { Request, Response } from 'express';
import { Merchant } from '../models/Merchant';
import AuditLog from '../models/Auditlog'; // <-- use your model with .record()

function getBankCtx(req: Request) {
    const anyReq = req as any;
    return {
        bankId: anyReq.bank?.id as number | undefined,
        actorId: (anyReq.bankUser?.id ?? anyReq.user?.id ?? anyReq.bank?.id) as number | undefined,
    };
}

// GET /api/bank/merchants/pending
export async function listPendingMerchantsForBank(req: Request, res: Response) {
    const { bankId } = getBankCtx(req);
    if (!bankId) return res.status(403).json({ message: 'Forbidden: missing bankId' });

    const rows = await Merchant.findAll({
        where: { bankId, status: 'pending' },
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'name', 'status', 'createdAt'],
    });

    // keep frontend shape (businessName)
    const mapped = rows.map(r => ({
        id: r.id,
        businessName: r.name,
        status: r.status,
        createdAt: r.createdAt,
    }));

    return res.json(mapped);
}

// POST /api/bank/merchants/:id/approve
export async function approveMerchant(req: Request, res: Response) {
    const { bankId, actorId } = getBankCtx(req);
    if (!bankId || !actorId) return res.status(403).json({ message: 'Forbidden' });

    const merchantId = Number(req.params.id);
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) return res.status(404).json({ message: 'Merchant not found' });
    if (merchant.bankId !== bankId) return res.status(403).json({ message: 'Not your merchant' });

    const oldStatus = merchant.status;
    merchant.status = 'approved';
    await merchant.save();

    await AuditLog.record(
        'merchant.approved',           // action
        'Merchant',                    // entity
        `bank:${bankId}`,              // performedBy (string per your model)
        undefined,                     // paymentId (not applicable here)
        { merchantId, oldStatus, newStatus: 'approved' } // metadata (JSONB)
    );

    return res.json({ message: 'Merchant approved', merchant });
}

// POST /api/bank/merchants/:id/reject
export async function rejectMerchant(req: Request, res: Response) {
    const { bankId, actorId } = getBankCtx(req);
    if (!bankId || !actorId) return res.status(403).json({ message: 'Forbidden' });

    const merchantId = Number(req.params.id);
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) return res.status(404).json({ message: 'Merchant not found' });
    if (merchant.bankId !== bankId) return res.status(403).json({ message: 'Not your merchant' });

    const oldStatus = merchant.status;
    merchant.status = 'rejected';
    await merchant.save();

    await AuditLog.record(
        'merchant.rejected',
        'Merchant',
        `bank:${bankId}`,
        undefined,
        { merchantId, oldStatus, newStatus: 'rejected' }
    );

    return res.json({ message: 'Merchant rejected', merchant });
}
