// -----------------------------------------------------------------------------
// RegisterPage.tsx
// Purpose
// - Register Merchant form with Navbar, responsive UI, and client validation.
// - Posts payload using snake_case keys that match your DB/validators.
// What changed (now) & why:
// - ✅ Added useNavigate + redirect to /merchant-created/:id immediately on success
//   (so the confirmation page can fetch & display the QR).
// - ✅ Still includes userId from AuthContext in the request body (your core logic).
// - ✅ Keeps TIN, BVN, Email required + existing look and feel.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { registerMerchant } from '../services/api';

type Form = {
    name: string;
    cacNumber: string;
    tin: string;
    bvn: string;
    bankName: string;
    accountNumber: string;
    accountNumber2: string;
    email: string;
};

export default function RegisterPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState<Form>({
        name: '',
        cacNumber: '',
        tin: '',
        bvn: '',
        bankName: '',
        accountNumber: '',
        accountNumber2: '',
        email: '',
    });

    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const update = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((s) => ({ ...s, [k]: e.target.value }));

    // ---- validators ----
    const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
    const isValidBVN = (v: string) => /^[0-9]{11}$/.test(v);
    const isValidAcct = (v: string) => /^[0-9]{10}$/.test(v);
    const isValidTIN = (v: string) => /^[A-Za-z0-9\-\/]{8,14}$/.test(v.trim());

    const validate = (): string | null => {
        if (!form.name.trim()) return 'Business Name is required.';
        if (!form.cacNumber.trim()) return 'CAC Number is required.';
        if (!form.tin.trim()) return 'TIN Number is required.';
        if (!isValidTIN(form.tin)) return 'Enter a valid TIN (8–14 chars; letters/digits allowed).';
        if (!form.bvn.trim()) return 'BVN is required.';
        if (!isValidBVN(form.bvn)) return 'BVN must be exactly 11 digits.';
        if (!form.bankName.trim()) return 'Bank Name is required.';
        if (!form.accountNumber.trim()) return 'Account Number is required.';
        if (!isValidAcct(form.accountNumber)) return 'Account Number must be 10 digits.';
        if (form.accountNumber !== form.accountNumber2) return 'Account numbers do not match.';
        if (!form.email.trim()) return 'Email is required.';
        if (!isValidEmail(form.email)) return 'Enter a valid email address.';
        return null;
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);

        // derive uid from the logged-in user (supports id or userId field)
        const uid = Number((user as any)?.id ?? (user as any)?.userId);
        if (!uid) {
            setErr('You must be logged in to register a merchant.');
            return;
        }

        const v = validate();
        if (v) {
            setErr(v);
            return;
        }

        try {
            setBusy(true);

            // snake_case + userId per backend contract
            const payload = {
                userId: uid,
                name: form.name.trim(),
                cac_number: form.cacNumber.trim(),
                tin_number: form.tin.trim(),
                bvn: form.bvn.trim(),
                bank_name: form.bankName.trim(),
                account_number: form.accountNumber.trim(),
                email: form.email.trim(),
            };

            if (import.meta.env.DEV) console.debug('[Register Merchant] payload', payload);

            // POST and get created id
            const { data } = await registerMerchant(payload); // -> { merchant: { id, ... }, qr: {...} }
            const merchantId = data?.merchant?.id;
            if (!merchantId) throw new Error('No merchant id returned');

            // redirect to confirmation/details page
            navigate(`/merchant-created/${merchantId}`);
        } catch (e: any) {
            const data = e?.response?.data;
            const msg =
                (Array.isArray(data?.errors) && data.errors.join(', ')) ||
                data?.message ||
                data?.error ||
                e?.message ||
                'Failed to register merchant.';
            setErr(msg);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Navbar />

            <div className="reg-wrap reg-offset">
                <form className="reg-card" onSubmit={submit} noValidate>
                    <h1 className="reg-title">Register Merchant</h1>
                    <p className="reg-sub">Provide your business details. You’ll get a confirmation screen next.</p>

                    <div className="grid">
                        <label>
                            <span>Business Name <Req /></span>
                            <input value={form.name} onChange={update('name')} placeholder="e.g., XYZ Enterprises" />
                        </label>

                        <label>
                            <span>CAC Number <Req /></span>
                            <input value={form.cacNumber} onChange={update('cacNumber')} placeholder="RC#######" />
                        </label>

                        <label>
                            <span>TIN Number <Req /></span>
                            <input value={form.tin} onChange={update('tin')} placeholder="Tax Identification Number" maxLength={14} />
                        </label>

                        <label>
                            <span>BVN <Req /></span>
                            <input
                                value={form.bvn}
                                onChange={update('bvn')}
                                placeholder="Bank Verification Number (11 digits)"
                                inputMode="numeric" pattern="[0-9]*" maxLength={11}
                            />
                        </label>

                        <label>
                            <span>Bank Name <Req /></span>
                            <input value={form.bankName} onChange={update('bankName')} placeholder="e.g., Zenith Bank" />
                        </label>

                        <label>
                            <span>Account Number <Req /></span>
                            <input
                                value={form.accountNumber}
                                onChange={update('accountNumber')}
                                placeholder="1234567890"
                                inputMode="numeric" pattern="[0-9]*" maxLength={10}
                            />
                        </label>

                        <label>
                            <span>Confirm Account Number <Req /></span>
                            <input
                                value={form.accountNumber2}
                                onChange={update('accountNumber2')}
                                placeholder="Re-enter account number"
                                inputMode="numeric" pattern="[0-9]*" maxLength={10}
                            />
                        </label>

                        <label className="full">
                            <span>Email <Req /></span>
                            <input value={form.email} onChange={update('email')} placeholder="you@company.com" />
                        </label>
                    </div>

                    {err && <div className="alert err" role="alert">{err}</div>}

                    <button className="btn primary" type="submit" disabled={busy}>
                        {busy ? 'Submitting…' : 'Register Merchant'}
                    </button>
                </form>
            </div>

            <style>{`
        :root{
          --pv-bg:#0a0f19; --pv-bg-2:#0f1b2f;
          --pv-border:rgba(255,255,255,.14);
          --pv-text:#e8f1ff; --pv-text-dim:rgba(232,241,255,.85);
          --pv-primary:#2a7bff;
        }
        .reg-offset{ padding-top: clamp(64px, 8vh, 96px); }
        .reg-wrap{
          min-height:100vh; display:grid; place-items:center; padding:24px;
          background: radial-gradient(800px 400px at 50% 0%, rgba(120,150,255,.18), transparent 60%),
                      linear-gradient(180deg,var(--pv-bg),var(--pv-bg-2));
        }
        .reg-card{
          width:min(880px, 96vw);
          border-radius:16px; padding: clamp(16px, 3vw, 28px);
          background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.05));
          border:1px solid var(--pv-border); color:var(--pv-text);
          box-shadow:0 16px 40px rgba(0,0,0,.35);
        }
        .reg-title{ margin:4px 0 4px; text-align:center; font-weight:900; font-size: clamp(24px, 3.2vw, 36px); }
        .reg-sub{ text-align:center; color:var(--pv-text-dim); margin:0 0 16px; font-weight:700; }
        .grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .grid .full{ grid-column:1 / -1; }
        label{ display:flex; flex-direction:column; gap:6px; font-weight:700; }
        input{
          background:rgba(255,255,255,.95); border:1px solid rgba(255,255,255,.35);
          border-radius:10px; padding:12px; color:#0a0f19; font-weight:700;
        }
        .btn.primary{
          width:100%; margin-top:14px; border-radius:12px; padding:12px 16px; font-weight:900;
          background: linear-gradient(180deg,#3c89ff,var(--pv-primary)); border:0; color:#fff;
        }
        .alert{ margin-top:10px; padding:10px 12px; border-radius:10px; font-weight:800; }
        .alert.ok{ background:rgba(0,195,137,.16); color:#aef2dc; border:1px solid rgba(0,195,137,.35); }
        .alert.err{ background:rgba(255,97,97,.18); color:#ffd1d1; border:1px solid rgba(255,97,97,.35); }
        .req{ color:#ffb3b3; margin-left:4px; font-weight:900; }
        @media (max-width:720px){ .grid{ grid-template-columns:1fr; } }
      `}</style>
        </>
    );
}

function Req() { return <span className="req" aria-hidden>*</span>; }
