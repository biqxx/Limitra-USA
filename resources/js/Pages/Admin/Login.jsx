import { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Seo from '../../Components/Seo';

export default function AdminLogin() {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
    remember: false,
  });

  useEffect(() => {
    document.documentElement.dataset.palette = 'riviera';
    const loader = document.getElementById('site-loader');
    if (loader) { loader.classList.add('sl-done'); setTimeout(() => loader.remove(), 600); }
  }, []);

  const submit = (e) => {
    e.preventDefault();
    post('/admin/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--brand-deep)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <Seo title="Admin Login" noIndex />

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--surface)',
        borderRadius: 16,
        boxShadow: '0 24px 60px rgba(0,0,0,.28)',
        overflow: 'hidden',
      }}>
        {/* Card header */}
        <div style={{
          background: 'var(--brand)',
          padding: '28px 32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{
            fontFamily: 'var(--font-display,"Bodoni Moda"),serif',
            fontSize: 26,
            letterSpacing: '.22em',
            color: '#fff',
            lineHeight: 1,
          }}>
            LIMITRA
          </span>
          <span style={{
            fontSize: 10,
            letterSpacing: '.32em',
            textTransform: 'uppercase',
            color: 'var(--accent-soft)',
            border: '1px solid rgba(255,255,255,.25)',
            borderRadius: 999,
            padding: '3px 10px',
          }}>
            Admin Portal
          </span>
        </div>

        {/* Form body */}
        <form onSubmit={submit} style={{ padding: '32px 32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em' }}>
              Sign in
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--muted)' }}>
              Enter your admin credentials to continue.
            </p>
          </div>

          <div className="adm-field">
            <label>Email address <span className="req">*</span></label>
            <input
              className="adm-input"
              type="email"
              value={data.email}
              onChange={(e) => setData('email', e.target.value)}
              placeholder="admin@example.com"
              autoFocus
              autoComplete="email"
              required
            />
            {errors.email && (
              <span style={{ fontSize: 12.5, color: '#c0392b', marginTop: 6, display: 'block' }}>
                {errors.email}
              </span>
            )}
          </div>

          <div className="adm-field">
            <label>Password <span className="req">*</span></label>
            <input
              className="adm-input"
              type="password"
              value={data.password}
              onChange={(e) => setData('password', e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            {errors.password && (
              <span style={{ fontSize: 12.5, color: '#c0392b', marginTop: 6, display: 'block' }}>
                {errors.password}
              </span>
            )}
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontSize: 13.5,
            color: 'var(--ink)',
            cursor: 'pointer',
            marginTop: -6,
          }}>
            <input
              type="checkbox"
              checked={data.remember}
              onChange={(e) => setData('remember', e.target.checked)}
            />
            Keep me signed in
          </label>

          <button
            type="submit"
            className="adm-btn adm-btn-primary"
            disabled={processing}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {processing ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,.3)', letterSpacing: '.04em' }}>
        LIMITRA © {new Date().getFullYear()} — Restricted access
      </p>
    </div>
  );
}
