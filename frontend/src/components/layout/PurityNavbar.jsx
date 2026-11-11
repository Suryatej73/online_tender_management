import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, Bell, Settings, User as UserIcon, LogOut,
  ChevronRight, ExternalLink, Check, Sparkles, AlertTriangle, ShieldCheck,
  Sun, Moon, Award, FileText, CheckCircle2, Users, Sliders
} from 'lucide-react';
import { tendersApi } from '../../api/tendersApi';
import { bidsApi } from '../../api/bidsApi';
import { useAuth } from '../../context/AuthContext';

function formatTimeAgo(dateString) {
  if (!dateString) return 'Just now';
  try {
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
}

const ROLE_DISPLAY_NAMES = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Organization Admin',
  TENDER_MANAGER: 'Tender Manager',
  VENDOR: 'Vendor / Bidder',
  EVALUATOR: 'Evaluator',
  AUDITOR: 'Auditor'
};

const ROLE_BADGE_CLASSES = {
  SUPER_ADMIN: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  ORG_ADMIN: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  TENDER_MANAGER: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  VENDOR: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  EVALUATOR: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  AUDITOR: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
};

export default function PurityNavbar({
  activeTab,
  currentUser,
  onLogout,
  onExploreClick,
  onTabChange,
  theme = 'dark',
  onToggleTheme
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef(null);
  const settingsRef = useRef(null);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ORG_ADMIN';

  // Load real notifications from backend state (zero dummy data)
  const loadNotifications = useCallback(async () => {
    try {
      const [tendersRes, bidsRes] = await Promise.all([
        tendersApi.getTenders({ limit: 6 }).catch(() => ({ data: [] })),
        bidsApi.getBids({ limit: 6 }).catch(() => ({ data: [] }))
      ]);

      const tList = tendersRes?.data || [];
      const bList = bidsRes?.data || [];

      const readIds = (() => {
        try {
          return JSON.parse(localStorage.getItem('tenderx_read_notifs') || '[]');
        } catch {
          return [];
        }
      })();

      const notifItems = [];

      // Add real bid submission notifications
      bList.slice(0, 4).forEach(b => {
        const id = `bid_${b.id}`;
        const tenderName = b.tender_title || b.tender?.title || b.tender_number || b.tender?.tender_number || 'solicitation';
        const vendorName = b.vendor_name || b.vendor?.company_name || 'Vendor';
        notifItems.push({
          id,
          title: `Proposal: ${b.bid_reference || 'Bid Submission'}`,
          description: `${vendorName} submitted formal proposal for ${tenderName}`,
          time: formatTimeAgo(b.created_at || b.submitted_at),
          read: readIds.includes(id),
          type: 'bid',
          tab: 'evaluations',
          timestamp: new Date(b.created_at || b.submitted_at || 0).getTime()
        });
      });

      // Add real tender lifecycle notifications
      tList.slice(0, 4).forEach(t => {
        const id = `tender_${t.id}_${t.status}`;
        let title = `Tender ${t.tender_number || ''}`;
        let description = `${t.title || 'Solicitation'} is currently ${t.status || 'ACTIVE'}.`;
        let type = 'tender';
        let tab = 'tenders';

        if (t.status === 'EVALUATION') {
          title = `Evaluation Live: ${t.tender_number || ''}`;
          description = `${t.title || 'Tender'} has closed bidding and is awaiting committee scoring.`;
          tab = 'evaluations';
          type = 'evaluation';
        } else if (t.status === 'ACTIVE') {
          title = `Active Solicitation: ${t.tender_number || ''}`;
          description = `${t.title || 'Tender'} is open for vendor proposals.`;
          tab = 'tenders';
          type = 'active';
        } else if (t.status === 'AWARDED') {
          title = `Contract Awarded: ${t.tender_number || ''}`;
          description = `Contract officially awarded to ${t.awarded_vendor_name || 'winning vendor'}.`;
          tab = 'evaluations';
          type = 'award';
        } else if (t.status === 'PUBLISHED') {
          title = `Published: ${t.tender_number || ''}`;
          description = `${t.title || 'Tender'} published to public directory.`;
          tab = 'tenders';
          type = 'active';
        }

        notifItems.push({
          id,
          title,
          description,
          time: formatTimeAgo(t.created_at || t.updated_at),
          read: readIds.includes(id),
          type,
          tab,
          timestamp: new Date(t.created_at || t.updated_at || 0).getTime()
        });
      });

      // Sort by newest first
      notifItems.sort((a, b) => b.timestamp - a.timestamp);

      setNotifications(notifItems);
      setUnreadCount(notifItems.filter(n => !n.read).length);
    } catch {
      // Quiet failover
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }

    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () => {
    try {
      const allIds = notifications.map(n => n.id);
      localStorage.setItem('tenderx_read_notifs', JSON.stringify(allIds));
    } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notif) => {
    try {
      const stored = JSON.parse(localStorage.getItem('tenderx_read_notifs') || '[]');
      if (!stored.includes(notif.id)) {
        stored.push(notif.id);
        localStorage.setItem('tenderx_read_notifs', JSON.stringify(stored));
      }
    } catch {}
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setNotificationsOpen(false);
    if (onTabChange && notif.tab) {
      onTabChange(notif.tab);
    }
  };

  const getTabTitle = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Command Center';
      case 'tenders': return 'Tenders & BOQs';
      case 'bids': return 'Bids & Submissions';
      case 'vendors': return user?.role === 'VENDOR' ? 'Vendor 360 & Awarded Work' : 'Vendor Management';
      case 'documents': return 'Documents';
      case 'evaluations': return 'Evaluations & Awards';
      case 'admin_governance': return 'Admin Governance';
      case 'users': return 'User Directory';
      case 'rbac': return 'RBAC Permissions';
      case 'profile': return 'User Profile & Security';
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
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Search Bar with Command Shortcut */}
        <div className="relative hidden sm:block w-48 md:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-white/40" />
          <input
            type="text"
            placeholder="Search tenders, bids, vendors..."
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

        {/* Notification Bell Dropdown (Real live backend events) */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setSettingsOpen(false);
            }}
            className="relative p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition shadow-xs"
            title="Procurement Notifications"
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
                  <span className="font-bold text-sm text-white">Live Procurement Alerts</span>
                  {unreadCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold border border-orange-500/30">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-medium border border-white/10">
                      Up to date
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
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                    <p className="font-semibold text-white">All caught up!</p>
                    <p className="text-[11px]">No unread procurement alerts right now.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`py-3 px-2.5 rounded-xl transition cursor-pointer flex gap-3 ${
                        n.read ? 'opacity-60 hover:bg-white/[0.03]' : 'bg-white/[0.04] hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'bid' && <Sparkles className="w-4 h-4 text-orange-400" />}
                        {n.type === 'award' && <Award className="w-4 h-4 text-emerald-400" />}
                        {n.type === 'evaluation' && <AlertTriangle className="w-4 h-4 text-purple-400" />}
                        {n.type === 'active' && <FileText className="w-4 h-4 text-sky-400" />}
                        {n.type === 'tender' && <FileText className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-white truncate">{n.title}</p>
                          <span className="text-[10px] text-white/40 whitespace-nowrap">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-white/70 mt-0.5 leading-relaxed">{n.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-white/[0.08] text-center">
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    if (onTabChange) onTabChange('evaluations');
                  }}
                  className="text-[11px] text-orange-400 hover:text-orange-300 font-medium transition"
                >
                  Open Committee Evaluation Board →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings & System Management Dropdown */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => {
              setSettingsOpen(!settingsOpen);
              setNotificationsOpen(false);
            }}
            className={`relative p-2 rounded-xl transition shadow-xs ${
              settingsOpen
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white'
            }`}
            title="System & Account Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Settings Menu Flyout */}
          {settingsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-[#0d1117] border border-white/10 shadow-2xl p-4 z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
              {/* User Profile Summary */}
              {currentUser && (
                <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-base shrink-0 shadow-inner">
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">
                      {currentUser.full_name || currentUser.username || 'User'}
                    </p>
                    <p className="text-[10px] text-white/50 truncate">
                      {currentUser.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold border ${ROLE_BADGE_CLASSES[currentUser.role] || 'bg-orange-500/15 text-orange-400 border-orange-500/30'}`}>
                        {ROLE_DISPLAY_NAMES[currentUser.role] || currentUser.role || 'Member'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Items in Settings */}
              <div className="space-y-1">
                {/* 1. Security & Profile */}
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    if (onTabChange) onTabChange('profile');
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
                        Security & Profile
                      </p>
                      <p className="text-[10px] text-white/40">
                        Credentials, 2FA MFA, active sessions
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
                </button>

                {/* 2. Theme Customization (Light / Dark Mode) */}
                {onToggleTheme && (
                  <button
                    onClick={() => {
                      onToggleTheme();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-orange-400" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
                          Color Theme
                        </p>
                        <p className="text-[10px] text-white/40">
                          {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 uppercase font-semibold">
                      {theme}
                    </span>
                  </button>
                )}

                {/* 3. Management & System Pages (for Admins) */}
                {isAdmin && (
                  <div className="pt-2 border-t border-white/[0.08] mt-2 space-y-1">
                    <p className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Management & System
                    </p>

                    <button
                      onClick={() => {
                        setSettingsOpen(false);
                        if (onTabChange) onTabChange('admin_governance');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                            Admin Governance
                          </p>
                          <p className="text-[10px] text-white/40">
                            Enterprise policy & system control
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
                    </button>

                    <button
                      onClick={() => {
                        setSettingsOpen(false);
                        if (onTabChange) onTabChange('users');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                            User Directory
                          </p>
                          <p className="text-[10px] text-white/40">
                            Staff & bidder accounts
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
                    </button>

                    <button
                      onClick={() => {
                        setSettingsOpen(false);
                        if (onTabChange) onTabChange('rbac');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                            RBAC Matrix
                          </p>
                          <p className="text-[10px] text-white/40">
                            Permissions and role rules
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
                    </button>
                  </div>
                )}
              </div>

              {/* Sign Out Option */}
              <div className="pt-2 border-t border-white/[0.08]">
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition group"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        {currentUser ? (
          <button
            onClick={() => {
              setSettingsOpen(!settingsOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 shadow-xs text-xs font-semibold text-white/90 transition text-left"
          >
            <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-[11px]">
              {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block leading-none">
              <span className="block text-white font-bold truncate max-w-[120px]">
                {currentUser.full_name || currentUser.username || 'User'}
              </span>
              <span className="text-[10px] text-white/50 font-mono">
                {ROLE_DISPLAY_NAMES[currentUser.role] || currentUser.role || 'Member'}
              </span>
            </div>
          </button>
        ) : null}
      </div>
    </header>
  );
}
