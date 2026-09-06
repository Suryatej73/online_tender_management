import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import EvaluatorOversightPanel from './components/evaluators/EvaluatorOversightPanel';
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
import TenderXLanding from './components/landing/TenderXLanding';
import PuritySidebar from './components/layout/PuritySidebar';
import PurityNavbar from './components/layout/PurityNavbar';
import PurityDashboardView from './components/dashboard/PurityDashboardView';


import { tendersApi } from './api/tendersApi';
import { vendorsApi } from './api/vendorsApi';
import { bidsApi } from './api/bidsApi';
import { 
  ArrowLeft, LayoutDashboard, User, Shield, KeyRound,
  FileText, Gavel, Building2, FileCheck, CheckCircle2
} from 'lucide-react';

function TenderXApp() {
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('login');
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showExplorePage, setShowExplorePage] = useState(false);

  const [dashboard, setDashboard] = useState({ statistics: {}, recent_tenders: [], bidStats: {} });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const [tenderResponse, vendorResponse, bidResponse] = await Promise.all([
        tendersApi.getDashboard().catch(() => ({ data: { statistics: {}, recent_tenders: [] } })),
        vendorsApi.getDashboard().catch(() => ({ data: {} })),
        bidsApi.getDashboard().catch(() => ({ data: {} })),
      ]);

      const tenderData = tenderResponse?.data || {};
      const vendorData = vendorResponse?.data || {};
      const bidData = bidResponse?.data || {};

      setDashboard({
        ...tenderData,
        vendorCount: vendorData.total_vendors || vendorData.total || 0,
        bidStats: bidData,
        statistics: {
          ...(tenderData.statistics || {}),
          total_bids: bidData.total_bids ?? tenderData.statistics?.total_bids ?? 0,
          awarded_tenders: tenderData.statistics?.awarded_tenders ?? bidData.awarded_bids ?? 0,
        },
      });
    } catch (error) {
      setDashboard({ statistics: {}, recent_tenders: [], vendorCount: 0, bidStats: {} });
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const refreshTimer = window.setInterval(loadDashboard, 30000);
    return () => window.clearInterval(refreshTimer);
  }, [loadDashboard]);

  // If user is NOT logged in or explicitly browsing explore, show Explore Landing Page
  if (!user || showExplorePage) {
    return (
      <div className="relative">
        {/* Floating return button if logged-in user is browsing explore */}
        {user && showExplorePage && (
          <div className="fixed top-20 right-6 z-50 bg-[#0d1117]/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border border-orange-500/30 flex items-center gap-3">
            <span className="text-xs font-semibold text-white/80">Logged in as {user.email}</span>
            <button
              onClick={() => setShowExplorePage(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        )}

        <TenderXLanding
          onOpenLogin={() => {
            setAuthInitialTab('login');
            setAuthModalOpen(true);
          }}
          onOpenRegister={() => {
            setAuthInitialTab('register');
            setAuthModalOpen(true);
          }}
        />


        {/* Global Auth Modal */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialTab={authInitialTab}
        />
      </div>
    );
  }

  // Once authenticated: User enters the TenderX OS Command Center with dark sidebar & theme
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex font-sans antialiased selection:bg-orange-500/30 selection:text-orange-200">
      
      {/* 1. Left Sidebar matching dark SaaS architecture */}
      <PuritySidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={user}
        onLogout={logout}
        onExploreClick={() => setShowExplorePage(true)}
      />

      {/* 2. Main Working Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Top Navbar with breadcrumbs, command bar, and notifications */}
        <PurityNavbar
          activeTab={activeTab}
          currentUser={user}
          onLogout={logout}
          onExploreClick={() => setShowExplorePage(true)}
          onTabChange={setActiveTab}
        />

        {/* Scrollable Working Content Area */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          
          {/* TAB 1: Executive Command Center Dashboard */}
          {activeTab === 'dashboard' && (
            <PurityDashboardView
              dashboardData={dashboard}
              onNavigateToTenders={() => setActiveTab('tenders')}
              onNavigateToDocuments={() => setActiveTab('documents')}
            />
          )}

          {/* TAB 2: Tenders & BOQ Catalog */}
          {activeTab === 'tenders' && (
            <div className="bg-[#0b0e14]/90 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <TenderManagementDashboard />
            </div>
          )}

          {/* TAB 3: Bidding & Submissions */}
          {activeTab === 'bids' && (
            <div className="bg-[#0b0e14]/90 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <BidManagementDashboard />
            </div>
          )}

          {/* TAB 4: Vendor Management */}
          {activeTab === 'vendors' && (
            <div className="bg-[#0b0e14]/90 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <VendorManagementDashboard />
            </div>
          )}

          {/* TAB 5: Documents (Module 8 - renamed strictly to Documents) */}
          {activeTab === 'documents' && (
            <div className="bg-[#0b0e14]/90 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <DocumentManagementDashboard currentUser={user} />
            </div>
          )}

          {/* TAB 6: Evaluations & Audits / Evaluator Oversight */}
          {activeTab === 'evaluations' && (
            <div className="bg-[#0b0e14]/90 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
              {user?.role === 'SUPER_ADMIN' ? (
                <EvaluatorOversightPanel />
              ) : (
                <BidManagementDashboard initialTab="evaluations" />
              )}
            </div>
          )}

          {/* TAB 7: Users Administration (Admin role only) */}
          {activeTab === 'users' && (
            <div className="bg-[#0b0e14]/90 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <UserManagementDashboard />
            </div>
          )}

          {/* TAB 8: RBAC Permissions Matrix (Admin role only) */}
          {activeTab === 'rbac' && (
            <div className="bg-[#0b0e14]/90 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <PermissionMatrix />
            </div>
          )}

          {/* TAB 9: Profile, Security & Session Management */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-black text-xl shadow-inner">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-white">{user.full_name || user.username || user.email}</h3>
                    <p className="text-xs text-white/50">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                        {user.role}
                      </span>
                      <span className="text-xs text-white/40">• Organization: {user.organization_name || user.effective_organization_name || 'General Authority'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition self-start sm:self-auto"
                >
                  Sign Out
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl">
                  <MFASetup />
                </div>
                <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl">
                  <SessionManager />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Auth & Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authInitialTab}
      />

      {addUserModalOpen && (
        <AddEditUserModal 
          onClose={() => setAddUserModalOpen(false)} 
          onSuccess={() => {
            setAddUserModalOpen(false);
            setActiveTab('users');
          }}
        />
      )}
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
