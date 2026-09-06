import React from 'react';
import {
  Search, Bell, Settings, User as UserIcon, LogOut,
  ChevronRight, ExternalLink
} from 'lucide-react';

export default function PurityNavbar({ activeTab, currentUser, onLogout, onExploreClick }) {
  const getTabTitle = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'tenders': return 'Tenders & BOQs';
      case 'bids': return 'Bids & Submissions';
      case 'vendors': return 'Vendor Management';
      case 'documents': return 'Documents'; // strictly "Documents"
      case 'users': return 'User Management';
      case 'rbac': return 'RBAC Matrix';
      case 'profile': return 'User Profile';
      default: return 'Overview';
    }
  };

  return (
    <header className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-transparent">
      {/* Breadcrumb & Title */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <span>Pages</span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-600 font-semibold">{getTabTitle(activeTab)}</span>
        </div>
        <h1 className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">
          {getTabTitle(activeTab)}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search Bar matching Purity UI */}
        <div className="relative w-44 sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Type here..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200/90 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 bg-white shadow-2xs text-slate-700"
          />
        </div>

        {/* User Profile Pill */}
        {currentUser ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-700">
            <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-700 flex items-center justify-center font-bold text-[10px]">
              {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden md:inline truncate max-w-[120px] font-semibold">
              {currentUser.full_name || currentUser.username || currentUser.email}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
              {currentUser.role || 'USER'}
            </span>
          </div>
        ) : (
          <button
            onClick={onExploreClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700 hover:text-teal-600 transition shadow-2xs"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {/* Notification Bell */}
        <button
          className="p-2 rounded-xl bg-white border border-slate-200/80 text-slate-400 hover:text-slate-700 transition shadow-2xs"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          className="p-2 rounded-xl bg-white border border-slate-200/80 text-slate-400 hover:text-slate-700 transition shadow-2xs"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
