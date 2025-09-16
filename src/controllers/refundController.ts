// src/controllers/refundController.ts
// -----------------------------------------------------------------------------
// Refunds controller (raw SQL with sequelize.query)
//
// What changed & why
// - ✅ Strong, safe typing of sequelize.query result using a tuple cast
//   to avoid TS2352 (“Conversion of 'undefined' to 'any[]' ...”).
// - ✅ Narrow, explicit parsing/validation of params.
// - ✅ Consistent column names (processed_at / created_at / updated_at).
// - ✅ Graceful 4xx messages instead of silent failures.
// -----------------------------------------------------------------------------

import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { QueryTypes } from 'sequelize';

// Shape of a row we RETURN from INSERT/SELECT
type RefundRow = {
    id: number;
    transaction_id: number;
    amount: string | number;     // numeric comes back as string in pg
    reason: string | null;
    status: 'pending' | 'succeeded' | 'failed' | 'reversed';
    processed_at: string;        // ISO timestamp from DB
    created_at: string;
    updated_at: string;
};

// INSERT returns [rows, metadata] when using Postgres + RETURNING
type InsertTuple = [RefundRow[], unknown];

/**
 * POST /api/transactions/:transactionId/refunds
 * body: { amount: number, reason?: string }
 */
export const createRefund = async (req: Request, res: Response) => {
    const txId = Number(req.params.transactionId);
    const amount = Number(req.body?.amount);
    const reason = (req.body?.reason ?? '').toString().trim() || null;

    if (!Number.isInteger(txId) || txId <= 0) {
        return res.status(400).json({ message: 'Invalid transaction id' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }

    try {
        const created = await sequelize.query(
            `
      INSERT INTO refunds (transaction_id, amount, reason)
      VALUES (:txId, :amount, :reason)
      RETURNING id, transaction_id, amount, reason, status, processed_at, created_at, updated_at
      `,
            {
                type: QueryTypes.INSERT,
                // @ts-expect-error — INSERT + RETURNING returns [rows, meta] in pg
                returning: true,
                replacements: { txId, amount, reason },
            }
        );

        // ✅ Safe, explicit tuple cast (prevents TS2352)
        const [rows] = created as unknown as InsertTuple;
        const refund = Array.isArray(rows) && rows.length ? rows[0] : null;

        return res
            .status(201)
            .json({ message: 'Refund created', refund });
    } catch (err: any) {
        console.error('[createRefund] error:', err);
        return res.status(500).json({ message: 'Failed to create refund' });
    }
};

/**
 * GET /api/transactions/:transactionId/refunds
 */
export const listRefundsForTransaction = async (req: Request, res: Response) => {
    const txId = Number(req.params.transactionId);
    if (!Number.isInteger(txId) || txId <= 0) {
        return res.status(400).json({ message: 'Invalid transaction id' });
    }

    try {
        const rows = await sequelize.query(
            `
      SELECT id, transaction_id, amount, reason, status, processed_at, created_at, updated_at
      FROM refunds
      WHERE transaction_id = :txId
      ORDER BY created_at DESC
      `,
            {
                type: QueryTypes.SELECT,
                replacements: { txId },
            }
        );

        // SELECT returns unknown[]; narrow it for the response type
        const refunds = rows as RefundRow[];
        return res.json({ refunds, count: refunds.length });
    } catch (err: any) {
        console.error('[listRefundsForTransaction] error:', err);
        return res.status(500).json({ message: 'Failed to fetch refunds' });
    }
};
