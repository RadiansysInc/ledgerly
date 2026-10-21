"use client";

import { ArrowRight, Check, CircleDollarSign, Eye, EyeOff, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { InvoiceStudio } from "@/components/invoice-studio";

const DEMO_EMAIL = "demo@ledgerly.app";
const DEMO_PASSWORD = "ledgerly2026";

export function AuthGate() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => setAuthenticated(response.ok))
      .finally(() => setReady(true));
  }, []);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      setAuthenticated(true);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
  };

  if (!ready) {
    return <div className="auth-loading"><div className="brand-mark"><span /><span /><span /></div></div>;
  }

  if (authenticated) return <InvoiceStudio onLogout={signOut} />;

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div><strong>Ledgerly</strong><span>Invoice studio</span></div>
        </div>
        <div className="landing-nav-links"><span>Live editor</span><span>Smart totals</span><span>Beautiful PDFs</span></div>
        <span className="landing-nav-note"><span className="status-dot" /> Demo workspace</span>
      </nav>

      <section className="landing-content">
        <div className="landing-copy">
          <span className="landing-kicker"><Sparkles size={13} /> The modern way to invoice</span>
          <h1>From work done to <em>paid—beautifully.</em></h1>
          <p>A focused invoice studio for people who care about the details. Create, customize, save, and send exceptional invoices in minutes.</p>
          <div className="hero-actions">
            <a href="#login">Open demo <ArrowRight size={16} /></a>
            <span><span className="avatar-stack"><i>D</i><i>N</i><i>+</i></span> Loved by detail people</span>
          </div>
          <div className="landing-points">
            <span><Check size={14} /> Live preview</span>
            <span><Check size={14} /> Exact totals</span>
            <span><Check size={14} /> Email delivery</span>
          </div>
          <div className="landing-bento">
            <div><Zap size={18} /><strong>60 sec</strong><small>to a polished invoice</small></div>
            <div><CircleDollarSign size={18} /><strong>100%</strong><small>accurate money math</small></div>
            <div><ShieldCheck size={18} /><strong>Private</strong><small>server-side storage</small></div>
          </div>
        </div>

        <div className="login-card-wrap">
          <div className="login-glow" />
          <div className="floating-stat stat-one"><span>Paid this month</span><strong>$8,450</strong><small>↗ 12.4%</small></div>
          <div className="floating-stat stat-two"><span className="sent-check">✓</span><div><strong>Invoice sent</strong><small>Just now</small></div></div>
          <form className="login-card" id="login" onSubmit={signIn}>
            <div className="login-card-icon"><Sparkles size={18} /></div>
            <span className="eyebrow">Welcome to Ledgerly</span>
            <h2>Your work deserves a sharp finish.</h2>
            <p>Use the demo access below to enter your workspace.</p>

            <label className="field">
              <span className="field-label">Email address</span>
              <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="field">
              <span className="field-label">Password</span>
              <span className="password-shell">
                <input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>

            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={loading}>{loading ? "Preparing your workspace…" : <>Enter workspace <ArrowRight size={17} /></>}</button>
            <div className="demo-credentials">
              <span>Demo access</span>
              <code>{DEMO_EMAIL}</code>
              <code>{DEMO_PASSWORD}</code>
            </div>
          </form>
          <p className="login-caption"><ShieldCheck size={12} /> Protected with a secure HTTP-only session</p>
        </div>
      </section>

      <footer className="landing-footer"><span>Ledgerly © 2026</span><span>Designed for independent professionals and small teams</span></footer>
    </main>
  );
}
