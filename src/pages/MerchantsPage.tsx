// src/pages/MerchantsPage.tsx
// ------------------------------------------------------------------------------------------
// Merchants Listing (Role-Aware) + Details Drawer + CSV Export (NO Create UI)
// - Admin: shows ALL merchants
// - Non-admin: shows ONLY merchants created by the logged-in user
// - Adds: View Details drawer, Export CSV (client-side). No "Create Merchant" UI.
// - Comments placed above code lines (per your preference).
// ------------------------------------------------------------------------------------------

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import MerchantDetailsDrawer from '../components/MerchantDetailsDrawer';

// ------------------ Types ------------------
// Purpose: light shape for bank info displayed in the table/drawer.
type BankLite = { bankName?: string | null; accountNumberMasked?: string | null };

// Purpose: minimal merchant projection for listing and details.
type Merchant = {
    id: number;
    name: string;
    email?: string | null;
    userId?: number | null;
    createdAt?: string;
    bankAccounts?: BankLite[];
};

const MerchantsPage = () => {
    // Purpose: auth + routing for protected calls and session handling.
    const { token, user, logout } = useAuth();
    const navigate = useNavigate();

    // Purpose: RBAC – decide if user is admin once and memoize.
    const isAdmin = useMemo(
        () => (user?.role || '').toLowerCase() === 'admin',
        [user?.role]
    );

    // Purpose: table/search/pagination state.
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState<number | null>(null);
    const [rows, setRows] = useState<Merchant[]>([]);

    // Purpose: drawer state for "View Merchant Details".
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null);

    // Purpose: fetch merchants with server-side scoping when available.
    const fetchMerchants = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);

            // Decide scope: admin=all, non-admin=mine (server should enforce RBAC).
            const scope = isAdmin ? 'all' : 'mine';

            // Build query params for search/pagination.
            const params = new URLSearchParams({
                scope,
                q: search,
                page: String(page),
                limit: String(pageSize),
            });

            // Call backend endpoint (preferred: server filters by scope).
            const res = await api.get(`/merchants?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Prefer X-Total-Count header when present for pagination.
            const hdrCount = Number(res.headers?.['x-total-count']);
            if (Number.isFinite(hdrCount)) setTotal(hdrCount);

            // Support both shapes: array OR { rows, total }.
            const list: Merchant[] = Array.isArray(res.data) ? res.data : (res.data?.rows ?? []);
            if (typeof res.data?.total === 'number') setTotal(res.data.total);

            setRows(list);
        } catch (err: any) {
            // Handle session expiry and general failures.
            if (err?.response?.status === 401) {
                toast.error('Session expired. Please log in again.');
                logout();
                navigate('/expired', { replace: true });
            } else {
                console.error(err);
                toast.error(err?.response?.data?.message ?? 'Failed to load merchants.');
            }
        } finally {
            setLoading(false);
        }
    }, [token, isAdmin, search, page, pageSize, logout, navigate]);

    // Purpose: initial load and dependency-based refresh.
    useEffect(() => {
        fetchMerchants();
    }, [fetchMerchants]);

    // Purpose: client-side fallback if backend didn't filter by scope.
    const visibleRows = useMemo(() => {
        if (isAdmin) return rows;
        const uid = (user as any)?.id;
        return rows.filter(r => !r.userId || r.userId === uid);
    }, [rows, isAdmin, user]);

    // Purpose: open/close the details drawer with selected merchant.
    const openDrawer = (m: Merchant) => { setActiveMerchant(m); setDrawerOpen(true); };
    const closeDrawer = () => { setDrawerOpen(false); setActiveMerchant(null); };

    // Purpose: CSV export (pure client-side).
    const exportCSV = () => {
        // Compose CSV header row.
        const headers = ['ID', 'Name', 'Email', 'Bank', 'Acct Mask', 'Created'];

        // Map visible rows to CSV-safe lines.
        const lines = visibleRows.map(m => {
            const bank = m.bankAccounts?.[0]?.bankName ?? '';
            const mask = m.bankAccounts?.[0]?.accountNumberMasked ?? '';
            const created = m.createdAt ? new Date(m.createdAt).toISOString() : '';
            return [m.id, m.name ?? '', m.email ?? '', bank, mask, created]
                .map(v => `"${String(v).replace(/"/g, '""')}"`)
                .join(',');
        });

        // Trigger download in browser.
        const csv = [headers.join(','), ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merchants.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Purpose: search + pagination handlers.
    const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setPage(1); setSearch(e.target.value); };
    const nextPage = () => setPage(p => p + 1);
    const prevPage = () => setPage(p => Math.max(1, p - 1));

    return (
        <>
            <Navbar />
            <div className="pv-dash-bg">
                <div className="container mt-4 text-light">
                    {/* Page header with search + CSV export */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h2 className="mb-0">Merchants</h2>
                            <p className="text-light opacity-75 mb-0">
                                {isAdmin ? 'All merchants in the system' : 'Merchants you created'}
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            {/* Search input (server-side q + client fallback) */}
                            <input
                                type="text"
                                value={search}
                                onChange={onSearchChange}
                                className="form-control form-control-sm"
                                placeholder="Search by name or email…"
                                style={{ maxWidth: 260 }}
                            />
                            {/* CSV export button */}
                            <button className="btn btn-outline-light btn-sm" onClick={exportCSV}>
                                Export CSV
                            </button>
                            {/* Intentionally no Create button here (you already have that flow). */}
                        </div>
                    </div>

                    {/* Table card */}
                    <div className="pv-glass-card p-3">
                        {loading ? (
                            <p className="opacity-75 m-0">Loading merchants…</p>
                        ) : visibleRows.length === 0 ? (
                            <p className="opacity-75 m-0">No merchants found.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-dark table-striped align-middle mb-2">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 90 }}>ID</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Bank</th>
                                            <th>Acct</th>
                                            <th>Created</th>
                                            <th style={{ width: 120 }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleRows.map((m) => {
                                            const firstAcct = m.bankAccounts?.[0];
                                            return (
                                                <tr key={m.id}>
                                                    <td>#{m.id}</td>
                                                    <td>{m.name ?? '-'}</td>
                                                    <td>{m.email ?? '-'}</td>
                                                    <td>{firstAcct?.bankName ?? '-'}</td>
                                                    <td>{firstAcct?.accountNumberMasked ?? '-'}</td>
                                                    <td>{m.createdAt ? new Date(m.createdAt).toLocaleString() : '-'}</td>
                                                    <td>
                                                        {/* View details: opens drawer */}
                                                        <button className="btn btn-outline-light btn-sm" onClick={() => openDrawer(m)}>
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Simple paging controls */}
                                <div className="d-flex justify-content-between align-items-center">
                                    <small className="opacity-75">
                                        Page {page}{total ? ` • ${total.toLocaleString()} total` : ''}
                                    </small>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-outline-light btn-sm" onClick={prevPage} disabled={page <= 1}>
                                            Prev
                                        </button>
                                        <button className="btn btn-outline-light btn-sm" onClick={nextPage} disabled={visibleRows.length < pageSize}>
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right-side details drawer */}
                <MerchantDetailsDrawer open={drawerOpen} merchant={activeMerchant} onClose={closeDrawer} />
            </div>
        </>
    );
};

export default MerchantsPage;
