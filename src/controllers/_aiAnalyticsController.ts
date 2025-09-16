// src/controllers/analyticsController.ts
// --------------------------------------------------------------------------------------
// All analytics endpoints in one place:
//  - getTransactionsSummary: time-bucketed series for charts
//  - getDashboardTiles: KPIs shown on the dashboard
//  - getFraudBreakdown: counts of refunds/disputes + quick stats
//  - getFraudBreakdownTransactions: drilldown list for the fraud modal
//  - getAiInsights: OpenAI-backed insights (falls back to 501 if no key)
//
// WHAT CHANGED (and why)
// - Unified TS-safe row parsing (no "c does not exist on type" errors).
// - Role-aware scoping helper (admin can pass merchantId; users are auto-scoped).
// - AI Insights uses OpenAI if OPENAI_API_KEY is present; else 501 so your
//   AiInsightsPanel hides itself just like your existing code expects.
// --------------------------------------------------------------------------------------

import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db';
import OpenAI from 'openai';

// ---------- helpers ---------------------------------------------------------------

const asNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function isAdmin(req: Request) {
    return String((req as any)?.user?.role || '').toLowerCase() === 'admin';
}
function getUserId(req: Request): number | null {
    const id = (req as any)?.user?.id;
    return Number.isFinite(Number(id)) ? Number(id) : null;
}

function buildScope(req: Request, alias = 't') {
    const admin = isAdmin(req);
    const userId = getUserId(req);
    const mId = Number((req.query.merchantId as any) ?? NaN);

    let where = 'WHERE 1=1';
    const repl: Record<string, any> = {};

    // We always JOIN merchants m ON m.id = t."merchantId"
    if (admin && Number.isFinite(mId)) {
        where += ` AND ${alias}."merchantId" = :mId`;
        repl.mId = mId;
    } else if (!admin && userId) {
        where += ` AND m."userId" = :uId`;
        repl.uId = userId;
    }
    return { where, repl };
}

function asFirstRow<T = any>(rows: unknown): T {
    return (Array.isArray(rows) ? rows[0] : rows) as T;
}

// ---------- getTransactionsSummary ----------------------------------------------

export async function getTransactionsSummary(req: Request, res: Response) {
    try {
        const interval = String(req.query.interval || 'day').toLowerCase(); // day|week|month
        const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : new Date(Date.now() - 30 * 864e5);
        const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : new Date();

        const bucketExpr =
            interval === 'month'
                ? `to_char(date_trunc('month', t."createdAt"), 'YYYY-MM')`
                : interval === 'week'
                    ? `to_char(date_trunc('week',  t."createdAt"), 'IYYY-IW')`
                    : `to_char(date_trunc('day',   t."createdAt"), 'YYYY-MM-DD')`;

        const { where, repl } = buildScope(req, 't');

        const rows = (await sequelize.query(
            `
      SELECT
        ${bucketExpr} AS bucket,
        COUNT(*)::int                 AS count,
        COALESCE(SUM(t.amount),0)::numeric AS total_amount
      FROM transactions t
      JOIN merchants m ON m.id = t."merchantId"
      ${where}
        AND t."createdAt" >= :from AND t."createdAt" < :to
      GROUP BY 1
      ORDER BY 1
      `,
            { type: QueryTypes.SELECT, replacements: { ...repl, from: dateFrom, to: dateTo } }
        )) as Array<{ bucket: string; count: number; total_amount: string | number }>;

        const series = rows.map((r) => ({
            bucket: r.bucket,
            count: asNum(r.count),
            totalAmount: asNum(r.total_amount),
        }));

        return res.json({
            series,
            meta: {
                interval,
                dateFrom: dateFrom.toISOString(),
                dateTo: dateTo.toISOString(),
                role: isAdmin(req) ? 'admin' : 'user',
                merchantId: Number(req.query.merchantId) || null,
            },
        });
    } catch (err) {
        console.error('[getTransactionsSummary] error:', err);
        return res.status(500).json({ message: 'Failed to load summary' });
    }
}

// ---------- getDashboardTiles ----------------------------------------------------

export async function getDashboardTiles(req: Request, res: Response) {
    try {
        const { where, repl } = buildScope(req, 't');

        // High-value threshold (₦)
        const HV_THRESHOLD = 500_000;

        // Pull the various KPIs in one round-trip
        const [totalRow, completedRow, pendingRow, sumRow, gmvTodayRow, gmvMtdRow, aovRow, highValRow] =
            await Promise.all([
                sequelize.query(
                    `SELECT COUNT(*)::int c FROM transactions t
           JOIN merchants m ON m.id = t."merchantId"
           ${where}`,
                    { type: QueryTypes.SELECT, replacements: { ...repl } }
                ),
                sequelize.query(
                    `SELECT COUNT(*)::int c FROM transactions t
           JOIN merchants m ON m.id = t."merchantId"
           ${where} AND t.status = 'Completed'`,
                    { type: QueryTypes.SELECT, replacements: { ...repl } }
                ),
                sequelize.query(
                    `SELECT COUNT(*)::int c FROM transactions t
           JOIN merchants m ON m.id = t."merchantId"
           ${where} AND t.status = 'Pending'`,
                    { type: QueryTypes.SELECT, replacements: { ...repl } }
                ),
                sequelize.query(
                    `SELECT COALESCE(SUM(t.amount),0)::numeric s FROM transactions t
           JOIN merchants m ON m.id = t."merchantId"
           ${where}`,
                    { type: QueryTypes.SELECT, replacements: { ...repl } }
                ),
                sequelize.query(
                    `SELECT COALESCE(SUM(t.amount),0)::numeric s FROM transactions t
           JOIN merchants m ON m.id = t."merchantId"
           ${where} AND t."createdAt"::date = NOW()::date`,
                    { type: QueryTypes.SELECT, replacements: { ...repl } }
                ),
                sequelize.query(
                    `SELECT COALESCE(SUM(t.amount),0)::numeric s FROM transactions t
           JOIN merchants m ON m.id = t."merchantId"
           ${where} AND date_trunc('month', t."createdAt") = date_trunc('month', NOW())`,
                    { type: QueryTypes.SELECT, replacements: { ...repl } }
                ),
                sequelize.query(
                    `SELECT COALESCE(AVG(t.amount),0)::numeric a FROM transactions t
           JOIN merchants m ON m.id = t."merchantId"
           ${where} AND t.status = 'Completed'`,
                    { type: QueryTypes.SELECT, replacements: { ...repl } }
                ),
                sequelize.query(
                    `SELECT COUNT(*)::int c FROM transactions t
           JOIN merchants m ON m.id = t."merchantId"
           ${where}
             AND date_trunc('month', t."createdAt") = date_trunc('month', NOW())
             AND t.amount >= :hv`,
                    { type: QueryTypes.SELECT, replacements: { ...repl, hv: HV_THRESHOLD } }
                ),
            ]);

        const total = asNum(asFirstRow(totalRow as any)?.c);
        const completed = asNum(asFirstRow(completedRow as any)?.c);
        const pending = asNum(asFirstRow(pendingRow as any)?.c);
        const sum = asNum(asFirstRow(sumRow as any)?.s);
        const gmvToday = asNum(asFirstRow(gmvTodayRow as any)?.s);
        const gmvMonthToDate = asNum(asFirstRow(gmvMtdRow as any)?.s);
        const aov = asNum(asFirstRow(aovRow as any)?.a);
        const highValueMonthCount = asNum(asFirstRow(highValRow as any)?.c);
        const successRate = total ? Math.round((completed / total) * 100) : 0;

        // Fraud score is computed by the modal; return 0 here
        return res.json({
            tiles: {
                gmvTotal: sum,
                aov,
                successRate,
                pending,
                gmvToday,
                gmvMonthToDate,
                highValueMonthCount,
                fraudScore: 0,
            },
        });
    } catch (err) {
        console.error('[getDashboardTiles] error:', err);
        return res.status(500).json({ message: 'Failed to load tiles' });
    }
}

// ---------- getFraudBreakdown ----------------------------------------------------

export async function getFraudBreakdown(req: Request, res: Response) {
    try {
        const windowDays = Math.max(1, Number(req.query.windowDays || 30));
        const dateTo = new Date();
        const dateFrom = new Date(dateTo.getTime() - windowDays * 864e5);
        const { where, repl } = buildScope(req, 't');

        // Refunds snapshot
        const refunds = await sequelize.query(
            `
      SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(CASE WHEN r.status='succeeded' THEN 1 ELSE 0 END),0)::int AS succeeded,
        COALESCE(SUM(CASE WHEN r.status='pending'   THEN 1 ELSE 0 END),0)::int AS pending,
        COALESCE(SUM(CASE WHEN r.status='failed'    THEN 1 ELSE 0 END),0)::int AS failed,
        COALESCE(SUM(CASE WHEN r.status='reversed'  THEN 1 ELSE 0 END),0)::int AS reversed
      FROM refunds r
      JOIN transactions t ON t.id = r.transaction_id
      JOIN merchants m   ON m.id = t."merchantId"
      ${where}
        AND t."createdAt" >= :from AND t."createdAt" < :to
      `,
            { type: QueryTypes.SELECT, replacements: { ...repl, from: dateFrom, to: dateTo } }
        );

        const r = asFirstRow<any>(refunds);
        const refundRate = await (async () => {
            const row = await sequelize.query(
                `SELECT COUNT(*)::int c FROM transactions t
         JOIN merchants m ON m.id = t."merchantId"
         ${where}
           AND t."createdAt" >= :from AND t."createdAt" < :to`,
                { type: QueryTypes.SELECT, replacements: { ...repl, from: dateFrom, to: dateTo } }
            );
            const txCount = asNum(asFirstRow<any>(row)?.c);
            const rate = txCount ? (asNum(r?.total) / txCount) * 100 : 0;
            return Number(rate.toFixed(2));
        })();

        // Disputes snapshot
        const disputes = await sequelize.query(
            `
      SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(CASE WHEN d.status='open'     THEN 1 ELSE 0 END),0)::int AS open,
        COALESCE(SUM(CASE WHEN d.status='won'      THEN 1 ELSE 0 END),0)::int AS won,
        COALESCE(SUM(CASE WHEN d.status='lost'     THEN 1 ELSE 0 END),0)::int AS lost,
        COALESCE(SUM(CASE WHEN d.status='canceled' THEN 1 ELSE 0 END),0)::int AS canceled
      FROM disputes d
      JOIN transactions t ON t.id = d.transaction_id
      JOIN merchants m   ON m.id = t."merchantId"
      ${where}
        AND t."createdAt" >= :from AND t."createdAt" < :to
      `,
            { type: QueryTypes.SELECT, replacements: { ...repl, from: dateFrom, to: dateTo } }
        );

        // Top “risk” merchants (by disputes count)
        const topRisk = await sequelize.query(
            `
      SELECT m.id AS "merchantId", m.name, COUNT(*)::int AS disputes
      FROM disputes d
      JOIN transactions t ON t.id = d.transaction_id
      JOIN merchants m   ON m.id = t."merchantId"
      ${where}
        AND t."createdAt" >= :from AND t."createdAt" < :to
      GROUP BY m.id, m.name
      ORDER BY disputes DESC, m.name ASC
      LIMIT 5;
      `,
            { type: QueryTypes.SELECT, replacements: { ...repl, from: dateFrom, to: dateTo } }
        );

        return res.json({
            windowDays,
            refundRate,
            refunds: asFirstRow(refunds),
            disputes: asFirstRow(disputes),
            topRiskMerchants: topRisk,
        });
    } catch (err) {
        console.error('[getFraudBreakdown] error:', err);
        return res.status(500).json({ message: 'Failed to load fraud breakdown' });
    }
}

// ---------- getFraudBreakdownTransactions (drilldown) ----------------------------

export async function getFraudBreakdownTransactions(req: Request, res: Response) {
    try {
        const type = String(req.query.type || '').toLowerCase(); // refunds | disputes
        const status = req.query.status ? String(req.query.status) : null;
        const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
        const windowDays = Math.max(1, Number(req.query.windowDays || 30));
        const dateTo = new Date();
        const dateFrom = new Date(dateTo.getTime() - windowDays * 864e5);
        const { where, repl } = buildScope(req, 't');

        if (type !== 'refunds' && type !== 'disputes') {
            return res.status(400).json({ message: "Query param 'type' must be 'refunds' or 'disputes'." });
        }

        if (type === 'refunds') {
            const rows = await sequelize.query(
                `
        SELECT
          r.id, r.status, r.amount,
          t.id AS "transactionId", t.reference, t.amount AS "txAmount", t."createdAt",
          m.id AS "merchantId", m.name AS "merchantName"
        FROM refunds r
        JOIN transactions t ON t.id = r.transaction_id
        JOIN merchants m   ON m.id = t."merchantId"
        ${where}
          AND t."createdAt" >= :from AND t."createdAt" < :to
          ${status ? 'AND r.status = :status' : ''}
        ORDER BY r.created_at DESC
        LIMIT :limit
        `,
                { type: QueryTypes.SELECT, replacements: { ...repl, from: dateFrom, to: dateTo, status, limit } }
            );
            return res.json({ kind: 'refunds', rows });
        }

        const rows = await sequelize.query(
            `
      SELECT
        d.id, d.status, d.amount, d.reason_code,
        t.id AS "transactionId", t.reference, t.amount AS "txAmount", t."createdAt",
        m.id AS "merchantId", m.name AS "merchantName"
      FROM disputes d
      JOIN transactions t ON t.id = d.transaction_id
      JOIN merchants m   ON m.id = t."merchantId"
      ${where}
        AND t."createdAt" >= :from AND t."createdAt" < :to
        ${status ? 'AND d.status = :status' : ''}
      ORDER BY d.opened_at DESC
      LIMIT :limit
      `,
            { type: QueryTypes.SELECT, replacements: { ...repl, from: dateFrom, to: dateTo, status, limit } }
        );
        return res.json({ kind: 'disputes', rows });
    } catch (err) {
        console.error('[getFraudBreakdownTransactions] error:', err);
        return res.status(500).json({ message: 'Failed to load drilldown list' });
    }
}

// ---------- getAiInsights (OpenAI-backed) ---------------------------------------

export async function getAiInsights(req: Request, res: Response) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            // Your AiInsightsPanel expects 501 to hide itself
            return res.status(501).json({ message: 'AI not configured' });
        }

        const windowDays = Math.max(1, Number(req.query.windowDays || 30));
        const dateTo = new Date();
        const dateFrom = new Date(dateTo.getTime() - windowDays * 864e5);
        const { where, repl } = buildScope(req, 't');

        // compact stats the model can reason over
        const stats = asFirstRow<any>(
            await sequelize.query(
                `
        WITH
          tx AS (
            SELECT COUNT(*)::int c, COALESCE(SUM(t.amount),0)::numeric s
            FROM transactions t
            JOIN merchants m ON m.id = t."merchantId"
            ${where} AND t."createdAt" >= :from AND t."createdAt" < :to
          ),
          rf AS (
            SELECT COUNT(*)::int c, COALESCE(SUM(CASE WHEN r.status='succeeded' THEN r.amount ELSE 0 END),0)::numeric s
            FROM refunds r
            JOIN transactions t ON t.id = r.transaction_id
            JOIN merchants m   ON m.id = t."merchantId"
            ${where} AND t."createdAt" >= :from AND t."createdAt" < :to
          ),
          dp AS (
            SELECT COUNT(*)::int c
            FROM disputes d
            JOIN transactions t ON t.id = d.transaction_id
            JOIN merchants m   ON m.id = t."merchantId"
            ${where} AND t."createdAt" >= :from AND t."createdAt" < :to
          ),
          loss90 AS (
            SELECT COALESCE(SUM(amount),0)::numeric s
            FROM disputes d
            JOIN transactions t ON t.id = d.transaction_id
            JOIN merchants m   ON m.id = t."merchantId"
            ${where}
              AND d.status='lost'
              AND t."createdAt" >= (NOW() - INTERVAL '90 days')
          )
        SELECT
          (SELECT c FROM tx)      AS tx_count,
          (SELECT s FROM tx)      AS tx_sum,
          (SELECT c FROM rf)      AS refunds_count,
          (SELECT s FROM rf)      AS refunds_sum,
          (SELECT c FROM dp)      AS disputes_count,
          (SELECT s FROM loss90)  AS loss_sum_90d
        `,
                { type: QueryTypes.SELECT, replacements: { ...repl, from: dateFrom, to: dateTo } }
            )
        );

        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

        const prompt = `
You are a payments risk analyst. Given the JSON stats, produce **at most 5** concise insights and **1–3** specific actions.
Focus on anomalies (refund/dispute pressure, sudden GMV change, high-value concentration).
Return ONLY valid JSON with the exact shape:
{
  "insights": [ { "title": string, "detail": string } ],
  "actions": [ string ]
}

Stats: ${JSON.stringify(stats)}
    `.trim();

        const resp = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }],
        });

        const raw = resp.choices?.[0]?.message?.content?.trim() || '{}';

        // robust JSON parse (strip leading code fences if any)
        let parsed: any;
        try {
            const jsonText = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
            parsed = JSON.parse(jsonText);
        } catch {
            parsed = { insights: [{ title: 'Summary', detail: raw }], actions: [] };
        }

        return res.json({
            stats,
            insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 5) : [],
            actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 3) : [],
        });
    } catch (err) {
        console.error('[getAiInsights] error:', err);
        return res.status(500).json({ message: 'Failed to generate AI insights' });
    }
}
