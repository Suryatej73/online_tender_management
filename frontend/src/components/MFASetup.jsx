import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Smartphone, QrCode, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MFASetup() {
  const { user, saveAuth } = useAuth();
  const [mfaData, setMfaData] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const initMfaSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/mfa/setup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tenderx_tokens') ? JSON.parse(localStorage.getItem('tenderx_tokens')).access : ''}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize MFA.');
      setMfaData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/mfa/verify-setup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tenderx_tokens') ? JSON.parse(localStorage.getItem('tenderx_tokens')).access : ''}`
        },
        body: JSON.stringify({ totp_code: totpCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed.');
      saveAuth({ ...user, is_mfa_enabled: true }, JSON.parse(localStorage.getItem('tenderx_tokens')));
      setMsg('Multi-Factor Authentication enabled successfully!');
      setMfaData(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="glass-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <motion.div whileHover={{ rotate: -10, scale: 1.1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
            <Smartphone size={22} style={{ color: 'var(--cyan)' }} />
          </motion.div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '750' }}>Multi-Factor Authentication</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>TOTP Authenticator Protection</p>
          </div>
        </div>
        <span className={`badge ${user.is_mfa_enabled ? 'badge-success' : 'badge-warning'}`}>
          {user.is_mfa_enabled ? 'MFA Active' : 'MFA Disabled'}
        </span>
      </div>

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

      {!mfaData ? (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.25rem', lineHeight: '1.6' }}>
            Protect your account with Google Authenticator or Authy. Once enabled, signing in will require a 6-digit TOTP code.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={initMfaSetup} disabled={loading}
            className="btn-action"
            style={{ background: 'linear-gradient(135deg, var(--cyan) 0%, var(--primary) 100%)' }}
          >
            <QrCode size={16} /> {user.is_mfa_enabled ? 'Re-configure MFA' : 'Setup 2FA Authenticator'}
          </motion.button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '0.85rem' }}>1. Scan QR Code in Google Authenticator app</p>
            <div style={{ background: '#ffffff', padding: '0.75rem', display: 'inline-block', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem' }}>
              <img src={mfaData.qr_code_url} alt="MFA QR Code" style={{ width: '140px', height: '140px', display: 'block' }} />
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Or enter secret key manually:</p>
            <code className="code-font" style={{ color: 'var(--cyan)', fontWeight: '700', fontSize: '0.9rem' }}>{mfaData.mfa_secret}</code>
          </div>

          <form onSubmit={handleVerifyMfa} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', fontWeight: '600' }}>2. Enter 6-digit code to complete setup</label>
            <input
              type="text" maxLength={6} required
              value={totpCode} onChange={(e) => setTotpCode(e.target.value)}
              placeholder="123456" className="code-font"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: '#030708', border: '1px solid var(--cyan)', color: 'var(--cyan)', textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.35em', outline: 'none' }}
            />
            <motion.button type="submit" disabled={loading} className="btn-action" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ justifyContent: 'center' }}>
              <ShieldCheck size={16} /> Confirm & Enable 2FA
            </motion.button>
          </form>
        </motion.div>
      )}
    </motion.div>
  );
}
