import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { bidsApi } from '../../api/bidsApi';
import { tendersApi } from '../../api/tendersApi';
import { useAuth } from '../../context/AuthContext';
import BidDetailPage from './BidDetailPage';
import BidSubmissionWizard from './BidSubmissionWizard';
import BidOpeningPanel from './BidOpeningPanel';

const STATUS_COLORS = {
  DRAFT: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
  SUBMISSION_IN_PROGRESS: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  SUBMITTED: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
  AMENDMENT_ALLOWED: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  AMENDMENT_SUBMITTED: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  WITHDRAWAL_REQUESTED: { bg: 'rgba(244,63,94,0.15)', color: '#fb7185', border: 'rgba(244,63,94,0.3)' },
  WITHDRAWN: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
  LOCKED: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  TECHNICAL_OPENED: { bg: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: 'rgba(14,165,233,0.3)' },
  TECHNICAL_EVALUATION: { bg: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: 'rgba(14,165,233,0.3)' },
  FINANCIAL_OPENING_AUTHORIZED: { bg: 'rgba(251,146,60,0.15)', color: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  FINANCIAL_OPENED: { bg: 'rgba(251,146,60,0.15)', color: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  EVALUATED: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  AWARDED: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  REJECTED: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  DISQUALIFIED: { bg: 'rgba(220,38,38,0.15)', color: '#dc2626', border: 'rgba(220,38,38,0.3)' },
};

function formatDeadline(seconds) {
  if (!seconds || seconds <= 0) return { text: 'Expired', urgent: true };
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return { text: `${d}d ${h}h ${m}m`, urgent: d < 2 };
  if (h > 0) return { text: `${h}h ${m}m ${s}s`, urgent: h < 6 };
  return { text: `${m}m ${s}s`, urgent: true };
}

function formatCurrency(amount, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency, maximumFractionDigits: 0
    }).format(Number(amount || 0));
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function BidManagementDashboard() {
  const { user, isVendor, isEvaluator } = useAuth();
  const [view, setView] = useState('dashboard'); // dashboard, detail, wizard, opening
  const [selectedBidId, setSelectedBidId] = useState(null);
  const [selectedTenderId, setSelectedTenderId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [bids, setBids] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tenders, setTenders] = useState([]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, bidsRes] = await Promise.all([
        bidsApi.getDashboard(),
        bidsApi.getBids({ ...filters, limit: 20 }),
      ]);
      setDashboard(dashRes.data || {});
      setBids(bidsRes.data || []);
      setPagination(bidsRes.pagination || {});
    } catch (err) {
      console.error('Failed to load bids:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const loadTenders = async () => {
    try {
      const res = await tendersApi.getTenders({ status: 'ACTIVE', limit: 50 });
      setTenders(res.data || []);
      setCreateModalOpen(true);
    } catch (err) {
      console.error('Failed to load tenders:', err);
    }
  };

  const handleCreateBid = async (tenderId) => {
    try {
      await bidsApi.createBid(tenderId);
      setCreateModalOpen(false);
      loadDashboard();
    } catch (err) {
      alert(err.message || 'Failed to create bid');
    }
  };

  const handleViewBid = (bidId) => {
    setSelectedBidId(bidId);
    setView('detail');
  };

  const handleAmendBid = (bidId) => {
    setSelectedBidId(bidId);
    setView('detail');
  };

  if (view === 'detail' && selectedBidId) {
    return <BidDetailPage bidId={selectedBidId} onBack={() => { setView('dashboard'); setSelectedBidId(null); }} />;
  }

  if (view === 'wizard' && selectedTenderId) {
    return <BidSubmissionWizard tenderId={selectedTenderId} onBack={() => { setView('dashboard'); setSelectedTenderId(null); }} />;
  }

  if (view === 'opening' && selectedTenderId) {
    return <BidOpeningPanel tenderId={selectedTenderId} onBack={() => { setView('dashboard'); setSelectedTenderId(null); }} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
            🏛️ Bid Management & Secure Submission Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Two-Envelope Sealed Bidding • Technical & Financial Proposal Management
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(isVendor || (!isVendor && user)) && (
            <button onClick={loadTenders} className="btn-action" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)' }}>
              + Create New Bid
            </button>
          )}
          {!isVendor && (
            <button onClick={() => { setSelectedTenderId(null); setView('opening'); }} className="btn-action" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
              🔓 Bid Opening Panel
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      {dashboard && (
        <motion.div 
          className="grid-4" 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        >
          {[
            { label: 'Total Bids', value: dashboard.total_bids, color: '#60a5fa', icon: '📋' },
            { label: 'Submitted', value: dashboard.submitted_bids, color: '#34d399', icon: '✅' },
            { label: 'Under Evaluation', value: dashboard.under_evaluation_bids, color: '#fbbf24', icon: '⚖️' },
            { label: 'Awarded', value: dashboard.awarded_bids, color: '#10b981', icon: '🏆' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="glass-card"
              style={{ padding: '1.25rem', borderLeft: `3px solid ${stat.color}` }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 150, damping: 20 }}
              whileHover={{ y: -2, boxShadow: `0 8px 24px ${stat.color}22` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stat.label}</span>
                <span style={{ fontSize: '1.25rem' }}>{stat.icon}</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: stat.color }}>
                {loading ? '—' : (stat.value ?? 0)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by reference, vendor, tender..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{
            flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px',
            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)',
            color: '#ffffff', fontSize: '0.85rem'
          }}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)',
            color: '#ffffff', fontSize: '0.85rem'
          }}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="LOCKED">Locked</option>
          <option value="TECHNICAL_OPENED">Technical Opened</option>
          <option value="FINANCIAL_OPENED">Financial Opened</option>
          <option value="AWARDED">Awarded</option>
          <option value="REJECTED">Rejected</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
      </div>

      {/* Bid Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-muted)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>
            📋 Active Bids ({pagination.total || bids.length})
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Bid Reference</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tender</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Vendor</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Version</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Docs</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Deadline</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {bids.map((bid, i) => {
                  const deadline = bid.deadline_remaining;
                  const deadlineInfo = deadline ? formatDeadline(deadline.remaining_seconds) : null;
                  const sc = STATUS_COLORS[bid.status] || STATUS_COLORS.DRAFT;

                  return (
                    <motion.tr
                      key={bid.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: i * 0.03 }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>
                          {bid.bid_reference}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: '600' }}>{bid.tender_title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bid.tender_number}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{bid.vendor_name}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ fontFamily: 'monospace' }}>v{bid.current_version}</span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span>{bid.document_count}</span>
                        {bid.has_technical && <span title="Technical"> ✅</span>}
                        {bid.has_financial && <span title="Financial"> 🔒</span>}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {deadlineInfo ? (
                          <span style={{ 
                            fontFamily: 'monospace', fontSize: '0.8rem',
                            color: deadlineInfo.urgent ? '#ef4444' : 'var(--text-muted)',
                            fontWeight: deadlineInfo.urgent ? '700' : '400',
                          }}>
                            {deadlineInfo.text}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem',
                          fontWeight: '700', background: sc.bg, color: sc.color,
                          border: `1px solid ${sc.border}`,
                        }}>
                          {bid.status_display || bid.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleViewBid(bid.id)}
                            style={{
                              padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem',
                              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                              color: '#60a5fa', cursor: 'pointer',
                            }}
                          >
                            View
                          </button>
                          {bid.is_modifiable && (
                            <button
                              onClick={() => handleAmendBid(bid.id)}
                              style={{
                                padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem',
                                background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
                                color: '#fbbf24', cursor: 'pointer',
                              }}
                            >
                              Amend
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {!loading && bids.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No bids found. {isVendor ? 'Create a bid for an active tender to get started.' : 'No bid records in the system.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Bid Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCreateModalOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card"
              style={{ padding: '1.5rem', width: '90%', maxWidth: '600px', maxHeight: '70vh', overflowY: 'auto' }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>
                Select Tender to Bid On
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tenders.map((t) => (
                  <motion.div
                    key={t.id}
                    whileHover={{ background: 'rgba(255,255,255,0.05)' }}
                    style={{
                      padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-muted)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                    onClick={() => handleCreateBid(t.id)}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{t.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.tender_number}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--emerald)' }}>
                        {formatCurrency(t.budget, t.currency)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Deadline: {t.submission_deadline ? new Date(t.submission_deadline).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {tenders.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                    No active tenders available for bidding.
                  </p>
                )}
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{
                  marginTop: '1rem', width: '100%', padding: '0.5rem',
                  borderRadius: '8px', border: '1px solid var(--border-muted)',
                  background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
