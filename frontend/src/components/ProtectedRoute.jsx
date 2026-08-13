import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, hasRole } = useAuth();

  if (!user) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <ShieldAlert size={36} style={{ color: 'var(--amber)', marginBottom: '0.5rem' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Authentication Required</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Please log in to access this protected tenderX module.</p>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--rose)' }}>
        <ShieldAlert size={36} style={{ color: 'var(--rose)', marginBottom: '0.5rem' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--rose)' }}>Access Denied (403 Forbidden)</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Your role (<strong>{user.role}</strong>) does not have permission to view this resource. Required role: {allowedRoles.join(' or ')}.
        </p>
      </div>
    );
  }

  return children;
}
