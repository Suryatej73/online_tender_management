import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Smartphone, QrCode, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

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
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Smartphone size={22} style={{ color: 'var(--cyan)' }} />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Multi-Factor Authentication (MFA / 2FA)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTP Authenticator Protection</p>
          </div>
        </div>
        <span className={`badge ${user.is_mfa_enabled ? 'badge-success' : 'badge-warning'}`}>
          {user.is_mfa_enabled ? 'MFA Active' : 'MFA Disabled'}
        </span>
      </div>

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

      {!mfaData ? (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
            Protect your account with Google Authenticator or Authy. Once enabled, signing in will require a 6-digit TOTP code.
          </p>
          <button onClick={initMfaSetup} disabled={loading} className="btn-action" style={{ background: 'linear-gradient(135deg, var(--cyan) 0%, var(--primary) 100%)' }}>
            <QrCode size={16} /> {user.is_mfa_enabled ? 'Re-configure MFA' : 'Setup 2FA Authenticator'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>1. Scan QR Code in Google Authenticator app</p>
            <div style={{ background: '#ffffff', padding: '0.75rem', display: 'inline-block', borderRadius: '12px', marginBottom: '0.75rem' }}>
              <img src={mfaData.qr_code_url} alt="MFA QR Code" style={{ width: '140px', height: '140px', display: 'block' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Or enter secret key manually:</p>
            <code className="code-font" style={{ color: 'var(--cyan)', fontWeight: '700', fontSize: '0.95rem' }}>{mfaData.mfa_secret}</code>
          </div>

          <form onSubmit={handleVerifyMfa} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>2. Enter 6-digit code to complete setup</label>
            <input 
              type="text" 
              maxLength={6} 
              required 
              value={totpCode} 
              onChange={(e) => setTotpCode(e.target.value)} 
              placeholder="123456" 
              className="code-font" 
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#05070c', border: '1px solid var(--cyan)', color: 'var(--cyan)', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.3em' }}
            />
            <button type="submit" disabled={loading} className="btn-action" style={{ justifyContent: 'center' }}>
              <ShieldCheck size={16} /> Confirm & Enable 2FA
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
