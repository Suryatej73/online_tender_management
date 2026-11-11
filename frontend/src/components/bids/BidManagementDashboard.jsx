import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Gavel, DollarSign, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, ArrowLeft, ShieldCheck, Lock, Sparkles, X, ChevronRight
} from 'lucide-react';
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
  const num = Number(amount || 0);
  if (currency === 'INR') {
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} L`;
    }
  }
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency, maximumFractionDigits: 0
    }).format(num);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function BidManagementDashboard({ initialTab, initialTenderId } = {}) {
  const { user, isVendor } = useAuth();
  const [view, setView] = useState(initialTab || 'dashboard'); // dashboard, detail, wizard, opening
  const [selectedBidId, setSelectedBidId] = useState(null);
  const [selectedTenderId, setSelectedTenderId] = useState(initialTenderId || null);
  const [dashboard, setDashboard] = useState(null);
  const [bids, setBids] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '' });

  // Guided Bid Creation Wizard Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loadingTenders, setLoadingTenders] = useState(false);
  const [wizardStep, setWizardStep] = useState(0); // 0: Select Tender, 1: Enter Bid Details, 2: Reverify, 3: Submitted
  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [bidForm, setBidForm] = useState({
    total_amount: '',
    currency: 'INR',
    tax_amount: '',
    discount: '',
    methodology: 'Standard engineering & technical execution conforming with tender technical requirements and BOQ items.',
    implementation_plan: 'Phase 1: Mobilization & Site Survey (Days 1-30)\nPhase 2: Core Engineering & Procurement (Days 31-90)\nPhase 3: Execution, Testing & Quality Assurance (Days 91-150)\nPhase 4: Commissioning & Handover (Days 151-180)',
    delivery_plan: '180 Calendar Days',
    compliance_statement: 'We confirm complete compliance with all tender specifications, BOQ line items, and schedule terms.',
    declaredConfirmed: false,
  });
  const [bidDocs, setBidDocs] = useState([]);

  const handleAddBidDoc = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newDocs = files.map(f => ({
      file_name: f.name,
      document_type: f.name.toLowerCase().includes('fin') ? 'FINANCIAL_PROPOSAL' : 'TECHNICAL_PROPOSAL',
      file_size: f.size,
      mime_type: 'application/pdf',
      file_url: `/media/bids/proposals/${f.name}`,
    }));
    setBidDocs(prev => [...prev, ...newDocs]);
  };

  const handleRemoveBidDoc = (idx) => {
    setBidDocs(prev => prev.filter((_, i) => i !== idx));
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submittedBidResult, setSubmittedBidResult] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, bidsRes] = await Promise.all([
        bidsApi.getDashboard().catch(() => ({ data: {} })),
        bidsApi.getBids({ ...filters, limit: 20 }).catch(() => ({ data: [] })),
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

  const openCreateWizard = async () => {
    // Open modal immediately so user sees immediate response
    setCreateModalOpen(true);
    setWizardStep(0);
    setSelectedTender(null);
    setSubmittedBidResult(null);
    setSubmissionError('');
    setLoadingTenders(true);
    setBidDocs([]);
    setBidForm({
      total_amount: '',
      currency: 'INR',
      tax_amount: '',
      discount: '',
      methodology: 'Standard engineering & technical execution conforming with tender technical requirements and BOQ items.',
      implementation_plan: 'Phase 1: Mobilization & Site Survey (Days 1-30)\nPhase 2: Core Engineering & Procurement (Days 31-90)\nPhase 3: Execution, Testing & Quality Assurance (Days 91-150)\nPhase 4: Commissioning & Handover (Days 151-180)',
      delivery_plan: '180 Calendar Days',
      compliance_statement: 'We confirm complete compliance with all tender specifications, BOQ line items, and schedule terms.',
      declaredConfirmed: false,
    });

    try {
      // Fetch open solicitations
      const res = await tendersApi.getTenders({ limit: 100 });
      const list = res.data || [];
      const eligible = list.filter(t =>
        ['PUBLISHED', 'ACTIVE', 'DRAFT'].includes(t.status) || !t.status
      );
      setTenders(eligible.length > 0 ? eligible : list);
    } catch (err) {
      console.error('Failed to load tenders:', err);
      setSubmissionError('Could not load tenders list. Please try again.');
    } finally {
      setLoadingTenders(false);
    }
  };

  useEffect(() => {
    if (initialTenderId) {
      (async () => {
        try {
          const res = await tendersApi.getTenderDetail(initialTenderId);
          if (res?.data) {
            setSelectedTender(res.data);
            setWizardStep(1);
            setBidDocs([]);
            setBidForm({
              total_amount: '',
              currency: 'INR',
              tax_amount: '',
              discount: '',
              methodology: 'Standard engineering & technical execution conforming with tender technical requirements and BOQ items.',
              implementation_plan: 'Phase 1: Mobilization & Site Survey (Days 1-30)\nPhase 2: Core Engineering & Procurement (Days 31-90)\nPhase 3: Execution, Testing & Quality Assurance (Days 91-150)\nPhase 4: Commissioning & Handover (Days 151-180)',
              delivery_plan: '180 Calendar Days',
              compliance_statement: 'We confirm complete compliance with all tender specifications, BOQ line items, and schedule terms.',
              declaredConfirmed: false,
            });
            setSubmittedBidResult(null);
            setSubmissionError('');
            setCreateModalOpen(true);
          }
        } catch {
          openCreateWizard();
        }
      })();
    }
  }, [initialTenderId]);

  const handleSelectTender = (t) => {
    setSelectedTender(t);
    setSubmissionError('');
    setWizardStep(1);
  };

  const handleFinalSubmitBid = async () => {
    if (!selectedTender) return;
    try {
      setIsSubmitting(true);
      setSubmissionError('');

      // 1. Create or resume draft bid
      const bidRes = await bidsApi.createBid(selectedTender.id);
      const createdBidId = bidRes?.data?.id;
      if (!createdBidId) {
        throw new Error(bidRes?.message || 'Could not initialize bid draft.');
      }

      // 2. Save Technical Proposal (including Detailed Implementation Plan)
      const techPayload = {
        methodology: bidForm.methodology || 'Technical execution methodology conforming with tender requirements.',
        technical_description: bidForm.methodology || 'Full technical compliance plan',
        implementation_plan: bidForm.implementation_plan || 'Phase 1: Mobilization & Site Survey (Days 1-30)\nPhase 2: Core Execution & Delivery (Days 31-150)\nPhase 3: Testing, Quality Audit & Handover (Days 151-180)',
        delivery_plan: bidForm.delivery_plan || '180 Calendar Days',
        compliance_statement: bidForm.compliance_statement || 'Full compliance affirmed.'
      };
      await bidsApi.saveTechnicalBid(createdBidId, techPayload);

      // Upload any attached proposal documents & certificates
      if (bidDocs && bidDocs.length > 0) {
        for (const doc of bidDocs) {
          try {
            await bidsApi.uploadBidDocument(createdBidId, {
              document_type: doc.document_type || 'TECHNICAL_PROPOSAL',
              file_name: doc.file_name,
              original_filename: doc.file_name,
              file_url: doc.file_url,
              file_size: doc.file_size || 1024,
              mime_type: 'application/pdf',
              sha256_hash: ''
            });
          } catch (uploadErr) {
            console.warn('Document upload warning:', uploadErr);
          }
        }
      }

      // 3. Save Financial Proposal
      const totalNum = parseFloat(bidForm.total_amount) || 0;
      const taxNum = parseFloat(bidForm.tax_amount) || 0;
      const discNum = parseFloat(bidForm.discount) || 0;
      const finalNum = Math.max(0, totalNum + taxNum - discNum);

      const finPayload = {
        currency: bidForm.currency || 'INR',
        total_amount: totalNum,
        tax_amount: taxNum,
        discount: discNum,
        final_amount: finalNum
      };
      await bidsApi.saveFinancialBid(createdBidId, finPayload);

      // 4. Submit Bid (seals dual-envelope)
      const submitRes = await bidsApi.submitBid(createdBidId);

      setSubmittedBidResult({
        ...submitRes.data,
        bid_reference: submitRes.data?.bid_reference || bidRes.data?.bid_reference,
        final_amount: finalNum,
        currency: bidForm.currency || 'INR',
        id: createdBidId
      });

      // Reload dashboard
      await loadDashboard();

      // Advance to Step 3: Success screen!
      setWizardStep(3);
    } catch (err) {
      setSubmissionError(err.message || 'Bid submission failed. Please verify your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewBid = (bidId) => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: isVendor ? 'rgba(249,115,22,0.15)' : 'rgba(59,130,246,0.15)', color: isVendor ? '#f97316' : '#60a5fa', fontWeight: 'bold' }}>
              {isVendor ? '🏢 SUPPLIER / BIDDER PORTAL' : '🏛️ PROCURING ENTITY OVERSIGHT'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#fff' }}>
            {isVendor ? '🏢 My Bids & Proposal Submissions' : '🏛️ Received Bids & Solicitations Overview'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {isVendor
              ? 'Two-Envelope Sealed Bidding • Enter Quote, Verify Technical Details, and Submit Proposals'
              : 'Sealed Dual-Envelope Bids Submitted by Registered Vendors for Your Solicitations'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isVendor ? (
            <button
              onClick={openCreateWizard}
              className="btn-action"
              style={{
                padding: '0.55rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <span>+ Submit New Bid</span>
            </button>
          ): (
            <button
                onClick={() => { setSelectedTenderId(null); setView('opening'); }}
                className="btn-action"
                style={{ padding: '0.55rem 1rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                🔓 Bid Opening Panel
              </button>
          )}
        </div>
      </div>

      {/* Procuring Official Guidance Banner when not in Vendor mode */}
      {!isVendor && (
        <div style={{
          padding: "0.9rem 1.25rem",
          borderRadius: "12px",
          background: "rgba(59, 130, 246, 0.08)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}>
          <span style={{ fontSize: "1.4rem" }}>⚖️</span>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#93c5fd" }}>
              Conflict of Interest Protection &amp; Separation of Duties
            </div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", marginTop: "0.2rem", lineHeight: "1.4" }}>
              You are signed in as a <strong>{user?.role === "TENDER_MANAGER" ? "Tender Manager" : user?.role || "Procuring Official"}</strong>. Procuring authorities review vendor submissions and cannot submit bids. Only registered supplier accounts can submit sealed bids.
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Total Bids', value: dashboard.total_bids || 0, color: 'var(--primary)' },
            { label: 'Draft', value: dashboard.draft_bids || 0, color: '#94a3b8' },
            { label: 'Submitted', value: dashboard.submitted_bids || 0, color: 'var(--emerald)' },
            { label: 'Under Eval', value: dashboard.under_evaluation_bids || 0, color: '#38bdf8' },
            { label: 'Awarded', value: dashboard.awarded_bids || 0, color: 'var(--emerald)' },
            { label: 'Rejected', value: dashboard.rejected_bids || 0, color: '#ef4444' },
          ].map((kpi, i) => (
            <motion.div key={i} whileHover={{ y: -2 }} className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>{kpi.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: kpi.color, marginTop: '0.25rem' }}>{kpi.value}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by bid reference, tender, vendor..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{
            flex: '1', minWidth: '200px', padding: '0.5rem 0.75rem',
            borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)',
            color: '#fff', fontSize: '0.85rem',
          }}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)',
            color: '#fff', fontSize: '0.85rem',
          }}
        >
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Bids Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)' }}>Bid Reference</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)' }}>Tender</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)' }}>Vendor</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)' }}>Evaluation Score</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)' }}>Docs</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)' }}>Deadline</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((b) => {
                const sc = STATUS_COLORS[b.status] || STATUS_COLORS.DRAFT;
                const dl = formatDeadline(b.deadline_remaining?.remaining_seconds);
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-muted)' }} className="table-row-hover">
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: '700', color: '#f97316' }}>
                      {b.bid_reference}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: '600' }}>{b.tender_title || b.tender?.title || 'Tender'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.tender_number}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {b.vendor_name || 'Registered Vendor'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem',
                        fontWeight: '700', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                      }}>
                        {b.status_display || b.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {b.technical_bid?.technical_score != null ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{
                            padding: '0.2rem 0.65rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            ⭐ {parseFloat(b.technical_bid.technical_score).toFixed(1)} / 100
                          </span>
                          {b.technical_bid.evaluation_remarks && (
                            <span
                              style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.2rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={b.technical_bid.evaluation_remarks}
                            >
                              "{b.technical_bid.evaluation_remarks}"
                            </span>
                          )}
                        </div>
                      ) : b.status === 'DISQUALIFIED' ? (
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                          Disqualified
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Pending Scoring
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {b.document_count || 0}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: dl.urgent ? '#ef4444' : 'var(--text-muted)', fontWeight: dl.urgent ? '700' : '400' }}>
                        {dl.text}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        {!isVendor && b.status === 'EVALUATED' && (
                          <button
                            onClick={async () => {
                              const vName = b.vendor_name || 'selected vendor';
                              if (!window.confirm(`OFFICIAL CONTRACT AWARD: Confirm award to ${vName} for Tender ${b.tender_number || 'solicitation'}?`)) return;
                              try {
                                await bidsApi.awardBid(b.id, { notes: `Contract officially awarded to ${vName}` });
                                alert(`Contract successfully awarded to ${vName}!`);
                                loadDashboard();
                              } catch (err) {
                                alert('Failed to award contract: ' + err.message);
                              }
                            }}
                            className="btn-action"
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: '800',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#fff',
                              border: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            title="Officially award contract to this evaluated vendor"
                          >
                            <span>🏆 Award</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleViewBid(b.id)}
                          className="btn-action"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {bids.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No proposals submitted yet. Click "+ Create New Bid" above to submit your first proposal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guided 4-Step Bid Submission Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isSubmitting) setCreateModalOpen(false);
            }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
              padding: '1rem', backdropFilter: 'blur(8px)'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card"
              style={{
                padding: '2rem', width: '100%', maxWidth: '720px', maxHeight: '88vh',
                overflowY: 'auto', background: '#0e131f', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '1.25rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              }}
            >
              {/* Modal Top Header with Stepper */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Gavel style={{ width: '1.2rem', height: '1.2rem', color: '#f97316' }} />
                    {wizardStep === 0 && 'Step 1: Select Tender to Bid On'}
                    {wizardStep === 1 && 'Step 2: Enter Bid Quote & Proposal Details'}
                    {wizardStep === 2 && 'Step 3: Reverify Details Before Submission'}
                    {wizardStep === 3 && 'Bid Submission Complete'}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    {wizardStep === 0 && 'Choose the open procurement solicitation you want to submit a formal bid for.'}
                    {wizardStep === 1 && 'Specify your commercial pricing in INR and key technical execution terms.'}
                    {wizardStep === 2 && 'Review your figures, confirm declarations, and execute dual-envelope sealing.'}
                    {wizardStep === 3 && 'Your bid is cryptographically sealed and submitted to the evaluation escrow.'}
                  </p>
                </div>
                {!isSubmitting && (
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px' }}
                  >
                    <X style={{ width: '1.1rem', height: '1.1rem' }} />
                  </button>
                )}
              </div>

              {/* Error Banner */}
              {submissionError && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <AlertTriangle style={{ width: '1rem', height: '1rem', shrink: 0 }} />
                  <span>{submissionError}</span>
                </div>
              )}

              {/* ────────────────────────────────────────────── */}
              {/* STEP 0: Select Tender                          */}
              {/* ────────────────────────────────────────────── */}
              {wizardStep === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {loadingTenders ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.6)' }}>
                      <div style={{
                        margin: '0 auto 1rem', width: '2.5rem', height: '2.5rem',
                        border: '3px solid rgba(255,255,255,0.15)',
                        borderTopColor: '#f97316', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      <p style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>Loading Solicitations...</p>
                    </div>
                  ) : (
                    <>
                      {tenders.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTender(t)}
                          style={{
                            padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.08)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                        >
                          <div style={{ maxWidth: '65%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#fff' }}>{t.title}</span>
                              <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 'bold' }}>
                                {t.status || 'ACTIVE'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                              <span style={{ fontFamily: 'monospace', color: '#f97316', fontWeight: 'bold' }}>{t.tender_number}</span> • {t.effective_org_name || t.organization_name || 'Procurement Authority'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>
                              Category: {t.category_name || 'General Procurement'}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Allocated Budget</div>
                            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#10b981', fontFamily: 'monospace' }}>
                              {formatCurrency(t.budget, t.currency)}
                            </div>
                            <button
                              type="button"
                              className="btn-action"
                              style={{
                                marginTop: '0.25rem',
                                padding: '0.3rem 0.75rem',
                                fontSize: '0.75rem',
                                background: 'rgba(249,115,22,0.15)',
                                color: '#f97316',
                                border: '1px solid rgba(249,115,22,0.3)',
                                borderRadius: '6px',
                                fontWeight: '700'
                              }}
                            >
                              Select &amp; Bid →
                            </button>
                          </div>
                        </div>
                      ))}

                      {tenders.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                          <p style={{ fontWeight: '700', color: '#fff', marginBottom: '0.3rem' }}>No Active Tenders Found</p>
                          <p style={{ fontSize: '0.8rem' }}>Create a tender solicitation first from the Tenders page.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────────── */}
              {/* STEP 1: Enter Bid Amount & Details             */}
              {/* ────────────────────────────────────────────── */}
              {wizardStep === 1 && selectedTender && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Selected Tender Summary Pill */}
                  <div style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: '700', textTransform: 'uppercase' }}>Selected Solicitation</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>{selectedTender.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{selectedTender.tender_number}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Target Budget</div>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: '#10b981', fontFamily: 'monospace' }}>
                        {formatCurrency(selectedTender.budget, selectedTender.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Financial Envelope Section */}
                  <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                      <DollarSign style={{ width: '1rem', height: '1rem', color: '#10b981' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        1. Financial Proposal (Commercial Bid)
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem' }}>
                        Total Proposed Bid Amount (Quote in INR) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '0.85rem', top: '0.7rem', color: '#f97316', fontWeight: 'bold', fontSize: '0.9rem' }}>₹</span>
                        <input
                          type="number"
                          placeholder="e.g. 45000000"
                          value={bidForm.total_amount}
                          onChange={(e) => setBidForm({ ...bidForm, total_amount: e.target.value })}
                          style={{
                            width: '100%', padding: '0.7rem 0.7rem 0.7rem 2.2rem', borderRadius: '8px',
                            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '700'
                          }}
                        />
                      </div>

                      {/* Live Formatted Price Preview */}
                      {bidForm.total_amount && (
                        <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Formatted Preview:</span>
                          <span style={{ color: '#10b981', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {formatCurrency(bidForm.total_amount, 'INR')} ({Number(bidForm.total_amount).toLocaleString('en-IN')})
                          </span>
                          {selectedTender.budget && (
                            <span style={{
                              fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px',
                              background: Number(bidForm.total_amount) <= Number(selectedTender.budget) ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: Number(bidForm.total_amount) <= Number(selectedTender.budget) ? '#34d399' : '#f87171',
                              fontWeight: 'bold'
                            }}>
                              {Number(bidForm.total_amount) <= Number(selectedTender.budget)
                                ? `Within Budget (${Math.round((1 - Number(bidForm.total_amount) / Number(selectedTender.budget)) * 100)}% savings)`
                                : `Exceeds Budget (+${Math.round((Number(bidForm.total_amount) / Number(selectedTender.budget) - 1) * 100)}%)`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.3rem' }}>
                          Applicable Taxes / GST (INR)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 0"
                          value={bidForm.tax_amount}
                          onChange={(e) => setBidForm({ ...bidForm, tax_amount: e.target.value })}
                          style={{
                            width: '100%', padding: '0.55rem', borderRadius: '8px',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', fontSize: '0.85rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.3rem' }}>
                          Offered Discount / Concession (INR)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 0"
                          value={bidForm.discount}
                          onChange={(e) => setBidForm({ ...bidForm, discount: e.target.value })}
                          style={{
                            width: '100%', padding: '0.55rem', borderRadius: '8px',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', fontSize: '0.85rem'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Technical Envelope Section */}
                  <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                      <FileText style={{ width: '1rem', height: '1rem', color: '#f97316' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        2. Technical Proposal &amp; Execution Plan
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem' }}>
                        Technical Execution Methodology &amp; Approach *
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Describe your technical methodology, standards compliance, project personnel, machinery, and quality control systems..."
                        value={bidForm.methodology}
                        onChange={(e) => setBidForm({ ...bidForm, methodology: e.target.value })}
                        style={{
                          width: '100%', padding: '0.6rem', borderRadius: '8px',
                          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff', fontSize: '0.85rem', resize: 'vertical'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.3rem' }}>
                          Delivery / Completion Schedule
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 180 Calendar Days / 6 Months"
                          value={bidForm.delivery_plan}
                          onChange={(e) => setBidForm({ ...bidForm, delivery_plan: e.target.value })}
                          style={{
                            width: '100%', padding: '0.55rem', borderRadius: '8px',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', fontSize: '0.85rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.3rem' }}>
                          Specification Compliance Statement
                        </label>
                        <input
                          type="text"
                          value={bidForm.compliance_statement}
                          onChange={(e) => setBidForm({ ...bidForm, compliance_statement: e.target.value })}
                          style={{
                            width: '100%', padding: '0.55rem', borderRadius: '8px',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', fontSize: '0.85rem'
                          }}
                        />
                      </div>
                    </div>

                    {/* Detailed Implementation Plan & Roadmap */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem' }}>
                        Implementation Plan &amp; Phased Execution Roadmap *
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Phase-by-phase delivery milestones, mobilization schedule, testing and commissioning dates..."
                        value={bidForm.implementation_plan}
                        onChange={(e) => setBidForm({ ...bidForm, implementation_plan: e.target.value })}
                        style={{
                          width: '100%', padding: '0.6rem', borderRadius: '8px',
                          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff', fontSize: '0.85rem', resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Proposal Documents & Technical Attachments */}
                    <div style={{ padding: '0.9rem', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fff' }}>
                            Upload Technical Proposal &amp; Implementation Documents
                          </span>
                          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                            Attach your detailed implementation dossier, technical blueprints, and certificates.
                          </p>
                        </div>
                        <label style={{
                          padding: '0.35rem 0.75rem', borderRadius: '6px', background: 'rgba(249,115,22,0.15)',
                          border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', fontSize: '0.75rem',
                          fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                        }}>
                          <span>+ Attach Files</span>
                          <input
                            type="file"
                            multiple
                            onChange={handleAddBidDoc}
                            style={{ display: 'none' }}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
                          />
                        </label>
                      </div>

                      {bidDocs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {bidDocs.map((doc, idx) => (
                            <div key={idx} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem'
                            }}>
                              <span style={{ color: '#fff', fontFamily: 'monospace' }}>📄 {doc.file_name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '3px', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 'bold' }}>
                                  READY TO SEAL
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBidDoc(idx)}
                                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '0.75rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                          No proposal files attached yet. Click "+ Attach Files" to upload implementation plans and credentials.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setWizardStep(0)}
                      className="btn-action"
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', padding: '0.6rem 1.25rem' }}
                    >
                      ← Back to Tenders
                    </button>
                    <button
                      type="button"
                      disabled={!bidForm.total_amount || parseFloat(bidForm.total_amount) <= 0 || !bidForm.methodology.trim()}
                      onClick={() => setWizardStep(2)}
                      className="btn-action"
                      style={{
                        padding: '0.65rem 1.5rem', fontWeight: '700',
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        opacity: (!bidForm.total_amount || parseFloat(bidForm.total_amount) <= 0 || !bidForm.methodology.trim()) ? 0.4 : 1,
                        cursor: (!bidForm.total_amount || parseFloat(bidForm.total_amount) <= 0 || !bidForm.methodology.trim()) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <span>Reverify Details →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────── */}
              {/* STEP 2: Reverify Details Before Submission     */}
              {/* ────────────────────────────────────────────── */}
              {wizardStep === 2 && selectedTender && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.8rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock style={{ width: '1rem', height: '1rem', shrink: 0, color: '#60a5fa' }} />
                    <span>Please reverify your proposal parameters below before sealing and final submission.</span>
                  </div>

                  {/* Verification Summary Card */}
                  <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Target Solicitation</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>{selectedTender.title} ({selectedTender.tender_number})</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Tender Authorized Budget</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {formatCurrency(selectedTender.budget, selectedTender.currency)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>Your Proposed Bid Quote</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#10b981', fontFamily: 'monospace' }}>
                        {formatCurrency(bidForm.total_amount, 'INR')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Delivery / Completion Schedule</span>
                      <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600' }}>{bidForm.delivery_plan || '180 Days'}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>Technical Methodology Summary</span>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.3)', padding: '0.6rem', borderRadius: '6px', lineHeight: '1.4' }}>
                        {bidForm.methodology}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>Implementation Plan &amp; Roadmap</span>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.3)', padding: '0.6rem', borderRadius: '6px', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                        {bidForm.implementation_plan}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Attached Proposal Documents</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: bidDocs.length > 0 ? '#34d399' : '#f59e0b' }}>
                        {bidDocs.length > 0 ? `${bidDocs.length} Documents Sealed for Upload` : 'No file attachments (Text dossier only)'}
                      </span>
                    </div>
                  </div>

                  {/* Declaration Checkbox */}
                  <label style={{ display: 'flex', gap: '0.75rem', padding: '0.85rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={bidForm.declaredConfirmed}
                      onChange={(e) => setBidForm({ ...bidForm, declaredConfirmed: e.target.checked })}
                      style={{ marginTop: '0.2rem' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.4' }}>
                      I confirm that all financial figures, technical methodologies, and delivery milestones provided in this proposal are authentic, legally binding, and comply fully with the tender specifications.
                    </span>
                  </label>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setWizardStep(1)}
                      className="btn-action"
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', padding: '0.6rem 1.25rem' }}
                    >
                      ← Back to Edit
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || !bidForm.declaredConfirmed}
                      onClick={handleFinalSubmitBid}
                      className="btn-action"
                      style={{
                        padding: '0.7rem 1.75rem', fontWeight: '800',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                        opacity: (isSubmitting || !bidForm.declaredConfirmed) ? 0.4 : 1,
                        cursor: (isSubmitting || !bidForm.declaredConfirmed) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                      }}
                    >
                      <Sparkles style={{ width: '1rem', height: '1rem' }} />
                      <span>{isSubmitting ? 'Sealing & Submitting...' : '🚀 Submit Official Bid'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────── */}
              {/* STEP 3: Bid Submitted Success Screen           */}
              {/* ────────────────────────────────────────────── */}
              {wizardStep === 3 && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <CheckCircle2 style={{ width: '2.5rem', height: '2.5rem' }} />
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em' }}>
                      Bid Submitted Successfully!
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Your proposal has been cryptographically sealed and registered in the procurement database.
                    </p>
                  </div>

                  <div style={{ width: '100%', maxWidth: '440px', padding: '1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Bid Reference ID</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#f97316', fontSize: '0.9rem' }}>
                        {submittedBidResult?.bid_reference || 'BID-REGISTERED'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Submission Status</span>
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 'bold' }}>
                        SUBMITTED
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Quoted Price</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#10b981', fontFamily: 'monospace' }}>
                        {formatCurrency(submittedBidResult?.final_amount || bidForm.total_amount, 'INR')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Sealed Envelopes</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                        🔒 Technical &amp; Financial Envelopes Locked
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setCreateModalOpen(false);
                        if (submittedBidResult?.id) {
                          handleViewBid(submittedBidResult.id);
                        }
                      }}
                      className="btn-action"
                      style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: '700', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
                    >
                      View Bid Details
                    </button>
                    <button
                      onClick={() => setCreateModalOpen(false)}
                      className="btn-action"
                      style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                    >
                      Return to Bids Dashboard
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
