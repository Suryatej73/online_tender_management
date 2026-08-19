import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MoreVertical, Eye, Edit2, ShieldAlert, CheckCircle, Lock,
  Trash2, RotateCcw, Smartphone, ShieldCheck, MailCheck
} from 'lucide-react';

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export default function UserTable({ users = [], onAction }) {
  const [activeMenuUserId, setActiveMenuUserId] = useState(null);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_ADMIN': return <span className="badge badge-danger"><ShieldCheck size={10} /> Super Admin</span>;
      case 'ORG_ADMIN': return <span className="badge badge-purple"><ShieldCheck size={10} /> Org Admin</span>;
      case 'TENDER_MANAGER': return <span className="badge badge-primary">Tender Mgr</span>;
      case 'EVALUATOR': return <span className="badge badge-warning">Evaluator</span>;
      case 'AUDITOR': return <span className="badge badge-secondary">Auditor</span>;
      default: return <span className="badge badge-secondary">Vendor</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE': return <span className="badge badge-success">Active</span>;
      case 'SUSPENDED': return <span className="badge badge-danger">Suspended</span>;
      case 'PENDING_VERIFICATION': return <span className="badge badge-warning">Pending</span>;
      default: return <span className="badge badge-secondary">Inactive</span>;
    }
  };

  const actionItems = [
    { key: 'view', label: 'View Profile', icon: Eye, color: 'var(--accent)' },
    { key: 'edit', label: 'Edit Account', icon: Edit2, color: 'var(--cyan)' },
    { key: 'verify', label: 'Mark Verified', icon: CheckCircle, color: 'var(--emerald)' },
    { key: 'reset-password', label: 'Reset Password', icon: Lock, color: 'var(--amber)' },
    { key: 'revoke-sessions', label: 'Revoke Sessions', icon: Smartphone, color: 'var(--purple)' },
  ];

  return (
    <div className="table-container">
      <table className="enterprise-table">
        <thead>
          <tr>
            <th>User Identity</th>
            <th>Email</th>
            <th>Organization</th>
            <th>Role</th>
            <th>Status</th>
            <th>Verified</th>
            <th>Registered</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <motion.tbody variants={staggerContainer} initial="initial" animate="animate">
          {users.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                No user accounts match your search or filter criteria.
              </td>
            </tr>
          ) : (
            users.map((user) => {
              const initials = user.full_name
                ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                : user.email.substring(0, 2).toUpperCase();

              return (
                <motion.tr key={user.id} variants={fadeUp}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', fontSize: '0.75rem', color: '#ffffff', flexShrink: 0,
                        }}
                      >{initials}</motion.div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{user.full_name || 'Anonymous'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{user.position_title || 'Procurement User'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="code-font" style={{ fontSize: '0.78rem', color: 'var(--primary-light)' }}>{user.email}</td>
                  <td>
                    <div style={{ fontWeight: '600', fontSize: '0.82rem' }}>{user.organization_title || user.organization_name || 'Unassigned'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>{user.department_title || 'General'}</div>
                  </td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td>{getStatusBadge(user.status)}</td>
                  <td>
                    {user.is_email_verified
                      ? <span className="badge badge-success" style={{ fontSize: '0.62rem' }}><MailCheck size={9} /> Verified</span>
                      : <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>Unverified</span>
                    }
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recent'}
                  </td>
                  <td style={{ textAlign: 'right', position: 'relative' }}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setActiveMenuUserId(activeMenuUserId === user.id ? null : user.id)}
                      style={{ background: 'none', border: '1px solid var(--border-muted)', color: 'var(--text-dim)', padding: '0.35rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                    >
                      <MoreVertical size={15} />
                    </motion.button>

                    <AnimatePresence>
                      {activeMenuUserId === user.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97, y: -3 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          style={{
                            position: 'absolute', right: '1rem', top: '2.5rem',
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-glow)',
                            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xl)',
                            zIndex: 60, minWidth: '185px', padding: '0.35rem 0', textAlign: 'left',
                          }}
                          onMouseLeave={() => setActiveMenuUserId(null)}
                        >
                          {actionItems.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.key}
                                onClick={() => { setActiveMenuUserId(null); onAction(item.key, user); }}
                                style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'background 100ms' }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(99,102,241,0.06)'}
                                onMouseLeave={(e) => e.target.style.background = 'none'}
                              >
                                <Icon size={13} color={item.color} /> {item.label}
                              </button>
                            );
                          })}
                          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0' }} />
                          {user.status === 'SUSPENDED' ? (
                            <button
                              onClick={() => { setActiveMenuUserId(null); onAction('activate', user); }}
                              style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--emerald)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                            >
                              <RotateCcw size={13} /> Activate
                            </button>
                          ) : (
                            <button
                              onClick={() => { setActiveMenuUserId(null); onAction('suspend', user); }}
                              style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--rose)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                            >
                              <ShieldAlert size={13} /> Suspend
                            </button>
                          )}
                          <button
                            onClick={() => { setActiveMenuUserId(null); onAction('delete', user); }}
                            style={{ width: '100%', padding: '0.5rem 1rem', background: 'none', border: 'none', color: 'var(--rose)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                          >
                            <Trash2 size={13} /> Deactivate
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                </motion.tr>
              );
            })
          )}
        </motion.tbody>
      </table>
    </div>
  );
}
