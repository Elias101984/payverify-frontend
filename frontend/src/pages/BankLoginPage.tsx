// -----------------------------------------------------------------------------
// Bank Login (Magic Link) — request + verify flow in one page
//
// New in this version:
// 1) Auto-verify support: if URL has ?token=..., we call /bank/login/verify,
//    store the returned JWT under 'bank_token', and redirect to /bank-dashboard.
// 2) Keeps explicit Cloudflare Turnstile render for the "request magic link" form.
// -----------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';
const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '') as string;

declare global {
    interface Window {
        __ts_onload?: () => void;
        turnstile?: {
            render: (el: HTMLElement, opts: Record<string, any>) => any;
            reset: (id?: any) => void;
        };
    }
}

const BankLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // --- state for request-magic-link form
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    // --- state for magic-link verification mode
    const [verifying, setVerifying] = useState(false);
    const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

    // --- Turnstile token handling (for request flow)
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const widgetContainerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<any>(null);

    // If we land with ?token=..., verify immediately
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const oneTimeToken = params.get('token');
        if (!oneTimeToken) return;

        (async () => {
            try {
                setVerifying(true);
                setVerifyMsg('Verifying your login…');

                const res = await fetch(`${API_URL}/bank/login/verify?token=${encodeURIComponent(oneTimeToken)}`);
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data?.message || 'Invalid or expired link.');
                }

                const data = await res.json(); // { token: <jwt>, bank: {...} }
                const jwt = data?.token as string | undefined;
                if (!jwt) throw new Error('Verification did not return a token.');

                // Persist for the dashboard
                localStorage.setItem('bank_token', jwt);

                setVerifyMsg('Login successful! Redirecting…');
                // Replace history so back button doesn’t re-verify
                navigate('/bank-dashboard', { replace: true });
            } catch (e: any) {
                setVerifyMsg(e?.message || 'Could not verify link.');
                // Leave user on this page; they can request a new link below
            } finally {
                setVerifying(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    // Load Turnstile script once and render explicitly
    useEffect(() => {
        if (!TURNSTILE_SITE_KEY) {
            console.warn('[Turnstile] Missing/invalid VITE_TURNSTILE_SITE_KEY');
        }

        const existing = document.querySelector<HTMLScriptElement>(
            'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
        );

        if (!existing) {
            const s = document.createElement('script');
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__ts_onload';
            s.async = true;
            s.defer = true;
            document.head.appendChild(s);
        }

        window.__ts_onload = () => tryRender();
        tryRender();

        return () => {
            delete window.__ts_onload;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tryRender = () => {
        if (!TURNSTILE_SITE_KEY) return;
        if (!widgetContainerRef.current) return;
        if (!window.turnstile) return;
        if (widgetIdRef.current) return; // already rendered

        widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: 'auto',
            appearance: 'always',
            callback: (token: string) => setCaptchaToken(token),
            'expired-callback': () => setCaptchaToken(null),
            'error-callback': () => setCaptchaToken(null),
        });
    };

    const resetWidget = () => {
        try {
            if (window.turnstile && widgetIdRef.current) {
                window.turnstile.reset(widgetIdRef.current);
            }
        } catch { }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSent(false);

        if (!captchaToken) {
            setError('Captcha token is required. Please complete the human check.');
            return;
        }

        try {
            setSubmitting(true);

            const res = await fetch(`${API_URL}/bank/login/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'cf-turnstile-response': captchaToken, // header variant some validators expect
                },
                body: JSON.stringify({
                    contactEmail: email,          // << server expects this key
                    captchaToken,                 // body variants for compatibility
                    turnstileToken: captchaToken,
                    token: captchaToken,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.message || 'Failed to send magic link.');
            }

            setSent(true);
            resetWidget();
            setCaptchaToken(null);
        } catch (err: any) {
            setError(err?.message || 'Could not send magic link.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="pv-auth-bg d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh' }}>
                <div className="container" style={{ maxWidth: 520 }}>
                    <div className="card pv-glass shadow-lg">
                        <div className="card-body p-4 p-md-5">
                            <h1 className="pv-glossy-title text-center mb-2">Bank Login</h1>
                            <p className="text-light-50 text-center mb-4">
                                Use a magic link to access your dashboard.
                            </p>

                            {/* Verification banner when arriving from email link */}
                            {verifying && (
                                <div className="alert alert-info mb-4">🔐 {verifyMsg || 'Verifying your login…'}</div>
                            )}
                            {!verifying && verifyMsg && (
                                <div className="alert alert-warning mb-4">⚠️ {verifyMsg}</div>
                            )}

                            {/* Request-magic-link form */}
                            <form className="row g-3" onSubmit={onSubmit}>
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Contact Email</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon icon={faEnvelope} />
                                        </span>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@yourbank.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="col-12 d-flex justify-content-center">
                                    {!TURNSTILE_SITE_KEY ? (
                                        <div className="alert alert-warning w-100 mb-0">
                                            Missing <code>VITE_TURNSTILE_SITE_KEY</code>. Add it to your <code>.env</code> and restart Vite.
                                        </div>
                                    ) : (
                                        <div ref={widgetContainerRef} />
                                    )}
                                </div>

                                {error && (
                                    <div className="col-12">
                                        <div className="alert alert-danger mb-0">{error}</div>
                                    </div>
                                )}
                                {sent && (
                                    <div className="col-12">
                                        <div className="alert alert-success mb-0">
                                            Magic link sent! Please check <strong>{email}</strong>.
                                        </div>
                                    </div>
                                )}

                                <div className="col-12 d-grid">
                                    <button type="submit" className="btn btn-primary fw-bold" disabled={submitting}>
                                        {submitting ? 'Sending…' : 'Send Magic Link'}
                                    </button>
                                </div>

                                <div className="col-12 d-grid">
                                    <button type="button" className="btn btn-outline-danger fw-bold" onClick={() => navigate('/login')}>
                                        Cancel
                                    </button>
                                </div>

                                <div className="col-12 text-center mt-2">
                                    <small className="text-light-50 d-block mb-1">New Bank?</small>
                                    <Link to="/register-bank" className="btn btn-outline-primary btn-sm px-3">
                                        Register New Bank
                                    </Link>
                                </div>
                            </form>
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
    .pv-auth-bg {
      background:
        radial-gradient(1200px 420px at 50% 0%, rgba(35, 105, 255, 0.20), rgba(0,0,0,0) 55%),
        linear-gradient(180deg, #05070b 0%, #0a0f19 40%, #0e1a2d 68%, #0f2138 85%, #0f243f 100%);
      box-shadow: inset 0 0 240px rgba(0,0,0,0.70);
    }
    .pv-glass {
      border: 1px solid rgba(255,255,255,0.16);
      background:
        linear-gradient(180deg, rgba(5, 10, 20, 0.35), rgba(5, 10, 20, 0.35)),
        linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06));
      backdrop-filter: blur(10px) saturate(140%);
      -webkit-backdrop-filter: blur(10px) saturate(140%);
      position: relative;
      border-radius: 18px;
      overflow: hidden;
      color: #eef5ff;
    }
    .pv-glossy-title {
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1.05;
      font-size: clamp(1.75rem, 2.2vw + 1rem, 2.4rem);
      background: linear-gradient(180deg, #ffffff 0%, #d7e7ff 58%, #7fb4ff 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      filter: drop-shadow(0 2px 10px rgba(0,0,0,.55));
      text-align: center;
    }
    .form-label { font-weight: 800; color: #e9f2ff; }
    .form-control, .form-select {
      font-weight: 700;
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(255,255,255,0.35);
    }
    .input-group-text {
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(255,255,255,0.35);
      font-weight: 700;
    }
    .text-light-50 { color: rgba(233,242,255,.80) !important; }
    .btn-outline-primary { font-weight: 800; }
    .btn-outline-danger  { font-weight: 800; }
    .btn.btn-primary     { font-weight: 900; }
  `}</style>
);

export default BankLoginPage;
