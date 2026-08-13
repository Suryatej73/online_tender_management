import React, { useState, useEffect } from 'react';
import { 
  X, User as UserIcon, Mail, Phone, Building, Shield, 
  CheckCircle2, Clock, Smartphone, FileText, KeyRound, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { usersApi } from '../../api/usersApi';

export default function UserProfileModal({ user, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, activity, sessions, permissions, documents
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-muted)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '1.2rem',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(37,99,235,0.4)'
            }}>
              {initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{user.full_name || user.username}</h3>
                <span className="badge badge-primary">{user.role}</span>
                <span className={`badge ${user.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{user.status}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email} • {user.position_title || 'Procurement Specialist'}</p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Profile Completion Bar */}
        <div style={{ marginBottom: '1.5rem', background: 'rgba(15,23,42,0.6)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', fontWeight: '600', marginBottom: '0.35rem' }}>
            <span>Profile Completeness & Verification</span>
            <span style={{ color: 'var(--accent)' }}>{completionRate}% Complete</span>
          </div>
          <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${completionRate}%`, background: 'linear-gradient(90deg, #2563eb, #10b981)', borderRadius: '3px' }} />
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-muted)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
          {['overview', 'activity', 'sessions', 'permissions', 'documents'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                border: 'none',
                color: activeTab === tab ? '#ffffff' : 'var(--text-muted)',
                fontWeight: '600',
                fontSize: '0.825rem',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="grid-2">
              <div className="glass-card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  Contact Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Email:</span>
                    <span className="code-font">{user.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Phone:</span>
                    <span>{user.phone_number || '+1 (555) 019-2834'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Email Verified:</span>
                    <span className={`badge ${user.is_email_verified ? 'badge-success' : 'badge-warning'}`}>{user.is_email_verified ? 'Verified' : 'Pending'}</span>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  Organizational Unit
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Organization:</span>
                    <span style={{ fontWeight: '600' }}>{user.organization_title || user.organization_name || 'Ministry of Public Works'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Department:</span>
                    <span>{user.department_title || 'Executive Board'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Designated Role:</span>
                    <span className="badge badge-primary">{user.role}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                Security & Authentication Status
              </h4>
              <div className="grid-3" style={{ fontSize: '0.825rem' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>MFA Status:</span>
                  <div style={{ fontWeight: '700', color: user.is_mfa_enabled ? 'var(--emerald)' : 'var(--amber)', marginTop: '0.2rem' }}>
                    {user.is_mfa_enabled ? 'TOTP Protected' : 'Disabled'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Last Login IP:</span>
                  <div className="code-font" style={{ fontWeight: '600', marginTop: '0.2rem' }}>
                    {user.last_login_ip || '192.168.1.104'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Account Status:</span>
                  <div style={{ fontWeight: '700', color: user.status === 'ACTIVE' ? 'var(--emerald)' : 'var(--rose)', marginTop: '0.2rem' }}>
                    {user.status}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Activity Timeline */}
        {activeTab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '420px', overflowY: 'auto' }}>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                No audit activity logged for this user account yet.
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} style={{ display: 'flex', gap: '0.85rem', padding: '0.85rem', background: 'rgba(15,23,42,0.6)', borderRadius: '8px', border: '1px solid var(--border-muted)' }}>
                  <div style={{ paddingTop: '0.2rem' }}>
                    <Clock size={16} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{act.action}</span>
                      <span className="code-font" style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {act.resource} • {act.details || 'System operation executed successfully.'}
                    </p>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                      IP: {act.ip_address || '127.0.0.1'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Active Sessions */}
        {activeTab === 'sessions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                No active device sessions found for this user.
              </div>
            ) : (
              sessions.map((sess) => (
                <div key={sess.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: 'rgba(15,23,42,0.6)', borderRadius: '8px', border: '1px solid var(--border-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Smartphone size={20} color="var(--primary)" />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{sess.device_type}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sess.ip_address} • {sess.location}</div>
                    </div>
                  </div>
                  <span className="badge badge-success">Active Now</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Permissions */}
        {activeTab === 'permissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="badge badge-primary" style={{ alignSelf: 'flex-start' }}>Role: {user.role}</div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Permissions granted via Role-Based Access Control (RBAC) policy matrix:
            </p>
            <div className="grid-2">
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-muted)' }}>
                <div style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>Tender Management</div>
                <ul style={{ fontSize: '0.775rem', color: 'var(--text-muted)', listStyle: 'circle', paddingLeft: '1.25rem' }}>
                  <li>View Tender Specifications</li>
                  {user.role !== 'VENDOR' && <li>Create & Edit Tenders</li>}
                  {['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER'].includes(user.role) && <li>Approve Tender Release</li>}
                </ul>
              </div>
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-muted)' }}>
                <div style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--emerald)', marginBottom: '0.5rem' }}>Bid & Evaluation</div>
                <ul style={{ fontSize: '0.775rem', color: 'var(--text-muted)', listStyle: 'circle', paddingLeft: '1.25rem' }}>
                  <li>Inspect Submitted Bids</li>
                  {['EVALUATOR', 'SUPER_ADMIN'].includes(user.role) && <li>Score Technical Bids</li>}
                  {['AUDITOR', 'SUPER_ADMIN'].includes(user.role) && <li>Export Audit Logs</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Documents */}
        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: 'rgba(15,23,42,0.6)', borderRadius: '8px', border: '1px solid var(--border-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={18} color="var(--accent)" />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>Tax Registration & Vendor Certificate.pdf</div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>Uploaded 2 weeks ago • 2.4 MB</div>
                </div>
              </div>
              <span className="badge badge-success">Verified</span>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '1rem', marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={onClose}>Close Profile</button>
        </div>
      </div>
    </div>
  );
}
