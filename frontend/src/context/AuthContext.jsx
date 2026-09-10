import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('tenderx_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [tokens, setTokens] = useState(() => {
    const savedTokens = localStorage.getItem('tenderx_tokens');
    return savedTokens ? JSON.parse(savedTokens) : null;
  });

  const saveAuth = (userData, tokenData) => {
    setUser(userData);
    setTokens(tokenData);
    if (userData) localStorage.setItem('tenderx_user', JSON.stringify(userData));
    if (tokenData) {
      localStorage.setItem('tenderx_tokens', JSON.stringify(tokenData));
      if (typeof tokenData === 'object') {
        if (tokenData.access) localStorage.setItem('access_token', tokenData.access);
        if (tokenData.refresh) localStorage.setItem('refresh_token', tokenData.refresh);
      } else if (typeof tokenData === 'string') {
        localStorage.setItem('access_token', tokenData);
      }
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('tenderx_user');
    localStorage.removeItem('tenderx_tokens');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return roles.includes(user.role);
  };

  // Helper functions for checking specific RBAC permissions
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isOrgAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';
  const isTenderManager = ['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER'].includes(user?.role);
  const isVendor = user?.role === 'VENDOR';
  const isEvaluator = ['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER', 'EVALUATOR'].includes(user?.role);
  const isAuditor = ['SUPER_ADMIN', 'ORG_ADMIN', 'AUDITOR'].includes(user?.role);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  useEffect(() => {
    if (!user) return;
    const tokenStr = tokens?.access || localStorage.getItem('access_token');
    if (!tokenStr) return;

    const sendHeartbeat = async () => {
      try {
        const currentToken = localStorage.getItem('access_token') || tokens?.access;
        if (!currentToken) return;

        const res = await fetch(`${API_BASE}/auth/sessions/heartbeat/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.status === 401) {
          const data = await res.json().catch(() => ({}));
          if (data.session_revoked) {
            console.warn('Session revoked by platform administrator. Logging out.');
            logout();
          }
        }
      } catch (err) {
        // Ignore network glitches
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [user, tokens?.access]);

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

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await readApiResponse(res);
    if (!data.otp_required && data.tokens && data.user) {
      saveAuth(data.user, data.tokens);
    }
    return data;
  };

  const register = async (formData) => {
    const res = await fetch(`${API_BASE}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await readApiResponse(res);
    if (!data.otp_required && data.tokens && data.user) {
      saveAuth(data.user, data.tokens);
    }
    return data;
  };

  const verifyOtp = async ({ temp_token, otp_code, email, purpose }) => {
    const res = await fetch(`${API_BASE}/auth/otp/verify/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token, otp_code, email, purpose })
    });
    const data = await readApiResponse(res);
    if (data.tokens && data.user) {
      saveAuth(data.user, data.tokens);
    }
    return data;
  };

  const resendOtp = async ({ temp_token, email, purpose }) => {
    const res = await fetch(`${API_BASE}/auth/otp/resend/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token, email, purpose })
    });
    return await readApiResponse(res);
  };

  const googleLogin = async (googleEmail) => {
    const res = await fetch(`${API_BASE}/auth/google/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: googleEmail, id_token: 'mock_google_oauth_token' })
    });
    const data = await readApiResponse(res);
    if (data.tokens && data.user) {
      saveAuth(data.user, data.tokens);
    }
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      tokens,
      saveAuth,
      logout,
      login,
      register,
      verifyOtp,
      resendOtp,
      googleLogin,
      hasRole,
      isSuperAdmin,
      isOrgAdmin,
      isTenderManager,
      isVendor,
      isEvaluator,
      isAuditor
    }}>
      {children}
    </AuthContext.Provider>
  );

};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
