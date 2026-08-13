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
    if (tokenData) localStorage.setItem('tenderx_tokens', JSON.stringify(tokenData));
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('tenderx_user');
    localStorage.removeItem('tenderx_tokens');
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

  return (
    <AuthContext.Provider value={{
      user,
      tokens,
      saveAuth,
      logout,
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
