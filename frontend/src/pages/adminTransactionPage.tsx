// src/pages/adminTransactionPage.tsx
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { FancyTable } from '../components/FancyTable/FancyTable';
import '../components/FancyTable/FancyTable.css';

type Tx = {
    id: number;
    merchantId: number;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    reference: string;
    createdAt: string;
};

const fmtNaira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

const AdminTransactionsPage = () => {
    const { token, logout } = useAuth();

    const [rows, setRows] = useState<Tx[]>([]);
    const [count, setCount] = useState(0);
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<'all' | Tx['status']>('all');
    const [q, setQ] = useState('');

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await api.get('/transactions/admin', {
                headers: { Authorization: `Bearer ${token}` },
                params: { limit, offset },
            });
            setRows(res.data?.rows ?? []);
            setCount(res.data?.count ?? 0);
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 401) logout();
            else setError('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [limit, offset]);

    const handlePrev = () => setOffset(Math.max(0, offset - limit));
    const handleNext = () => {
        if (offset + limit < count) setOffset(offset + limit);
    };

    const filtered = useMemo(() => {
        let out = rows.slice();

        if (statusFilter !== 'all') {
            out = out.filter((r) => r.status === statusFilter);
        }

        const query = q.trim().toLowerCase();
        if (query) {
            out = out.filter(
                (r) =>
                    r.reference.toLowerCase().includes(query) ||
                    String(r.merchantId).includes(query)
            );
        }

        return out;
    }, [rows, statusFilter, q]);

    const kpis = useMemo(() => {
        const total = rows.length;
        const gmv = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const completed = rows.filter((r) => r.status === 'completed').length;
        const pending = rows.filter((r) => r.status === 'pending').length;
        const failed = rows.filter((r) => r.status === 'failed').length;
        return { total, gmv, completed, pending, failed };
    }, [rows]);

    const pageFrom = count === 0 ? 0 : offset + 1;
    const pageTo = Math.min(offset + limit, count);

    const columns = [
        { key: 'id', label: 'ID', sortable: true, copyable: true },
        { key: 'merchantId', label: 'Merchant ID', sortable: true, copyable: true },
        {
            key: 'amount',
            label: 'Amount',
            sortable: true,
            render: (val: number) => fmtNaira(val),
        },
        {
            key: 'status',
            label: 'Status',
            render: (val: string) => <span className={`status-badge ${val}`}>{val}</span>,
        },
        { key: 'reference', label: 'Reference', sortable: true, copyable: true },
        {
            key: 'createdAt',
            label: 'Created At',
            sortable: true,
            render: (val: string) => new Date(val).toLocaleString(),
        },
    ];

    return (
        <>
            <Navbar />

            {/* Background wrapper */}
            <div className="pv-admin-bg">
                <div className="container py-4" style={{ maxWidth: 1180 }}>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h3 className="mb-0 text-light">Admin – All Transactions</h3>
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-sm btn-outline-light"
                                onClick={fetchTransactions}
                                disabled={loading}
                            >
                                {loading ? 'Refreshing…' : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    {/* Controls row — glassy card */}
                    <div className="card pv-glass mb-3">
                        <div className="card-body py-3">
                            <div className="row g-3 align-items-end">
                                <div className="col-12 col-md-3">
                                    <label className="form-label mb-1">Status</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={statusFilter}
                                        onChange={(e) =>
                                            setStatusFilter(e.target.value as 'all' | Tx['status'])
                                        }
                                    >
                                        <option value="all">All</option>
                                        <option value="completed">Completed</option>
                                        <option value="pending">Pending</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                </div>

                                <div className="col-12 col-md-5">
                                    <label className="form-label mb-1">Quick search</label>
                                    <input
                                        className="form-control form-control-sm"
                                        placeholder="Search by reference or merchant ID…"
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                    />
                                </div>

                                <div className="col-6 col-md-2">
                                    <label className="form-label mb-1">Rows / page</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={limit}
                                        onChange={(e) => {
                                            setLimit(Number(e.target.value));
                                            setOffset(0);
                                        }}
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>

                                <div className="col-6 col-md-2">
                                    <label className="form-label mb-1 d-block">&nbsp;</label>
                                    <div className="small text-muted fw-bold text-end">
                                        Showing {pageFrom}–{pageTo} of {count.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KPI strip — glassy tiles */}
                    <div className="row g-3 mb-3">
                        <div className="col-6 col-md-2">
                            <div className="card pv-glass">
                                <div className="card-body py-2">
                                    <div className="text-muted small fw-bold">Total (page)</div>
                                    <div className="pv-kpi">{kpis.total.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="card pv-glass">
                                <div className="card-body py-2">
                                    <div className="text-muted small fw-bold">GMV (page)</div>
                                    <div className="pv-kpi">{fmtNaira(kpis.gmv)}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-4 col-md-2">
                            <div className="card pv-glass">
                                <div className="card-body py-2">
                                    <div className="text-muted small fw-bold">Completed</div>
                                    <div className="pv-kpi text-success">
                                        {kpis.completed.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-4 col-md-2">
                            <div className="card pv-glass">
                                <div className="card-body py-2">
                                    <div className="text-muted small fw-bold">Pending</div>
                                    <div className="pv-kpi text-warning">
                                        {kpis.pending.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-4 col-md-2">
                            <div className="card pv-glass">
                                <div className="card-body py-2">
                                    <div className="text-muted small fw-bold">Failed</div>
                                    <div className="pv-kpi text-danger">
                                        {kpis.failed.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table container — glassy */}
                    <div className="card pv-glass">
                        <div className="card-body p-0">
                            {loading && <div className="p-3 text-muted small fw-bold">Loading…</div>}
                            {error && (
                                <div className="alert alert-danger mb-0 rounded-0">{error}</div>
                            )}

                            {/* ✨ Gloss wrapper for FancyTable */}
                            {!loading && !error && (
                                <div className="pv-fancy-sheen p-1">
                                    <FancyTable
                                        data={filtered}
                                        columns={columns}
                                        statusKey="status"
                                        filterStatusValues={['pending', 'completed', 'failed']}
                                        defaultSortKey="createdAt"
                                    />
                                </div>
                            )}

                            {/* Pagination footer — translucent */}
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 pv-glass-footer border-top">
                                <div className="small text-muted fw-bold">
                                    Showing {pageFrom}–{pageTo} of {count.toLocaleString()}
                                </div>
                                <div className="btn-group">
                                    <button
                                        className="btn btn-sm btn-outline-secondary fw-bold"
                                        disabled={offset === 0}
                                        onClick={handlePrev}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        className="btn btn-sm btn-outline-secondary fw-bold"
                                        disabled={offset + limit >= count}
                                        onClick={handleNext}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🎨 Background + Glass + Bold Typography + FancyTable Gloss */}
            <style>{`
        /* Page background */
        .pv-admin-bg {
          min-height: 100vh;
          background:
            radial-gradient(1200px 260px at 50% 100%, rgba(0,0,0,0.35), rgba(0,0,0,0) 60%),
            linear-gradient(180deg, #0c0f13 0%, #151c23 40%, #22303a 68%, #3e4e5a 80%, #aeb8c1 100%);
          box-shadow: inset 0 0 160px rgba(0,0,0,0.55);
        }

        /* Glass card base */
        .pv-glass {
          border: 1px solid rgba(255,255,255,0.20);
          background:
            radial-gradient(120% 160% at 100% 0, rgba(255,255,255,0.14), rgba(255,255,255,0.06) 60%),
            linear-gradient(180deg, rgba(255,255,255,0.20), rgba(255,255,255,0.08));
          backdrop-filter: blur(10px) saturate(140%);
          -webkit-backdrop-filter: blur(10px) saturate(140%);
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255,255,255,0.18);
          border-radius: 16px;
          overflow: hidden;
          position: relative;
        }
        .pv-glass::before {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0) 38%);
          pointer-events: none; mix-blend-mode: screen;
        }

        /* Table translucency inside cards */
        .pv-glass .table { background: transparent; margin-bottom: 0; }
        .pv-glass .table thead th {
          background: rgba(255,255,255,0.25);
          border-bottom-color: rgba(255,255,255,0.25);
          color: #1f2a33;
          font-weight: 800;              /* bolder headers */
          letter-spacing: .25px;
        }
        .pv-glass .table-striped > tbody > tr:nth-of-type(odd) > * {
          background: rgba(255,255,255,0.18);
        }
        .pv-glass .table-hover tbody tr:hover > * {
          background: rgba(255,255,255,0.22);
        }
        .pv-glass .table tbody td {
          font-weight: 600;              /* bolder cells */
        }

        /* Inputs readable + bold */
        .pv-glass .form-control,
        .pv-glass .form-select {
          background: rgba(255,255,255,0.9);
          border-color: rgba(255,255,255,0.65);
          font-weight: 600;              /* bolder inputs */
        }

        /* Footer under table */
        .pv-glass-footer {
          background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04));
          backdrop-filter: blur(8px) saturate(140%);
          -webkit-backdrop-filter: blur(8px) saturate(140%);
          border-top: 1px solid rgba(255,255,255,0.18) !important;
        }

        /* Buttons on dark header */
        .pv-admin-bg .btn-outline-light {
          border-color: rgba(255,255,255,0.35);
          color: #e9f2ff; font-weight: 700;
        }
        .pv-admin-bg .btn-outline-light:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.55);
          color: #fff;
        }

        /* ✨ FancyTable glossy shell */
        .pv-fancy-sheen {
          position: relative;
          border-radius: 14px;
          background:
            radial-gradient(140% 160% at 110% -10%, rgba(255,255,255,.18), rgba(255,255,255,0) 45%),
            linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.06));
          backdrop-filter: blur(8px) saturate(160%);
          -webkit-backdrop-filter: blur(8px) saturate(160%);
          overflow: hidden;
        }
        .pv-fancy-sheen::before {
          content:""; position:absolute; inset:0;
          background: linear-gradient(to bottom, rgba(255,255,255,.25), rgba(255,255,255,0) 34%);
          pointer-events:none; mix-blend-mode:screen;
        }
        .pv-fancy-sheen table { background: transparent !important; }
        .pv-fancy-sheen thead th { font-weight: 800 !important; letter-spacing: .25px; }
        .pv-fancy-sheen tbody td { font-weight: 600; }
        .pv-fancy-sheen .status-badge { font-weight: 800; }

        /* Global page typography bumps (scoped to this page) */
        .pv-admin-bg h1, .pv-admin-bg h2, .pv-admin-bg h3,
        .pv-admin-bg .form-label, .pv-admin-bg .btn, .pv-admin-bg .small {
          font-weight: 700;
        }
        .pv-admin-bg .pv-kpi {
          font-size: 1.35rem;
          font-weight: 800;               /* hero numbers */
          line-height: 1.1;
        }
      `}</style>
        </>
    );
};

export default AdminTransactionsPage;
