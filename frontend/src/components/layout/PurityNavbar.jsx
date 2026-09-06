import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Bell, Settings, User as UserIcon, LogOut,
  ChevronRight, ExternalLink, Check, Sparkles, AlertTriangle, ShieldCheck
} from 'lucide-react';

export default function PurityNavbar({ activeTab, currentUser, onLogout, onExploreClick, onTabChange }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'New Bid Submitted',
      description: 'Vendor Apex Global submitted technical & financial bid for TX-882.',
      time: '12m ago',
      read: false,
      type: 'bid'
    },
    {
      id: 2,
      title: 'AI OCR Document Verified',
      description: 'Document DOC-409 passed SHA-256 integrity & virus scan with zero findings.',
      time: '1h ago',
      read: false,
      type: 'doc'
    },
    {
      id: 3,
      title: 'Tender Approaching Deadline',
      description: 'Highway Modernization Phase II closes in 24 hours.',
      time: '3h ago',
      read: false,
      type: 'tender'
    }
  ]);

  const notifRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getTabTitle = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Command Center';
      case 'tenders': return 'Tenders & BOQs';
      case 'bids': return 'Bids & Submissions';
      case 'vendors': return 'Vendor Management';
      case 'documents': return 'Documents'; // strictly "Documents"
      case 'evaluations': return 'Evaluations & Audits';
      case 'users': return 'User Management';
      case 'rbac': return 'RBAC Permissions';
      case 'profile': return 'User Profile & Security';
      case 'system': return 'System Telemetry';
      default: return 'Overview';
    }
  };

  return (
    <header className="sticky top-0 z-30 px-6 py-3.5 bg-[#07090e]/80 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between gap-4 transition-colors">
      {/* Left: Breadcrumb & Title */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-white/40 font-medium tracking-wide">
          <span>TenderX</span>
          <ChevronRight className="w-3 h-3 text-white/20" />
          <span className="text-orange-400 font-semibold">{getTabTitle(activeTab)}</span>
          <span className="ml-2 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE
          </span>
        </div>
        <h1 className="text-lg font-black text-white tracking-tight mt-0.5">
          {getTabTitle(activeTab)}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search Bar with Command Shortcut */}
        <div className="relative hidden sm:block w-48 md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-white/40" />
          <input
            type="text"
            placeholder="Search tenders, docs, vendors..."
            className="w-full pl-9 pr-10 py-1.5 rounded-xl border border-white/10 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 bg-[#0d1117]/80 text-white placeholder:text-white/30 shadow-inner"
          />
          <kbd className="absolute right-2.5 top-2 px-1.5 py-0.5 text-[10px] font-mono text-white/40 bg-white/5 border border-white/10 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Explore Mode Switcher */}
        <button
          onClick={onExploreClick}
          title="Switch to Landing & Public Explore Page"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-white/80 hover:text-orange-400 transition shadow-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Explore Mode</span>
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition shadow-xs"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-[#07090e] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Flyout */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0d1117] border border-white/10 shadow-2xl p-4 z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold border border-orange-500/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 transition"
                  >
                    <Check className="w-3 h-3" /> Mark read
                  </button>
                )}
              </div>

              <div className="divide-y divide-white/[0.05] max-h-72 overflow-y-auto my-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`py-3 px-2 rounded-xl transition cursor-pointer flex gap-3 ${
                      n.read ? 'opacity-60 hover:bg-white/[0.02]' : 'bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="mt-0.5">
                      {n.type === 'bid' && <Sparkles className="w-4 h-4 text-orange-400" />}
                      {n.type === 'doc' && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                      {n.type === 'tender' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white truncate">{n.title}</p>
                        <span className="text-[10px] text-white/40 whitespace-nowrap">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">{n.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/[0.08] text-center">
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    if (onTabChange) onTabChange('system');
                  }}
                  className="text-[11px] text-white/50 hover:text-white font-medium transition"
                >
                  View full security & audit stream →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        {currentUser ? (
          <button
            onClick={() => onTabChange && onTabChange('profile')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 shadow-xs text-xs font-semibold text-white/90 transition text-left"
            title="Open Profile Settings"
          >
            <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-[11px]">
              {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:flex flex-col">
              <span className="truncate max-w-[110px] font-bold text-white text-[11px]">
                {currentUser.full_name || currentUser.username || currentUser.email}
              </span>
              <span className="text-[9px] text-orange-400 font-mono tracking-wider">
                {currentUser.role || 'USER'}
              </span>
            </div>
          </button>
        ) : (
          <button
            onClick={onExploreClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow-md shadow-orange-500/20"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
