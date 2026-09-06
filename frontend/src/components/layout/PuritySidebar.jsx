import React from 'react';
import {
  LayoutDashboard, FileText, Gavel, Building2, FileCheck,
  Award, User, Users, ShieldCheck, LogOut, HelpCircle,
  Sparkles, ExternalLink, ChevronRight, Server
} from 'lucide-react';

export default function PuritySidebar({ activeTab, onTabChange, currentUser, onLogout, onExploreClick }) {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ORG_ADMIN';

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'tenders', label: 'Tenders & BOQ', icon: FileText },
    // Super Admin does NOT submit bids - only vendors and organization members view/submit bids
    ...(!isSuperAdmin ? [{ id: 'bids', label: 'Bids & Proposals', icon: Gavel }] : []),
    { id: 'vendors', label: 'Vendor 360', icon: Building2 },
    { id: 'documents', label: 'Documents', icon: FileCheck },
    { id: 'evaluations', label: isSuperAdmin ? 'Evaluator Oversight' : 'Evaluations & Awards', icon: Award },
  ];

  const accountItems = [
    { id: 'profile', label: 'Security & Profile', icon: User },
    ...(isAdmin ? [
      { id: 'users', label: 'User Directory', icon: Users },
      { id: 'rbac', label: 'RBAC Matrix', icon: ShieldCheck },
    ] : []),
  ];

  return (
    <aside className="w-64 bg-[#07090e] min-h-screen border-r border-white/10 flex flex-col justify-between p-4 shrink-0 shadow-2xl selection:bg-orange-500 selection:text-white">
      <div>
        {/* Brand Logo matching dark SaaS aesthetic */}
        <div className="flex items-center gap-3 px-3 py-3.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-orange-400 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-orange-500/25 shrink-0">
            TX
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider uppercase text-white block">
              Tender<span className="text-orange-500">X</span> <span className="font-mono text-xs text-orange-400">OS</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium block -mt-0.5">
              Enterprise Procurement
            </span>
          </div>
        </div>

        <div className="h-px bg-white/10 w-full mb-4" />

        {/* Main Navigation Pages */}
        <div className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id + item.label}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                  isActive
                    ? 'bg-orange-500/15 text-white border border-orange-500/30 shadow-sm shadow-orange-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                      : 'bg-white/5 text-slate-400 group-hover:text-white group-hover:bg-white/10'
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
        <div className="mt-7 mb-2 px-3">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            Management & System
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                  isActive
                    ? 'bg-orange-500/15 text-white border border-orange-500/30 shadow-sm shadow-orange-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                      : 'bg-white/5 text-slate-400 group-hover:text-white group-hover:bg-white/10'
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all mt-2"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Bottom Documentation & Help Card */}
      <div className="mt-6">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#131926] to-[#0c101a] border border-orange-500/20 text-white shadow-lg shadow-black/40 relative overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mb-2.5 text-orange-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-xs text-white">Documentation & API</h4>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
            Developer guides and module specifications
          </p>
          <button
            onClick={() => window.open('https://github.com/Suryatej73/online_tender_management', '_blank')}
            className="mt-3 w-full py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow-sm"
          >
            View Docs
          </button>
        </div>

        {/* Explore link button */}
        <button
          onClick={onExploreClick}
          className="mt-3 w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-orange-400 transition flex items-center justify-center gap-1.5"
        >
          <span>Public Explore Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
