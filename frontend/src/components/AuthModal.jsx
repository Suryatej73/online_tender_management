import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Building,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Smartphone
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { saveAuth } = useAuth();
  const [tab, setTab] = useState('login');

  const [formData, setFormData] = useState({
    email: '', password: '', password_confirm: '',
    first_name: '', last_name: '', role: 'VENDOR',
    organization_name: '', totp_code: '', token: ''
  });

  const [mfaUserId, setMfaUserId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials.');
      if (data.mfa_required) {
        setMfaUserId(data.user_id);
        setTab('mfa');
        setMsg('Multi-Factor Authentication required. Enter 6-digit TOTP code.');
      } else {
        saveAuth(data.user, data.tokens);
        setMsg('Login successful!');
        setTimeout(onClose, 800);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login/mfa/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: mfaUserId, totp_code: formData.totp_code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid TOTP code.');
      saveAuth(data.user, data.tokens);
      setMsg('MFA Authentication successful!');
      setTimeout(onClose, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.password ? data.password[0] : (data.email ? data.email[0] : 'Registration failed.'));
      saveAuth(data.user, data.tokens);
      setMsg(`Registered as ${data.user.role_display}!`);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetReq = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/password/reset-request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      setMsg(data.message || 'Password reset link sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(2, 5, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 5 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: '480px', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
        >
          <X size={20} />
        </motion.button>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            style={{
              display: 'inline-flex', padding: '0.65rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary-surface), var(--purple-surface))',
              color: 'var(--primary-light)', marginBottom: '0.75rem',
            }}
          >
            <ShieldCheck size={28} />
          </motion.div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', letterSpacing: '-0.02em' }}>tenderX Identity Portal</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Secure JWT Authentication & Role Management</p>
        </div>

        {/* Tab Navigation */}
        {tab !== 'mfa' && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem', gap: '0.25rem' }}>
            {['login', 'register', 'reset_password'].map((t) => (
              <motion.button
                key={t}
                whileTap={{ scale: 0.97 }}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '0.65rem', background: 'none', border: 'none',
                  borderBottom: tab === t ? '2px solid var(--primary)' : 'none',
                  color: tab === t ? '#ffffff' : 'var(--text-dim)',
                  fontWeight: '650', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                {t === 'login' ? 'Sign In' : t === 'register' ? 'Register' : 'Reset'}
              </motion.button>
            ))}
          </div>
        )}

        {/* Notifications */}
        {msg && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--emerald-surface)', border: '1px solid rgba(52,211,153,0.2)', color: 'var(--emerald)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} /> {msg}
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--rose-surface)', border: '1px solid rgba(251,113,133,0.2)', color: 'var(--rose)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: '600' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-faint)' }} />
                <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="name@organization.com"
                  style={{ width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.4rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-default)', color: '#ffffff', fontSize: '0.875rem', outline: 'none', transition: 'border-color 150ms' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: '600' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-faint)' }} />
                <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••"
                  style={{ width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.4rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-default)', color: '#ffffff', fontSize: '0.875rem', outline: 'none', transition: 'border-color 150ms' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
                />
              </div>
            </div>
            <motion.button type="submit" disabled={loading} className="btn-action" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? 'Authenticating...' : 'Sign In with JWT'}
            </motion.button>
          </form>
        )}

        {/* MFA Form */}
        {tab === 'mfa' && (
          <form onSubmit={handleMfaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                <Smartphone size={36} style={{ color: 'var(--cyan)', marginBottom: '0.5rem' }} />
              </motion.div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '750' }}>Multi-Factor Authentication</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Enter 6-digit TOTP code from your Authenticator App</p>
            </div>
            <input
              type="text" name="totp_code" maxLength={6} required
              value={formData.totp_code} onChange={handleChange}
              placeholder="123456" className="code-font"
              style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--cyan)', color: 'var(--cyan)', fontSize: '1.5rem', letterSpacing: '0.4em', textAlign: 'center', outline: 'none' }}
            />
            <motion.button type="submit" disabled={loading} className="btn-action" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, var(--cyan) 0%, var(--emerald) 100%)' }}>
              {loading ? 'Verifying...' : 'Verify MFA Code'}
            </motion.button>
          </form>
        )}

        {/* Registration Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>First Name</label>
                <input type="text" name="first_name" required value={formData.first_name} onChange={handleChange} className="input-control" style={{ marginTop: '0.3rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>Last Name</label>
                <input type="text" name="last_name" required value={formData.last_name} onChange={handleChange} className="input-control" style={{ marginTop: '0.3rem' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>Email Address</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="user@company.com" className="input-control" style={{ marginTop: '0.3rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>RBAC Role</label>
              <select name="role" value={formData.role} onChange={handleChange} className="input-control" style={{ marginTop: '0.3rem', fontWeight: '700' }}>
                <option value="VENDOR">Vendor / Bidder</option>
                <option value="TENDER_MANAGER">Tender Manager</option>
                <option value="EVALUATOR">Evaluator</option>
                <option value="AUDITOR">Auditor</option>
                <option value="ORG_ADMIN">Organization Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>Organization Name</label>
              <input type="text" name="organization_name" value={formData.organization_name} onChange={handleChange} placeholder="Global Tech Ltd" className="input-control" style={{ marginTop: '0.3rem' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>Password</label>
                <input type="password" name="password" required value={formData.password} onChange={handleChange} className="input-control" style={{ marginTop: '0.3rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>Confirm</label>
                <input type="password" name="password_confirm" required value={formData.password_confirm} onChange={handleChange} className="input-control" style={{ marginTop: '0.3rem' }} />
              </div>
            </div>
            <motion.button type="submit" disabled={loading} className="btn-action" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? 'Registering...' : 'Create Account & Assign Role'}
            </motion.button>
          </form>
        )}

        {/* Password Reset */}
        {tab === 'reset_password' && (
          <form onSubmit={handlePasswordResetReq} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: '600' }}>Registered Email</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="user@company.com" className="input-control" />
            </div>
            <motion.button type="submit" disabled={loading} className="btn-action" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Sending...' : 'Request Password Reset'}
            </motion.button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
