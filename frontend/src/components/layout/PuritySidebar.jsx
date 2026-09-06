import React from 'react';
import {
  LayoutDashboard, FileText, Gavel, Building2, FileCheck,
  Award, User, Users, ShieldCheck, LogOut, HelpCircle,
  Sparkles, ExternalLink, ChevronRight
} from 'lucide-react';

export default function PuritySidebar({ activeTab, onTabChange, currentUser, onLogout, onExploreClick }) {
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ORG_ADMIN';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenders', label: 'Tenders & BOQ', icon: FileText },
    { id: 'bids', label: 'Bids & Submissions', icon: Gavel },
    { id: 'vendors', label: 'Vendors', icon: Building2 },
    { id: 'documents', label: 'Documents', icon: FileCheck }, // strictly named "Documents"
    { id: 'bids', label: 'Evaluations', icon: Award },
  ];

  const accountItems = [
    { id: 'profile', label: 'Profile', icon: User },
    ...(isAdmin ? [
      { id: 'users', label: 'Users & Org Admin', icon: Users },
      { id: 'rbac', label: 'RBAC Matrix', icon: ShieldCheck },
    ] : []),
  ];

  return (
    <aside className="w-64 bg-white min-h-screen border-r border-slate-100 flex flex-col justify-between p-4 shrink-0 shadow-xs selection:bg-teal-500 selection:text-white">
      <div>
        {/* Brand Logo matching Purity UI */}
        <div className="flex items-center gap-3 px-3 py-4 mb-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-teal-500/30">
            tX
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider uppercase text-slate-800 block">
              Purity tenderX
            </span>
            <span className="text-[10px] text-slate-400 font-semibold block -mt-0.5">
              Online Tender Management
            </span>
          </div>
        </div>

        <div className="h-px bg-slate-100 w-full mb-4" />

        {/* Main Navigation Pages */}
        <div className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id + item.label}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-slate-800 shadow-md shadow-slate-200/60 border border-slate-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/40'
                      : 'bg-slate-100 text-teal-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section: Account Pages */}
        <div className="mt-8 mb-2 px-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Account Pages
          </p>
        </div>

        <div className="space-y-1">
          {accountItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-slate-800 shadow-md shadow-slate-200/60 border border-slate-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/40'
                      : 'bg-slate-100 text-teal-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50/80 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Bottom Purity "Need Help?" Card matching screenshot */}
      <div className="mt-6">
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-teal-500 to-teal-400 text-white shadow-lg shadow-teal-500/20 relative overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
            <HelpCircle className="w-4 h-4 text-white" />
          </div>
          <h4 className="font-bold text-xs">Need help?</h4>
          <p className="text-[11px] text-teal-50 mt-0.5 leading-snug">
            Please check our documentation
          </p>
          <button
            onClick={() => window.open('https://github.com/Suryatej73/online_tender_management', '_blank')}
            className="mt-3.5 w-full py-2 bg-white text-teal-700 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition"
          >
            Documentation
          </button>
        </div>

        {/* Explore link button */}
        <button
          onClick={onExploreClick}
          className="mt-3 w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-teal-600 transition flex items-center justify-center gap-1.5"
        >
          <span>Public Explore Page</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
}
