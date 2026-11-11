import React from 'react';
import {
  LayoutDashboard, FileText, Gavel, Building2, FileCheck,
  Award, HelpCircle, ExternalLink, ShieldCheck, Users, ClipboardCheck
} from 'lucide-react';

export default function PuritySidebar({ activeTab, onTabChange, currentUser, onExploreClick }) {
  const role = currentUser?.role || 'VENDOR';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isOrgAdmin = role === 'ORG_ADMIN';
  const isTenderManager = role === 'TENDER_MANAGER' || isSuperAdmin || isOrgAdmin;
  const isVendor = role === 'VENDOR';
  const isEvaluator = role === 'EVALUATOR';
  const isAuditor = role === 'AUDITOR';

  const navItems = [
    { id: 'dashboard', label: isAuditor ? 'Audit Command Center' : 'Command Center', icon: LayoutDashboard },
    {
      id: 'tenders',
      label: isVendor ? 'Tenders & Solicitations' : isAuditor ? 'Tender Audit Records' : 'Tenders & BOQ',
      icon: FileText
    },
    // Bids & Proposals: Vendors see "My Bids", Managers/Admins see "Received Bids", Auditors see "Bid Oversight", Evaluators do not manage bids
    ...(!isEvaluator ? [{
      id: 'bids',
      label: isVendor ? 'My Bids & Proposals' : isAuditor ? 'Bid Integrity Records' : 'Received Bids',
      icon: Gavel
    }] : []),
    // Vendor 360: Supplier Master Directory & Due Diligence (Tender Managers, Org Admins, Super Admins)
    ...(isTenderManager ? [{ id: 'vendors', label: 'Vendor 360', icon: Building2 }] : []),
    // Document Vault: Contextual document repository (All roles)
    { id: 'documents', label: 'Document Vault', icon: FileCheck },
    // Evaluations & Awards: Committee, Tender Managers, Admins, and Auditors. Strictly hidden for Vendors!
    ...(!isVendor ? [{
      id: 'evaluations',
      label: isSuperAdmin ? 'Evaluator Oversight' : isAuditor ? 'Evaluations Audit' : 'Evaluations & Awards',
      icon: Award
    }] : []),
    // Team / User Management: Org Admin & Super Admin only
    ...(isSuperAdmin || isOrgAdmin ? [{
      id: 'users',
      label: isOrgAdmin ? 'Team Directory' : 'User Directory',
      icon: Users
    }] : []),
    // Admin Governance & Audit Trail: Super Admin & Auditor
    ...(isSuperAdmin || isAuditor ? [{
      id: 'admin_governance',
      label: isAuditor ? 'Audit & Forensic Trail' : 'Platform Governance',
      icon: isAuditor ? ClipboardCheck : ShieldCheck
    }] : []),
  ];

  return (
    <aside className="tx-sidebar w-64 bg-[#07090e] min-h-screen border-r border-white/10 flex flex-col justify-between p-4 shrink-0 shadow-2xl selection:bg-orange-500 selection:text-white transition-colors duration-200">
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
      </div>

      {/* Bottom Documentation & Help Card */}
      <div className="mt-6">
        <div className="tx-sidebar-help-card p-4 rounded-2xl bg-gradient-to-br from-[#131926] to-[#0c101a] border border-orange-500/20 text-white shadow-lg shadow-black/40 relative overflow-hidden">
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
