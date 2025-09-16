// src/pages/MerchantCreatedPage.tsx
// -----------------------------------------------------------------------------
// Merchant Created (glossy + centered)
//
// What changed (presentation only):
// - Dark gradient hero background that matches your login/bank theme
// - Centered glassy card with subtle sheen + rounded corners
// - Glossy title, soft breadcrumb, and tidy two-column “facts” grid
// - Framed QR preview with gentle glow and bold buttons
// - Inline CSS via <StyleBlock /> (no global CSS edits; backend unchanged)
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';

interface Merchant {
    id: number;
    name: string;
    email?: string;
    cac_number: string;
    account_number: string;
    bank_name: string;
    qrUrl?: string;
    qrToken?: string;
    qrGeneratedAt?: string;
}

const maskAcc = (acct?: string) =>
    acct && acct.length >= 4 ? `**** ${acct.slice(-4)}` : acct || '—';

const MerchantCreatedPage = () => {
    const { merchantId } = useParams<{ merchantId: string }>();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [merchant, setMerchant] = useState<Merchant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchMerchant = async () => {
        const res = await api.get(`/merchants/${merchantId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setMerchant(res.data);
    };

    useEffect(() => {
        const init = async () => {
            try {
                await fetchMerchant();
                toast.success('Merchant created successfully!');
            } catch (err: any) {
                console.error(err);
                setError('Failed to load merchant details');
            } finally {
                setLoading(false);
            }
        };
        if (merchantId && token) init();
    }, [merchantId, token]);

    const handleDownloadQR = () => {
        if (merchant?.qrUrl) saveAs(merchant.qrUrl, 'merchant-qr.png');
    };

    const handleRegenerateQR = async () => {
        try {
            await api.post(
                '/qr/regenerate',
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchMerchant();
            toast.success('QR Code regenerated!');
        } catch {
            toast.error('Failed to regenerate QR');
        }
    };

    const handleEmailQR = async () => {
        try {
            await api.post(
                '/qr/email',
                { merchantId: merchant?.id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('QR Code emailed successfully!');
        } catch {
            toast.error('Failed to send email.');
        }
    };

    return (
        <>
            <Navbar />

            {/* Background wrapper (fills page under the navbar) */}
            <div className="pv-auth-bg d-flex align-items-center justify-content-center py-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
                <div className="container" style={{ maxWidth: 980 }}>
                    <div className="card pv-glass shadow-lg">
                        <div className="card-body p-4 p-md-5">
                            {/* Breadcrumbs */}
                            <nav aria-label="breadcrumb" className="mb-3">
                                <ol className="breadcrumb pv-crumbs mb-0">
                                    <li className="breadcrumb-item">
                                        <Link to="/dashboard">Dashboard</Link>
                                    </li>
                                    <li className="breadcrumb-item">
                                        <Link to="/register">Register</Link>
                                    </li>
                                    <li className="breadcrumb-item active" aria-current="page">
                                        Merchant Created
                                    </li>
                                </ol>
                            </nav>

                            {/* Title */}
                            <h1 className="pv-glossy-title mb-1">Merchant Registration Complete</h1>
                            <p className="text-light-50 mb-4">
                                Your merchant account and QR code have been generated.
                            </p>

                            {loading && (
                                <div className="text-center text-light-50 py-4">Loading merchant…</div>
                            )}

                            {error && !loading && (
                                <div className="alert alert-danger">{error}</div>
                            )}

                            {merchant && !loading && !error && (
                                <>
                                    {/* Info + QR grid */}
                                    <div className="row g-4 align-items-start">
                                        {/* Merchant quick facts */}
                                        <div className="col-12 col-lg-6">
                                            <div className="pv-pane p-3 p-md-4">
                                                <h5 className="mb-3">Merchant Details</h5>

                                                <div className="row gy-3">
                                                    <div className="col-5 text-light-50">Name</div>
                                                    <div className="col-7 fw-semibold">{merchant.name}</div>

                                                    <div className="col-5 text-light-50">CAC Number</div>
                                                    <div className="col-7 fw-semibold">{merchant.cac_number}</div>

                                                    <div className="col-5 text-light-50">Bank</div>
                                                    <div className="col-7 fw-semibold">{merchant.bank_name}</div>

                                                    <div className="col-5 text-light-50">Account</div>
                                                    <div className="col-7 fw-semibold">{maskAcc(merchant.account_number)}</div>

                                                    {merchant.qrGeneratedAt && (
                                                        <>
                                                            <div className="col-5 text-light-50">QR Generated</div>
                                                            <div className="col-7 fw-semibold">
                                                                {new Date(merchant.qrGeneratedAt).toLocaleString()}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* QR preview & actions */}
                                        <div className="col-12 col-lg-6">
                                            <div className="pv-pane p-3 p-md-4 text-center">
                                                <h5 className="mb-3">Your QR Code</h5>

                                                {merchant.qrUrl ? (
                                                    <>
                                                        <div className="qr-frame mx-auto mb-3">
                                                            <img
                                                                src={merchant.qrUrl}
                                                                alt="Merchant QR"
                                                                className="img-fluid"
                                                                style={{ maxWidth: 320 }}
                                                            />
                                                        </div>

                                                        <div className="d-flex flex-wrap gap-2 justify-content-center">
                                                            <button className="btn btn-success fw-bold" onClick={handleDownloadQR}>
                                                                📥 Download
                                                            </button>
                                                            <button className="btn btn-warning fw-bold" onClick={handleRegenerateQR}>
                                                                ♻️ Regenerate
                                                            </button>
                                                            <button className="btn btn-primary fw-bold" onClick={handleEmailQR}>
                                                                📧 Email QR
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="alert alert-secondary mb-0">
                                                        QR code not available.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Back / CTA */}
                                    <div className="text-center mt-4">
                                        <button
                                            className="btn btn-outline-light fw-bold me-2"
                                            onClick={() => navigate('/dashboard')}
                                        >
                                            ← Back to Dashboard
                                        </button>
                                        <button
                                            className="btn btn-outline-primary fw-bold"
                                            onClick={() => navigate('/register')}
                                        >
                                            + Create Another Merchant
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <StyleBlock />
        </>
    );
};

const StyleBlock = () => (
    <style>{`
    /* Background matches your glossy theme */
    .pv-auth-bg {
      background:
        radial-gradient(1200px 420px at 50% 0%, rgba(35, 105, 255, 0.20), rgba(0,0,0,0) 55%),
        linear-gradient(180deg, #05070b 0%, #0a0f19 40%, #0e1a2d 68%, #0f2138 85%, #0f243f 100%);
      box-shadow: inset 0 0 240px rgba(0,0,0,0.70);
    }

    /* Main glass card */
    .pv-glass {
      border: 1px solid rgba(255,255,255,0.16);
      background:
        linear-gradient(180deg, rgba(5, 10, 20, 0.35), rgba(5, 10, 20, 0.35)),
        linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06));
      backdrop-filter: blur(10px) saturate(140%);
      -webkit-backdrop-filter: blur(10px) saturate(140%);
      border-radius: 18px;
      color: #eef5ff;
      position: relative;
      overflow: hidden;
    }
    .pv-glass::before {
      content: "";
      position: absolute; inset: 0;
      background: linear-gradient(to bottom, rgba(255,255,255,0.18), rgba(255,255,255,0) 36%);
      pointer-events: none; mix-blend-mode: screen;
    }

    /* Smaller glass panes inside the card */
    .pv-pane {
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 14px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04));
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    /* Glossy animated title */
    .pv-glossy-title {
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1.05;
      font-size: clamp(1.6rem, 1.5vw + 1rem, 2rem);
      background: linear-gradient(180deg, #ffffff 0%, #d7e7ff 58%, #7fb4ff 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      filter: drop-shadow(0 2px 10px rgba(0,0,0,.55));
      position: relative;
      overflow: hidden;
    }
    .pv-glossy-title::after {
      content:"";
      position:absolute;
      top:0; left:-120%;
      height:100%; width:55%;
      transform: skewX(-20deg);
      background: linear-gradient(
        75deg,
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,.75) 10%,
        rgba(255,255,255,0) 20%
      );
      animation: pvTitleShine 3.2s ease-in-out infinite;
      pointer-events:none;
    }
    @keyframes pvTitleShine {
      0% { left: -120%; }
      55% { left: 130%; }
      100% { left: 130%; }
    }

    /* Breadcrumbs tuned for dark surface */
    .pv-crumbs .breadcrumb-item a { color: #b9d1ff; text-decoration: none; }
    .pv-crumbs .breadcrumb-item a:hover { color: #ffffff; text-decoration: underline; }
    .pv-crumbs .breadcrumb-item + .breadcrumb-item::before {
      color: rgba(255,255,255,0.45);
    }
    .pv-crumbs .active { color: rgba(233,242,255,.95); font-weight: 700; }

    /* Light text helpers */
    .text-light-50 { color: rgba(233,242,255,.82) !important; }

    /* QR frame with glow */
    .qr-frame {
      display: inline-block;
      padding: 10px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.18);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04));
      box-shadow:
        0 10px 24px rgba(0,0,0,0.35),
        0 0 32px rgba(0, 140, 255, 0.15);
    }

    /* Buttons heavier on dark */
    .btn { border-radius: 10px; }
    .btn-outline-light { border-color: rgba(255,255,255,.45); color: #f0f6ff; font-weight: 800; }
    .btn-outline-light:hover { background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.65); color: #ffffff; }
    .btn-outline-primary { font-weight: 800; }
    .btn.btn-primary, .btn.btn-success, .btn.btn-warning { font-weight: 900; }
  `}</style>
);

export default MerchantCreatedPage;
