import React, { useState, useEffect, useCallback } from 'react';
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
import TenderXLanding from './components/landing/TenderXLanding';
import PuritySidebar from './components/layout/PuritySidebar';
import PurityNavbar from './components/layout/PurityNavbar';
import PurityDashboardView from './components/dashboard/PurityDashboardView';


import { tendersApi } from './api/tendersApi';
import { vendorsApi } from './api/vendorsApi';
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

  const [dashboard, setDashboard] = useState({ statistics: {}, recent_tenders: [] });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const [tenderResponse, vendorResponse] = await Promise.all([
        tendersApi.getDashboard().catch(() => ({ data: { statistics: {}, recent_tenders: [] } })),
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
    const refreshTimer = window.setInterval(loadDashboard, 30000);
    return () => window.clearInterval(refreshTimer);
  }, [loadDashboard]);

  // If user is NOT logged in or explicitly browsing explore, show Explore Landing Page
  if (!user || showExplorePage) {
    return (
      <div className="relative">
        {/* Floating return button if logged-in user is browsing explore */}
        {user && showExplorePage && (
          <div className="fixed top-20 right-6 z-50 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-teal-200 flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Logged in as {user.email}</span>
            <button
              onClick={() => setShowExplorePage(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-xs transition"
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

  // Once authenticated: User enters the Purity UI Dashboard layout with left sidebar
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex font-sans antialiased">
      
      {/* 1. Left Sidebar matching reference image */}
      <PuritySidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={user}
        onLogout={logout}
        onExploreClick={() => setShowExplorePage(true)}
      />

      {/* 2. Main Working Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Top Navbar with breadcrumbs and search */}
        <PurityNavbar
          activeTab={activeTab}
          currentUser={user}
          onLogout={logout}
          onExploreClick={() => setShowExplorePage(true)}
        />

        {/* Scrollable Working Content Area */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          
          {/* TAB 1: Purity UI Executive Dashboard matching reference picture */}
          {activeTab === 'dashboard' && (
            <PurityDashboardView
              dashboardData={dashboard}
              onNavigateToTenders={() => setActiveTab('tenders')}
              onNavigateToDocuments={() => setActiveTab('documents')}
            />
          )}

          {/* TAB 2: Tenders & BOQ Catalog */}
          {activeTab === 'tenders' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <TenderManagementDashboard />
            </div>
          )}

          {/* TAB 3: Bidding & Submissions */}
          {activeTab === 'bids' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <BidManagementDashboard />
            </div>
          )}

          {/* TAB 4: Vendor Management */}
          {activeTab === 'vendors' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <VendorManagementDashboard />
            </div>
          )}

          {/* TAB 5: Documents (Module 8 - renamed strictly to Documents) */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <DocumentManagementDashboard currentUser={user} />
            </div>
          )}

          {/* TAB 6: Users Administration (Admin role only) */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <UserManagementDashboard />
            </div>
          )}

          {/* TAB 7: RBAC Permissions Matrix (Admin role only) */}
          {activeTab === 'rbac' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <PermissionMatrix />
            </div>
          )}

          {/* TAB 8: Profile, Security & Session Management */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/20 text-teal-700 flex items-center justify-center font-black text-xl">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-800">{user.full_name || user.username || user.email}</h3>
                    <p className="text-xs text-slate-500">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {user.role}
                      </span>
                      <span className="text-xs text-slate-400">• Organization: {user.organization_name || user.effective_organization_name || 'General Authority'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition"
                >
                  Sign Out
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                  <MFASetup />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
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
