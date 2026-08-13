import React, { useState } from 'react';
import { 
  ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight,
  Shield, CheckCircle2, Building2, KeyRound, AlertCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SplitScreenAuth({ onLoginSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      setSuccessMsg('Authentication successful! Redirecting...');
      if (onLoginSuccess) {
        setTimeout(() => onLoginSuccess(res), 600);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '85vh', display: 'flex', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-muted)', background: 'var(--bg-surface)' }}>
      {/* Left Section: Branding & Trust Indicators */}
      <div style={{
        flex: '1.2',
        background: 'linear-gradient(135deg, #0b1329 0%, #1e293b 50%, #0f172a 100%)',
        padding: '3.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        borderRight: '1px solid var(--border-muted)'
      }}>
        {/* Top Logo */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '2.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '1.4rem',
              color: '#ffffff',
              boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)'
            }}>
              tX
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff' }}>
                tenderX
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Online Tender Management System</p>
            </div>
          </div>

          <div style={{ maxWidth: '460px' }}>
            <div className="badge badge-primary" style={{ marginBottom: '1.25rem', padding: '0.35rem 0.85rem' }}>
              <ShieldCheck size={14} /> Enterprise Procurement Platform
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', lineHeight: '1.25', marginBottom: '1.25rem', color: '#ffffff' }}>
              Streamlined, Transparent & Secure Government Procurement
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2.5rem' }}>
              End-to-end encrypted tender publishing, vendor onboarding, fine-grained RBAC permissions, live reverse auctions, and auditable procurement workflows.
            </p>
          </div>
        </div>

        {/* Abstract Procurement Visual / Trust Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2rem' }}>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
            <Lock size={20} color="var(--accent)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>Secure Auth</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>AES-256 JWT Pair</div>
          </div>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
            <Shield size={20} color="var(--emerald)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>Role-Based Access</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>6 Granular Roles</div>
          </div>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
            <Building2 size={20} color="var(--purple)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>Auditable Logs</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Immutable History</div>
          </div>
        </div>

        {/* Bottom Trust Line */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.5rem', marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <span>ISO 27001 Certified Infrastructure</span>
          <span>Version 3.2.0</span>
        </div>
      </div>

      {/* Right Section: Interactive Authentication Form */}
      <div style={{
        flex: '1',
        padding: '3.5rem 3rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: '#0f172a'
      }}>
        <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
            Sign in to access your procurement dashboard and active tenders.
          </p>

          {/* Feedback Alerts */}
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Email Field */}
            <div>
              <label className="input-label" htmlFor="email-input">Official Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="email-input"
                  type="email"
                  className="input-control"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="name@organization.gov / company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="input-label" htmlFor="password-input" style={{ marginBottom: 0 }}>Password</label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset token request dispatched to administrator.'); }} style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: '600' }}>
                  Forgot password?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="input-control"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ borderRadius: '4px', cursor: 'pointer' }}
              />
              <label htmlFor="remember-me" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Keep me signed in for 30 days
              </label>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              className="btn-action"
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In to Portal <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Social / OAuth Divider */}
          <div style={{ margin: '1.75rem 0', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-muted)' }} />
            <span>OR SIGN IN WITH ENTERPRISE SSO</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-muted)' }} />
          </div>

          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem' }}
            onClick={() => alert('Government Single Sign-On (SSO / OAuth 2.0) SAML identity integration initiated.')}
          >
            <KeyRound size={16} /> Continue with Govt Single Sign-On (SSO)
          </button>

          <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Need a vendor account?{' '}
            <a href="#register" onClick={(e) => { e.preventDefault(); alert('Registration modal open: Submit organizational credentials.'); }} style={{ color: 'var(--accent)', fontWeight: '700', textDecoration: 'none' }}>
              Register Organization
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
