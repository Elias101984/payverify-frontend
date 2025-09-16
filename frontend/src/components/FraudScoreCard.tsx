// src/components/FraudScoreCard.tsx
// -----------------------------------------------------------------------------
// Shows a Fraud Score tile and opens a details modal.
// FIXES:
// - Uses `refunds.ratePercent` from /analytics/fraud-breakdown (the old prop
//   `refundRateDays` no longer exists).
// - Self-fetches data; no props required.
// - Defensive rendering so missing fields never crash the page.
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type Breakdown = {
    windowDays: number;
    score: number;
    refunds: {
        total: number;
        pending: number;
        succeeded: number;
        failed: number;
        reversed: number;
        ratePercent: number;
    };
    disputes: {
        total: number;
        open: number;
        won: number;
        lost: number;
        canceled: number;
    };
    topRisks: { merchantId: number; name: string; disputes: number }[];
};

const FraudScoreCard = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [data, setData] = useState<Breakdown | null>(null);

    useEffect(() => {
        let mounted = true;

        const run = async () => {
            if (!token) return;
            setLoading(true);
            setErr(null);
            try {
                const res = await api.get<Breakdown>('/analytics/fraud-breakdown', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!mounted) return;
                setData(res.data);
            } catch (e: any) {
                if (!mounted) return;
                setErr(e?.response?.data?.message || e?.message || 'Failed to fetch fraud breakdown');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        run();
        return () => {
            mounted = false;
        };
    }, [token]);

    const score = data?.score ?? 0;
    const rate = data?.refunds?.ratePercent ?? 0;

    return (
        <>
            <button
                className="pv-gloss-gradient pv-glass-card pv-fraud w-100 text-start"
                onClick={() => setOpen(true)}
                aria-label="View fraud breakdown"
                style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
                disabled={loading}
            >
                <div className="pv-card-body">
                    <div className="pv-tile-title">Fraud Score</div>
                    <div className="pv-tile-value">{loading ? '—' : score}</div>
                    <div className="pv-tile-desc">
                        {loading ? 'Loading…' : `Refund rate: ${rate}% • Click for details`}
                    </div>
                </div>
            </button>

            {open && (
                <>
                    <div
                        onClick={() => setOpen(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1070 }}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        style={{
                            position: 'fixed',
                            top: '10vh',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 680,
                            maxWidth: '95vw',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            color: '#e9f2ff',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 16,
                            boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
                            zIndex: 1080,
                        }}
                    >
                        <div
                            className="p-3 d-flex justify-content-between align-items-center"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}
                        >
                            <h5 className="mb-0">Fraud Breakdown</h5>
                            <button className="btn btn-outline-light btn-sm" onClick={() => setOpen(false)}>
                                Close
                            </button>
                        </div>

                        <div className="p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {err && (
                                <div className="alert alert-danger" role="alert">
                                    {err}
                                </div>
                            )}

                            {!err && !data && <div className="text-light opacity-75">Loading…</div>}

                            {!err && data && (
                                <>
                                    <div className="mb-3">
                                        <div className="text-uppercase opacity-75" style={{ fontSize: '.8rem' }}>
                                            Score Window
                                        </div>
                                        <div>
                                            Last {data.windowDays} day{data.windowDays === 1 ? '' : 's'}
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col-sm-6 mb-3">
                                            <div className="pv-glass-card p-3 h-100">
                                                <div className="text-uppercase opacity-75" style={{ fontSize: '.8rem' }}>
                                                    Refunds
                                                </div>
                                                <ul className="mb-0">
                                                    <li>Total: {data.refunds.total}</li>
                                                    <li>Rate: {data.refunds.ratePercent}%</li>
                                                    <li>Pending: {data.refunds.pending}</li>
                                                    <li>Succeeded: {data.refunds.succeeded}</li>
                                                    <li>Failed: {data.refunds.failed}</li>
                                                    <li>Reversed: {data.refunds.reversed}</li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="col-sm-6 mb-3">
                                            <div className="pv-glass-card p-3 h-100">
                                                <div className="text-uppercase opacity-75" style={{ fontSize: '.8rem' }}>
                                                    Disputes
                                                </div>
                                                <ul className="mb-0">
                                                    <li>Total: {data.disputes.total}</li>
                                                    <li>Open: {data.disputes.open}</li>
                                                    <li>Won: {data.disputes.won}</li>
                                                    <li>Lost: {data.disputes.lost}</li>
                                                    <li>Canceled: {data.disputes.canceled}</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-2">
                                        <div className="text-uppercase opacity-75" style={{ fontSize: '.8rem' }}>
                                            Top Risk Merchants
                                        </div>
                                        {data.topRisks?.length ? (
                                            <ol className="mb-0">
                                                {data.topRisks.map(r => (
                                                    <li key={r.merchantId}>
                                                        {r.name} — {r.disputes} dispute{r.disputes === 1 ? '' : 's'}
                                                    </li>
                                                ))}
                                            </ol>
                                        ) : (
                                            <div className="opacity-75">No high-risk merchants in this window.</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default FraudScoreCard;
