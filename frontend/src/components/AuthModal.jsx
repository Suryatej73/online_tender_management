import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import authBannerImg from '../assets/auth-banner.png';
import {
  X,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Smartphone,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Building2,
  UserCheck,
  Sparkles,
} from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
);

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const { saveAuth, login, register, verifyOtp, resendOtp, googleLogin } = useAuth();

  const normalizeTab = (t) => (t === 'register' || t === 'signup' ? 'signup' : 'login');
  const [tab, setTab] = useState(normalizeTab(initialTab));
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // OTP Verification States
  const [otpPending, setOtpPending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpPurpose, setOtpPurpose] = useState('LOGIN');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [demoOtpHint, setDemoOtpHint] = useState(null);

  // MFA fallback state
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
      setDemoOtpHint(null);
      setShowGooglePicker(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (otpPending && (name === 'email' || name === 'password')) {
      setOtpPending(false);
      setOtpCode('');
      setTempToken(null);
      setMsg(null);
      setDemoOtpHint(null);
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
    setDemoOtpHint(null);
    setShowGooglePicker(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (otpPending) {
      await handleVerifyOtp();
      return;
    }

    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!formData.password) {
      setError('Please enter your password.');
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
        if (data.demo_otp_hint) {
          setDemoOtpHint(data.demo_otp_hint);
        }
        setMsg(
          data.message ||
            `Security verification code sent to ${data.masked_email || formData.email}. Check your email inbox.`
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
      setError(err.message || 'Login failed. Please check your credentials.');
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

    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Terms & Conditions to create an account.');
      return;
    }

    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const payload = {
        ...formData,
        password_confirm: formData.password_confirm || formData.password,
      };
      const data = await register(payload);
      if (data.otp_required) {
        setTempToken(data.temp_token);
        setMaskedEmail(data.masked_email || formData.email);
        setOtpPurpose(data.purpose || 'SIGNUP');
        setOtpPending(true);
        setOtpCode('');
        setResendCooldown(60);
        if (data.demo_otp_hint) {
          setDemoOtpHint(data.demo_otp_hint);
        }
        setMsg(
          data.message ||
            `Verification code sent to ${data.masked_email || formData.email}. Enter it below to complete sign up.`
        );
      } else {
        setMsg('Account created successfully!');
        setTimeout(onClose, 1000);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
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
        setMsg('OTP verified successfully! Logging you in...');
        setTimeout(onClose, 700);
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await resendOtp({
        email: formData.email,
        purpose: otpPurpose,
      });
      setTempToken(data.temp_token);
      setResendCooldown(60);
      if (data.demo_otp_hint) {
        setDemoOtpHint(data.demo_otp_hint);
      }
      setMsg(data.message || `A new verification code has been dispatched to ${data.masked_email || formData.email}.`);
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
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
      setMsg(`Authenticated with Google as ${data.user.email}!`);
      setShowGooglePicker(false);
      setTimeout(onClose, 800);
    } catch (err) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const googleAccounts = [
    { email: 'admin.procurement@gmail.com', name: 'Super Admin', role: 'SUPER_ADMIN', desc: 'Government Authority' },
    { email: 'tenderx69@gmail.com', name: 'TenderX Lead', role: 'TENDER_MANAGER', desc: 'Procurement Specialist' },
    { email: 'iitsuryatej@gmail.com', name: 'Suryatej Reddy', role: 'VENDOR', desc: 'Verified Global Contractor' },
  ];

  const quickFillCredentials = (email, pwd) => {
    setFormData((prev) => ({ ...prev, email, password: pwd }));
    setError(null);
    setMsg(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#0c0915]/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative w-full max-w-[940px] bg-[#1e1b29] border border-white/10 rounded-[28px] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row my-auto"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Close Button Top Right */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Left Column: Visual Dunes Banner (Matches Screenshot) */}
          <div className="hidden md:block relative w-[46%] min-h-[580px] p-2.5 select-none shrink-0">
            <div className="relative w-full h-full rounded-[22px] overflow-hidden shadow-inner flex flex-col justify-between">
              {/* Dunes Background Image */}
              <img
                src={authBannerImg}
                alt="TenderX Dunes"
                className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
              />

              {/* Top Navigation & Brand Header */}
              <div className="relative z-10 p-6 flex items-center justify-between">
                {/* Visual Brand Mark */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7052db] to-purple-400 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-purple-900/40">
                    tX
                  </div>
                  <span className="text-lg font-bold tracking-tight text-white drop-shadow">
                    Tender<span className="text-purple-300">X</span>
                  </span>
                </div>

                {/* Back to website button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 text-white/90 text-xs font-medium backdrop-blur-md transition flex items-center gap-1.5 shadow-sm cursor-pointer group"
                >
                  <span>Back to website</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Bottom Website Tagline & Carousel Indicators */}
              <div className="relative z-10 p-7 pt-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/25 border border-purple-400/30 text-purple-200 text-[11px] font-semibold mb-3 backdrop-blur-md">
                  <Sparkles size={12} className="text-purple-300" />
                  <span>The Intelligent Procurement OS</span>
                </div>

                <h3 className="text-2xl lg:text-[28px] font-bold text-white leading-tight tracking-tight drop-shadow-md">
                  Every Tender.
                  <br />
                  <span className="text-purple-300">One Intelligent Platform.</span>
                </h3>

                <p className="text-xs text-white/75 mt-2.5 leading-relaxed drop-shadow max-w-[340px]">
                  Discover opportunities, validate compliance, build stronger bids, and manage procurement lifecycle securely.
                </p>

                {/* Three indicator lines */}
                <div className="flex items-center gap-2 mt-5">
                  <span className="w-9 h-1 rounded-full bg-white shadow-sm" />
                  <span className="w-5 h-1 rounded-full bg-white/35" />
                  <span className="w-5 h-1 rounded-full bg-white/35" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form Container (Matches Screenshot) */}
          <div className="flex-1 flex flex-col justify-center px-6 py-8 sm:px-10 md:px-12 text-white">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                {otpPending
                  ? 'Verify Security Code'
                  : tab === 'signup'
                  ? 'Create an account'
                  : 'Log in to your account'}
              </h2>
              <div className="text-sm text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                {tab === 'signup' ? (
                  <>
                    <span>Already have an account?</span>
                    <button
                      type="button"
                      onClick={() => switchTab('login')}
                      className="text-white hover:text-purple-300 font-medium underline underline-offset-2 transition cursor-pointer"
                    >
                      Log in
                    </button>
                  </>
                ) : (
                  <>
                    <span>Don't have an account?</span>
                    <button
                      type="button"
                      onClick={() => switchTab('signup')}
                      className="text-white hover:text-purple-300 font-medium underline underline-offset-2 transition cursor-pointer"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Error & Message Alerts */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-start gap-2.5"
              >
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div className="leading-snug">{error}</div>
              </motion.div>
            )}

            {msg && !error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs sm:text-sm flex items-start gap-2.5"
              >
                <Check size={16} className="text-purple-400 shrink-0 mt-0.5" />
                <div className="leading-snug">{msg}</div>
              </motion.div>
            )}

            {/* OTP Hint Helper Badge if available */}
            {demoOtpHint && (
              <div className="mb-4 p-2.5 rounded-lg bg-[#342e47] border border-purple-500/30 flex items-center justify-between text-xs">
                <span className="text-gray-300">Quick OTP Code:</span>
                <button
                  type="button"
                  onClick={() => setOtpCode(demoOtpHint)}
                  className="px-2.5 py-1 rounded bg-[#7052db] hover:bg-[#6144cf] text-white font-mono font-bold tracking-widest transition cursor-pointer"
                >
                  {demoOtpHint} (Click to Fill)
                </button>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={tab === 'signup' ? handleSignupSubmit : handleLoginSubmit} className="space-y-3.5">
              {/* If OTP is pending */}
              {otpPending ? (
                <div className="space-y-4">
                  <div className="text-xs text-gray-300">
                    We sent a 6-digit confirmation code to{' '}
                    <span className="text-purple-300 font-semibold">{maskedEmail}</span>.
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">6-Digit Code</label>
                    <input
                      type="text"
                      name="otpCode"
                      autoFocus
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-[#342e47] border border-purple-500/50 focus:border-purple-400 focus:bg-[#39324e] text-white text-center font-mono text-2xl tracking-[0.5em] rounded-lg py-3 outline-none transition placeholder:text-gray-600"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-gray-400">Didn't receive code?</span>
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || loading}
                      onClick={handleResendOtp}
                      className="text-purple-300 hover:text-purple-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={resendCooldown > 0 ? 'animate-spin' : ''} />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Signup Fields: Name Inputs Side by Side */}
                  {tab === 'signup' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleChange}
                          placeholder="Fletcher"
                          required
                          className="w-full bg-[#342e47] border border-transparent focus:border-purple-400/80 focus:bg-[#39324e] text-white text-sm placeholder:text-gray-400 rounded-lg px-3.5 py-3 outline-none transition"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleChange}
                          placeholder="Last name"
                          className="w-full bg-[#342e47] border border-transparent focus:border-purple-400/80 focus:bg-[#39324e] text-white text-sm placeholder:text-gray-400 rounded-lg px-3.5 py-3 outline-none transition"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Input */}
                  <div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email"
                      required
                      className="w-full bg-[#342e47] border border-transparent focus:border-purple-400/80 focus:bg-[#39324e] text-white text-sm placeholder:text-gray-400 rounded-lg px-3.5 py-3 outline-none transition"
                    />
                  </div>

                  {/* Password Input with Eye Icon */}
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={tab === 'signup' ? 'Enter your password' : 'Enter your password'}
                      required
                      className="w-full bg-[#342e47] border border-transparent focus:border-purple-400/80 focus:bg-[#39324e] text-white text-sm placeholder:text-gray-400 rounded-lg px-3.5 py-3 pr-10 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Role Selector for Registration */}
                  {tab === 'signup' && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1.5 font-medium">Select Account Role</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'VENDOR', label: 'Vendor' },
                          { id: 'TENDER_MANAGER', label: 'Manager' },
                          { id: 'EVALUATOR', label: 'Evaluator' },
                        ].map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, role: r.id }))}
                            className={`py-2 px-2 text-xs rounded-lg font-medium border transition cursor-pointer text-center ${
                              formData.role === r.id
                                ? 'bg-purple-600/30 border-purple-400 text-white shadow-sm'
                                : 'bg-[#342e47]/60 border-white/5 text-gray-400 hover:text-white'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Fill Test Accounts for Login */}
                  {tab === 'login' && !formData.email && (
                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      <span className="text-[11px] text-gray-500">Demo Fill:</span>
                      <button
                        type="button"
                        onClick={() => quickFillCredentials('admin@tenderx.io', 'Admin@12345')}
                        className="text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition cursor-pointer"
                      >
                        Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => quickFillCredentials('tenderx69@gmail.com', 'Admin123!')}
                        className="text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition cursor-pointer"
                      >
                        TenderX Gmail
                      </button>
                      <button
                        type="button"
                        onClick={() => quickFillCredentials('iitsuryatej@gmail.com', 'Admin123!')}
                        className="text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition cursor-pointer"
                      >
                        Vendor
                      </button>
                    </div>
                  )}

                  {/* Terms & Conditions Checkbox (Matches Screenshot) */}
                  {tab === 'signup' && (
                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setAgreeTerms(!agreeTerms)}
                        className={`w-5 h-5 rounded flex items-center justify-center transition border cursor-pointer ${
                          agreeTerms
                            ? 'bg-white border-white text-black'
                            : 'bg-[#342e47] border-white/20 text-transparent'
                        }`}
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                      <label
                        onClick={() => setAgreeTerms(!agreeTerms)}
                        className="text-xs text-gray-300 cursor-pointer select-none"
                      >
                        I agree to the{' '}
                        <span className="underline hover:text-white transition">Terms & Conditions</span>
                      </label>
                    </div>
                  )}
                </>
              )}

              {/* Submit CTA Button (Vibrant Purple Solid) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#7052db] hover:bg-[#6144cf] text-white font-medium text-sm py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : otpPending ? (
                    <span>Verify Code & Continue</span>
                  ) : tab === 'signup' ? (
                    <span>Create account</span>
                  ) : (
                    <span>Log in</span>
                  )}
                </button>
              </div>
            </form>

            {/* Divider: Or register with / Or login with */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#1e1b29] px-3 text-gray-400">
                  {tab === 'signup' ? 'Or register with' : 'Or login with'}
                </span>
              </div>
            </div>

            {/* Social Buttons: ONLY GOOGLE (Apple completely removed per user request) */}
            <div>
              <button
                type="button"
                onClick={() => setShowGooglePicker(!showGooglePicker)}
                className="w-full bg-[#2d283e]/80 hover:bg-[#38324e] border border-white/10 rounded-lg py-2.5 px-4 flex items-center justify-center gap-2.5 text-white text-sm font-medium transition cursor-pointer shadow-sm group"
              >
                <GoogleIcon />
                <span>Google</span>
              </button>

              {/* Quick Google Account Selector Dropdown */}
              <AnimatePresence>
                {showGooglePicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2.5 p-3 rounded-xl bg-[#282338] border border-purple-500/20 space-y-2 overflow-hidden"
                  >
                    <div className="text-[11px] text-gray-400 font-medium">Select Google account to continue:</div>
                    <div className="space-y-1.5">
                      {googleAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => handleGoogleLogin(acc.email)}
                          className="w-full p-2 rounded-lg bg-white/5 hover:bg-white/10 text-left flex items-center justify-between text-xs transition cursor-pointer group"
                        >
                          <div>
                            <div className="font-semibold text-white group-hover:text-purple-300">{acc.name}</div>
                            <div className="text-[10px] text-gray-400">{acc.email}</div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
                            {acc.role}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-1.5 border-t border-white/5 flex gap-2">
                      <input
                        type="email"
                        placeholder="Or custom @gmail.com"
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        className="flex-1 bg-[#1e1b29] border border-white/10 text-white text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-purple-400"
                      />
                      <button
                        type="button"
                        disabled={!customGoogleEmail || !customGoogleEmail.includes('@')}
                        onClick={() => handleGoogleLogin(customGoogleEmail)}
                        className="px-3 py-1.5 rounded-lg bg-[#7052db] hover:bg-[#6144cf] text-white text-xs font-medium disabled:opacity-50 transition"
                      >
                        Sign in
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
  );
}
