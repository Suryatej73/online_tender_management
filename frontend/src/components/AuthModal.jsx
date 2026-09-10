import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Smartphone,
  Send,
  Sparkles,
  Check
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const { saveAuth, login, register, verifyOtp, resendOtp, googleLogin } = useAuth();
  const [tab, setTab] = useState(initialTab || 'login');
  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  const [otpStep, setOtpStep] = useState('send'); // 'send' | 'verify'
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpPurpose, setOtpPurpose] = useState('LOGIN');
  const [resendCooldown, setResendCooldown] = useState(0);

  React.useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab, isOpen]);

  React.useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

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

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  const readApiResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();

    if (!contentType.includes('application/json')) {
      const serviceHint = response.status === 0 || response.status === 502 || response.status === 503
        ? 'Make sure the Django backend is running on http://127.0.0.1:8000.'
        : 'Check that the request is being sent to the Django backend, not a static file server.';
      throw new Error(`Authentication service returned HTTP ${response.status} instead of JSON. ${serviceHint}`);
    }

    try {
      const data = body ? JSON.parse(body) : {};
      if (!response.ok) {
        const details = data.error || data.detail || data.message || Object.values(data).flat().join(' ');
        throw new Error(details || `Authentication request failed (HTTP ${response.status}).`);
      }
      return data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Authentication service returned invalid JSON. Please check the Django server logs.');
      }
      throw error;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const data = await login(formData.email, formData.password);
      if (data.otp_required) {
        setTempToken(data.temp_token);
        setMaskedEmail(data.masked_email || formData.email);
        setOtpPurpose(data.purpose || 'LOGIN');
        setOtpEmail(formData.email);
        setOtpStep('verify');
        setTab('otp');
        setResendCooldown(60);
        setMsg(data.message || `Credentials verified. OTP sent to ${data.masked_email || formData.email}`);
      } else if (data.mfa_required) {
        setMfaUserId(data.user_id);
        setTab('mfa');
        setMsg('Multi-Factor Authentication required. Enter 6-digit TOTP code.');
      } else {
        setMsg('Login successful!');
        setTimeout(onClose, 800);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (gEmail) => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const data = await googleLogin(gEmail);
      setMsg(`Signed in with Google as ${data.user.email}!`);
      setShowGooglePicker(false);
      setTimeout(onClose, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const targetEmail = otpEmail || formData.email;
    if (!targetEmail) {
      setError('Please enter your email address to receive an OTP code.');
      return;
    }
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/auth/otp/send/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, purpose: otpPurpose })
      });
      const data = await readApiResponse(res);
      if (data.temp_token) setTempToken(data.temp_token);
      if (data.masked_email) setMaskedEmail(data.masked_email);
      setOtpEmail(targetEmail);
      setOtpStep('verify');
      setResendCooldown(60);
      setMsg(data.message || `6-digit OTP code dispatched to ${data.masked_email || targetEmail}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError('Please enter a valid 6-digit OTP code.');
      return;
    }
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const data = await verifyOtp({
        temp_token: tempToken,
        otp_code: otpCode,
        email: otpEmail || formData.email,
        purpose: otpPurpose
      });
      if (data.mfa_required) {
        setMfaUserId(data.user_id);
        setTab('mfa');
        setMsg('Multi-Factor Authentication required.');
      } else {
        setMsg('OTP Authentication successful!');
        setTimeout(onClose, 800);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const data = await resendOtp({
        temp_token: tempToken,
        email: otpEmail || formData.email,
        purpose: otpPurpose
      });
      if (data.temp_token) setTempToken(data.temp_token);
      if (data.masked_email) setMaskedEmail(data.masked_email);
      setResendCooldown(60);
      setMsg(data.message || 'A new OTP verification code has been sent to your email.');
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
      const res = await fetch(`${API_BASE}/auth/login/mfa/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: mfaUserId, totp_code: formData.totp_code })
      });
      const data = await readApiResponse(res);
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
      const data = await register(formData);
      if (data.otp_required) {
        setTempToken(data.temp_token);
        setMaskedEmail(data.masked_email || formData.email);
        setOtpPurpose(data.purpose || 'SIGNUP');
        setOtpEmail(formData.email);
        setOtpStep('verify');
        setTab('otp');
        setResendCooldown(60);
        setMsg(data.message || `Account created! Verification code sent to ${data.masked_email || formData.email}`);
      } else {
        setMsg(`Registered as ${data.user.role_display}!`);
        setTimeout(onClose, 1200);
      }
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
      const res = await fetch(`${API_BASE}/auth/password/reset-request/`, {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await readApiResponse(res);
      setMsg(data.message || 'Password reset link sent to your email.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const googleAccounts = [
    { email: 'admin.procurement@gmail.com', name: 'Super Admin (TenderX Gov)', role: 'SUPER_ADMIN', avatar: 'A' },
    { email: 'vendor.globaltech@gmail.com', name: 'GlobalTech Innovations', role: 'VENDOR', avatar: 'G' },
    { email: 'authority.digital@gmail.com', name: 'Ministry of Digital Affairs', role: 'ORG_ADMIN', avatar: 'M' },
  ];

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
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', letterSpacing: '-0.02em' }}>TenderX Identity Portal</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Secure Enterprise Authentication & Governance</p>
        </div>

        {/* Tab Navigation */}
        {tab !== 'mfa' && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.25rem', gap: '0.25rem' }}>
            {[
              { id: 'login', label: 'Sign In' },
              { id: 'otp', label: 'OTP Login' },
              { id: 'register', label: 'Register' },
              { id: 'reset_password', label: 'Reset' }
            ].map((t) => (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setTab(t.id); setError(null); setMsg(null); }}
                style={{
                  flex: 1, padding: '0.65rem', background: 'none', border: 'none',
                  borderBottom: tab === t.id ? '2px solid var(--primary)' : 'none',
                  color: tab === t.id ? '#ffffff' : 'var(--text-dim)',
                  fontWeight: '650', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                {t.label}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              <motion.button type="submit" disabled={loading} className="btn-action" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}>
                {loading ? 'Authenticating...' : 'Sign In with JWT'}
              </motion.button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            {/* Google Sign-in Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowGooglePicker(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                padding: '0.7rem', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', fontSize: '0.85rem', fontWeight: '600',
                cursor: 'pointer', transition: 'background 150ms'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign in with Google</span>
            </motion.button>
          </div>
        )}

        {/* 6-digit OTP Login / Verification Form */}
        {(tab === 'otp' || tab === 'otp_verify') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '0.25rem' }}>
              <div style={{ display: 'inline-flex', padding: '0.5rem', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)', marginBottom: '0.5rem' }}>
                <ShieldCheck size={28} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800' }}>
                {otpPurpose === 'SIGNUP' ? 'Verify Signup Account OTP' : 'Security OTP Verification'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                {otpStep === 'verify'
                  ? `6-digit verification code sent to ${maskedEmail || otpEmail || formData.email}`
                  : 'Instant security OTP verification via email'}
              </p>
            </div>

            {otpStep === 'send' ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: '600' }}>Email Address for OTP</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-faint)' }} />
                    <input
                      type="email" required
                      value={otpEmail || formData.email}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="user@organization.com"
                      style={{ width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.4rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-default)', color: '#ffffff', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                </div>
                <motion.button type="submit" disabled={loading} className="btn-action" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Sending OTP Code...' : 'Send 6-Digit OTP Code'}
                </motion.button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: '600', textAlign: 'center' }}>Enter 6-Digit OTP Code</label>
                  <input
                    type="text" maxLength={6} required autoFocus
                    value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •" className="code-font"
                    style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--primary)', color: 'var(--primary-light)', fontSize: '1.6rem', letterSpacing: '0.45em', textAlign: 'center', outline: 'none' }}
                  />
                </div>
                <motion.button type="submit" disabled={loading} className="btn-action" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Verifying OTP...' : 'Verify OTP & Access Portal'}
                </motion.button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  <button type="button" onClick={() => setOtpStep('send')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    style={{
                      background: 'none', border: 'none',
                      color: resendCooldown > 0 ? 'var(--text-faint)' : 'var(--primary-light)',
                      cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      fontWeight: '700'
                    }}
                  >
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>Email Address</label>
                <span style={{ fontSize: '0.68rem', color: 'var(--emerald)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Check size={12} /> Email Verification Included
                </span>
              </div>
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
              {loading ? 'Registering...' : 'Create Account & Dispatch Verification Email'}
            </motion.button>

            {/* Google Quick Register option */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowGooglePicker(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.55rem', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: '600',
                cursor: 'pointer', marginTop: '0.2rem'
              }}
            >
              <span>Or Register via Google Account</span>
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
              {loading ? 'Sending Verification Link...' : 'Send Verification Email Link'}
            </motion.button>
          </form>
        )}

        {/* Google Account Picker Modal Overlay */}
        {showGooglePicker && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 110,
              background: 'rgba(5, 8, 20, 0.96)', borderRadius: 'var(--radius-lg)',
              padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <h3 style={{ fontSize: '1rem', fontWeight: '750', color: '#ffffff' }}>Choose a Google Account</h3>
                </div>
                <button onClick={() => setShowGooglePicker(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
                Select an account to continue to <strong>TenderX Procurement Platform</strong>:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {googleAccounts.map((acc) => (
                  <motion.button
                    key={acc.email}
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleGoogleLogin(acc.email)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem',
                      borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b00, #e65100)', color: '#ffffff', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                      {acc.avatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {acc.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {acc.email}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Custom Google Email Option */}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Use another Google Email</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="email"
                    placeholder="your.email@gmail.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    className="input-control"
                    style={{ flex: 1, fontSize: '0.82rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => customGoogleEmail && handleGoogleLogin(customGoogleEmail)}
                    style={{ padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', background: '#ff6b00', color: '#ffffff', fontSize: '0.78rem', fontWeight: '700', border: 'none', cursor: 'pointer' }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                By signing in with Google, you agree to TenderX Procurement Terms of Service.
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
