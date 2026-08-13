import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import SystemStatus from './components/SystemStatus';
import AuthModal from './components/AuthModal';
import MFASetup from './components/MFASetup';
import SessionManager from './components/SessionManager';
import RbacInspector from './components/RbacInspector';
import { 
  ShieldCheck, 
  GitBranch, 
  Workflow, 
  Box, 
  CheckCircle,
  User as UserIcon,
  LogOut,
  KeyRound,
  Shield,
  Smartphone,
  Monitor,
  Code2,
  Terminal,
  Cpu
} from 'lucide-react';

function TenderXApp() {
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'rbac', 'security', 'sessions'

  const modulesList = [
    { id: 1, title: "M1: Project Setup", desc: "Docker, Git, CI/CD, Django + React", status: "completed" },
    { id: 2, title: "M2: User Auth & RBAC", desc: "JWT, 6-Roles, MFA TOTP, Reset, Sessions", status: "completed" },
    { id: 3, title: "M3: Tender Creation", desc: "Category, Specs, BOQ, Attachments", status: "pending" },
    { id: 4, title: "M4: Bid Submission", desc: "Encrypted Financial & Tech Bids", status: "pending" },
    { id: 5, title: "M5: Tender Evaluation", desc: "Scoring, Comparison, Shortlisting", status: "pending" },
    { id: 6, title: "M6: Reverse Auction", desc: "Real-time Live Bidding Engine", status: "pending" },
    { id: 7, title: "M7: Award & Contract", desc: "PO Generation, Digital Signatures", status: "pending" },
    { id: 8, title: "M8: Payment Gateway", desc: "EMD, Tender Fee, Wallet", status: "pending" },
    { id: 9, title: "M9: Audit & Security", desc: "Immutable Activity Logs", status: "pending" },
    { id: 10, title: "M10: Notifications", desc: "Email, SMS, WebSockets", status: "pending" },
    { id: 11, title: "M11: Analytics & Reports", desc: "Spend Analysis, Vendor Performance", status: "pending" },
    { id: 12, title: "M12: Production & Ops", desc: "K8s, Monitoring, SSL, Hardening", status: "pending" },
  ];

  return (
    <div>
      {/* Top Navigation */}
      <nav style={{ 
        borderBottom: '1px solid var(--border-muted)', 
        background: 'rgba(9, 13, 22, 0.85)', 
        backdropFilter: 'blur(16px)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 50 
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', 
              width: '38px', 
              height: '38px', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '1.25rem',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}>
              tX
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                tenderX
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Online Tender Management System</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{user.full_name || user.email}</div>
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                    {user.role}
                  </span>
                </div>
                <button 
                  onClick={logout} 
                  style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#f87171', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="btn-action">
                <UserIcon size={16} /> Sign In / Register
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1rem' }}>
        
        {/* Module 2 Banner */}
        <div className="glass-card" style={{ 
          background: 'radial-gradient(ellipse at top right, rgba(139, 92, 246, 0.25) 0%, rgba(17, 24, 39, 0.8) 70%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ maxWidth: '720px' }}>
              <div className="badge badge-success" style={{ marginBottom: '1rem' }}>
                <CheckCircle size={14} /> Module 2 - Authentication, RBAC & Security Complete
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.75rem', lineHeight: '1.2' }}>
                JWT Authentication & 6-Role Access Control Enabled
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                Features SimpleJWT token authentication, 6 defined RBAC roles (Super Admin, Org Admin, Tender Manager, Vendor, Evaluator, Auditor), Multi-Factor Authentication (MFA TOTP), Email verification token workflow, Password Reset flow, and Active Session Management.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><KeyRound size={12} /> JWT Auth Pair</span>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><Shield size={12} /> 6 RBAC Roles</span>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><Smartphone size={12} /> TOTP MFA 2FA</span>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><Monitor size={12} /> Session Revocation</span>
              </div>
            </div>

            {/* User Session Quick Card */}
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.35)', 
              borderRadius: '12px', 
              padding: '1.25rem', 
              border: '1px solid var(--border-muted)',
              minWidth: '260px'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Active Identity Profile
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span className="code-font" style={{ color: user ? 'var(--emerald)' : 'var(--amber)', fontWeight: '600' }}>
                    {user ? 'Authenticated' : 'Guest Mode'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Role:</span>
                  <span className="code-font" style={{ color: 'var(--primary)', fontWeight: '600' }}>
                    {user?.role || 'VENDOR'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>MFA Protected:</span>
                  <span className="code-font" style={{ color: user?.is_mfa_enabled ? 'var(--emerald)' : 'var(--rose)', fontWeight: '600' }}>
                    {user?.is_mfa_enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Module Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-muted)', pb: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('overview')} 
            style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', background: activeTab === 'overview' ? 'var(--primary)' : 'rgba(0,0,0,0.3)', border: 'none', color: '#ffffff', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            System Infrastructure & Health
          </button>
          <button 
            onClick={() => setActiveTab('rbac')} 
            style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', background: activeTab === 'rbac' ? 'var(--primary)' : 'rgba(0,0,0,0.3)', border: 'none', color: '#ffffff', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            6-Role RBAC Inspector
          </button>
          <button 
            onClick={() => setActiveTab('security')} 
            style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', background: activeTab === 'security' ? 'var(--primary)' : 'rgba(0,0,0,0.3)', border: 'none', color: '#ffffff', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            MFA Authenticator Setup
          </button>
          <button 
            onClick={() => setActiveTab('sessions')} 
            style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', background: activeTab === 'sessions' ? 'var(--primary)' : 'rgba(0,0,0,0.3)', border: 'none', color: '#ffffff', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Session Management
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'overview' && <SystemStatus />}
        {activeTab === 'rbac' && <RbacInspector />}
        {activeTab === 'security' && <MFASetup />}
        {activeTab === 'sessions' && <SessionManager />}

        {/* 12-Module Roadmap Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>TenderX Project Module Roadmap (1 to 12)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sequential development modules overview</p>
            </div>
            <span className="badge badge-success">2 / 12 Completed</span>
          </div>

          <div className="grid-4">
            {modulesList.map((m) => (
              <div 
                key={m.id} 
                className="glass-card" 
                style={{ 
                  padding: '1rem',
                  borderColor: m.status === 'completed' ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-muted)',
                  background: m.status === 'completed' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="code-font" style={{ fontSize: '0.75rem', fontWeight: '700', color: m.status === 'completed' ? 'var(--emerald)' : 'var(--text-dim)' }}>
                    MODULE {m.id}
                  </span>
                  {m.status === 'completed' ? (
                    <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>Completed</span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', border: '1px solid var(--border-muted)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>Upcoming</span>
                  )}
                </div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.25rem' }}>{m.title}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <footer style={{ marginTop: '4rem', borderTop: '1px solid var(--border-muted)', padding: '2rem 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        <p>tenderX © 2026 | Online Tender Management System | Module 2 Authentication & RBAC Complete</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TenderXApp />
    </AuthProvider>
  );
}
