import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import { requestPasswordReset } from '../services/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return toast.error('Please enter your email.');
        try {
            setSubmitting(true);
            await requestPasswordReset(email.trim());
            // Backend should return 200 even if email is unknown (no enumeration).
            toast.success('If that email exists, a reset link has been sent.');
        } catch (err: any) {
            console.error(err);
            // For safety, keep same user message (prevents enumeration).
            toast.success('If that email exists, a reset link has been sent.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Navbar />

            <div className="pv-auth-bg d-flex align-items-center justify-content-center py-5">
                <div className="container" style={{ maxWidth: 560 }}>
                    <div className="card pv-glass shadow-lg">
                        <div className="card-body p-4 p-md-5">
                            <h3 className="text-light fw-bold mb-2">Forgot your password?</h3>
                            <p className="text-light-50 mb-4">
                                Enter the email you used to sign up. We’ll send a one-time reset link.
                            </p>

                            <form onSubmit={onSubmit} className="row g-3">
                                <div className="col-12">
                                    <label className="form-label text-light fw-semibold">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        placeholder="you@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="col-12 d-grid">
                                    <button className="btn btn-primary fw-bold" type="submit" disabled={submitting}>
                                        {submitting ? 'Sending…' : 'Send reset link'}
                                    </button>
                                </div>

                                <div className="col-12">
                                    <Link to="/login" className="text-decoration-none">
                                        ← Back to login
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
}

const StyleBlock = () => (
    <style>{`
    .pv-auth-bg {
      min-height: calc(100vh - 56px); /* minus navbar (approx) */
      background:
        radial-gradient(1100px 220px at 50% 100%, rgba(0,0,0,.35), rgba(0,0,0,0) 60%),
        linear-gradient(180deg, #0c0f13 0%, #151c23 40%, #22303a 68%, #3e4e5a 80%, #aeb8c1 100%);
      box-shadow: inset 0 0 160px rgba(0,0,0,.55);
    }
    .pv-glass {
      border: 1px solid rgba(255,255,255,.20);
      background:
        radial-gradient(120% 160% at 100% 0, rgba(255,255,255,.14), rgba(255,255,255,.06) 60%),
        linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,.08));
      backdrop-filter: blur(10px) saturate(140%);
      -webkit-backdrop-filter: blur(10px) saturate(140%);
      position: relative;
      border-radius: 18px;
      overflow: hidden;
      color: #e9f2ff;
    }
    .pv-glass::before{
      content:""; position:absolute; inset:0;
      background: linear-gradient(to bottom, rgba(255,255,255,.28), rgba(255,255,255,0) 38%);
      pointer-events:none; mix-blend-mode:screen;
    }
    .text-light-50 { color: rgba(233,242,255,.75); }
    .form-control, .form-select { font-weight: 600; }
  `}</style>
);
