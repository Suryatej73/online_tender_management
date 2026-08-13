import React, { useState } from 'react';
import { 
  MoreVertical, Eye, Edit2, ShieldAlert, CheckCircle, Lock, 
  Trash2, RotateCcw, Smartphone, ShieldCheck, MailCheck
} from 'lucide-react';

export default function UserTable({ users = [], onAction }) {
  const [activeMenuUserId, setActiveMenuUserId] = useState(null);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="badge badge-danger"><ShieldCheck size={11} /> Super Admin</span>;
      case 'ORG_ADMIN':
        return <span className="badge badge-purple"><ShieldCheck size={11} /> Org Admin</span>;
      case 'TENDER_MANAGER':
        return <span className="badge badge-primary">Tender Manager</span>;
      case 'EVALUATOR':
        return <span className="badge badge-warning">Evaluator</span>;
      case 'AUDITOR':
        return <span className="badge badge-secondary">Auditor</span>;
      case 'VENDOR':
      default:
        return <span className="badge badge-secondary">Vendor</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-success">Active</span>;
      case 'SUSPENDED':
        return <span className="badge badge-danger">Suspended</span>;
      case 'PENDING_VERIFICATION':
        return <span className="badge badge-warning">Pending Verify</span>;
      case 'DEACTIVATED':
      default:
        return <span className="badge badge-secondary">Deactivated</span>;
    }
  };

  return (
    <div className="table-container">
      <table className="enterprise-table">
        <thead>
          <tr>
            <th>User Identity</th>
            <th>Email Address</th>
            <th>Organization / Department</th>
            <th>Role</th>
            <th>Status</th>
            <th>Verification</th>
            <th>Registered</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No user accounts match your active search or filter criteria.
              </td>
            </tr>
          ) : (
            users.map((user) => {
              const initials = user.full_name
                ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                : user.email.substring(0, 2).toUpperCase();

              return (
                <tr key={user.id}>
                  {/* User Identity & Avatar */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        color: '#ffffff'
                      }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{user.full_name || 'Anonymous User'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{user.position_title || 'Procurement User'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td>
                    <span className="code-font" style={{ fontSize: '0.8rem', color: '#93c5fd' }}>{user.email}</span>
                  </td>

                  {/* Organization & Dept */}
                  <td>
                    <div style={{ fontWeight: '600', fontSize: '0.8rem' }}>{user.organization_title || user.organization_name || 'Unassigned'}</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>{user.department_title || 'General'}</div>
                  </td>

                  {/* Role */}
                  <td>{getRoleBadge(user.role)}</td>

                  {/* Status */}
                  <td>{getStatusBadge(user.status)}</td>

                  {/* Verification */}
                  <td>
                    {user.is_email_verified ? (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        <MailCheck size={10} /> Verified
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                        Unverified
                      </span>
                    )}
                  </td>

                  {/* Registered Date */}
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recent'}
                  </td>

                  {/* Actions Dropdown */}
                  <td style={{ textAlign: 'right', position: 'relative' }}>
                    <button
                      onClick={() => setActiveMenuUserId(activeMenuUserId === user.id ? null : user.id)}
                      style={{ background: 'none', border: '1px solid var(--border-muted)', color: 'var(--text-muted)', padding: '0.35rem', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Popover Action Menu */}
                    {activeMenuUserId === user.id && (
                      <div
                        style={{
                          position: 'absolute',
                          right: '1rem',
                          top: '2.5rem',
                          background: '#0f172a',
                          border: '1px solid var(--border-glow)',
                          borderRadius: '8px',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                          zIndex: 60,
                          minWidth: '180px',
                          padding: '0.35rem 0',
                          textAlign: 'left'
                        }}
                        onMouseLeave={() => setActiveMenuUserId(null)}
                      >
                        <button
                          onClick={() => { setActiveMenuUserId(null); onAction('view', user); }}
                          style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                        >
                          <Eye size={14} color="var(--accent)" /> View Full Profile
                        </button>
                        
                        <button
                          onClick={() => { setActiveMenuUserId(null); onAction('edit', user); }}
                          style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                        >
                          <Edit2 size={14} color="var(--cyan)" /> Edit Account
                        </button>

                        <button
                          onClick={() => { setActiveMenuUserId(null); onAction('verify', user); }}
                          style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                        >
                          <CheckCircle size={14} color="var(--emerald)" /> Mark Verified
                        </button>

                        <button
                          onClick={() => { setActiveMenuUserId(null); onAction('reset-password', user); }}
                          style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                        >
                          <Lock size={14} color="var(--amber)" /> Reset Password
                        </button>

                        <button
                          onClick={() => { setActiveMenuUserId(null); onAction('revoke-sessions', user); }}
                          style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                        >
                          <Smartphone size={14} color="var(--purple)" /> Revoke Sessions
                        </button>

                        <div style={{ height: '1px', background: 'var(--border-muted)', margin: '0.25rem 0' }} />

                        {user.status === 'SUSPENDED' ? (
                          <button
                            onClick={() => { setActiveMenuUserId(null); onAction('activate', user); }}
                            style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: '#34d399', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                          >
                            <RotateCcw size={14} /> Activate Account
                          </button>
                        ) : (
                          <button
                            onClick={() => { setActiveMenuUserId(null); onAction('suspend', user); }}
                            style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                          >
                            <ShieldAlert size={14} /> Suspend Account
                          </button>
                        )}

                        <button
                          onClick={() => { setActiveMenuUserId(null); onAction('delete', user); }}
                          style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} /> Deactivate User
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
