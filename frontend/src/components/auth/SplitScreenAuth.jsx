import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight,
  Shield, CheckCircle2, Building2, KeyRound, AlertCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

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

  const trustItems = [
    { icon: Lock, label: 'Secure Auth', sub: 'AES-256 JWT', color: 'var(--accent)' },
    { icon: Shield, label: 'Role-Based Access', sub: '6 Granular Roles', color: 'var(--emerald)' },
    { icon: Building2, label: 'Auditable Logs', sub: 'Immutable History', color: 'var(--purple)' },
  ];

  return (
    <div style={{ minHeight: '80vh', display: 'flex', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border-muted)', background: 'var(--bg-surface)' }}>

      {/* Left: Branding & Trust */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        style={{
          flex: '1.2',
          background: 'linear-gradient(135deg, #050a18 0%, #0e1525 50%, #0a1020 100%)',
          padding: '3.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          borderRight: '1px solid var(--border-muted)',
          overflow: 'hidden',
        }}
      >
        {/* Subtle gradient overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 20% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 25 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '2.5rem' }}
          >
            <div style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              width: '44px', height: '44px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '900', fontSize: '1.3rem', color: '#ffffff',
              boxShadow: '0 6px 24px rgba(99, 102, 241, 0.4)',
            }}>tX</div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.03em', color: '#ffffff' }}>tenderX</h1>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Enterprise Tender Management</p>
            </div>
          </motion.div>

          <div style={{ maxWidth: '460px' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 25 }}
            >
              <div className="badge badge-primary" style={{ marginBottom: '1.25rem', padding: '0.35rem 0.85rem' }}>
                <ShieldCheck size={14} /> Enterprise Procurement Platform
              </div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: '900', lineHeight: '1.2', marginBottom: '1.25rem', color: '#ffffff', letterSpacing: '-0.03em' }}>
                Streamlined, Transparent & Secure Government Procurement
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.7', marginBottom: '2.5rem' }}>
                End-to-end encrypted tender publishing, vendor onboarding, fine-grained RBAC permissions, live reverse auctions, and auditable procurement workflows.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Trust Indicators */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginTop: '2rem', position: 'relative', zIndex: 1 }}
        >
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ scale: 1.04, y: -2 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="glass-card glass-card--compact"
                style={{ textAlign: 'center', background: 'rgba(10, 16, 32, 0.6)', cursor: 'default' }}
              >
                <motion.div whileHover={{ rotate: -10, scale: 1.1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                  <Icon size={20} color={item.color} style={{ marginBottom: '0.5rem' }} />
                </motion.div>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)' }}>{item.label}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>{item.sub}</div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom Trust */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-faint)', position: 'relative', zIndex: 1 }}>
          <span>ISO 27001 Certified Infrastructure</span>
          <span className="code-font">v3.2.0</span>
        </div>
      </motion.div>

      {/* Right: Auth Form */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
        style={{
          flex: '1',
          padding: '3.5rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'var(--bg-elevated)',
        }}
      >
        <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 25 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.4rem', letterSpacing: '-0.03em' }}>Welcome Back</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              Sign in to access your procurement dashboard and active tenders.
            </p>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              style={{ background: 'var(--rose-surface)', border: '1px solid rgba(251, 113, 133, 0.2)', color: 'var(--rose)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
            >
              <AlertCircle size={18} /> {error}
            </motion.div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              style={{ background: 'var(--emerald-surface)', border: '1px solid rgba(52, 211, 153, 0.2)', color: 'var(--emerald)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
            >
              <CheckCircle2 size={18} /> {successMsg}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <label className="input-label" htmlFor="auth-email">Official Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-faint)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="auth-email"
                  type="email"
                  className="input-control"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="name@organization.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="input-label" htmlFor="auth-password" style={{ marginBottom: 0 }}>Password</label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset dispatched.'); }} style={{ fontSize: '0.72rem', color: 'var(--primary-light)', textDecoration: 'none', fontWeight: '600' }}>
                  Forgot password?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-faint)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="auth-password"
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
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: '2px' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ borderRadius: '4px', cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="remember-me" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Keep me signed in for 30 days
              </label>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <motion.button
                type="submit"
                className="btn-action"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.9rem' }}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Authenticating...</>
                ) : (
                  <>Sign In to Portal <ArrowRight size={18} /></>
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* SSO Divider */}
          <div style={{ margin: '1.75rem 0', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-faint)', fontSize: '0.72rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            <span style={{ letterSpacing: '0.05em' }}>OR SSO</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          <motion.button
            type="button"
            className="btn-secondary"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem' }}
            onClick={() => alert('Govt SSO initiated.')}
          >
            <KeyRound size={16} /> Continue with Govt SSO
          </motion.button>

          <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Need a vendor account?{' '}
            <a href="#register" onClick={(e) => { e.preventDefault(); alert('Registration modal open.'); }} style={{ color: 'var(--primary-light)', fontWeight: '700', textDecoration: 'none' }}>
              Register Organization
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
