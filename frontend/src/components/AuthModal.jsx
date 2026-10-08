import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { LOGIN_BOTANICAL_URI } from './loginBotanicalData';
import {
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  RefreshCw,
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const { saveAuth, login, register, verifyOtp, resendOtp, googleLogin } = useAuth();

  const normalizeTab = (t) => (t === 'register' || t === 'signup' ? 'signup' : 'login');
  const [tab, setTab] = useState(normalizeTab(initialTab));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // Same-page OTP state
  const [otpPending, setOtpPending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpPurpose, setOtpPurpose] = useState('LOGIN');
  const [resendCooldown, setResendCooldown] = useState(0);

  // MFA fallback state (if user has TOTP MFA enabled)
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaUserId, setMfaUserId] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    role: 'VENDOR',
    organization_name: '',
    totp_code: '',
  });

  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTab(normalizeTab(initialTab));
      setOtpPending(false);
      setOtpCode('');
      setMfaPending(false);
      setError(null);
      setMsg(null);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // If user edits email or password after OTP was sent, allow re-sending on next submit
    if (otpPending && (name === 'email' || name === 'password')) {
      setOtpPending(false);
      setOtpCode('');
      setTempToken(null);
      setMsg(null);
    }
  };

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setOtpPending(false);
    setOtpCode('');
    setTempToken(null);
    setMfaPending(false);
    setError(null);
    setMsg(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (otpPending) {
      await handleVerifyOtp();
      return;
    }

    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const data = await login(formData.email, formData.password);
      if (data.otp_required) {
        setTempToken(data.temp_token);
        setMaskedEmail(data.masked_email || formData.email);
        setOtpPurpose(data.purpose || 'LOGIN');
        setOtpPending(true);
        setOtpCode('');
        setResendCooldown(60);
        setMsg(
          data.message ||
            `OTP sent to ${data.masked_email || formData.email}. Please enter it below.`
        );
      } else if (data.mfa_required) {
        setMfaUserId(data.user_id);
        setMfaPending(true);
        setMsg('Enter 6-digit TOTP code from your authenticator app.');
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

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (otpPending) {
      await handleVerifyOtp();
      return;
    }

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const data = await register(formData);
      if (data.otp_required) {
        setTempToken(data.temp_token);
        setMaskedEmail(data.masked_email || formData.email);
        setOtpPurpose(data.purpose || 'SIGNUP');
        setOtpPending(true);
        setOtpCode('');
        setResendCooldown(60);
        setMsg(
          data.message ||
            `Verification OTP sent to ${data.masked_email || formData.email}. Enter it below to complete sign up.`
        );
      } else {
        setMsg(`Signed up successfully!`);
        setTimeout(onClose, 1000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setError('Please enter the 6-digit OTP sent to your email.');
      return;
    }
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const data = await verifyOtp({
        temp_token: tempToken,
        otp_code: otpCode,
        email: formData.email,
        purpose: otpPurpose,
      });
      if (data.mfa_required) {
        setMfaUserId(data.user_id);
        setOtpPending(false);
        setMfaPending(true);
        setMsg('Multi-Factor Authentication required.');
      } else {
        setMsg('OTP verified! Logging you in...');
        setTimeout(onClose, 700);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const data = await resendOtp({
        temp_token: tempToken,
        email: formData.email,
        purpose: otpPurpose,
      });
      if (data.temp_token) setTempToken(data.temp_token);
      if (data.masked_email) setMaskedEmail(data.masked_email);
      setResendCooldown(60);
      setMsg(data.message || 'A new 6-digit OTP has been sent to your email.');
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
        body: JSON.stringify({ user_id: mfaUserId, totp_code: formData.totp_code }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'MFA verification failed.');
      }
      saveAuth(data.user, data.tokens);
      setMsg('Authentication successful!');
      setTimeout(onClose, 700);
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

  const googleAccounts = [
    { email: 'admin.procurement@gmail.com', name: 'Super Admin (TenderX Gov)', role: 'SUPER_ADMIN', avatar: 'A' },
    { email: 'vendor.globaltech@gmail.com', name: 'GlobalTech Innovations', role: 'VENDOR', avatar: 'G' },
    { email: 'authority.digital@gmail.com', name: 'Ministry of Digital Affairs', role: 'ORG_ADMIN', avatar: 'M' },
  ];

  const underlineInputStyle = {
    width: '100%',
    padding: '0.55rem 0.1rem',
    border: 'none',
    borderBottom: '1.8px solid #58727f',
    background: 'transparent',
    color: '#2c3e47',
    fontSize: '0.92rem',
    outline: 'none',
    transition: 'border-color 150ms',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 16, 28, 0.78)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        style={{
          width: '100%',
          maxWidth: '860px',
          minHeight: '540px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'row',
          position: 'relative',
          boxShadow: '0 28px 70px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '1.1rem',
            right: '1.1rem',
            zIndex: 20,
            background: 'transparent',
            border: 'none',
            color: '#7c9099',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} />
        </button>

        {/* Left Botanical Illustration Panel */}
        <div
          className="hidden sm:block"
          style={{
            width: '43%',
            minHeight: '520px',
            borderRadius: '14px',
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: '#7d9ea3',
            backgroundImage: `url(${LOGIN_BOTANICAL_URI})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Right Form Panel */}
        <div
          style={{
            flex: 1,
            padding: '2.25rem 2.75rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            color: '#3e5864',
            position: 'relative',
          }}
        >
          {/* Greeting Header */}
          <div style={{ marginBottom: '1.35rem' }}>
            <h2
              style={{
                fontSize: '2.25rem',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                margin: 0,
                color: '#486370',
                fontWeight: 500,
              }}
            >
              <span style={{ fontWeight: 800, color: '#6e8c91' }}>Hello,</span>{' '}
              <span>Guyss!</span>
            </h2>
          </div>

          {/* Login / SignUp Tabs */}
          {!mfaPending && (
            <div
              style={{
                display: 'flex',
                 justifyContent: 'center',
                gap: '2.5rem',
                marginBottom: '1.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => switchTab('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === 'login' ? '2.5px solid #486370' : '2.5px solid transparent',
                  padding: '0.25rem 0.6rem 0.4rem',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: tab === 'login' ? '#486370' : '#bac6ca',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => switchTab('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === 'signup' ? '2.5px solid #486370' : '2.5px solid transparent',
                  padding: '0.25rem 0.6rem 0.4rem',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: tab === 'signup' ? '#486370' : '#bac6ca',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                SignUp
              </button>
            </div>
          )}

          {/* Status / Error Alerts */}
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{msg}</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* LOGIN TAB (with same-page OTP verification) */}
          {tab === 'login' && !mfaPending && (
            <form
              onSubmit={handleLoginSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.35rem',
                maxWidth: '340px',
                width: '100%',
                margin: '0 auto',
              }}
            >
              <div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  style={underlineInputStyle}
                />
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter Password"
                  style={{ ...underlineInputStyle, paddingRight: '2.2rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.1rem',
                    bottom: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#58727f',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>

              {/* Same-page OTP Input shown after entering login details */}
              <AnimatePresence>
                {otpPending && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ paddingTop: '0.2rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.35rem',
                          fontSize: '0.76rem',
                          color: '#58727f',
                        }}
                      >
                        <span>OTP sent to {maskedEmail || formData.email}</span>
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={resendCooldown > 0 || loading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: resendCooldown > 0 ? '#9eb0b8' : '#486370',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: 0,
                          }}
                        >
                          <RefreshCw size={12} />
                          {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit OTP"
                        style={{
                          ...underlineInputStyle,
                          letterSpacing: otpCode ? '0.35em' : 'normal',
                          fontWeight: otpCode ? 700 : 400,
                          borderBottom: '2px solid #486370',
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginTop: '0.35rem',
                  background: '#4b6572',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                  transition: 'background 150ms',
                }}
              >
                {loading
                  ? otpPending
                    ? 'Verifying OTP...'
                    : 'Sending OTP...'
                  : otpPending
                  ? 'Verify OTP & Login'
                  : 'Login'}
              </motion.button>

              {/* Or Divider & Social Buttons */}
              <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#9aaab2', fontWeight: 500 }}>
                  Or
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1.5rem',
                    marginTop: '0.85rem',
                  }}
                >
                  {/* Google Button */}
                  <button
                    type="button"
                    onClick={() => setShowGooglePicker(true)}
                    title="Sign in with Google"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </button>

                  {/* Facebook Button */}
                  <button
                    type="button"
                    onClick={() => setShowGooglePicker(true)}
                    title="Continue with Social Account"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path
                        fill="#1877F2"
                        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* SIGNUP TAB (with same-page OTP verification) */}
          {tab === 'signup' && !mfaPending && (
            <form
              onSubmit={handleSignupSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.95rem',
                maxWidth: '340px',
                width: '100%',
                margin: '0 auto',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <input
                  type="text"
                  name="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="First Name"
                  style={underlineInputStyle}
                />
                <input
                  type="text"
                  name="last_name"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Last Name"
                  style={underlineInputStyle}
                />
              </div>

              <div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  style={underlineInputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  style={{ ...underlineInputStyle, cursor: 'pointer' }}
                >
                  <option value="VENDOR">Vendor / Bidder</option>
                  <option value="TENDER_MANAGER">Tender Manager</option>
                  <option value="EVALUATOR">Evaluator</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="ORG_ADMIN">Org Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
                <input
                  type="text"
                  name="organization_name"
                  value={formData.organization_name}
                  onChange={handleChange}
                  placeholder="Organization"
                  style={underlineInputStyle}
                />
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter Password"
                  style={{ ...underlineInputStyle, paddingRight: '2.2rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '0.1rem',
                    bottom: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#58727f',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="password_confirm"
                  required
                  value={formData.password_confirm}
                  onChange={handleChange}
                  placeholder="Confirm Password"
                  style={{ ...underlineInputStyle, paddingRight: '2.2rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '0.1rem',
                    bottom: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#58727f',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showConfirmPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>

              {/* Same-page OTP Input after entering signup details */}
              <AnimatePresence>
                {otpPending && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ paddingTop: '0.15rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.3rem',
                          fontSize: '0.75rem',
                          color: '#58727f',
                        }}
                      >
                        <span>OTP sent to {maskedEmail || formData.email}</span>
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={resendCooldown > 0 || loading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: resendCooldown > 0 ? '#9eb0b8' : '#486370',
                            fontWeight: 700,
                            fontSize: '0.74rem',
                            cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                            padding: 0,
                          }}
                        >
                          {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit OTP"
                        style={{
                          ...underlineInputStyle,
                          letterSpacing: otpCode ? '0.35em' : 'normal',
                          fontWeight: otpCode ? 700 : 400,
                          borderBottom: '2px solid #486370',
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                style={{
                  width: '100%',
                  padding: '0.72rem',
                  marginTop: '0.3rem',
                  background: '#4b6572',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {loading
                  ? otpPending
                    ? 'Verifying OTP...'
                    : 'Creating Account...'
                  : otpPending
                  ? 'Verify OTP & SignUp'
                  : 'SignUp'}
              </motion.button>

              <div style={{ textAlign: 'center', marginTop: '0.15rem' }}>
                <span style={{ fontSize: '0.88rem', color: '#9aaab2', fontWeight: 500 }}>
                  Or
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1.5rem',
                    marginTop: '0.6rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowGooglePicker(true)}
                    title="Sign up with Google"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGooglePicker(true)}
                    title="Continue with Social Account"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24">
                      <path
                        fill="#1877F2"
                        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Optional TOTP MFA Verification Step */}
          {mfaPending && (
            <form
              onSubmit={handleMfaSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                maxWidth: '340px',
                width: '100%',
                margin: '0 auto',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Smartphone size={32} style={{ color: '#4b6572', margin: '0 auto 0.4rem' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#486370' }}>
                  Authenticator Verification
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#7c9099' }}>
                  Enter the 6-digit code from your Authenticator app
                </p>
              </div>
              <input
                type="text"
                name="totp_code"
                maxLength={6}
                required
                value={formData.totp_code}
                onChange={handleChange}
                placeholder="Enter 6-digit TOTP"
                style={{
                  ...underlineInputStyle,
                  textAlign: 'center',
                  letterSpacing: '0.35em',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#4b6572',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Verifying...' : 'Verify MFA'}
              </button>
            </form>
          )}

          {/* Google Account Picker Overlay */}
          {showGooglePicker && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 30,
                background: 'rgba(255, 255, 255, 0.98)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334e58', margin: 0 }}>
                      Choose an Account
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGooglePicker(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7c9099',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {googleAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleGoogleLogin(acc.email)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        background: '#f4f7f8',
                        border: '1px solid #dce5e7',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: '#4b6572',
                          color: '#ffffff',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        {acc.avatar}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            color: '#2c3e47',
                            display: 'block',
                          }}
                        >
                          {acc.name}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#6c8590', display: 'block' }}>
                          {acc.email}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: '1rem',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid #e2eaec',
                  }}
                >
                  <label
                    style={{
                      fontSize: '0.74rem',
                      color: '#58727f',
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Use another Google Email
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="email"
                      placeholder="your.email@gmail.com"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      style={{ ...underlineInputStyle, flex: 1, fontSize: '0.84rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => customGoogleEmail && handleGoogleLogin(customGoogleEmail)}
                      style={{
                        padding: '0.45rem 0.9rem',
                        borderRadius: '4px',
                        background: '#4b6572',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
