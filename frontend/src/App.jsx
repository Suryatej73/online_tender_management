import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import SystemStatus from './components/SystemStatus';
import AuthModal from './components/AuthModal';
import MFASetup from './components/MFASetup';
import SessionManager from './components/SessionManager';
import RbacInspector from './components/RbacInspector';
import SplitScreenAuth from './components/auth/SplitScreenAuth';
import UserManagementDashboard from './components/users/UserManagementDashboard';
import PermissionMatrix from './components/users/PermissionMatrix';
import AddEditUserModal from './components/users/AddEditUserModal';
import TenderManagementDashboard from './components/tenders/TenderManagementDashboard';
import VendorManagementDashboard from './components/vendors/VendorManagementDashboard';
import BidManagementDashboard from './components/bids/BidManagementDashboard';
import DocumentManagementDashboard from './components/documents/DocumentManagementDashboard';
import { tendersApi } from './api/tendersApi';
import { vendorsApi } from './api/vendorsApi';


import { 
  ShieldCheck, 
  Users, 
  User as UserIcon,
  LogOut,
  KeyRound,
  Shield,
  Smartphone,
  Monitor,
  LayoutDashboard,
  Lock,
  Layers,
  FileText,
  Gavel,
  CheckCircle2,
  TrendingUp,
  Award,
  Search,
  Plus,  Building, Bell, Clock, ExternalLink, Building2, FileCheck
} from 'lucide-react';


function TenderXApp() {
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'tenders', 'bids', 'users', 'rbac', 'security'

  const [dashboard, setDashboard] = useState({ statistics: {}, recent_tenders: [] });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const [tenderResponse, vendorResponse] = await Promise.all([
        tendersApi.getDashboard(),
        vendorsApi.getDashboard().catch(() => ({ data: {} })),
      ]);
      setDashboard({
        ...(tenderResponse.data || { statistics: {}, recent_tenders: [] }),
        vendorCount: vendorResponse.data?.total_vendors || 0,
      });
    } catch (error) {
      setDashboard({ statistics: {}, recent_tenders: [], vendorCount: 0 });
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const refreshTimer = window.setInterval(loadDashboard, 15000);
    return () => window.clearInterval(refreshTimer);
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
  }, [activeTab, loadDashboard]);

  useEffect(() => {
    window.addEventListener('tenders:changed', loadDashboard);
    return () => window.removeEventListener('tenders:changed', loadDashboard);
  }, [loadDashboard]);

  const dashboardStats = dashboard.statistics || {};
  const recentTenders = dashboard.recent_tenders || [];
  const formatCurrency = (amount, currency = 'USD') =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount || 0));

  return (
    <div>
      {/* Top Header Bar */}
      <header style={{ 
        borderBottom: '1px solid var(--border-muted)', 
        background: 'rgba(15, 23, 42, 0.95)', 
        backdropFilter: 'blur(16px)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 50 
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem' }}>
          
          {/* Logo & Platform Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', 
                width: '40px', 
                height: '40px', 
                borderRadius: '10px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '1.3rem',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
              }}>
                tX
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  tenderX
                </h1>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enterprise Online Tender Management System</p>
              </div>
            </div>

            {/* Quick Search Bar */}
            <div style={{ position: 'relative', width: '280px', display: 'none', md: 'block' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.65rem', color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                placeholder="Search Tenders, BOQ, Vendors..." 
                style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2.2rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', color: '#ffffff', fontSize: '0.825rem' }}
              />
            </div>
          </div>

          {/* User Controls & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button 
              onClick={() => setAddUserModalOpen(true)} 
              className="btn-action" 
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--emerald) 0%, var(--cyan) 100%)' }}
            >
              <Plus size={15} /> Add User
            </button>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border-muted)', paddingLeft: '0.85rem' }}>
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
              <button onClick={() => setAuthModalOpen(true)} className="btn-action" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}>
                <UserIcon size={15} /> Identity Sign In
              </button>
            )}
          </div>
        </div>

        {/* Primary Platform Navigation Tabs */}
        <div style={{ background: 'rgba(9, 13, 22, 0.95)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="container" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.4rem 1.5rem' }}>
            <button 
              onClick={() => setActiveTab('dashboard')} 
              style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', background: activeTab === 'dashboard' ? 'var(--primary)' : 'transparent', border: 'none', color: activeTab === 'dashboard' ? '#ffffff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <LayoutDashboard size={16} /> Procurement Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('tenders')} 
              style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', background: activeTab === 'tenders' ? 'var(--primary)' : 'transparent', border: 'none', color: activeTab === 'tenders' ? '#ffffff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <FileText size={16} /> Tenders & BOQ Catalog
            </button>
            <button 
              onClick={() => setActiveTab('documents')} 
              style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', background: activeTab === 'documents' ? 'var(--primary)' : 'transparent', border: 'none', color: activeTab === 'documents' ? '#ffffff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <FileCheck size={16} /> Document Center (M8)
            </button>

            <button 
              onClick={() => setActiveTab('bids')} 
              style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', background: activeTab === 'bids' ? 'var(--primary)' : 'transparent', border: 'none', color: activeTab === 'bids' ? '#ffffff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Gavel size={16} /> Bidding & Evaluation
            </button>
            <button 
              onClick={() => setActiveTab('users')} 
              style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', background: activeTab === 'users' ? 'var(--primary)' : 'transparent', border: 'none', color: activeTab === 'users' ? '#ffffff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Users size={16} /> User & Org Administration
            </button>
            <button 
              onClick={() => setActiveTab('vendors')} 
              style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', background: activeTab === 'vendors' ? 'var(--primary)' : 'transparent', border: 'none', color: activeTab === 'vendors' ? '#ffffff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Building2 size={16} /> Vendor Management
            </button>
            <button 
              onClick={() => setActiveTab('rbac')} 
              style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', background: activeTab === 'rbac' ? 'var(--primary)' : 'transparent', border: 'none', color: activeTab === 'rbac' ? '#ffffff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <ShieldCheck size={16} /> RBAC Permissions Matrix
            </button>
            <button 
              onClick={() => setActiveTab('security')} 
              style={{ padding: '0.6rem 1.1rem', borderRadius: '8px', background: activeTab === 'security' ? 'var(--primary)' : 'transparent', border: 'none', color: activeTab === 'security' ? '#ffffff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <KeyRound size={16} /> Identity & Security Portal
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginTop: '1.5rem' }}>
        
        {/* Executive Dashboard View */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            
            {/* Executive Stat Cards */}
            <div className="grid-4">
              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Tenders</span>
                  <FileText size={18} color="var(--primary)" />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800' }}>{dashboardLoading ? '—' : dashboardStats.active_tenders || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--emerald)', marginTop: '0.35rem' }}>Live count in ACTIVE status</div>
              </div>

              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Submitted Bids</span>
                  <Gavel size={18} color="var(--cyan)" />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800' }}>{dashboardLoading ? '—' : dashboardStats.submitted_bids || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', marginTop: '0.35rem' }}>Live bid records (bid module pending)</div>
              </div>

              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Awarded Value</span>
                  <Award size={18} color="var(--emerald)" />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800' }}>{dashboardLoading ? '—' : formatCurrency(dashboardStats.awarded_value)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--emerald)', marginTop: '0.35rem' }}>Across {dashboardStats.awarded_contracts || 0} awarded tenders</div>
              </div>

              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered Vendors</span>
                  <Building size={18} color="var(--accent)" />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800' }}>{dashboardLoading ? '—' : dashboard.vendorCount || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.35rem' }}>Live registered vendor profiles</div>
              </div>
            </div>

            {/* Procurement Tenders Overview Table Preview */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Recent Procurement Opportunities & Status</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Latest tenders from your live tender workflow</p>
                </div>
                <button onClick={() => setActiveTab('tenders')} className="btn-action" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                  View All Tenders
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem' }}>Tender ID</th>
                      <th style={{ padding: '0.75rem' }}>Title & Description</th>
                      <th style={{ padding: '0.75rem' }}>Category</th>
                      <th style={{ padding: '0.75rem' }}>Est. Value</th>
                      <th style={{ padding: '0.75rem' }}>Deadline</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTenders.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.75rem' }} className="code-font">{t.tender_number}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: '700' }}>{t.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.effective_org_name}</div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="badge badge-primary">{t.category_name || 'General'}</span>
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: '700' }}>{formatCurrency(t.budget, t.currency)}</td>
                        <td style={{ padding: '0.75rem' }} className="code-font">{t.submission_deadline ? new Date(t.submission_deadline).toLocaleDateString() : 'Not set'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge ${['ACTIVE', 'AWARDED'].includes(t.status) ? 'badge-success' : 'badge-warning'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!dashboardLoading && recentTenders.length === 0 && (
                      <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No tenders have been created yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Infrastructure Monitor */}
            <SystemStatus />
          </div>
        )}

        {/* Tenders & BOQ Catalog View */}
        {activeTab === 'tenders' && <TenderManagementDashboard />}

        {/* Document Center (Module 8) View */}
        {activeTab === 'documents' && <DocumentManagementDashboard currentUser={user} />}

        {/* Vendor Management Tab */}
        {activeTab === 'vendors' && <VendorManagementDashboard />}



        {/* Bidding & Evaluation View */}
        {activeTab === 'bids' && <BidManagementDashboard />}

        {/* User Management Tab */}
        {activeTab === 'users' && <UserManagementDashboard />}

        {/* RBAC Matrix Tab */}
        {activeTab === 'rbac' && <PermissionMatrix />}

        {/* Identity & Security Portal Tab */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <SplitScreenAuth onLoginSuccess={() => setActiveTab('users')} />
            <div className="grid-2">
              <MFASetup />
              <SessionManager />
            </div>
          </div>
        )}

      </main>

      {/* Auth Modals */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      {addUserModalOpen && (
        <AddEditUserModal 
          onClose={() => setAddUserModalOpen(false)} 
          onSuccess={() => {
            setAddUserModalOpen(false);
            setActiveTab('users');
          }}
        />
      )}

      {/* Footer */}
      <footer style={{ marginTop: '4rem', borderTop: '1px solid var(--border-muted)', padding: '2rem 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        <p>tenderX © 2026 | Enterprise Online Tender Management Platform | Infrastructure & Security Active</p>
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
