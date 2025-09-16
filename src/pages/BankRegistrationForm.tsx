// src/pages/BankRegistrationForm.tsx
// -----------------------------------------------------------------------------
// What changed & why
// - ✅ Moved useState(hp) INSIDE the component (fixes "Invalid hook call").
// - ✅ Honeypot field included (hidden) and sent in POST body as companyWebsite.
// - ❌ All Turnstile code removed.
// -----------------------------------------------------------------------------

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUniversity, faUser, faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const BankRegistrationForm: React.FC = () => {
    const navigate = useNavigate();

    // Form state
    const [bankName, setBankName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    // Honeypot (must stay empty for humans)
    const [hp, setHp] = useState('');

    // UI state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        try {
            setSubmitting(true);
            const res = await fetch(`${API_URL}/banks/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bankName,
                    contactPerson,
                    contactEmail,
                    contactPhone,
                    companyWebsite: hp, // honeypot—should be empty for real users
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error((data as any)?.message || 'Registration failed.');
            }

            setSuccess(true);
            // Optional redirect:
            // setTimeout(() => navigate('/bank-login'), 1500);
        } catch (err: any) {
            setError(err?.message || 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="pv-auth-bg d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh' }}>
                <div className="container" style={{ maxWidth: 560 }}>
                    <div className="card pv-glass shadow-lg">
                        <div className="card-body p-4 p-md-5">
                            {/* Glossy Title */}
                            <h1 className="pv-glossy-title text-center mb-2">Register Your Bank</h1>
                            <p className="text-light-50 text-center mb-4">
                                Tell us about your institution and a contact. We’ll reach out to complete onboarding.
                            </p>

                            <form className="row g-3" onSubmit={handleSubmit}>
                                {/* Bank Name */}
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Bank Name</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon icon={faUniversity} />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            placeholder="e.g. PayVerify Bank PLC"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Contact Person */}
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Contact Person</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon icon={faUser} />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={contactPerson}
                                            onChange={(e) => setContactPerson(e.target.value)}
                                            placeholder="Full name"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Contact Email */}
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Contact Email</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon icon={faEnvelope} />
                                        </span>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={contactEmail}
                                            onChange={(e) => setContactEmail(e.target.value)}
                                            placeholder="name@yourbank.com"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Contact Phone */}
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Contact Phone</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FontAwesomeIcon icon={faPhone} />
                                        </span>
                                        <input
                                            type="tel"
                                            className="form-control"
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                            placeholder="+234 801 234 5678"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Feedback */}
                                {error && (
                                    <div className="col-12">
                                        <div className="alert alert-danger mb-0">{error}</div>
                                    </div>
                                )}
                                {success && (
                                    <div className="col-12">
                                        <div className="alert alert-success mb-0">
                                            Thanks! Your request has been received. We’ll contact you shortly.
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="col-6 d-grid">
                                    <button
                                        type="button"
                                        className="btn btn-outline-light fw-bold"
                                        onClick={() => navigate('/bank-login')}
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <div className="col-6 d-grid">
                                    <button type="submit" className="btn btn-primary fw-bold" disabled={submitting}>
                                        {submitting ? 'Submitting…' : 'Register Bank'}
                                    </button>
                                </div>

                                <div className="col-12 text-center mt-1">
                                    <small className="text-light-50">
                                        Already have access?{' '}
                                        <Link to="/bank-login" className="text-decoration-none">Back to Bank Login</Link>
                                    </small>
                                </div>

                                {/* Honeypot (hidden from users; bots often fill it) */}
                                <div className="d-none" aria-hidden="true">
                                    <label className="form-label">Company Website</label>
                                    <input
                                        type="url"
                                        name="companyWebsite"
                                        value={hp}
                                        onChange={(e) => setHp(e.target.value)}
                                        autoComplete="url"
                                        tabIndex={-1}
                                        className="form-control"
                                        placeholder="https://example.com"
                                    />
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
    /* --- Background: same as the login theme --- */
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

    /* --- Glossy title with animated sheen --- */
    .pv-glossy-title {
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1.05;
      font-size: clamp(1.65rem, 2.0vw + 1rem, 2.2rem);
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

    /* --- Form readability on dark --- */
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
    .btn-outline-light { border-color: rgba(255,255,255,.45); color: #f0f6ff; font-weight: 800; }
    .btn-outline-light:hover { background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.65); color: #ffffff; }
    .btn.btn-primary { font-weight: 900; }
  `}</style>
);

export default BankRegistrationForm;
