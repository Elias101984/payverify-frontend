// src/pages/UserRegistration.tsx
// -----------------------------------------------------------------------------
// Register New User — glossy dark theme (presentation only)
//
// What’s new (no backend changes):
// - Dark gradient hero background (same vibe as your login/bank pages)
// - Glassy card with subtle sheen and rounded corners
// - Bold glossy title with animated light-sweep
// - Email + password + confirm password with show/hide toggles
// - Inline validation (min length, match) with friendly errors
// - Success message then gentle redirect to /login
//
// Endpoint unchanged: POST /api/users/registerUser
// -----------------------------------------------------------------------------

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const UserRegistration: React.FC = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');

    const [showPwd, setShowPwd] = useState(false);
    const [showPwd2, setShowPwd2] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState(false);

    const validate = (): string | null => {
        if (!email.trim()) return 'Email is required.';
        if (!password) return 'Password is required.';
        if (password.length < 8) return 'Password should be at least 8 characters.';
        if (password !== confirm) return 'Passwords do not match.';
        return null;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setOk(false);

        const v = validate();
        if (v) {
            setError(v);
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch(`${API_URL}/users/registerUser`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.message || 'Registration failed.');
            }

            setOk(true);
            // gentle redirect after 1.2s
            setTimeout(() => navigate('/login'), 1200);
        } catch (err: any) {
            setError(err?.message || 'Could not register user.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* No Navbar here for a focused form */}
            <div className="pv-auth-bg d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh' }}>
                <div className="container" style={{ maxWidth: 560 }}>
                    <div className="card pv-glass shadow-lg">
                        <div className="card-body p-4 p-md-5">
                            {/* Glossy Title */}
                            <h1 className="pv-glossy-title text-center mb-2">Register New User</h1>
                            <p className="text-light-50 text-center mb-4">
                                Create your account to access PayVerify tools.
                            </p>

                            <form className="row g-3" onSubmit={onSubmit}>
                                {/* Email */}
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Email</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon icon={faEnvelope} />
                                        </span>
                                        <input
                                            type="email"
                                            className="form-control"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Password</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon icon={faLock} />
                                        </span>
                                        <input
                                            type={showPwd ? 'text' : 'password'}
                                            className="form-control"
                                            placeholder="Create password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowPwd((s) => !s)}
                                            title={showPwd ? 'Hide password' : 'Show password'}
                                        >
                                            <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
                                        </button>
                                    </div>
                                    <div className="form-text text-light-50">Minimum 8 characters.</div>
                                </div>

                                {/* Confirm Password */}
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Confirm Password</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon icon={faLock} />
                                        </span>
                                        <input
                                            type={showPwd2 ? 'text' : 'password'}
                                            className="form-control"
                                            placeholder="Re-enter password"
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowPwd2((s) => !s)}
                                            title={showPwd2 ? 'Hide password' : 'Show password'}
                                        >
                                            <FontAwesomeIcon icon={showPwd2 ? faEyeSlash : faEye} />
                                        </button>
                                    </div>
                                </div>

                                {/* Feedback */}
                                {error && (
                                    <div className="col-12">
                                        <div className="alert alert-danger mb-0">{error}</div>
                                    </div>
                                )}
                                {ok && (
                                    <div className="col-12">
                                        <div className="alert alert-success mb-0">Account created! Redirecting to login…</div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="col-6 d-grid">
                                    <button type="submit" className="btn btn-primary fw-bold" disabled={submitting}>
                                        {submitting ? 'Registering…' : 'Register'}
                                    </button>
                                </div>
                                <div className="col-6 d-grid">
                                    <button type="button" className="btn btn-outline-secondary fw-bold" onClick={() => navigate('/login')}>
                                        Cancel
                                    </button>
                                </div>

                                <div className="col-12 text-center mt-1">
                                    <Link to="/forgot-password" className="text-decoration-none">Forgot Password?</Link>
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
    /* --- Background: same family as your other glossy pages --- */
    .pv-auth-bg {
      background:
        radial-gradient(1200px 420px at 50% 0%, rgba(35, 105, 255, 0.20), rgba(0,0,0,0) 55%),
        linear-gradient(180deg, #05070b 0%, #0a0f19 40%, #0e1a2d 68%, #0f2138 85%, #0f243f 100%);
      box-shadow: inset 0 0 240px rgba(0,0,0,0.70);
    }

    /* --- Glass / glossy card --- */
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
    .pv-glass::before {
      content:"";
      position:absolute; inset:0;
      background: linear-gradient(to bottom, rgba(255,255,255,0.18), rgba(255,255,255,0) 36%);
      pointer-events:none; mix-blend-mode:screen;
    }

    /* --- Glossy animated title --- */
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
      position: relative;
      overflow: hidden;
      text-align: center;
    }
    .pv-glossy-title::after {
      content: "";
      position: absolute;
      top: 0;
      left: -120%;
      height: 100%;
      width: 55%;
      transform: skewX(-20deg);
      background: linear-gradient(
        75deg,
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,.75) 10%,
        rgba(255,255,255,0) 20%
      );
      animation: pvTitleShine 3.2s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes pvTitleShine {
      0% { left: -120%; }
      55% { left: 130%; }
      100% { left: 130%; }
    }

    /* --- Inputs readable on dark --- */
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

    /* --- Buttons --- */
    .btn-outline-secondary { font-weight: 800; }
    .btn.btn-primary { font-weight: 900; }
  `}</style>
);

export default UserRegistration;
