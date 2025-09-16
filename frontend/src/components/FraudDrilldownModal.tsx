import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type Kind = 'refunds' | 'disputes';

type Props = {
    open: boolean;
    onClose: () => void;
    kind: Kind;
    status?: string;      // optional filter (e.g., 'succeeded' or 'lost')
    title: string;        // heading to show
};

type PageResp = {
    total: number;
    page: number;
    pageSize: number;
    items: any[];
};

export default function FraudDrilldownModal({ open, onClose, kind, status, title }: Props) {
    const { token } = useAuth();
    const [data, setData] = useState<PageResp | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!open) return;
        const run = async () => {
            if (!token) return;
            setLoading(true);
            setErr(null);
            try {
                const params: any = { page, pageSize: 20 };
                if (status) params.status = status;
                const url = kind === 'refunds' ? '/analytics/fraud/refunds' : '/analytics/fraud/disputes';
                const res = await api.get<PageResp>(url, {
                    params,
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(res.data);
            } catch (e: any) {
                setErr(e?.response?.data?.message || e?.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [open, token, kind, status, page]);

    if (!open) return null;

    const total = data?.total ?? 0;
    const items = data?.items || [];
    const totalPages = Math.max(1, Math.ceil(total / 20));

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1070 }} />
            <div
                role="dialog"
                aria-modal="true"
                style={{
                    position: 'fixed',
                    top: '8vh',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90vw',
                    maxWidth: 1100,
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
                <div className="p-3 d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                    <h5 className="mb-0">{title}</h5>
                    <button className="btn btn-outline-light btn-sm" onClick={onClose}>Close</button>
                </div>

                <div className="p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {err && <div className="alert alert-danger">{err}</div>}
                    {!err && (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <div className="opacity-75">
                                    Total: {total.toLocaleString()} • Page {page} of {totalPages}
                                </div>
                                <div className="btn-group">
                                    <button className="btn btn-outline-light btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                                    <button className="btn btn-outline-light btn-sm" disabled={page >= totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-sm table-dark table-striped align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th>Merchant</th>
                                            <th>Txn Ref</th>
                                            <th>Txn Date</th>
                                            {kind === 'refunds' ? (
                                                <>
                                                    <th>Refund Amt</th>
                                                    <th>Status</th>
                                                    <th>Reason</th>
                                                    <th>Processed At</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th>Dispute Amt</th>
                                                    <th>Status</th>
                                                    <th>Reason</th>
                                                    <th>Opened</th>
                                                    <th>Closed</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && (
                                            <tr><td colSpan={8} className="opacity-75">Loading…</td></tr>
                                        )}
                                        {!loading && items.length === 0 && (
                                            <tr><td colSpan={8} className="opacity-75">No rows.</td></tr>
                                        )}
                                        {!loading && items.map((r: any, i: number) => (
                                            <tr key={i}>
                                                <td>{r.merchant_name} (#{r.merchant_id})</td>
                                                <td>{r.transaction_reference ?? `#${r.transaction_id}`}</td>
                                                <td>{r.transaction_created_at ? new Date(r.transaction_created_at).toLocaleString() : '-'}</td>

                                                {kind === 'refunds' ? (
                                                    <>
                                                        <td>₦{Number(r.refund_amount || 0).toLocaleString()}</td>
                                                        <td>{r.refund_status}</td>
                                                        <td>{r.refund_reason ?? '-'}</td>
                                                        <td>{r.refund_processed_at ? new Date(r.refund_processed_at).toLocaleString() : '-'}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td>₦{Number(r.dispute_amount || 0).toLocaleString()}</td>
                                                        <td>{r.dispute_status}</td>
                                                        <td>{r.dispute_reason_code ?? '-'}</td>
                                                        <td>{r.dispute_opened_at ? new Date(r.dispute_opened_at).toLocaleString() : '-'}</td>
                                                        <td>{r.dispute_closed_at ? new Date(r.dispute_closed_at).toLocaleString() : '-'}</td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
