// src/pages/BankDashboard.tsx
// -----------------------------------------------------------------------------
// What changed & why (high-level)
// - Added a "Pending Merchants" card so bank users can approve/reject merchants.
// - Reused your existing auth flow (token normalization + /bank/me).
// - Introduced a small data layer (`loadPendingMerchants`, `decideMerchant`) to
//   keep UI lean and testable.
// - Normalized bank status (api -> UI) so 'approved' maps to 'Active' label.
// - Preserved Bootstrap responsive layout, badges, and your loading skeleton.
// - Surface a badge count for pending merchants in the header + card.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api'; // axios instance pointing to /api

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Bank = {
    id: number;
    bankName: string;
    contactEmail: string;
    contactPhone?: string;
    contactPerson?: string;
    status: 'Pending' | 'Active' | 'Rejected';
    createdAt?: string;
};

type MerchantRow = {
    id: number;
    businessName: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt?: string;
};

// -----------------------------------------------------------------------------
// Token helpers (kept from your code)
// -----------------------------------------------------------------------------

const BANK_TOKEN_KEYS = ['bank_token', 'bankToken'];

const getBankToken = () => {
    for (const k of BANK_TOKEN_KEYS) {
        const v = localStorage.getItem(k);
        if (v) return { key: k, value: v };
    }
    return null;
};

const isExpired = (jwt: string) => {
    try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

// -----------------------------------------------------------------------------
// UI helpers
// -----------------------------------------------------------------------------

const asUiBankStatus = (raw?: string): Bank['status'] => {
    if (!raw) return 'Pending';
    const v = raw.toLowerCase();
    if (v === 'approved' || v === 'active') return 'Active';
    if (v === 'rejected') return 'Rejected';
    return 'Pending';
};

const statusBadge = (s?: Bank['status']) => {
    const map: Record<NonNullable<Bank['status']>, string> = {
        Active: 'text-bg-success',
        Pending: 'text-bg-warning',
        Rejected: 'text-bg-danger',
    };
    return s ? map[s] || 'text-bg-secondary' : 'text-bg-secondary';
};

const prettyDate = (iso?: string) => {
    try { return iso ? new Date(iso).toLocaleString() : '—'; } catch { return '—'; }
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function BankDashboard() {
    const [bank, setBank] = useState<Bank | null>(null);
    const [loading, setLoading] = useState(true);

    const [pendingMerchants, setPendingMerchants] = useState<MerchantRow[]>([]);
    const [loadingMerchants, setLoadingMerchants] = useState(true);
    const pendingCount = pendingMerchants.length;

    const navigate = useNavigate();

    const token = useMemo(() => {
        const found = getBankToken();
        if (!found) return null;
        if (found.key !== 'bank_token') {
            localStorage.setItem('bank_token', found.value);
            localStorage.removeItem(found.key);
        }
        return found.value;
    }, []);

    useEffect(() => {
        if (!token || isExpired(token)) {
            localStorage.removeItem('bank_token');
            toast.error('Your session has expired. Please log in again.');
            navigate('/bank-login', { replace: true });
            return;
        }

        (async () => {
            try {
                const res = await api.get('/bank/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const normalized: Bank = {
                    ...res.data,
                    status: asUiBankStatus(res.data?.status),
                };
                setBank(normalized);
            } catch (err: any) {
                console.error('Failed to fetch bank profile:', err);
                toast.error(err?.response?.data?.message || 'Auth error. Please log in again.');
                localStorage.removeItem('bank_token');
                navigate('/bank-login', { replace: true });
            } finally {
                setLoading(false);
            }
        })();
    }, [token, navigate]);

    const loadPendingMerchants = async () => {
        if (!token) return;
        setLoadingMerchants(true);
        try {
            const res = await api.get('/bank/merchants/pending', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPendingMerchants(res.data || []);
        } catch (err: any) {
            console.error('Failed to load pending merchants:', err);
            toast.error(err?.response?.data?.message || 'Failed to load pending merchants.');
            setPendingMerchants([]);
        } finally {
            setLoadingMerchants(false);
        }
    };

    useEffect(() => {
        if (bank) loadPendingMerchants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bank]);

    const decideMerchant = async (id: number, decision: 'approve' | 'reject') => {
        const comment = prompt(`Add ${decision} comment (optional):`) || undefined;
        try {
            await api.post(
                `/bank/merchants/${id}/${decision}`,
                { comment },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Merchant ${decision}d`);
            await loadPendingMerchants();
        } catch (err: any) {
            console.error(`Failed to ${decision} merchant:`, err);
            toast.error(err?.response?.data?.message || `Failed to ${decision} merchant`);
        }
    };

    const handleLogout = () => {
        if (confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('bank_token');
            toast.info('You have been logged out.');
            navigate('/bank-login', { replace: true });
        }
    };

    // Loading
    if (loading) {
        return (
            <div className="container py-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <h2 className="mb-0">Bank Dashboard</h2>
                    <button className="btn btn-outline-secondary disabled">Logout</button>
                </div>

                <div className="card mb-3">
                    <div className="card-body">
                        <div className="placeholder-glow">
                            <span className="placeholder col-4"></span>
                        </div>
                        <div className="mt-3 placeholder-glow">
                            <span className="placeholder col-8"></span>
                            <span className="placeholder col-6 d-block mt-2"></span>
                            <span className="placeholder col-5 d-block mt-2"></span>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header bg-body-tertiary fw-semibold">Pending Merchants</div>
                    <div className="card-body">
                        <div className="placeholder-glow">
                            <span className="placeholder col-12 d-block mb-2"></span>
                            <span className="placeholder col-10 d-block mb-2"></span>
                            <span className="placeholder col-8 d-block"></span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Missing bank
    if (!bank) {
        return (
            <div className="container py-4">
                <div className="alert alert-warning mb-3">No bank profile found.</div>
                <button className="btn btn-primary" onClick={() => navigate('/bank-login', { replace: true })}>
                    Go to Login
                </button>
            </div>
        );
    }

    // Main UI
    return (
        <div className="container py-4">
            {/* Header strip */}
            <div className="d-flex align-items-start align-items-md-center justify-content-between gap-2 mb-3">
                <div>
                    <h2 className="mb-1 d-flex align-items-center gap-2">
                        Bank Dashboard
                        <span className="badge text-bg-secondary">Pending Merchants: {pendingCount}</span>
                    </h2>
                    <div className="small text-muted">Welcome back, {bank.contactPerson || bank.bankName}.</div>
                </div>
                <button className="btn btn-outline-secondary" onClick={handleLogout}>
                    Logout
                </button>
            </div>

            {/* Hero card */}
            <div className="card border-0 mb-4 shadow-sm">
                <div className="card-body p-4">
                    <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
                        <div>
                            <h4 className="mb-1">{bank.bankName}</h4>
                            <span className={`badge ${statusBadge(bank.status)} rounded-pill`}>{bank.status}</span>
                        </div>

                        {/* Quick actions (placeholder) */}
                        <div className="d-flex gap-2">
                            <button type="button" className="btn btn-outline-primary btn-sm" disabled>
                                View Statements
                            </button>
                            <button type="button" className="btn btn-outline-primary btn-sm" disabled>
                                Configure Webhooks
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info grid */}
            <div className="row g-3 row-cols-1 row-cols-md-2">
                <div className="col">
                    <div className="card h-100 shadow-sm">
                        <div className="card-header bg-body-tertiary fw-semibold">Contact</div>
                        <div className="card-body">
                            <div className="mb-2">
                                <div className="fw-semibold">Email</div>
                                <div className="text-muted">{bank.contactEmail}</div>
                            </div>
                            {bank.contactPhone && (
                                <div className="mb-2">
                                    <div className="fw-semibold">Phone</div>
                                    <div className="text-muted">{bank.contactPhone}</div>
                                </div>
                            )}
                            {bank.contactPerson && (
                                <div>
                                    <div className="fw-semibold">Contact Person</div>
                                    <div className="text-muted">{bank.contactPerson}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col">
                    <div className="card h-100 shadow-sm">
                        <div className="card-header bg-body-tertiary fw-semibold">Account</div>
                        <div className="card-body">
                            <div className="mb-2">
                                <div className="fw-semibold">Bank ID</div>
                                <div className="text-muted">{bank.id}</div>
                            </div>
                            <div className="mb-2">
                                <div className="fw-semibold">Status</div>
                                <div>
                                    <span className={`badge ${statusBadge(bank.status)} rounded-pill`}>{bank.status}</span>
                                </div>
                            </div>
                            <div>
                                <div className="fw-semibold">Created</div>
                                <div className="text-muted">{prettyDate(bank.createdAt)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Merchants */}
            <div className="card shadow-sm mt-4">
                <div className="card-header bg-body-tertiary fw-semibold d-flex align-items-center justify-content-between">
                    <span className="d-flex align-items-center gap-2">
                        Pending Merchants
                        <span className="badge text-bg-primary">{pendingCount}</span>
                    </span>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={loadPendingMerchants}
                        disabled={loadingMerchants}
                    >
                        {loadingMerchants ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>

                <div className="card-body">
                    {loadingMerchants ? (
                        <div className="placeholder-glow">
                            <span className="placeholder col-12 d-block mb-2"></span>
                            <span className="placeholder col-10 d-block mb-2"></span>
                            <span className="placeholder col-8 d-block"></span>
                        </div>
                    ) : pendingMerchants.length === 0 ? (
                        <div className="text-muted">No pending merchants to review.</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table align-middle">
                                <thead>
                                    <tr>
                                        <th>Merchant</th>
                                        <th>Requested</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingMerchants.map((m) => (
                                        <tr key={m.id}>
                                            <td>{m.businessName}</td>
                                            <td>{prettyDate(m.createdAt)}</td>
                                            <td className="text-end">
                                                <div className="btn-group">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => decideMerchant(m.id, 'approve')}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => decideMerchant(m.id, 'reject')}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
