// src/pages/TransactionsPage.tsx
// ------------------------------------------------------------------------------------------
// Enhanced Transactions Page (Inline-styled "glassy" theme)
//
// ✅ What changed (presentation-only):
// 1) Chart polish: soft brand color + gradient fill for the area chart (clearer, on-theme).
// 2) KPI strip: quick GMV/Completed/Pending/Failed for the CURRENT TABLE PAGE (no extra calls).
// 3) Clickable reference: each ref links to /transactions/:reference (drill-down).
// 4) Export CSV: one-click CSV export of the VISIBLE rows (current page only).
//
// ⚠️ No API endpoints, auth flows, or data wiring changed.
// ------------------------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // ⬅️ Link added for clickable refs
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { saveAs } from 'file-saver'; // ⬅️ for Export CSV

// -------------------- Inline Theme Tokens / Helpers ---------------------------------------

const S = {
    // Page background (soft gradient + subtle radial tints)
    page: {
        minHeight: '100vh',
        background: `
      radial-gradient(900px 600px at 10% 110%, rgba(229,216,255,.17), transparent 60%),
      radial-gradient(800px 500px at 100% -10%, rgba(255,209,217,.17), transparent 60%),
      linear-gradient(180deg, #f7f7f9 0%, #f0f2f5 60%, #eef1f6 100%)
    `,
    } as React.CSSProperties,

    // Big frosted "sheet"
    stage: {
        background: 'rgba(255,255,255,.78)',
        border: '1px solid rgba(255,255,255,.8)',
        borderRadius: 24,
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        boxShadow: '0 50px 120px rgba(15,17,21,.12), 0 8px 22px rgba(15,17,21,.06)',
        padding: 28,
    } as React.CSSProperties,

    // Hero header
    kicker: {
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 700,
        color: '#2f2f35',
        background: '#f2f3f7',
        borderRadius: 999,
        padding: '6px 10px',
    } as React.CSSProperties,
    title: {
        fontWeight: 800,
        letterSpacing: '-.02em',
        lineHeight: 1.06,
        fontSize: 'clamp(28px, 4.5vw, 48px)',
        color: '#0f1115',
        margin: '4px 0 10px',
    } as React.CSSProperties,
    divider: {
        height: 3,
        background: '#ffd33f',
        borderRadius: 999,
        margin: '12px 0 4px',
    } as React.CSSProperties,
    subtle: { color: '#8b909a' } as React.CSSProperties,

    // Pills
    pillGroup: {
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        background: '#f3f4f7',
        padding: 6,
        borderRadius: 999,
    } as React.CSSProperties,
    pill: {
        border: 0,
        background: 'transparent',
        padding: '6px 14px',
        borderRadius: 999,
        fontWeight: 700,
        color: '#4a4f5a',
        cursor: 'pointer',
    } as React.CSSProperties,
    pillActive: {
        background: '#fff',
        boxShadow: '0 2px 8px rgba(15,17,21,.08)',
    } as React.CSSProperties,

    // Glass cards
    card: {
        backgroundColor: 'rgba(255,255,255,.75)',
        border: '1px solid rgba(255,255,255,.85)',
        borderRadius: 20,
        boxShadow: '0 10px 25px rgba(12,17,29,.06), 0 2px 6px rgba(12,17,29,.04)',
        backdropFilter: 'saturate(180%) blur(8px)',
        WebkitBackdropFilter: 'saturate(180%) blur(8px)',
    } as React.CSSProperties,

    // Forms
    input: { borderRadius: 14, borderColor: '#e6e8ef' } as React.CSSProperties,
    label: { fontWeight: 600, color: '#6c7280' } as React.CSSProperties,
    btnPrimary: { borderRadius: 999, paddingInline: 18, fontWeight: 700 } as React.CSSProperties,

    // Table polish
    th: { fontWeight: 700, color: '#6c7280', borderBottomColor: '#eceef3' } as React.CSSProperties,

    // Badges
    badgeSuccess: { background: '#00c389', color: '#fff', borderRadius: 999, padding: '0.5rem 0.7rem', fontWeight: 700 } as React.CSSProperties,
    badgeDanger: { background: '#ff6161', color: '#fff', borderRadius: 999, padding: '0.5rem 0.7rem', fontWeight: 700 } as React.CSSProperties,
    badgePending: { background: '#ffd66e', color: '#3b3b45', borderRadius: 999, padding: '0.5rem 0.7rem', fontWeight: 700 } as React.CSSProperties,
};

// -------------------- Types ---------------------------------------------------------------

type Tx = {
    id: number;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    reference: string;
    merchantId: number;
    createdAt: string;
    updatedAt: string;
    merchant?: { id: number; name: string };
};
type MerchantLite = { id: number; name: string };

type Interval = 'day' | 'week' | 'month';

type TableFilters = {
    status: 'all' | 'pending' | 'completed' | 'failed';
    merchantId: number | 'all';
    startDate?: string;
    endDate?: string;
    ref?: string;
};

/** Local chart types (Axis-style) */
type ChartPoint = { x: string | number | Date; y: number };
type ChartSeriesAxisLike = Array<{ name: string; data: Array<number | ChartPoint> }>;

// -------------------- Utils ----------------------------------------------------------------

const fmtNaira = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

// Export CSV for the VISIBLE rows (current page only) — small quality-of-life helper.
function exportCsv(rows: Tx[]) {
    const header = ['Date', 'Reference', 'Merchant', 'Amount', 'Status'];
    const lines = rows.map(r => [
        new Date(r.createdAt).toISOString(),
        r.reference,
        (r.merchant?.name ?? `#${r.merchantId}`).replace(/,/g, ' '),
        String(r.amount ?? 0),
        r.status,
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'transactions-page.csv');
}

// -------------------- Data hooks -----------------------------------------------------------

function useTransactionsData(
    isAdmin: boolean,
    token: string | undefined,
    filters: TableFilters
) {
    const [rows, setRows] = useState<Tx[]>([]);
    const [count, setCount] = useState(0);
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const endpoint = isAdmin ? '/transactions/admin' : '/transactions';
            const params: any = { limit, offset };

            if (filters.status !== 'all') params.status = filters.status;
            if (isAdmin && filters.merchantId !== 'all') params.merchantId = filters.merchantId;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.ref) params.ref = filters.ref;

            const res = await api.get(endpoint, {
                params,
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            const { rows: data, count: total } = res.data ?? { rows: [], count: 0 };
            setRows(Array.isArray(data) ? data : []);
            setCount(typeof total === 'number' ? total : 0);
        } catch (e: any) {
            console.error(e);
            setError(e?.response?.data?.message || 'Failed to load transactions');
            setRows([]);
            setCount(0);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, token, limit, offset, filters]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
    useEffect(() => { setOffset(0); }, [filters.status, filters.merchantId, filters.startDate, filters.endDate, filters.ref]);

    return { rows, count, limit, offset, loading, error, setLimit, setOffset, refetch: fetchTransactions };
}

function useAnalyticsData(isAdmin: boolean, token?: string) {
    const [series, setSeries] = useState<ChartSeriesAxisLike>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [interval, setInterval] = useState<Interval>('day');
    const [selectedMerchantId, setSelectedMerchantId] = useState<number | 'all'>('all');

    const fetchChart = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params: any = { interval };
            if (isAdmin && selectedMerchantId !== 'all') params.merchantId = selectedMerchantId;

            const res = await api.get('/analytics/transactions/summary', {
                params,
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            const pts: Array<{ date: string; totalAmount: number }> = res.data?.series ?? [];
            setSeries([{ name: 'Amount', data: pts.map((p) => ({ x: p.date, y: Number(p.totalAmount || 0) })) }]);
        } catch (e: any) {
            console.error(e);
            setError(e?.response?.data?.message || 'Failed to load analytics');
            setSeries([]);
        } finally {
            setLoading(false);
        }
    }, [interval, isAdmin, selectedMerchantId, token]);

    useEffect(() => { fetchChart(); }, [fetchChart]);

    return { series, loading, error, interval, setInterval, selectedMerchantId, setSelectedMerchantId, refetch: fetchChart };
}

function useMyMerchants(enabled: boolean, token?: string) {
    const [options, setOptions] = useState<MerchantLite[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    useEffect(() => {
        if (!enabled) return;
        (async () => {
            try {
                const res = await api.get('/me/merchants', {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                const list: MerchantLite[] = (res.data || []).map((m: any) => ({
                    id: m.id,
                    name: m.name || m.businessName || `#${m.id}`,
                }));
                setOptions(list);
                if (list.length === 1) setSelectedId(list[0].id);
            } catch (e) { console.error(e); }
        })();
    }, [enabled, token]);

    return { options, selectedId, setSelectedId };
}

// -------------------- Presentational bits ------------------------------------------------

function FiltersCard(props: {
    isAdmin: boolean;
    merchantOptions: MerchantLite[];
    filters: TableFilters;
    onChange: (patch: Partial<TableFilters>) => void;
    onApply: () => void;
    onReset: () => void;
}) {
    const { isAdmin, merchantOptions, filters, onChange, onApply, onReset } = props;

    return (
        <div className="card shadow-sm mb-4" style={S.card}>
            <div className="card-body">
                <div className="row g-3 align-items-end">
                    {isAdmin && (
                        <div className="col-md-3">
                            <label className="form-label" style={S.label}>Merchant</label>
                            <select
                                className="form-select"
                                style={S.input}
                                value={filters.merchantId}
                                onChange={(e) => onChange({ merchantId: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
                            >
                                <option value="all">All merchants</option>
                                {merchantOptions.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="col-md-2">
                        <label className="form-label" style={S.label}>Status</label>
                        <select
                            className="form-select"
                            style={S.input}
                            value={filters.status}
                            onChange={(e) => onChange({ status: e.target.value as TableFilters['status'] })}
                        >
                            <option value="all">All</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label" style={S.label}>Start date</label>
                        <input
                            type="date"
                            className="form-control"
                            style={S.input}
                            value={filters.startDate || ''}
                            onChange={(e) => onChange({ startDate: e.target.value || undefined })}
                        />
                    </div>

                    <div className="col-md-2">
                        <label className="form-label" style={S.label}>End date</label>
                        <input
                            type="date"
                            className="form-control"
                            style={S.input}
                            value={filters.endDate || ''}
                            onChange={(e) => onChange({ endDate: e.target.value || undefined })}
                        />
                    </div>

                    <div className="col-md-2">
                        <label className="form-label" style={S.label}>Reference contains</label>
                        <input
                            type="text"
                            className="form-control"
                            style={S.input}
                            value={filters.ref || ''}
                            onChange={(e) => onChange({ ref: e.target.value || undefined })}
                            placeholder="e.g. PV-2025…"
                        />
                    </div>

                    <div className="col-md-1 d-flex gap-2">
                        <button className="btn btn-primary w-100" style={S.btnPrimary} onClick={onApply} title="Apply filters">
                            Apply
                        </button>
                    </div>

                    <div className="col-md-1 d-flex gap-2">
                        <button className="btn btn-outline-secondary w-100" onClick={onReset} title="Reset filters">
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TransactionsTable(props: { rows: Tx[]; isAdmin: boolean; loading: boolean; error: string | null }) {
    const { rows, isAdmin, loading, error } = props;

    return (
        <div className="card shadow-sm" style={S.card}>
            <div className="card-body p-0">
                {error && <div className="alert alert-danger m-3 mb-0">{error}</div>}
                <div className="table-responsive">
                    <table className="table table-striped table-hover mb-0">
                        <thead className="table-light">
                            <tr>
                                <th style={{ width: 180, ...S.th }}>Date</th>
                                <th style={S.th as any}>Reference</th>
                                <th style={S.th as any}>Merchant</th>
                                <th className="text-end" style={S.th as any}>Amount (₦)</th>
                                <th style={S.th as any}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="text-muted ps-4 py-3" aria-live="polite">
                                        Loading transactions…
                                    </td>
                                </tr>
                            )}
                            {!loading && rows.length === 0 && !error && (
                                <tr>
                                    <td colSpan={5} className="text-muted ps-4 py-3">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && rows.map((tx) => {
                                const badgeStyle =
                                    tx.status === 'completed' ? S.badgeSuccess :
                                        tx.status === 'failed' ? S.badgeDanger : S.badgePending;

                                return (
                                    <tr key={tx.id}>
                                        <td>{new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                        <td className="font-monospace">
                                            {/* 🔗 Change: clickable reference -> /transactions/:reference */}
                                            <Link
                                                to={`/transactions/${tx.reference}`}
                                                className="text-primary text-decoration-none"
                                                title="Open details"
                                            >
                                                {tx.reference}
                                            </Link>
                                        </td>
                                        <td>{tx.merchant?.name || `#${tx.merchantId}`}</td>
                                        <td className="text-end">{Number(tx.amount || 0).toLocaleString('en-NG')}</td>
                                        <td><span className="badge" style={badgeStyle}>{tx.status}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function PaginationFooter(props: {
    limit: number; offset: number; total: number; visibleCount: number;
    onPrev: () => void; onNext: () => void; onChangeLimit: (n: number) => void;
}) {
    const { limit, offset, total, visibleCount, onPrev, onNext, onChangeLimit } = props;
    const canPrev = offset > 0;
    const canNext = offset + limit < total;

    return (
        <div className="d-flex justify-content-between align-items-center mt-2">
            <div className="text-muted small">
                Page {Math.floor(offset / limit) + 1} • Showing {visibleCount} of {total.toLocaleString()}
            </div>
            <div className="d-flex align-items-center gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={onPrev} disabled={!canPrev}>Previous</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={onNext} disabled={!canNext}>Next</button>
                <select
                    className="form-select form-select-sm ms-2"
                    style={{ width: 120 }}
                    value={limit}
                    onChange={(e) => onChangeLimit(Number(e.target.value))}
                >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                </select>
            </div>
        </div>
    );
}

function CreateTransactionCard(props: {
    isAdmin: boolean;
    token?: string;
    adminMerchantOptions: MerchantLite[];
    myMerchants: MerchantLite[];
    mySelectedMerchantId: number | null;
    setMySelectedMerchantId: (id: number | null) => void;
    onSuccess: () => void;
}) {
    const {
        isAdmin, token, adminMerchantOptions, myMerchants,
        mySelectedMerchantId, setMySelectedMerchantId, onSuccess,
    } = props;

    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState<Tx['status']>('pending');
    const [adminMerchantId, setAdminMerchantId] = useState<number | ''>('');
    const [saving, setSaving] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = Number(amount);
        if (!amountNum || amountNum <= 0) return toast.error('Enter a valid amount.');

        try {
            setSaving(true);

            if (isAdmin) {
                if (!adminMerchantId) return toast.error('Please select a merchant.');
                await api.post(
                    '/transactions/admin',
                    { merchantId: adminMerchantId, amount: amountNum, status },
                    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
                );
            } else {
                await api.post(
                    '/transactions',
                    { amount: amountNum, status, merchantId: mySelectedMerchantId ?? undefined },
                    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
                );
            }

            toast.success('Transaction created');
            setAmount('');
            setStatus('pending');
            if (isAdmin) setAdminMerchantId('');
            onSuccess();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'Failed to create transaction');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card shadow-sm mb-4" style={S.card}>
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Create Transaction</h5>
                </div>

                <form className="row g-3 align-items-end" onSubmit={submit}>
                    {isAdmin ? (
                        <div className="col-md-4">
                            <label className="form-label" style={S.label}>Merchant</label>
                            <select
                                className="form-select"
                                style={S.input}
                                value={adminMerchantId}
                                onChange={(e) => setAdminMerchantId(Number(e.target.value))}
                                required
                            >
                                <option value="" disabled>Select a merchant…</option>
                                {adminMerchantOptions.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="col-md-4">
                            <label className="form-label" style={S.label}>Merchant</label>
                            {myMerchants.length <= 1 ? (
                                <input
                                    className="form-control"
                                    style={S.input}
                                    value={myMerchants.length === 1 ? `${myMerchants[0].name} (#${myMerchants[0].id})` : 'No merchants'}
                                    disabled
                                />
                            ) : (
                                <select
                                    className="form-select"
                                    style={S.input}
                                    value={mySelectedMerchantId ?? ''}
                                    onChange={(e) => setMySelectedMerchantId(Number(e.target.value))}
                                    required
                                >
                                    <option value="" disabled>Select a merchant…</option>
                                    {myMerchants.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="col-md-3">
                        <label className="form-label" style={S.label}>Amount (₦)</label>
                        <input
                            type="number" min="0" step="0.01"
                            className="form-control"
                            style={S.input}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="col-md-3">
                        <label className="form-label" style={S.label}>Status</label>
                        <select
                            className="form-select"
                            style={S.input}
                            value={status}
                            onChange={(e) => setStatus(e.target.value as Tx['status'])}
                        >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    <div className="col-md-2 d-grid">
                        <button className="btn btn-primary" style={S.btnPrimary} type="submit" disabled={saving}>
                            {saving ? 'Saving…' : 'Create'}
                        </button>
                    </div>
                </form>

                <small className="text-muted d-block mt-2">
                    Reference is generated automatically on the server for traceability.
                </small>
            </div>
        </div>
    );
}

// -------------------- Page ----------------------------------------------------------------

export default function TransactionsPage() {
    const { user, token } = useAuth() as any;
    const isAdmin = (user?.role || '').toLowerCase() === 'admin';
    const navigate = useNavigate();

    const [pendingFilters, setPendingFilters] = useState<TableFilters>({
        status: 'all', merchantId: 'all', startDate: undefined, endDate: undefined, ref: undefined,
    });
    const [appliedFilters, setAppliedFilters] = useState<TableFilters>(pendingFilters);

    const { rows, count, limit, offset, loading, error, setLimit, setOffset, refetch } =
        useTransactionsData(isAdmin, token, appliedFilters);

    const tableMerchantOptions: MerchantLite[] = useMemo(() => {
        const map = new Map<number, string>();
        for (const r of rows) {
            const id = r.merchant?.id ?? r.merchantId;
            const name = r.merchant?.name || `#${r.merchantId}`;
            if (typeof id === 'number' && !map.has(id)) map.set(id, name);
        }
        return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [rows]);

    const {
        series, loading: chartLoading, error: chartError,
        interval, setInterval, selectedMerchantId, setSelectedMerchantId, refetch: refetchChart,
    } = useAnalyticsData(isAdmin, token);

    const { options: myMerchants, selectedId: mySelectedMerchantId, setSelectedId: setMySelectedMerchantId } =
        useMyMerchants(!isAdmin, token);

    const handlePrev = () => setOffset((p) => Math.max(0, p - limit));
    const handleNext = () => setOffset((p) => p + limit);
    const handleChangeLimit = (n: number) => { setLimit(n); setOffset(0); };

    const applyFilters = () => setAppliedFilters({ ...pendingFilters });
    const resetFilters = () => {
        const clean = { status: 'all', merchantId: 'all', startDate: undefined, endDate: undefined, ref: undefined } as TableFilters;
        setPendingFilters(clean);
        setAppliedFilters(clean);
    };

    // 🎨 Chart polish: soft brand color + gradient fill
    const chartOptions: ApexOptions = {
        chart: { type: 'area', height: 300, toolbar: { show: false } },
        stroke: { curve: 'smooth' },
        dataLabels: { enabled: false },
        colors: ['#2f6fed'],
        fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 0.9, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] }
        },
        xaxis: { type: 'category', labels: { rotate: -15 } },
        yaxis: { labels: { formatter: (n: number) => fmtNaira(n) } },
        tooltip: { y: { formatter: (n: number) => fmtNaira(n) } },
    };

    const seriesForApex = series as unknown as any;

    // 🧮 KPI strip (current page only — quick signal, no extra calls)
    const pageKpis = useMemo(() => {
        const total = rows.length;
        const gmv = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const completed = rows.filter(r => r.status === 'completed').length;
        const pending = rows.filter(r => r.status === 'pending').length;
        const failed = rows.filter(r => r.status === 'failed').length;
        return { total, gmv, completed, pending, failed };
    }, [rows]);

    return (
        <div style={S.page}>
            <Navbar />
            <main className="container-xl py-5">
                <div className="position-relative" style={S.stage}>
                    {/* HERO HEADER */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                        <div>
                            <span style={S.kicker}>Daily</span>
                            <h1 style={S.title}>{isAdmin ? 'All Transactions (Admin)' : 'My Transactions'}</h1>
                            <div style={S.divider} />
                            <div style={S.subtle}>
                                {isAdmin ? 'Displaying all users’ transactions' : 'Transactions for your merchant account'}
                            </div>
                        </div>
                        <div className="mt-3 mt-md-0" style={S.pillGroup}>
                            <button type="button" style={{ ...S.pill, ...S.pillActive }}>Daily</button>
                            <button type="button" style={S.pill}>Overview</button>
                        </div>
                    </div>

                    {/* Analytics */}
                    <div className="card shadow-sm mb-4" style={S.card}>
                        <div className="card-body">
                            <div className="d-flex flex-wrap gap-3 justify-content-between mb-2">
                                <div className="text-muted">Aggregated amounts by {interval}</div>
                                <div className="d-flex flex-wrap gap-2">
                                    <select
                                        className="form-select form-select-sm"
                                        style={S.input}
                                        value={interval}
                                        onChange={(e) => setInterval(e.target.value as Interval)}
                                    >
                                        <option value="day">Day</option>
                                        <option value="week">Week</option>
                                        <option value="month">Month</option>
                                    </select>

                                    {isAdmin && (
                                        <select
                                            className="form-select form-select-sm"
                                            style={S.input}
                                            value={selectedMerchantId}
                                            onChange={(e) => setSelectedMerchantId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                        >
                                            <option value="all">All merchants</option>
                                            {tableMerchantOptions.map((m) => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {chartLoading ? (
                                <div className="text-muted" aria-live="polite">Loading analytics…</div>
                            ) : chartError ? (
                                <div className="text-danger">{chartError}</div>
                            ) : (
                                <ReactApexChart options={chartOptions} series={seriesForApex} type="area" height={300} />
                            )}
                        </div>
                    </div>

                    {/* KPI strip (current page) */}
                    <div className="card shadow-sm mb-4" style={S.card}>
                        <div className="card-body">
                            <div className="row g-3 text-center">
                                <div className="col-6 col-md-2 offset-md-1">
                                    <div style={S.subtle}>Rows (page)</div>
                                    <div className="fw-bold fs-5">{pageKpis.total.toLocaleString()}</div>
                                </div>
                                <div className="col-6 col-md-3">
                                    <div style={S.subtle}>GMV (page)</div>
                                    <div className="fw-bold fs-5">{fmtNaira(pageKpis.gmv)}</div>
                                </div>
                                <div className="col-4 col-md-2">
                                    <div style={S.subtle}>Completed</div>
                                    <div className="fw-bold text-success">{pageKpis.completed.toLocaleString()}</div>
                                </div>
                                <div className="col-4 col-md-2">
                                    <div style={S.subtle}>Pending</div>
                                    <div className="fw-bold text-warning">{pageKpis.pending.toLocaleString()}</div>
                                </div>
                                <div className="col-4 col-md-2">
                                    <div style={S.subtle}>Failed</div>
                                    <div className="fw-bold text-danger">{pageKpis.failed.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Create form */}
                    <CreateTransactionCard
                        isAdmin={isAdmin}
                        token={token}
                        adminMerchantOptions={tableMerchantOptions}
                        myMerchants={myMerchants}
                        mySelectedMerchantId={mySelectedMerchantId}
                        setMySelectedMerchantId={setMySelectedMerchantId}
                        onSuccess={() => { refetch(); refetchChart(); }}
                    />

                    {/* Filters */}
                    <FiltersCard
                        isAdmin={isAdmin}
                        merchantOptions={tableMerchantOptions}
                        filters={pendingFilters}
                        onChange={(patch) => setPendingFilters((f) => ({ ...f, ...patch }))}
                        onApply={applyFilters}
                        onReset={resetFilters}
                    />

                    {/* Table */}
                    <TransactionsTable rows={rows} isAdmin={isAdmin} loading={loading} error={error} />

                    {/* Export + Pagination */}
                    <div className="d-flex justify-content-end mt-3">
                        {/* 🔽 New: Export visible rows to CSV */}
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => exportCsv(rows)}
                            title="Export current page to CSV"
                        >
                            Export CSV
                        </button>
                    </div>

                    <PaginationFooter
                        limit={limit} offset={offset} total={count} visibleCount={rows.length}
                        onPrev={handlePrev} onNext={handleNext} onChangeLimit={handleChangeLimit}
                    />
                </div>
            </main>
        </div>
    );
}
