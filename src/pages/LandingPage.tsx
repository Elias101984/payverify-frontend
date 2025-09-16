// src/pages/LandingPage.tsx
// -----------------------------------------------------------------------------
// Changes & Why
// - Import bg image from src/assets to ensure cache-busted, reliable path.
// - Use non-negative z-index within isolated stacking context so bg is visible.
// - Make hero and cards fully responsive with clamp(), fluid paddings, and
//   grid breakpoints.
// - Keep waitlist API with local fallback when offline.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

/** Import the hero background from src/assets (../ from /pages). */
import heroBg from '../assets/bg.png';

export default function LandingPage() {
    /** Enable programmatic navigation for CTAs. */
    const navigate = useNavigate();

    /** Waitlist form state. */
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    /** Accessibility: focus the hero region on mount for screen readers. */
    const heroRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => { heroRef.current?.focus(); }, []);

    /** Smooth-scroll helper for in-page anchors. */
    const scrollToId = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    /** Submit waitlist; falls back to localStorage if API is unavailable. */
    const submitWaitlist = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null); setMsg(null);

        if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
            setErr('Please enter your name and a valid email.');
            return;
        }

        try {
            setBusy(true);
            await api.post('/waitlist', { name: name.trim(), email: email.trim() });
            setMsg("You're on the list! We’ll be in touch.");
            setName(''); setEmail('');
        } catch {
            const key = 'pv_waitlist_local';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            list.push({ name: name.trim(), email: email.trim(), ts: Date.now() });
            localStorage.setItem(key, JSON.stringify(list));
            setMsg("You're on the list! (Saved locally until the API is ready.)");
            setName(''); setEmail('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <StyleBlock />

            {/* Sticky header with brand and CTAs */}
            <header className="pv-landing-head">
                <div className="pv-head-inner">
                    {/* Animated brand mark with cursive face */}
                    <div className="pv-logo" aria-label="PayVerify">PayVerify</div>

                    {/* Simple, accessible nav */}
                    <nav className="pv-nav" aria-label="Primary">
                        <button className="pv-link" onClick={() => scrollToId('solutions')}>Solutions</button>
                        <button className="pv-link" onClick={() => scrollToId('idv')}>IDV</button>
                        <button className="pv-link" onClick={() => scrollToId('qr')}>QR Payments</button>
                        <button className="pv-link" onClick={() => scrollToId('analytics')}>Analytics</button>
                        <Link to="/login" className="pv-btn pv-btn-dim">Login</Link>
                        <Link to="/register-user" className="pv-btn pv-btn-primary">Create Account</Link>
                    </nav>
                </div>
            </header>

            {/* Hero section with layered background + overlay + content */}
            <section className="pv-hero" ref={heroRef} tabIndex={-1} aria-labelledby="hero-title">
                {/* Background layer with imported asset */}
                <div
                    className="pv-hero-bg"
                    style={{
                        backgroundImage: `url(${heroBg})`,
                    }}
                    aria-hidden
                />

                {/* Soft overlay to improve text contrast */}
                <div className="pv-hero-overlay" aria-hidden />

                {/* Headline, subcopy, and CTAs */}
                <div className="pv-hero-content">
                    <h1 id="hero-title" className="pv-hero-title">
                        <span>Loved by users.</span><br />
                        <span className="pv-underline">Loathed by fraudsters.</span>
                    </h1>

                    <p className="pv-hero-sub">
                        Verify Merchant identity, generate secure QR codes for payments, and monitor risk with our
                        AI-driven tools—frictionless for customers, relentless on fraud.
                    </p>

                    <div className="pv-cta-row">
                        <button className="pv-btn pv-btn-primary" onClick={() => navigate('/qr-generator')}>See QR in Action</button>
                        <button className="pv-btn pv-btn-dim" onClick={() => scrollToId('solutions')}>Explore Solutions</button>
                    </div>

                    {/* Compact, mobile-friendly waitlist form */}
                    <form className="pv-waitlist" onSubmit={submitWaitlist}>
                        <div className="pv-waitlist-title">Join the waitlist</div>
                        <div className="pv-waitlist-grid">
                            <input
                                className="pv-input"
                                type="text"
                                placeholder="Full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                aria-label="Full name"
                            />
                            <input
                                className="pv-input"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-label="Email"
                            />
                            <button className="pv-btn pv-btn-success" type="submit" disabled={busy}>
                                {busy ? 'Adding…' : 'Join Waitlist'}
                            </button>
                        </div>
                        {msg && <div className="pv-alert pv-ok" role="status">{msg}</div>}
                        {err && <div className="pv-alert pv-err" role="alert">{err}</div>}
                    </form>
                </div>
            </section>

            {/* Solution cards grid */}
            <section id="solutions" className="pv-solutions" aria-label="Solutions">
                <div className="pv-sol-grid">
                    <article id="idv" className="pv-card">
                        <div className="pv-card-kicker" aria-hidden>🔎</div>
                        <h3>Instant ID Verification (IDV)</h3>
                        <p>Document + device + behavior signals stop impersonation and bots—without slowing good customers.</p>
                    </article>

                    <article id="qr" className="pv-card">
                        <div className="pv-card-kicker" aria-hidden>💳</div>
                        <h3>QR Payments</h3>
                        <p>Generate and accept QR codes in seconds. Track settlements, disputes, and refunds centrally.</p>
                    </article>

                    <article id="analytics" className="pv-card">
                        <div className="pv-card-kicker" aria-hidden>📊</div>
                        <h3>Merchant Analytics</h3>
                        <p>Dashboards for GMV, success rate, and risk. Export anytime for finance &amp; ops.</p>
                    </article>

                    <article className="pv-card">
                        <div className="pv-card-kicker" aria-hidden>🛡️</div>
                        <h3>Transaction Screening</h3>
                        <p>Velocity checks, blacklists, and device risk auto-block suspicious activity in real time.</p>
                    </article>
                </div>
            </section>
        </>
    );
}

/** Local CSS (scoped to this page). */
const StyleBlock = () => (
    <style>{`
  /* Type & Theme ------------------------------------------------------------------------- */
  @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Outfit:wght@400;700;900&display=swap');

  :root{
    --pv-bg:#0a0f19;          /* Deep navy for app chrome */
    --pv-bg-2:#0f1b2f;        /* Secondary panel bg */
    --pv-border:rgba(255,255,255,0.15);
    --pv-text:#e8f1ff;        /* Primary text on dark */
    --pv-text-dim:rgba(232,241,255,.85);
    --pv-primary:#2a7bff;     /* Brand blue */
    --pv-success:#00c389;     /* Success green */
  }

  /* Header ------------------------------------------------------------------------------- */
  .pv-landing-head{
    position: sticky; top: 0; z-index: 50;
    backdrop-filter: blur(8px) saturate(140%);
    background: linear-gradient(180deg, rgba(10,15,25,.65), rgba(10,15,25,.35));
    border-bottom: 1px solid var(--pv-border);
  }
  .pv-head-inner{
    max-width: 1200px;
    margin: 0 auto;
    padding: 10px clamp(12px, 3vw, 20px);
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
  }

  /* Logo with gentle animation ----------------------------------------------------------- */
  .pv-logo{
    font-family:'Lucida Handwriting','Pacifico',cursive;
    font-weight:700;
    font-size: clamp(24px, 3.8vw, 44px);
    letter-spacing:.3px;
    background: linear-gradient(120deg, #e9f2ff, #b9d5ff 30%, #6aa6ff 60%, #b9d5ff 85%, #e9f2ff);
    background-size:220% 100%;
    -webkit-background-clip:text; background-clip:text; color:transparent;
    filter: drop-shadow(0 2px 10px rgba(0,0,0,.35));
    position:relative;
    animation: pvTextSweep 6s ease-in-out infinite, pvFloat 5.8s ease-in-out infinite;
    white-space: nowrap;
  }
  .pv-logo::after{
    content:""; position:absolute; inset:-6px -10px;
    background: linear-gradient(70deg, transparent 45%, rgba(255,255,255,.55) 50%, transparent 55%);
    mix-blend-mode: screen; pointer-events:none;
    animation: pvSheen 3.5s ease-in-out infinite;
  }
  @keyframes pvTextSweep{ 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes pvSheen{ 0%{transform:translateX(-140%);opacity:0} 10%{opacity:.75} 35%{transform:translateX(140%);opacity:0} 100%{transform:translateX(140%);opacity:0} }
  @keyframes pvFloat{ 0%{transform:translateY(0)} 50%{transform:translateY(-3px)} 100%{transform:translateY(0)} }

  .pv-nav{ display:flex; gap:8px; align-items:center; flex-wrap: wrap; }
  .pv-link{
    background:transparent; border:0;
    color:var(--pv-text-dim); font-weight:700;
    padding:8px 10px; border-radius:10px; cursor:pointer;
  }
  .pv-link:hover{ color:var(--pv-text); }

  .pv-btn{
    border-radius:12px; padding:10px 14px; font-weight:800; line-height:1;
    border:1px solid var(--pv-border); color:var(--pv-text); background:rgba(255,255,255,.04);
  }
  .pv-btn:hover{ background:rgba(255,255,255,.08); }
  .pv-btn-primary{ background: linear-gradient(180deg,#3c89ff,#2a7bff); border-color:transparent; color:#fff; }
  .pv-btn-primary:hover{ filter: brightness(1.06); }
  .pv-btn-dim{ color:var(--pv-text); background:rgba(255,255,255,.08); }
  .pv-btn-success{ background: linear-gradient(180deg,#05d39b,#00c389); color:#072016; border-color:transparent; font-weight:900; }

  /* Hero --------------------------------------------------------------------------------- */
  .pv-hero{
    position: relative;
    isolation: isolate; /* Ensures predictable layer stacking inside */
    min-height: 70vh;
    display: grid; place-items: center;
    padding: clamp(40px, 7vw, 80px) 0;
    background:
      radial-gradient(1200px 500px at 60% -10%, rgba(73,126,255,.25), rgba(0,0,0,0) 60%),
      linear-gradient(180deg, var(--pv-bg), var(--pv-bg-2));
    overflow: hidden;
  }
  .pv-hero-bg{
    position:absolute; inset:0;
    background-position:center; background-repeat:no-repeat; background-size:cover;
    opacity:.42; transform: scale(1.02);
    z-index:0; /* Non-negative to render above parent's background */
  }
  .pv-hero-overlay{
    position:absolute; inset:0;
    background:
      radial-gradient(1000px 600px at 50% 0%, rgba(110,136,255,.25), rgba(0,0,0,0) 60%),
      linear-gradient(180deg, rgba(8,13,24,.55), rgba(8,13,24,.70));
    z-index:1; /* Sits above the bg image, below content */
  }
  .pv-hero-content{
    position:relative; z-index:2;
    width:100%; max-width:1100px;
    padding: 0 clamp(14px, 4vw, 20px);
    color:var(--pv-text);
  }
  .pv-hero-title{
    margin:0 0 12px;
    font-family:'Outfit',system-ui; font-weight:900; line-height:1.02;
    font-size: clamp(32px, 5vw, 56px);
    letter-spacing:.2px;
    text-shadow:0 6px 30px rgba(0,0,0,.45);
  }
  .pv-underline{ position:relative; display:inline-block; }
  .pv-underline::after{
    content:""; position:absolute; left:0; right:0; bottom:-6px; height:8px;
    background:linear-gradient(90deg,#7fb4ff,#2a7bff); border-radius:999px; opacity:.9;
  }
  .pv-hero-sub{
    max-width: 60ch;
    color:var(--pv-text-dim);
    font-weight:700;
    font-size: clamp(14px, 1.4vw, 18px);
    margin: 10px 0 20px;
  }
  .pv-cta-row{ display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px; }

  /* Waitlist ----------------------------------------------------------------------------- */
  .pv-waitlist{
    margin-top:10px;
    background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.05));
    border:1px solid var(--pv-border);
    padding:14px; border-radius:14px;
    backdrop-filter: blur(6px) saturate(140%);
    max-width:820px;
  }
  .pv-waitlist-title{ font-weight:900; margin-bottom:8px; }
  .pv-waitlist-grid{
    display:grid;
    grid-template-columns: 1.2fr 1.8fr auto;
    gap:10px;
  }
  @media (max-width: 760px){
    .pv-waitlist-grid{ grid-template-columns: 1fr; }
  }
  .pv-input{
    background:rgba(255,255,255,.92);
    border:1px solid rgba(255,255,255,.35);
    border-radius:10px; padding:10px 12px; font-weight:800; width:100%;
  }
  .pv-alert{ margin-top:8px; padding:8px 10px; border-radius:10px; font-weight:800; }
  .pv-ok{ background:rgba(0,195,137,.16); color:#aef2dc; border:1px solid rgba(0,195,137,.35); }
  .pv-err{ background:rgba(255,97,97,.18); color:#ffd1d1; border:1px solid rgba(255,97,97,.35); }

  /* Solutions Grid ----------------------------------------------------------------------- */
  .pv-solutions{
    background: linear-gradient(180deg, var(--pv-bg-2), #0b1322);
    padding: clamp(28px, 6vw, 56px) clamp(14px, 4vw, 20px) clamp(60px, 8vw, 90px);
    color:var(--pv-text);
  }
  .pv-sol-grid{
    max-width:1100px; margin:0 auto;
    display:grid; grid-template-columns:repeat(4,1fr); gap:16px;
  }
  @media (max-width:1100px){
    .pv-sol-grid{ grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:640px){
    .pv-sol-grid{ grid-template-columns:1fr; }
  }
  .pv-card{
    background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
    border:1px solid var(--pv-border);
    border-radius:16px; padding:16px;
    box-shadow:0 16px 40px rgba(0,0,0,.25);
    backdrop-filter: blur(8px) saturate(140%);
  }
  .pv-card h3{ margin:4px 0 6px; font-family:'Outfit',system-ui; font-weight:900; font-size: clamp(18px, 2vw, 22px); }
  .pv-card p{ color:var(--pv-text-dim); font-weight:700; }
  .pv-card-kicker{ font-size:20px; }

  /* Motion prefs ------------------------------------------------------------------------- */
  @media (prefers-reduced-motion: reduce){
    .pv-logo, .pv-logo::after{ animation:none !important; }
  }
  `}</style>
);
