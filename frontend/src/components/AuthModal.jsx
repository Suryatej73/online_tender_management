import React, { useState } from 'react';
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
  const [tab, setTab] = useState('login'); // 'login', 'register', 'mfa', 'verify_email', 'reset_password'
  
  // Form States
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    role: 'VENDOR',
    organization_name: '',
    totp_code: '',
    token: ''
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
      
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

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

      if (!res.ok) {
        throw new Error(data.error || 'Invalid TOTP code.');
      }

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

      if (!res.ok) {
        throw new Error(data.password ? data.password[0] : (data.email ? data.email[0] : 'Registration failed.'));
      }

      saveAuth(data.user, data.tokens);
      setMsg(`Registered as ${data.user.role_display}! Check your email for verification token.`);
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
      setMsg(data.message || 'Password reset link sent to your email.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 15, 0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '480px', position: 'relative' }}>
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '0.6rem', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))', 
            color: 'var(--primary)',
            marginBottom: '0.75rem' 
          }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>tenderX Identity Portal</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Secure JWT Authentication & Role Management</p>
        </div>

        {/* Navigation Tabs */}
        {tab !== 'mfa' && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-muted)', marginBottom: '1.5rem' }}>
            <button 
              onClick={() => setTab('login')} 
              style={{ flex: 1, padding: '0.6rem', background: 'none', border: 'none', borderBottom: tab === 'login' ? '2px solid var(--primary)' : 'none', color: tab === 'login' ? '#ffffff' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer' }}
            >
              Sign In
            </button>
            <button 
              onClick={() => setTab('register')} 
              style={{ flex: 1, padding: '0.6rem', background: 'none', border: 'none', borderBottom: tab === 'register' ? '2px solid var(--primary)' : 'none', color: tab === 'register' ? '#ffffff' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer' }}
            >
              Register
            </button>
            <button 
              onClick={() => setTab('reset_password')} 
              style={{ flex: 1, padding: '0.6rem', background: 'none', border: 'none', borderBottom: tab === 'reset_password' ? '2px solid var(--primary)' : 'none', color: tab === 'reset_password' ? '#ffffff' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer' }}
            >
              Reset
            </button>
          </div>
        )}

        {/* Notifications */}
        {msg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} /> {msg}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f87171', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-dim)' }} />
                <input 
                  type="email" 
                  name="email" 
                  required 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="name@organization.com" 
                  style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.4rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', color: '#ffffff', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-dim)' }} />
                <input 
                  type="password" 
                  name="password" 
                  required 
                  value={formData.password} 
                  onChange={handleChange} 
                  placeholder="••••••••" 
                  style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.4rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', color: '#ffffff', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-action" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? 'Authenticating...' : 'Sign In with JWT'}
            </button>
          </form>
        )}

        {/* MFA Step 2 Form */}
        {tab === 'mfa' && (
          <form onSubmit={handleMfaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <Smartphone size={36} style={{ color: 'var(--cyan)', marginBottom: '0.5rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Multi-Factor Authentication</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enter 6-digit TOTP security code from your Authenticator App</p>
            </div>

            <div>
              <input 
                type="text" 
                name="totp_code" 
                maxLength={6} 
                required 
                value={formData.totp_code} 
                onChange={handleChange} 
                placeholder="123456" 
                className="code-font"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--cyan)', color: 'var(--cyan)', fontSize: '1.4rem', letterSpacing: '0.4em', textAlign: 'center' }}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-action" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, var(--cyan) 0%, var(--emerald) 100%)' }}>
              {loading ? 'Verifying...' : 'Verify MFA Code'}
            </button>
          </form>
        )}

        {/* Registration Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>First Name</label>
                <input type="text" name="first_name" required value={formData.first_name} onChange={handleChange} style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', color: '#ffffff' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Name</label>
                <input type="text" name="last_name" required value={formData.last_name} onChange={handleChange} style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', color: '#ffffff' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="user@company.com" style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', color: '#ffffff' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assign RBAC Role</label>
              <select name="role" value={formData.role} onChange={handleChange} style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', background: '#111827', border: '1px solid var(--primary)', color: '#ffffff', fontWeight: '600' }}>
                <option value="VENDOR">Vendor / Bidder</option>
                <option value="TENDER_MANAGER">Tender Manager</option>
                <option value="EVALUATOR">Evaluator</option>
                <option value="AUDITOR">Auditor</option>
                <option value="ORG_ADMIN">Organization Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Organization Name</label>
              <input type="text" name="organization_name" value={formData.organization_name} onChange={handleChange} placeholder="Global Tech Ltd" style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', color: '#ffffff' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Password</label>
                <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', color: '#ffffff' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confirm Password</label>
                <input type="password" name="password_confirm" required value={formData.password_confirm} onChange={handleChange} placeholder="••••••••" style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', color: '#ffffff' }} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-action" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? 'Registering...' : 'Create Account & Assign Role'}
            </button>
          </form>
        )}

        {/* Password Reset Request Form */}
        {tab === 'reset_password' && (
          <form onSubmit={handlePasswordResetReq} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Enter Registered Email</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="user@company.com" style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', color: '#ffffff' }} />
            </div>
            <button type="submit" disabled={loading} className="btn-action" style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Sending...' : 'Request Password Reset Link'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
