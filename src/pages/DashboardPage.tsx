// src/pages/DashboardPage.tsx
// -------------------------------------------------------------------------------------------------
// PayVerify Dashboard (Dark Gloss / Glass Theme) + Merchants Tile (Modal)
// -------------------------------------------------------------------------------------------------
// WHAT CHANGED (and why):
// 1) NEW import of MerchantsModal (no route needed). Opens a modal from the dashboard tile.
// 2) NEW state: `merchantsOpen` to control modal visibility; `merchantsCount` to show count on tile.
// 3) NEW helper `fetchMerchantsCount()` (role-aware: admin=all, non-admin=mine) with graceful fallbacks.
// 4) UPDATED initial load & manual refresh to also call `fetchMerchantsCount()` so the tile stays accurate.
// 5) NEW clickable "Merchants" tile alongside the existing analytics tiles; opens the modal.
// 6) MINOR CLEANUP: interval cleanup now clears the actual interval ref (prevents a subtle leak).
// -------------------------------------------------------------------------------------------------
// NOTE: You’ll also add a new file `src/components/MerchantsModal.tsx` (the modal we open here).
//       No new route is required, and this does not break existing dashboard behavior.
// -------------------------------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

// Admin-only panel
import AdminBanksPanel from '../components/AdminBanksPanel';

// -----------------------------------------
// NEW: Merchants modal (opened by tile click)
// -----------------------------------------
import MerchantsModal from '../components/MerchantsModal';

import AiInsightsPanel from '../components/AiInsightsPanel';
import FraudScoreCard from '../components/FraudScoreCard';

// -----------------------------
// Types
// -----------------------------
type BasicStats = {
    total: number;
    pending: number;
    completed: number;
    sum: number;
};

type Tiles = {
    gmvTotal: number;
    aov: number;
    successRate: number;      // percent 0–100
    pending: number;
    gmvToday: number;
    gmvMonthToDate: number;
    highValueMonthCount: number;
    fraudScore: number;       // 0–100
};

// Endpoint sometimes returns { tiles, events }, sometimes flat (just tiles)
type TilesResponse = { tiles?: Tiles; events?: any[] } | Tiles;

// -----------------------------
// Helpers (null-safe formatters)
// -----------------------------

/** numeric coercion that never throws or yields NaN */
const asNum = (v: unknown) => {
    const n = Number((v as any) ?? 0);
    return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (v: unknown) => `₦${asNum(v).toLocaleString()}`;
const fmtInt = (v: unknown) => asNum(v).toLocaleString();
const fmtPct = (v: unknown) => `${asNum(v)}%`;

/** Safer token check (also avoids throwing on malformed token) */
const isTokenExpired = (jwt: string): boolean => {
    try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

const DashboardPage = () => {
    const { token, logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation() as any;

    const [stats, setStats] = useState<BasicStats | null>(null);
    const [tiles, setTiles] = useState<Tiles | null>(null);
    const [loading, setLoading] = useState(true);

    // Keep a stable interval id across renders for auto-refresh
    const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // ---------------------------------------------------------
    // NEW: Merchants UI state (modal visibility + count on tile)
    // - merchantsOpen: controls the modal opened from the tile
    // - merchantsCount: shows count (admin=all, non-admin=mine)
    // ---------------------------------------------------------
    const [merchantsOpen, setMerchantsOpen] = useState(false);
    const [merchantsCount, setMerchantsCount] = useState<number | null>(null);

    // -----------------------------
    // One-off toast passed via navigation state (e.g., post-login)
    // -----------------------------
    useEffect(() => {
        const msg = location?.state?.toast as string | undefined;
        if (msg) {
            toast.success(msg);
            // prevent replaying on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location?.state]);

    // -----------------------------
    // Role & Display Name (no first/last name dependency)
    // -----------------------------
    const isAdmin = useMemo(
        () => (user?.role || '').toLowerCase() === 'admin',
        [user?.role]
    );

    // Robust display name using common fields, then email handle, then "User"
    const displayName = useMemo(() => {
        const u = (user as any) ?? {};
        const candidates = [
            u.name,            // most common
            u.displayName,     // sometimes used
            u.username,        // alternative field
            u.merchant?.name,  // merchant-owned accounts
            u.profile?.name,   // nested profile objects
            typeof u.email === 'string' ? u.email.split('@')[0] : undefined, // email handle
        ].filter((v: unknown) => typeof v === 'string' && v.trim().length > 0) as string[];

        return candidates[0] ?? 'User';
    }, [user]);

    // ---------------------------------------------------------
    // NEW: Role-aware merchants count with graceful fallback
    // - Tries GET /merchants/count?scope=all|mine first (fast path)
    // - Falls back to GET /merchants?scope=...&limit=1 and reads X-Total-Count
    // - If headers not present, falls back to array length (still safe)
    // ---------------------------------------------------------
    const fetchMerchantsCount = async () => {
        if (!token) return;
        try {
            const scope = isAdmin ? 'all' : 'mine';

            // Preferred: dedicated count endpoint
            const res = await api.get(`/merchants/count?scope=${scope}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (typeof res?.data?.count === 'number') {
                setMerchantsCount(res.data.count);
                return;
            }

            // Fallback: listing endpoint; use header if exposed by server
            const listRes = await api.get(`/merchants?scope=${scope}&limit=1`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const hdrCount = Number(listRes.headers?.['x-total-count']);
            if (Number.isFinite(hdrCount)) {
                setMerchantsCount(hdrCount);
            } else if (Array.isArray(listRes.data)) {
                setMerchantsCount(listRes.data.length);
            } else {
                setMerchantsCount(null);
            }
        } catch (err) {
            console.error('Failed to fetch merchants count', err);
            setMerchantsCount(null); // keep UI usable
        }
    };

    // -----------------------------
    // Initial load + auto-refresh
    // -----------------------------
    useEffect(() => {
        if (!token || isTokenExpired(token)) {
            // If token is missing/expired, clear session and redirect
            logout();
            navigate('/expired', { replace: true });
            return;
        }

        // NOTE (unchanged): dashboard tiles/stats fetcher
        const fetchALL = async () => {
            try {
                setLoading(true);

                // Legacy dashboard stats
                const res = await api.get('/dashboard', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setStats(res.data as BasicStats);

                // Analytics tiles (normalize payload)
                const tilesRes = await api.get<TilesResponse>('/analytics/tiles', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const t = (tilesRes.data as any)?.tiles ?? (tilesRes.data as Tiles);
                setTiles({
                    gmvTotal: asNum(t?.gmvTotal),
                    aov: asNum(t?.aov),
                    successRate: asNum(t?.successRate),
                    pending: asNum(t?.pending),
                    gmvToday: asNum(t?.gmvToday),
                    gmvMonthToDate: asNum(t?.gmvMonthToDate),
                    highValueMonthCount: asNum(t?.highValueMonthCount),
                    fraudScore: asNum(t?.fraudScore),
                });

                // ---------------------------------------------
                // CHANGED: also refresh merchants count for tile
                // - keeps the tile up-to-date without page reload
                // ---------------------------------------------
                await fetchMerchantsCount();
            } catch (err: any) {
                console.error(err);
                if (err?.response?.status === 401) {
                    toast.error('Session expired. Please log in again.');
                    logout();
                    navigate('/expired', { replace: true });
                } else {
                    toast.error(err?.response?.data?.message ?? 'Failed to load dashboard.');
                }
            } finally {
                setLoading(false);
            }
        };

        // Kick off fetching
        fetchALL();

        // Auto-refresh every 60s; store id in ref
        refreshTimer.current = setInterval(fetchALL, 60_000);

        // ----------------------------------------------------------
        // CHANGED: Correct interval cleanup (clearInterval(ref only))
        // - Prevents leaking an interval on unmount / route change
        // ----------------------------------------------------------
        return () => {
            if (refreshTimer.current) clearInterval(refreshTimer.current);
            refreshTimer.current = null;
        };
    }, [token, logout, navigate, isAdmin]); // include isAdmin so scope stays correct

    // -----------------------------
    // Manual refresh handler
    // -----------------------------
    const handleManualRefresh = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [res, tilesRes] = await Promise.all([
                api.get('/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<TilesResponse>('/analytics/tiles', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setStats(res.data as BasicStats);

            const t = (tilesRes.data as any)?.tiles ?? (tilesRes.data as Tiles);
            setTiles({
                gmvTotal: asNum(t?.gmvTotal),
                aov: asNum(t?.aov),
                successRate: asNum(t?.successRate),
                pending: asNum(t?.pending),
                gmvToday: asNum(t?.gmvToday),
                gmvMonthToDate: asNum(t?.gmvMonthToDate),
                highValueMonthCount: asNum(t?.highValueMonthCount),
                fraudScore: asNum(t?.fraudScore),
            });

            // ---------------------------------------------
            // CHANGED: refresh merchants count on manual click
            // ---------------------------------------------
            await fetchMerchantsCount();

            toast.success('Dashboard refreshed');
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message ?? 'Failed to refresh dashboard.');
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------
    // Loading state (keeps background theme visible)
    // -----------------------------
    if (loading) {
        return (
            <>
                <Navbar />
                <div className="pv-dash-bg d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                    <p className="text-light opacity-75">Loading dashboard…</p>
                </div>
                <StyleBlock />
            </>
        );
    }

    // -----------------------------
    // Main Render
    // -----------------------------
    return (
        <>
            <Navbar />

            {/* Background gradient wrapper with dark → deep blue glow */}
            <div className="pv-dash-bg">
                <div className="container mt-4 text-light">
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            {/* Friendly welcome using robust displayName */}
                            <div className="pv-welcome">
                                Welcome, {isAdmin ? 'Admin ' : ''}{displayName}
                            </div>

                            <h2 className="mb-0">Dashboard</h2>
                            <p className="text-light opacity-75 mb-0">
                                {isAdmin ? 'Global stats for all merchants' : 'Stats for your merchant account'}
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-outline-light btn-sm" onClick={handleManualRefresh}>
                                Refresh
                            </button>
                            <Link to="/profile" className="btn btn-primary btn-sm shadow-sm">
                                Profile Settings
                            </Link>
                        </div>
                    </div>

                    {/* Legacy KPI cards (restyled as glossy tiles with descriptions) */}
                    <div className="row mt-3">
                        <div className="col-md-3 mb-3">
                            <div className="pv-glass-card">
                                <div className="pv-card-body">
                                    <div className="pv-tile-title">Total Transactions</div>
                                    <div className="pv-tile-value">{fmtInt(stats?.total)}</div>
                                    <div className="pv-tile-desc">Count of all transactions recorded to date.</div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <div className="pv-glass-card">
                                <div className="pv-card-body">
                                    <div className="pv-tile-title">Completed</div>
                                    <div className="pv-tile-value">{fmtInt(stats?.completed)}</div>
                                    <div className="pv-tile-desc">Transactions successfully processed.</div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <div className="pv-glass-card">
                                <div className="pv-card-body">
                                    <div className="pv-tile-title">Pending</div>
                                    <div className="pv-tile-value">{fmtInt(stats?.pending)}</div>
                                    <div className="pv-tile-desc">Awaiting completion or confirmation.</div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <div className="pv-glass-card">
                                <div className="pv-card-body">
                                    <div className="pv-tile-title">Total Sum</div>
                                    <div className="pv-tile-value">{fmtMoney(stats?.sum)}</div>
                                    <div className="pv-tile-desc">Aggregate value of all transactions.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* New Analytics tiles (+ Merchants tile) */}
                    <div className="row mt-2">
                        <div className="col-md-3 mb-3">
                            <div className="pv-gloss-gradient pv-glass-card">
                                <div className="pv-card-body">
                                    <div className="pv-tile-title">GMV Today</div>
                                    <div className="pv-tile-value">{fmtMoney(tiles?.gmvToday)}</div>
                                    <div className="pv-tile-desc">Gross merchandise value processed today.</div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <div className="pv-gloss-gradient pv-glass-card">
                                <div className="pv-card-body">
                                    <div className="pv-tile-title">GMV MTD</div>
                                    <div className="pv-tile-value">{fmtMoney(tiles?.gmvMonthToDate)}</div>
                                    <div className="pv-tile-desc">Gross merchandise value for this month.</div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <div className="pv-gloss-gradient pv-glass-card">
                                <div className="pv-card-body">
                                    <div className="pv-tile-title">Average Order Value</div>
                                    <div className="pv-tile-value">{fmtMoney(tiles?.aov)}</div>
                                    <div className="pv-tile-desc">Average value per completed transaction.</div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <div className="pv-gloss-gradient pv-glass-card">
                                <div className="pv-card-body">
                                    <div className="pv-tile-title">Success Rate</div>
                                    <div className="pv-tile-value">{fmtPct(tiles?.successRate)}</div>
                                    <div className="pv-tile-desc">Share of transactions that complete successfully.</div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <div className="pv-gloss-gradient pv-glass-card">
                                <div className="pv-card-body">
                                    <div className="pv-tile-title">High-Value Tx (MTD)</div>
                                    <div className="pv-tile-value">{fmtInt(tiles?.highValueMonthCount)}</div>
                                    <div className="pv-tile-desc">Count of large transactions this month.</div>
                                </div>
                            </div>
                        </div>

                        <div className="col-sm-6 col-md-3">
                            <FraudScoreCard initialScore={tiles?.fraudScore ?? 0} />
                        </div>

                        {/* ----------------------------------------------------
                           NEW: Clickable Merchants tile (opens modal, no route)
                           - Displays count (role-aware) with graceful fallback
                           ---------------------------------------------------- */}
                        <div className="col-md-3 mb-3">
                            <button
                                className="pv-gloss-gradient pv-glass-card w-100 text-start"
                                onClick={() => setMerchantsOpen(true)}
                                aria-label={isAdmin ? 'View all merchants' : 'View your merchants'}
                                style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
                            >
                                <div className="pv-card-body">
                                    <div className="pv-tile-title">Merchants</div>
                                    <div className="pv-tile-value">
                                        {merchantsCount == null ? '—' : merchantsCount.toLocaleString()}
                                    </div>
                                    <div className="pv-tile-desc">
                                        {isAdmin ? 'View all merchants' : 'View your merchants'}
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Admin-only section */}
                    {isAdmin && (
                        <>
                            <hr className="border-secondary my-4" />
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <h3 className="mb-0">Admin Panel</h3>
                                <span className="badge text-bg-secondary">Banks</span>
                            </div>
                            <p className="text-light opacity-75">
                                Review pending bank registrations. Approving sends an approval email; rejecting sends a polite
                                rejection email with an optional reason.
                            </p>
                            <div className="pv-glass-card p-2">
                                <AdminBanksPanel />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ----------------------------------------------------
               NEW: Merchants modal mounted at the end of the page
               - Opens from the Merchants tile; no navigation needed
               ---------------------------------------------------- */}
            <MerchantsModal
                open={merchantsOpen}
                onClose={() => setMerchantsOpen(false)}
            />

            {/* Inline style injection for the theme (kept close to the page for easy removal later) */}
            <StyleBlock />
        </>
    );
};

/**
 * StyleBlock
 * - Recreates a 2-color shade (black → deep blue) with subtle radial glows
 * - Provides glossy/glass card aesthetics and hover elevation
 * - Adds a "pv-welcome" style that reads well on dark backgrounds
 * - Keeps styles scoped to dashboard wrappers to avoid leaking globally
 */
const StyleBlock = () => (
    <style>{`
    /* --- Background wrapper: black to electric blue --- */
    .pv-dash-bg {
      width: 100%;
      min-height: 100vh;

      /* Layered gradients for depth (radial glow + linear horizon) */
      background:
        radial-gradient(1200px 600px at 65% -10%, rgba(0, 102, 255, 0.30), rgba(0,0,0,0) 60%),
        radial-gradient(900px 450px at 20% 10%, rgba(0, 50, 160, 0.35), rgba(0,0,0,0) 55%),
        linear-gradient(180deg, #06070a 0%, #061024 45%, #0a1c40 65%, #0b2e75 100%);

      /* Gentle vignette to emphasize center content */
      box-shadow: inset 0 0 160px rgba(0,0,0,0.55);
    }

    /* --- Welcome line (high-contrast on dark bg) --- */
    .pv-welcome{
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #e9f2ff;
      font-size: clamp(16px, 2.2vw, 20px);
      margin-bottom: 4px;
    }

    /* --- Glass / glossy card base --- */
    .pv-glass-card {
      position: relative;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow:
        0 10px 24px rgba(0, 0, 0, 0.35),
        inset 0 1px 0 rgba(255,255,255,0.15);
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      color: #e9f2ff;
    }

    /* --- Subtle glossy highlight strip (top) --- */
    .pv-glass-card::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 16px;
      background: linear-gradient( to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0.0) 35% );
      pointer-events: none;
      mix-blend-mode: screen;
      opacity: 0.65;
    }

    /* --- Hover: lift and brighten --- */
    .pv-glass-card:hover {
      transform: translateY(-2px);
      box-shadow:
        0 16px 36px rgba(0, 0, 0, 0.45),
        inset 0 1px 0 rgba(255,255,255,0.22);
      border-color: rgba(255,255,255,0.22);
    }

    /* --- Extra sheen for analytics tiles --- */
    .pv-gloss-gradient {
      background:
        radial-gradient(120% 150% at 120% -20%, rgba(0, 140, 255, 0.25), rgba(0,0,0,0) 40%),
        linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05));
    }

    /* --- Fraud tile slight warning glow --- */
    .pv-fraud {
      box-shadow:
        0 10px 24px rgba(0, 0, 0, 0.35),
        0 0 32px rgba(255, 127, 39, 0.15),
        inset 0 1px 0 rgba(255,255,255,0.12);
    }

    /* --- Card inner spacing & typography --- */
    .pv-card-body { padding: 16px 18px; }
    .pv-tile-title {
      font-size: 0.875rem;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      opacity: 0.85;
      margin-bottom: 6px;
    }
    .pv-tile-value {
      font-size: 1.6rem;
      font-weight: 700;
      line-height: 1.1;
    }
    .pv-tile-desc {
      margin-top: 6px;
      font-size: 0.86rem;
      color: rgba(233, 242, 255, 0.8);
    }

    /* Buttons readable on dark bg */
    .btn-outline-light {
      border-color: rgba(255,255,255,0.35);
      color: #e9f2ff;
    }
    .btn-outline-light:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.55);
      color: #fff;
    }

    /* Keep HR visible on dark */
    hr.border-secondary {
      border-top-color: rgba(255,255,255,0.2) !important;
    }
  `}</style>
);

export default DashboardPage;
