import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import SystemStatus from './components/SystemStatus';
import AuthModal from './components/AuthModal';
import MFASetup from './components/MFASetup';
import SessionManager from './components/SessionManager';
import RbacInspector from './components/RbacInspector';
import SplitScreenAuth from './components/auth/SplitScreenAuth';
import UserManagementDashboard from './components/users/UserManagementDashboard';
import PermissionMatrix from './components/users/PermissionMatrix';
import { 
  ShieldCheck, 
  Users, 
  CheckCircle,
  User as UserIcon,
  LogOut,
  KeyRound,
  Shield,
  Smartphone,
  Monitor,
  LayoutDashboard,
  Lock,
  Layers
} from 'lucide-react';

function TenderXApp() {
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'auth-screen', 'rbac-matrix', 'sessions', 'security', 'overview'

  const modulesList = [
    { id: 1, title: "M1: Project Setup", desc: "Docker, Git, CI/CD, Django + React", status: "completed" },
    { id: 2, title: "M2: User Auth & RBAC", desc: "JWT, 6-Roles, MFA TOTP, Reset, Sessions", status: "completed" },
    { id: 3, title: "M3: User Management UI", desc: "Split Auth, Dashboard, RBAC Matrix, Sessions, Timeline", status: "completed" },
    { id: 4, title: "M4: Tender Creation", desc: "Category, Specs, BOQ, Attachments", status: "pending" },
    { id: 5, title: "M5: Bid Submission", desc: "Encrypted Financial & Tech Bids", status: "pending" },
    { id: 6, title: "M6: Tender Evaluation", desc: "Scoring, Comparison, Shortlisting", status: "pending" },
    { id: 7, title: "M7: Reverse Auction", desc: "Real-time Live Bidding Engine", status: "pending" },
    { id: 8, title: "M8: Award & Contract", desc: "PO Generation, Digital Signatures", status: "pending" },
    { id: 9, title: "M9: Payment Gateway", desc: "EMD, Tender Fee, Wallet", status: "pending" },
    { id: 10, title: "M10: Audit & Security", desc: "Immutable Activity Logs", status: "pending" },
    { id: 11, title: "M11: Analytics & Reports", desc: "Spend Analysis, Vendor Performance", status: "pending" },
    { id: 12, title: "M12: Production & Ops", desc: "K8s, Monitoring, SSL, Hardening", status: "pending" },
  ];

  return (
    <div>
      {/* Top Navigation Bar */}
      <nav style={{ 
        borderBottom: '1px solid var(--border-muted)', 
        background: 'rgba(15, 23, 42, 0.95)', 
        backdropFilter: 'blur(16px)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 50 
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem' }}>
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
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
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
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
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

      {/* Main App Container */}
      <main className="container" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginTop: '0.5rem' }}>
        
        {/* Module 3 Executive Banner */}
        <div className="glass-card" style={{ 
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(15, 23, 42, 0.95) 70%)',
          border: '1px solid var(--border-glow)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ maxWidth: '750px' }}>
              <div className="badge badge-success" style={{ marginBottom: '0.85rem' }}>
                <CheckCircle size={14} /> Module 3 — Advanced User Management & Authentication UI Complete
              </div>
              <h2 style={{ fontSize: '1.85rem', fontWeight: '800', marginBottom: '0.65rem', lineHeight: '1.2' }}>
                Enterprise Procurement Identity & Access Management (IAM)
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.6' }}>
                Full-stack user management dashboard featuring multi-tenant organization & department units, debounced search, multi-faceted filtering, fine-grained RBAC permission matrix configuration, audit-style activity timeline, session revocation, and split-screen authentication UI.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><Users size={12} /> User Directory & Metrics</span>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><ShieldCheck size={12} /> RBAC Permission Matrix</span>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><Lock size={12} /> Split-Screen Auth UI</span>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><Smartphone size={12} /> Audit Activity & Sessions</span>
              </div>
            </div>

            {/* Status Card */}
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.4)', 
              borderRadius: '10px', 
              padding: '1rem 1.25rem', 
              border: '1px solid var(--border-muted)',
              minWidth: '240px'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                System Module Status
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Progress:</span>
                  <span style={{ color: 'var(--emerald)', fontWeight: '700' }}>3 / 12 Completed</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Identity:</span>
                  <span className="code-font" style={{ color: 'var(--accent)', fontWeight: '600' }}>
                    {user?.email || 'Guest Mode'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Role:</span>
                  <span className="code-font" style={{ color: 'var(--purple)', fontWeight: '600' }}>
                    {user?.role || 'VENDOR'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.65rem', borderBottom: '1px solid var(--border-muted)', paddingBottom: '0.65rem', overflowX: 'auto' }}>
          <button 
            onClick={() => setActiveTab('users')} 
            style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: activeTab === 'users' ? 'var(--primary)' : 'rgba(15,23,42,0.6)', border: 'none', color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Users size={16} /> User Management Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('auth-screen')} 
            style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: activeTab === 'auth-screen' ? 'var(--primary)' : 'rgba(15,23,42,0.6)', border: 'none', color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Lock size={16} /> Split-Screen Auth Login UI
          </button>
          <button 
            onClick={() => setActiveTab('rbac-matrix')} 
            style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: activeTab === 'rbac-matrix' ? 'var(--primary)' : 'rgba(15,23,42,0.6)', border: 'none', color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ShieldCheck size={16} /> Fine-Grained RBAC Matrix
          </button>
          <button 
            onClick={() => setActiveTab('sessions')} 
            style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: activeTab === 'sessions' ? 'var(--primary)' : 'rgba(15,23,42,0.6)', border: 'none', color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Smartphone size={16} /> Session Management
          </button>
          <button 
            onClick={() => setActiveTab('security')} 
            style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: activeTab === 'security' ? 'var(--primary)' : 'rgba(15,23,42,0.6)', border: 'none', color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <KeyRound size={16} /> MFA TOTP Setup
          </button>
          <button 
            onClick={() => setActiveTab('overview')} 
            style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: activeTab === 'overview' ? 'var(--primary)' : 'rgba(15,23,42,0.6)', border: 'none', color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Layers size={16} /> System Infrastructure
          </button>
        </div>

        {/* Tab Content Views */}
        {activeTab === 'users' && <UserManagementDashboard />}
        {activeTab === 'auth-screen' && <SplitScreenAuth onLoginSuccess={() => setActiveTab('users')} />}
        {activeTab === 'rbac-matrix' && <PermissionMatrix />}
        {activeTab === 'sessions' && <SessionManager />}
        {activeTab === 'security' && <MFASetup />}
        {activeTab === 'overview' && <SystemStatus />}

        {/* 12-Module Roadmap Section */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>TenderX 12-Module Enterprise Roadmap</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Complete end-to-end procurement system implementation</p>
            </div>
            <span className="badge badge-success">3 / 12 Completed</span>
          </div>

          <div className="grid-4">
            {modulesList.map((m) => (
              <div 
                key={m.id} 
                className="glass-card" 
                style={{ 
                  padding: '1rem',
                  borderColor: m.status === 'completed' ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-muted)',
                  background: m.status === 'completed' ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="code-font" style={{ fontSize: '0.725rem', fontWeight: '700', color: m.status === 'completed' ? 'var(--emerald)' : 'var(--text-dim)' }}>
                    MODULE {m.id}
                  </span>
                  {m.status === 'completed' ? (
                    <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>Completed</span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', border: '1px solid var(--border-muted)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>Upcoming</span>
                  )}
                </div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.25rem' }}>{m.title}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <footer style={{ marginTop: '4rem', borderTop: '1px solid var(--border-muted)', padding: '2rem 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        <p>tenderX © 2026 | Enterprise Online Tender Management System | Module 3 Advanced User Management & Auth UI Complete</p>
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

