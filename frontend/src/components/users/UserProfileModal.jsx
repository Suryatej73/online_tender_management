import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Mail, Phone, Clock, Smartphone, FileText, ShieldCheck
} from 'lucide-react';
import { usersApi } from '../../api/usersApi';

export default function UserProfileModal({ user, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingDetails(true);
    Promise.all([
      usersApi.getUserActivity(user.id).catch(() => []),
      usersApi.getUserSessions(user.id).catch(() => [])
    ]).then(([actData, sessData]) => {
      setActivities(Array.isArray(actData) ? actData : []);
      setSessions(Array.isArray(sessData) ? sessData : []);
    }).finally(() => setLoadingDetails(false));
  }, [user]);

  if (!user) return null;

  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : user.email.substring(0, 2).toUpperCase();
  const completionRate = user.profile_completion_rate || 85;

  const tabs = ['overview', 'activity', 'sessions', 'permissions', 'documents'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <motion.div whileHover={{ scale: 1.05 }}
              style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '800', fontSize: '1.1rem', color: '#ffffff',
                boxShadow: '0 4px 20px rgba(99,102,241,0.35)', flexShrink: 0,
              }}>
              {initials}
            </motion.div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>{user.full_name || user.username}</h3>
                <span className="badge badge-primary">{user.role}</span>
                <span className={`badge ${user.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{user.status}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>{user.email} · {user.position_title || 'Procurement Specialist'}</p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </motion.button>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '1.5rem', background: 'rgba(10, 16, 32, 0.5)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '650', marginBottom: '0.4rem' }}>
            <span>Profile Completeness</span>
            <span style={{ color: 'var(--accent)' }}>{completionRate}%</span>
          </div>
          <div style={{ height: '5px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--emerald))', borderRadius: '3px' }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
          {tabs.map(tab => (
            <motion.button key={tab} whileTap={{ scale: 0.97 }} onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                border: 'none', color: activeTab === tab ? '#ffffff' : 'var(--text-dim)',
                fontWeight: '650', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize',
                transition: 'all 150ms',
              }}>
              {tab}
            </motion.button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="grid-2">
              <div className="glass-card glass-card--compact">
                <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Info</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-faint)' }}>Email:</span><span className="code-font" style={{ fontSize: '0.78rem' }}>{user.email}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-faint)' }}>Phone:</span><span>{user.phone_number || 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-faint)' }}>Verified:</span>
                    <span className={`badge ${user.is_email_verified ? 'badge-success' : 'badge-warning'}`}>{user.is_email_verified ? 'Yes' : 'Pending'}</span>
                  </div>
                </div>
              </div>
              <div className="glass-card glass-card--compact">
                <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Organization</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-faint)' }}>Org:</span><span style={{ fontWeight: '650' }}>{user.organization_title || user.organization_name || 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-faint)' }}>Dept:</span><span>{user.department_title || 'General'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-faint)' }}>Role:</span><span className="badge badge-primary">{user.role}</span></div>
                </div>
              </div>
            </div>
            <div className="glass-card glass-card--compact">
              <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Security Status</h4>
              <div className="grid-3" style={{ fontSize: '0.8rem' }}>
                <div><span style={{ color: 'var(--text-faint)' }}>MFA:</span><div style={{ fontWeight: '700', color: user.is_mfa_enabled ? 'var(--emerald)' : 'var(--amber)', marginTop: '0.2rem' }}>{user.is_mfa_enabled ? 'TOTP Active' : 'Disabled'}</div></div>
                <div><span style={{ color: 'var(--text-faint)' }}>Last Login IP:</span><div className="code-font" style={{ fontWeight: '600', marginTop: '0.2rem', fontSize: '0.78rem' }}>{user.last_login_ip || 'N/A'}</div></div>
                <div><span style={{ color: 'var(--text-faint)' }}>Status:</span><div style={{ fontWeight: '700', color: user.status === 'ACTIVE' ? 'var(--emerald)' : 'var(--rose)', marginTop: '0.2rem' }}>{user.status}</div></div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Activity */}
        {activeTab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>No audit activity logged yet.</div>
            ) : activities.map((act, i) => (
              <motion.div key={act.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
                style={{ display: 'flex', gap: '0.85rem', padding: '0.85rem', background: 'rgba(10, 16, 32, 0.5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <Clock size={16} color="var(--accent)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{act.action}</span>
                    <span className="code-font" style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>{new Date(act.timestamp).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{act.resource} · {act.details || 'System operation executed.'}</p>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>IP: {act.ip_address || '127.0.0.1'}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tab: Sessions */}
        {activeTab === 'sessions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>No active sessions.</div>
            ) : sessions.map((sess, i) => (
              <motion.div key={sess.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: 'rgba(10, 16, 32, 0.5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Smartphone size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{sess.device_type}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{sess.ip_address} · {sess.location}</div>
                  </div>
                </div>
                <span className="badge badge-success">Active</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tab: Permissions */}
        {activeTab === 'permissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="badge badge-primary" style={{ alignSelf: 'flex-start' }}>Role: {user.role}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>RBAC permissions granted via role policy matrix:</p>
            <div className="grid-2">
              <div className="glass-card glass-card--compact">
                <div style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>Tender Management</div>
                <ul style={{ fontSize: '0.75rem', color: 'var(--text-dim)', listStyle: 'circle', paddingLeft: '1.25rem' }}>
                  <li>View Tender Specifications</li>
                  {user.role !== 'VENDOR' && <li>Create & Edit Tenders</li>}
                  {['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER'].includes(user.role) && <li>Approve Tender Release</li>}
                </ul>
              </div>
              <div className="glass-card glass-card--compact">
                <div style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--emerald)', marginBottom: '0.5rem' }}>Bid & Evaluation</div>
                <ul style={{ fontSize: '0.75rem', color: 'var(--text-dim)', listStyle: 'circle', paddingLeft: '1.25rem' }}>
                  <li>Inspect Submitted Bids</li>
                  {['EVALUATOR', 'SUPER_ADMIN'].includes(user.role) && <li>Score Technical Bids</li>}
                  {['AUDITOR', 'SUPER_ADMIN'].includes(user.role) && <li>Export Audit Logs</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Documents */}
        {activeTab === 'documents' && (
          <div style={{ padding: '1rem', background: 'rgba(10, 16, 32, 0.5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={18} color="var(--accent)" />
              <div>
                <div style={{ fontWeight: '650', fontSize: '0.85rem' }}>Tax Registration & Vendor Certificate.pdf</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Uploaded 2 weeks ago · 2.4 MB</div>
              </div>
            </div>
            <span className="badge badge-success">Verified</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn-secondary" onClick={onClose}>Close</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
