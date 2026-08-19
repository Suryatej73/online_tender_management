import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import SystemStatus from './components/SystemStatus';
import AuthModal from './components/AuthModal';
import MFASetup from './components/MFASetup';
import SessionManager from './components/SessionManager';
import SplitScreenAuth from './components/auth/SplitScreenAuth';
import UserManagementDashboard from './components/users/UserManagementDashboard';
import PermissionMatrix from './components/users/PermissionMatrix';
import AddEditUserModal from './components/users/AddEditUserModal';
import TenderManagementDashboard from './components/tenders/TenderManagementDashboard';
import {
  ShieldCheck,
  Users,
  User as UserIcon,
  LogOut,
  KeyRound,
  Smartphone,
  LayoutDashboard,
  FileText,
  Gavel,
  CheckCircle2,
  Award,
  Search,
  Plus,
  Building,
  Clock,
  ArrowRight,
  TrendingUp,
  Zap,
  Lock,
  Shield,
  GripVertical,
  Timer,
  AlertTriangle
} from 'lucide-react';

/* ── Animation Variants ── */
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

/* Scroll-triggered variants (whileInView) */
const scrollFadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
};

const scrollStagger = {
  whileInView: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
  viewport: { once: true, margin: '-40px' },
};

const scrollFadeUpChild = {
  initial: { opacity: 0, y: 30 },
};

/* ── Bid Countdown Timer ── */
function CountdownTimer({ deadline, publishDate }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { days, hours, minutes, seconds, totalMs, progress, urgency } = useMemo(() => {
    const deadlineMs = new Date(deadline).getTime();
    const publishMs = publishDate ? new Date(publishDate).getTime() : deadlineMs - 30 * 86400000;
    const totalWindow = deadlineMs - publishMs;
    const remaining = Math.max(0, deadlineMs - now);
    const elapsed = totalWindow - remaining;
    const prog = totalWindow > 0 ? Math.min(1, Math.max(0, elapsed / totalWindow)) : 1;

    let urg = 'safe';
    if (remaining <= 0) urg = 'expired';
    else if (remaining < 86400000) urg = 'critical';
    else if (remaining < 2 * 86400000) urg = 'danger';
    else if (remaining < 7 * 86400000) urg = 'warning';

    return {
      days: Math.floor(remaining / 86400000),
      hours: Math.floor((remaining % 86400000) / 3600000),
      minutes: Math.floor((remaining % 3600000) / 60000),
      seconds: Math.floor((remaining % 60000) / 1000),
      totalMs: remaining,
      progress: prog,
      urgency: urg,
    };
  }, [deadline, publishDate, now]);

  const colors = {
    safe: { bar: 'var(--emerald)', text: 'var(--emerald)', glow: 'rgba(52, 211, 153, 0.15)' },
    warning: { bar: 'var(--amber)', text: 'var(--amber)', glow: 'rgba(245, 158, 11, 0.15)' },
    danger: { bar: '#f97316', text: '#f97316', glow: 'rgba(249, 115, 22, 0.15)' },
    critical: { bar: 'var(--rose)', text: 'var(--rose)', glow: 'rgba(251, 113, 133, 0.2)' },
    expired: { bar: 'var(--text-faint)', text: 'var(--text-faint)', glow: 'transparent' },
  };
  const c = colors[urgency];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Progress bar */}
      <div style={{ position: 'relative', height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          style={{
            height: '100%',
            borderRadius: '999px',
            background: c.bar,
            boxShadow: `0 0 12px ${c.glow}`,
          }}
        />
        {urgency === 'critical' && (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(90deg, transparent, ${c.bar}, transparent)`,
              borderRadius: '999px',
            }}
          />
        )}
      </div>

      {/* Countdown text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {urgency === 'critical' ? (
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <AlertTriangle size={13} color={c.text} />
          </motion.div>
        ) : (
          <Timer size={12} color={c.text} style={{ opacity: 0.7 }} />
        )}
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          {totalMs <= 0 ? (
            <span style={{ color: c.text, fontWeight: '700', letterSpacing: '0.04em' }}>DEADLINE PASSED</span>
          ) : (
            [
              { val: days, label: 'd' },
              { val: hours, label: 'h' },
              { val: minutes, label: 'm' },
              { val: seconds, label: 's' },
            ].map((unit) => (
              <span key={unit.label} style={{ color: c.text, fontWeight: '700' }}>
                {String(unit.val).padStart(2, '0')}
                <span style={{ fontWeight: '400', opacity: 0.6, fontSize: '0.65rem' }}>{unit.label}</span>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tab Configuration ── */
const tabs = [
  { id: 'dashboard', label: 'Procurement Dashboard', icon: LayoutDashboard },
  { id: 'tenders', label: 'Tenders & BOQ Catalog', icon: FileText },
  { id: 'bids', label: 'Bidding & Evaluation', icon: Gavel },
  { id: 'users', label: 'User & Org Admin', icon: Users },
  { id: 'rbac', label: 'RBAC Permissions', icon: ShieldCheck },
  { id: 'security', label: 'Identity & Security', icon: KeyRound },
];

/* ── Sample Tenders ── */
const sampleTenders = [
  {
    id: "TDR-2026-8901",
    title: "Supply & Installation of High-Performance Data Center Servers",
    category: "IT Infrastructure",
    estimated_cost: "$1,250,000",
    emd_amount: "$25,000",
    publish_date: "2026-08-01",
    submission_deadline: "2026-08-28",
    status: "Published",
    stage: "Two-Envelope Bidding",
    organization: "Ministry of Digital Transformation",
    color: "var(--primary)",
  },
  {
    id: "TDR-2026-8902",
    title: "Construction of Smart Civil Highway Bypass & Toll Plaza",
    category: "Civil Construction",
    estimated_cost: "$8,500,000",
    emd_amount: "$170,000",
    publish_date: "2026-07-15",
    submission_deadline: "2026-08-25",
    status: "Under Evaluation",
    stage: "Technical Scoring",
    organization: "National Highway Authority",
    color: "var(--amber)",
  },
  {
    id: "TDR-2026-8903",
    title: "Annual Maintenance Contract (AMC) for Renewable Solar Plant",
    category: "Energy & Utilities",
    estimated_cost: "$480,000",
    emd_amount: "$9,600",
    publish_date: "2026-08-10",
    submission_deadline: "2026-09-05",
    status: "Published",
    stage: "Reverse Auction Eligible",
    organization: "Green Energy Grid Ltd",
    color: "var(--emerald)",
  }
];

/* ── Animated Header ── */
function AnimatedHeader({ onOpenAuth, onOpenAddUser }) {
  const { user, logout } = useAuth();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(5, 10, 24, 0.85)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <motion.div
              whileHover={{ scale: 1.05, rotate: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '1.1rem',
                color: '#ffffff',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                cursor: 'pointer',
              }}
            >
              tX
            </motion.div>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: '900', letterSpacing: '-0.03em' }} className="text-gradient-brand">
                tenderX
              </h1>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.02em' }}>Enterprise Tender Management</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            style={{ position: 'relative', width: '280px' }}
            className="hidden-mobile"
          >
            <Search size={15} style={{ position: 'absolute', left: '0.8rem', top: '0.6rem', color: 'var(--text-faint)' }} />
            <input
              type="text"
              placeholder="Search tenders, vendors, BOQ..."
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem 0.5rem 2.4rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                transition: 'all 200ms ease',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-surface)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none'; }}
            />
          </motion.div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenAddUser}
            className="btn-action"
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--emerald) 0%, var(--accent) 100%)' }}
          >
            <Plus size={15} /> Add User
          </motion.button>

          {user ? (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1rem' }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>{user.full_name || user.email}</div>
                <span className="badge badge-primary" style={{ fontSize: '0.62rem', padding: '0.08rem 0.4rem' }}>
                  {user.role}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(251, 113, 133, 0.2)' }}
                whileTap={{ scale: 0.9 }}
                onClick={logout}
                style={{
                  background: 'var(--rose-surface)',
                  border: '1px solid rgba(251, 113, 133, 0.2)',
                  color: 'var(--rose)',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                }}
                title="Sign Out"
              >
                <LogOut size={16} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenAuth}
              className="btn-action"
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
            >
              <UserIcon size={15} /> Sign In
            </motion.button>
          )}
        </div>
      </div>
    </motion.header>
  );
}

/* ── Animated Tab Bar ── */
function AnimatedTabBar({ activeTab, setActiveTab }) {
  return (
    <div style={{
      background: 'rgba(5, 10, 24, 0.7)',
      borderBottom: '1px solid var(--border-subtle)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="container" style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', padding: '0.4rem 1.5rem' }}>
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.id)}
              style={{
                position: 'relative',
                padding: '0.65rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                border: 'none',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isActive ? '700' : '600',
                cursor: 'pointer',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap',
                transition: 'color 200ms ease',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--primary)',
                    borderRadius: 'var(--radius-md)',
                    zIndex: -1,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={15} /> {tab.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Dashboard Stats ── */
const stats = [
  { label: 'Active Tenders', value: '24', change: '+4 this week', icon: FileText, color: 'var(--primary)', glow: 'var(--primary-glow)' },
  { label: 'Submitted Bids', value: '142', change: 'Encrypted & tamper-proof', icon: Gavel, color: 'var(--cyan)', glow: 'var(--cyan-glow)' },
  { label: 'Total Awarded', value: '$18.4M', change: '12 procurement contracts', icon: Award, color: 'var(--emerald)', glow: 'var(--emerald-glow)' },
  { label: 'Registered Vendors', value: '380', change: 'Verified org profiles', icon: Building, color: 'var(--purple)', glow: 'var(--purple-glow)' },
];

function StatCard({ stat, index }) {
  const Icon = stat.icon;
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="glass-card"
      style={{ padding: '1.35rem', cursor: 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>{stat.label}</span>
        <div style={{
          padding: '0.4rem',
          borderRadius: 'var(--radius-sm)',
          background: `${stat.color}15`,
          color: stat.color,
          display: 'flex',
        }}>
          <Icon size={18} />
        </div>
      </div>
      <div style={{ fontSize: '1.85rem', fontWeight: '900', letterSpacing: '-0.03em' }}>{stat.value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.3rem', fontWeight: '500' }}>
        {stat.change}
      </div>
    </motion.div>
  );
}

/* ── Tender Table Row ── */
function TenderRow({ tender, index }) {
  return (
    <motion.tr
      variants={fadeUp}
      whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.04)' }}
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <td className="code-font" style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--accent)' }}>{tender.id}</td>
      <td style={{ padding: '0.85rem 1rem' }}>
        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{tender.title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>{tender.organization}</div>
      </td>
      <td style={{ padding: '0.85rem 1rem' }}>
        <span className="badge badge-primary">{tender.category}</span>
      </td>
      <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{tender.estimated_cost}</td>
      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>{tender.emd_amount}</td>
      <td style={{ padding: '0.85rem 1rem', minWidth: '160px' }}>
        <div className="code-font" style={{ fontSize: '0.75rem', color: 'var(--amber)', marginBottom: '0.35rem' }}>{tender.submission_deadline}</div>
        <CountdownTimer deadline={tender.submission_deadline} publishDate={tender.publish_date} />
      </td>
      <td style={{ padding: '0.85rem 1rem' }}>
        <span className={`badge ${tender.status === 'Published' ? 'badge-success' : 'badge-warning'}`}>
          {tender.status}
        </span>
      </td>
    </motion.tr>
  );
}

/* ── Tender Card (draggable + countdown) ── */
function TenderCard({ tender, dragHandleProps }) {
  return (
    <Reorder.Item
      value={tender}
      whileDrag={{ scale: 1.04, boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 10 }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="glass-card"
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--bg-card)', cursor: 'grab', listStyle: 'none' }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="code-font" style={{ fontSize: '0.78rem', color: tender.color, fontWeight: '700' }}>{tender.id}</span>
            <motion.div
              {...(dragHandleProps || {})}
              whileHover={{ color: 'var(--primary-light)' }}
              style={{ color: 'var(--text-faint)', cursor: 'grab', display: 'flex' }}
            >
              <GripVertical size={14} />
            </motion.div>
          </div>
          <span className={`badge ${tender.status === 'Published' ? 'badge-success' : 'badge-warning'}`}>{tender.status}</span>
        </div>
        <h4 style={{ fontSize: '1rem', fontWeight: '750', marginBottom: '0.5rem', lineHeight: '1.35', color: 'var(--text-primary)' }}>{tender.title}</h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>{tender.organization}</p>
      </div>

      {/* Countdown Timer */}
      <div style={{ marginBottom: '0.85rem' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginBottom: '0.35rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bidding Window</div>
        <CountdownTimer deadline={tender.submission_deadline} publishDate={tender.publish_date} />
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-dim)' }}>Estimated Cost:</span>
          <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{tender.estimated_cost}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-dim)' }}>EMD Deposit:</span>
          <span style={{ color: 'var(--text-secondary)' }}>{tender.emd_amount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-dim)' }}>Deadline:</span>
          <span className="code-font" style={{ color: 'var(--amber)', fontWeight: '600' }}>{tender.submission_deadline}</span>
        </div>
      </div>
    </Reorder.Item>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main TenderX Application
   ══════════════════════════════════════════════════════════════ */

function TenderXApp() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tenderOrder, setTenderOrder] = useState(sampleTenders);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AnimatedHeader onOpenAuth={() => setAuthModalOpen(true)} onOpenAddUser={() => setAddUserModalOpen(true)} />

      {/* Tab Navigation */}
      <AnimatedTabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <main className="container" style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          {/* ── Dashboard View ── */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '2rem 0' }}
            >
              {/* Hero Welcome */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                style={{ marginBottom: '2rem' }}
              >
                <h2 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '0.4rem' }} className="text-gradient">
                  Procurement Command Center
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '600px' }}>
                  Real-time overview of active tenders, submitted bids, awarded contracts, and your procurement pipeline.
                </p>
              </motion.div>

              {/* Stats Grid — scroll-triggered stagger */}
              <motion.div
                variants={scrollStagger}
                initial="initial"
                whileInView="whileInView"
                viewport={scrollStagger.viewport}
                className="grid-4"
                style={{ marginBottom: '2rem' }}
              >
                {stats.map((stat, i) => (
                  <motion.div key={i} variants={scrollFadeUpChild}>
                    <StatCard stat={stat} index={i} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Tenders Table — scroll-triggered */}
              <motion.div
                {...scrollFadeUp}
                transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.1 }}
                className="glass-card"
                style={{ marginBottom: '2rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Recent Procurement Opportunities</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Active public tenders open for bidding</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveTab('tenders')}
                    className="btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                  >
                    View All <ArrowRight size={14} />
                  </motion.button>
                </div>

                <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Tender ID</th>
                        <th>Title & Description</th>
                        <th>Category</th>
                        <th>Est. Value</th>
                        <th>EMD Fee</th>
                        <th>Deadline</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={staggerContainer} initial="initial" animate="animate">
                      {sampleTenders.map((t, i) => <TenderRow key={t.id} tender={t} index={i} />)}
                    </motion.tbody>
                  </table>
                </div>
              </motion.div>

              {/* System Status — scroll-triggered */}
              <motion.div
                {...scrollFadeUp}
                transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.15 }}
              >
                <SystemStatus />
              </motion.div>
            </motion.div>
          )}

          {/* ── Tenders View ── */}
          {activeTab === 'tenders' && (
            <motion.div
              key="tenders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '2rem 0' }}
            >
              <TenderManagementDashboard />
            </motion.div>
          )}

          {/* ── Bids View ── */}
          {activeTab === 'bids' && (
            <motion.div
              key="bids"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="glass-card glass-card--hero"
                style={{ textAlign: 'center', maxWidth: '600px', width: '100%' }}
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  style={{ display: 'inline-flex', padding: '1rem', borderRadius: 'var(--radius-lg)', background: 'var(--primary-surface)', color: 'var(--primary)', marginBottom: '1.25rem' }}
                >
                  <Gavel size={36} />
                </motion.div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Bid Submission & Evaluation Portal</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  Two-Envelope Encrypted Bid Submissions, Technical Scoring Matrix, and Financial Unsealing Engine.
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveTab('tenders')}
                  className="btn-action"
                  style={{ padding: '0.8rem 1.5rem' }}
                >
                  Explore Active Tenders <ArrowRight size={16} />
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {/* ── Users View ── */}
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '2rem 0' }}
            >
              <UserManagementDashboard />
            </motion.div>
          )}

          {/* ── RBAC View ── */}
          {activeTab === 'rbac' && (
            <motion.div
              key="rbac"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '2rem 0' }}
            >
              <PermissionMatrix />
            </motion.div>
          )}

          {/* ── Security View ── */}
          {activeTab === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              <SplitScreenAuth onLoginSuccess={() => setActiveTab('users')} />
              <div className="grid-2">
                <MFASetup />
                <SessionManager />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Add User Modal */}
      <AnimatePresence>
        {addUserModalOpen && (
          <AddEditUserModal
            onClose={() => setAddUserModalOpen(false)}
            onSuccess={() => {
              setAddUserModalOpen(false);
              setActiveTab('users');
            }}
          />
        )}
      </AnimatePresence>

      {/* Footer — scroll-triggered */}
      <motion.footer
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--border-subtle)',
          padding: '2rem 0',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem', fontWeight: '500' }}>
            tenderX © 2026 · Enterprise Online Tender Management Platform · Infrastructure & Security Active
          </p>
        </div>
      </motion.footer>
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
