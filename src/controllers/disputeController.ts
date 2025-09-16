import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db';

const ALLOWED = new Set(['open', 'won', 'lost', 'canceled']);

export async function createDispute(req: Request, res: Response) {
    try {
        const transactionId = Number(req.params.transactionId);
        const { amount, reason_code } = req.body;

        if (!transactionId || !amount) {
            return res.status(400).json({ message: 'transactionId and amount are required' });
        }

        const [row]: any[] = await sequelize.query(
            `
      INSERT INTO disputes (transaction_id, amount, reason_code)
      VALUES (:tx, :amount, :rc)
      RETURNING id, transaction_id, amount, reason_code, status, opened_at, closed_at, created_at, updated_at
      `,
            {
                replacements: { tx: transactionId, amount, rc: reason_code ?? null },
                type: QueryTypes.SELECT,
            }
        );

        return res.status(201).json(row);
    } catch (err: any) {
        // If unique index blocks a second OPEN dispute:
        if (String(err?.message || '').includes('disputes_one_open_per_tx')) {
            return res.status(409).json({ message: 'There is already an open dispute for this transaction' });
        }
        console.error('[createDispute] error', err);
        return res.status(500).json({ message: 'Failed to create dispute' });
    }
}

export async function listDisputesForTransaction(req: Request, res: Response) {
    try {
        const transactionId = Number(req.params.transactionId);
        const rows = await sequelize.query(
            `
      SELECT id, transaction_id, amount, reason_code, status, opened_at, closed_at, created_at, updated_at
      FROM disputes
      WHERE transaction_id = :tx
      ORDER BY opened_at DESC
      `,
            { replacements: { tx: transactionId }, type: QueryTypes.SELECT }
        );
        return res.json(rows);
    } catch (err: any) {
        console.error('[listDisputesForTransaction] error', err);
        return res.status(500).json({ message: 'Failed to fetch disputes' });
    }
}

export async function updateDisputeStatus(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        const { status } = req.body as { status: string };

        if (!ALLOWED.has(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const [row]: any[] = await sequelize.query(
            `
      UPDATE disputes
      SET status = :status,
          closed_at = CASE WHEN :status IN ('won','lost','canceled') THEN NOW() ELSE closed_at END
      WHERE id = :id
      RETURNING id, transaction_id, amount, reason_code, status, opened_at, closed_at, created_at, updated_at
      `,
            { replacements: { status, id }, type: QueryTypes.SELECT }
        );

        if (!row) return res.status(404).json({ message: 'Dispute not found' });
        return res.json(row);
    } catch (err: any) {
        console.error('[updateDisputeStatus] error', err);
        return res.status(500).json({ message: 'Failed to update dispute' });
    }
}
