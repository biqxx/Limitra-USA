import { useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import I from './Icons';

export default function AuthModal({ open, onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const loginForm = useForm({ email: '', password: '', remember: false });
  const registerForm = useForm({ name: '', email: '', phone: '', password: '', password_confirmation: '' });

  useEffect(() => {
    if (!open) return;
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const submitLogin = (e) => {
    e.preventDefault();
    loginForm.post('/login', {
      preserveScroll: true,
      onSuccess: () => { loginForm.reset('password'); onAuthenticated?.(); onClose(); },
    });
  };

  const submitRegister = (e) => {
    e.preventDefault();
    registerForm.post('/register', {
      preserveScroll: true,
      onSuccess: () => { registerForm.reset('password', 'password_confirmation'); onAuthenticated?.(); onClose(); },
    });
  };

  return (
    <div className="ns-overlay" onMouseDown={onClose}>
      <div className="ns-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ns-photo">
          <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80" alt="Limitra USA" />
        </div>
        <button className="ns-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="ns-form-side">
          <div className="ns-brand">
            <div className="nw">LIMITRA</div>
            <div className="usa-row">
              <span className="rule"></span>
              <span className="usa">USA</span>
              <span className="rule"></span>
            </div>
          </div>
          <h2 className="ns-headline">{mode === 'login' ? 'SIGN IN' : 'JOIN US'}</h2>
          <div className="ns-divider"><span className="dia">◆</span></div>

          <div className="auth-tabs">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button>
          </div>

          {/* Both forms stay mounted (stacked via CSS grid) so the modal never resizes when switching tabs — only the active one is visible/interactive. */}
          <div className="auth-forms">
            <form onSubmit={submitLogin} className={"ns-fields auth-form" + (mode === 'login' ? ' active' : '')} aria-hidden={mode !== 'login'}>
              <div className="ns-field">
                <label>E-mail<span className="req">*</span></label>
                <div className="ns-input-wrap">
                  <I.mail width="17" height="17" />
                  <input type="email" value={loginForm.data.email} onChange={(e) => loginForm.setData('email', e.target.value)} tabIndex={mode === 'login' ? 0 : -1} required />
                </div>
              </div>
              <div className="ns-field">
                <label>Password<span className="req">*</span></label>
                <div className="ns-input-wrap">
                  <input type="password" value={loginForm.data.password} onChange={(e) => loginForm.setData('password', e.target.value)} tabIndex={mode === 'login' ? 0 : -1} required />
                </div>
              </div>
              {loginForm.errors.email && <div className="auth-error">{loginForm.errors.email}</div>}
              <label className="auth-remember">
                <input type="checkbox" checked={loginForm.data.remember} onChange={(e) => loginForm.setData('remember', e.target.checked)} tabIndex={mode === 'login' ? 0 : -1} />
                Keep me signed in
              </label>
              <button className="ns-submit" type="submit" disabled={loginForm.processing} tabIndex={mode === 'login' ? 0 : -1}>
                {loginForm.processing ? 'SIGNING IN…' : 'SIGN IN'}
              </button>
            </form>

            <form onSubmit={submitRegister} className={"ns-fields auth-form" + (mode === 'register' ? ' active' : '')} aria-hidden={mode !== 'register'}>
              <div className="ns-field">
                <label>Name<span className="req">*</span></label>
                <div className="ns-input-wrap">
                  <I.user width="17" height="17" />
                  <input type="text" value={registerForm.data.name} onChange={(e) => registerForm.setData('name', e.target.value)} tabIndex={mode === 'register' ? 0 : -1} required />
                </div>
                {registerForm.errors.name && <div className="auth-error">{registerForm.errors.name}</div>}
              </div>
              <div className="ns-field">
                <label>E-mail<span className="req">*</span></label>
                <div className="ns-input-wrap">
                  <I.mail width="17" height="17" />
                  <input type="email" value={registerForm.data.email} onChange={(e) => registerForm.setData('email', e.target.value)} tabIndex={mode === 'register' ? 0 : -1} required />
                </div>
                {registerForm.errors.email && <div className="auth-error">{registerForm.errors.email}</div>}
              </div>
              <div className="ns-field">
                <label>Phone Number <span style={{fontSize:11,color:"var(--muted)",fontWeight:400,letterSpacing:0,textTransform:"none"}}>(US only, optional)</span></label>
                <div className="ns-input-wrap">
                  <span style={{fontSize:18,lineHeight:1}}>🇺🇸</span>
                  <span style={{fontSize:14,color:"var(--muted)",borderRight:"1px solid #ddd",paddingRight:10,marginRight:2}}>+1</span>
                  <input type="tel" placeholder="(201) 555-0123" value={registerForm.data.phone} onChange={(e) => registerForm.setData('phone', e.target.value)} tabIndex={mode === 'register' ? 0 : -1} />
                </div>
              </div>
              <div className="ns-field">
                <label>Password<span className="req">*</span></label>
                <div className="ns-input-wrap">
                  <input type="password" value={registerForm.data.password} onChange={(e) => registerForm.setData('password', e.target.value)} tabIndex={mode === 'register' ? 0 : -1} required />
                </div>
                {registerForm.errors.password && <div className="auth-error">{registerForm.errors.password}</div>}
              </div>
              <div className="ns-field">
                <label>Confirm Password<span className="req">*</span></label>
                <div className="ns-input-wrap">
                  <input type="password" value={registerForm.data.password_confirmation} onChange={(e) => registerForm.setData('password_confirmation', e.target.value)} tabIndex={mode === 'register' ? 0 : -1} required />
                </div>
              </div>
              <button className="ns-submit" type="submit" disabled={registerForm.processing} tabIndex={mode === 'register' ? 0 : -1}>
                {registerForm.processing ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
