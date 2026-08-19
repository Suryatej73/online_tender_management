import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { tendersApi } from '../../api/tendersApi';
import {
  FileText, Plus, Search, Filter, ChevronRight, Clock, AlertTriangle,
  CheckCircle2, XCircle, Award, Archive, Eye, Edit3, Trash2, Copy,
  ArrowRight, TrendingUp, DollarSign, Calendar, Layers, BookTemplate,
  FileEdit, Gavel, Building, Timer, Zap, RotateCw, X
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

/* ── Status Config ── */
const statusConfig = {
  DRAFT:       { label: 'Draft', color: 'var(--text-dim)', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.2)', icon: Edit3 },
  PUBLISHED:   { label: 'Published', color: 'var(--accent)', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.2)', icon: Eye },
  ACTIVE:      { label: 'Active', color: 'var(--emerald)', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.2)', icon: Zap },
  EVALUATION:  { label: 'Evaluation', color: 'var(--amber)', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.2)', icon: Gavel },
  AWARDED:     { label: 'Awarded', color: 'var(--purple)', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.2)', icon: Award },
  CLOSED:      { label: 'Closed', color: 'var(--text-muted)', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.2)', icon: Archive },
  CANCELLED:   { label: 'Cancelled', color: 'var(--rose)', bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.2)', icon: XCircle },
};

const nextStatusMap = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['EVALUATION', 'CANCELLED'],
  EVALUATION: ['AWARDED', 'CLOSED'],
  AWARDED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

/* ── Status Badge ── */
function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.DRAFT;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      padding: '0.2rem 0.65rem', borderRadius: '9999px',
      fontSize: '0.7rem', fontWeight: 650, letterSpacing: '0.02em',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

/* ── Executive Metrics ── */
function MetricsBar({ metrics }) {
  const cards = [
    { label: 'Total Tenders', value: metrics?.total || 0, icon: FileText, color: 'var(--primary)' },
    { label: 'Active', value: metrics?.active || 0, icon: Zap, color: 'var(--emerald)' },
    { label: 'In Evaluation', value: metrics?.evaluation || 0, icon: Gavel, color: 'var(--amber)' },
    { label: 'Awarded', value: metrics?.awarded || 0, icon: Award, color: 'var(--purple)' },
    { label: 'Est. Value', value: `$${Number(metrics?.total_estimated_value || 0).toLocaleString()}`, icon: DollarSign, color: 'var(--accent)' },
    { label: 'Expiring ≤7d', value: metrics?.expiring_within_7_days || 0, icon: Timer, color: 'var(--rose)' },
  ];

  return (
    <div className="grid-4" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
            className="glass-card"
            style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 'var(--radius-md)',
              background: `${c.color}18`, color: c.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>{c.value}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Lifecycle Pipeline Visual ── */
function LifecyclePipeline({ currentStatus }) {
  const stages = ['DRAFT', 'PUBLISHED', 'ACTIVE', 'EVALUATION', 'AWARDED', 'CLOSED'];
  const currentIdx = stages.indexOf(currentStatus);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
      {stages.map((stage, i) => {
        const cfg = statusConfig[stage];
        const isReached = i <= currentIdx;
        const isCurrent = stage === currentStatus;
        return (
          <React.Fragment key={stage}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.2rem 0.55rem', borderRadius: '9999px',
              fontSize: '0.65rem', fontWeight: isCurrent ? 700 : 500,
              background: isReached ? cfg.bg : 'rgba(255,255,255,0.03)',
              color: isReached ? cfg.color : 'var(--text-faint)',
              border: `1px solid ${isReached ? cfg.border : 'transparent'}`,
              transition: 'all 200ms ease',
            }}>
              {React.createElement(cfg.icon, { size: 10 })}
              {cfg.label}
            </div>
            {i < stages.length - 1 && (
              <ChevronRight size={12} style={{ color: isReached ? cfg.color : 'var(--text-faint)', opacity: isReached ? 1 : 0.3 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Tender Row ── */
function TenderRow({ tender, onTransition, onViewDetail }) {
  const cfg = statusConfig[tender.status] || statusConfig.DRAFT;
  const nextStatuses = nextStatusMap[tender.status] || [];

  return (
    <motion.tr
      variants={fadeUp}
      whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.04)' }}
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <td className="code-font" style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--accent)' }}>
        {tender.tender_number}
      </td>
      <td style={{ padding: '0.85rem 1rem' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', maxWidth: '300px' }}>{tender.title}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>{tender.category_name}</span>
          <span style={{ color: 'var(--text-faint)' }}>·</span>
          <span>{tender.organization_name}</span>
          {tender.is_two_envelope && <span className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '0.05rem 0.35rem' }}>2-Envelope</span>}
          {tender.is_reverse_auction_eligible && <span className="badge badge-cyan" style={{ fontSize: '0.6rem', padding: '0.05rem 0.35rem' }}>Reverse Auction</span>}
        </div>
      </td>
      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
        ${Number(tender.estimated_cost).toLocaleString()}
      </td>
      <td style={{ padding: '0.85rem 1rem' }}>
        <StatusBadge status={tender.status} />
      </td>
      <td style={{ padding: '0.85rem 1rem', minWidth: '140px' }}>
        <div className="code-font" style={{ fontSize: '0.72rem', color: 'var(--amber)', marginBottom: '0.2rem' }}>
          {tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleDateString() : '—'}
        </div>
        {tender.is_expired ? (
          <span style={{ fontSize: '0.65rem', color: 'var(--rose)', fontWeight: 600 }}>EXPIRED</span>
        ) : (
          <span style={{ fontSize: '0.65rem', color: tender.days_until_deadline <= 7 ? 'var(--amber)' : 'var(--text-dim)' }}>
            {tender.days_until_deadline}d left
          </span>
        )}
      </td>
      <td style={{ padding: '0.85rem 1rem' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>v{tender.version}</span>
      </td>
      <td style={{ padding: '0.85rem 1rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onViewDetail(tender)}
          style={{ background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', padding: '0.3rem', borderRadius: 'var(--radius-sm)', display: 'flex' }}
          title="View Details"
        >
          <Eye size={15} />
        </motion.button>
        {nextStatuses.map((ns) => (
          <motion.button
            key={ns}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onTransition(tender.id, ns)}
            className="btn-secondary"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontWeight: 600 }}
            title={`Transition to ${statusConfig[ns]?.label}`}
          >
            → {statusConfig[ns]?.label}
          </motion.button>
        ))}
      </td>
    </motion.tr>
  );
}

/* ── Create Tender Modal ── */
function CreateTenderModal({ onClose, onSuccess, categories, templates }) {
  const [form, setForm] = useState({
    title: '', description: '', category: '', estimated_cost: '',
    emd_amount: '', submission_deadline: '', is_two_envelope: false,
    is_reverse_auction_eligible: false, location: '', currency: 'USD',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.category) delete payload.category;
      if (payload.submission_deadline) {
        payload.submission_deadline = new Date(payload.submission_deadline).toISOString();
      }
      await tendersApi.createTender(payload);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(10,16,32,0.8)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)' };
  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--text-muted)', marginBottom: '0.3rem' };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="modal-content"
        style={{ maxWidth: '720px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create New Tender</h3>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </motion.button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--rose-surface)', border: '1px solid rgba(251,113,133,0.2)', color: 'var(--rose)', fontSize: '0.82rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Tender Title *</label>
              <input required style={inputStyle} value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. Supply & Installation of Data Center Servers" />
            </div>
            <div>
              <label style={labelStyle}>Description *</label>
              <textarea required rows={3} style={{...inputStyle, resize: 'vertical'}} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Detailed description of the tender scope..." />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select style={inputStyle} value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Submission Deadline *</label>
              <input required type="datetime-local" style={inputStyle} value={form.submission_deadline} onChange={(e) => setForm({...form, submission_deadline: e.target.value})} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Estimated Cost *</label>
              <input required type="number" step="0.01" style={inputStyle} value={form.estimated_cost} onChange={(e) => setForm({...form, estimated_cost: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <label style={labelStyle}>EMD Amount</label>
              <input type="number" step="0.01" style={inputStyle} value={form.emd_amount} onChange={(e) => setForm({...form, emd_amount: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select style={inputStyle} value={form.currency} onChange={(e) => setForm({...form, currency: e.target.value})}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <input style={inputStyle} value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="City, State, Country" />
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.is_two_envelope} onChange={(e) => setForm({...form, is_two_envelope: e.target.checked})} style={{ accentColor: 'var(--primary)' }} />
              Two-Envelope Bidding
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.is_reverse_auction_eligible} onChange={(e) => setForm({...form, is_reverse_auction_eligible: e.target.checked})} style={{ accentColor: 'var(--primary)' }} />
              Reverse Auction Eligible
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn-secondary" onClick={onClose}>Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn-action" disabled={loading}>
              {loading ? 'Creating...' : 'Create Tender'} <Plus size={15} />
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ── Tender Detail Modal ── */
function TenderDetailModal({ tender, onClose, onTransition }) {
  if (!tender) return null;
  const cfg = statusConfig[tender.status] || statusConfig.DRAFT;
  const nextStatuses = nextStatusMap[tender.status] || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="modal-content"
        style={{ maxWidth: '800px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
              <span className="code-font" style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700 }}>{tender.tender_number}</span>
              <StatusBadge status={tender.status} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.3 }}>{tender.title}</h3>
          </div>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </motion.button>
        </div>

        {/* Lifecycle Pipeline */}
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(10,16,32,0.5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lifecycle Status</div>
          <LifecyclePipeline currentStatus={tender.status} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>Description</div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tender.description || 'No description provided.'}</p>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Estimated Cost', value: `$${Number(tender.estimated_cost).toLocaleString()}`, color: 'var(--emerald)' },
            { label: 'EMD Amount', value: `$${Number(tender.emd_amount).toLocaleString()}`, color: 'var(--amber)' },
            { label: 'Category', value: tender.category_name, color: 'var(--primary-light)' },
            { label: 'Organization', value: tender.organization_name, color: 'var(--accent)' },
            { label: 'Deadline', value: tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleDateString() : '—', color: 'var(--amber)' },
            { label: 'Version', value: `v${tender.version}`, color: 'var(--text-muted)' },
          ].map((item) => (
            <div key={item.label} style={{ padding: '0.65rem 0.85rem', background: 'rgba(10,16,32,0.4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: item.color, marginTop: '0.15rem' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* BOQ Items */}
        {tender.boq_items && tender.boq_items.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Bill of Quantities ({tender.boq_items.length} items — Total: ${Number(tender.total_boq_value).toLocaleString()})
            </div>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(10,16,32,0.8)' }}>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-dim)', fontWeight: 600 }}>Qty</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-dim)', fontWeight: 600 }}>Unit Price</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-dim)', fontWeight: 600 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tender.boq_items.map((item) => (
                    <tr key={item.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td className="code-font" style={{ padding: '0.45rem 0.75rem', color: 'var(--accent)' }}>{item.item_number}</td>
                      <td style={{ padding: '0.45rem 0.75rem' }}>{item.description}</td>
                      <td className="code-font" style={{ padding: '0.45rem 0.75rem', textAlign: 'right' }}>{item.quantity}</td>
                      <td className="code-font" style={{ padding: '0.45rem 0.75rem', textAlign: 'right' }}>${Number(item.unit_price).toLocaleString()}</td>
                      <td className="code-font" style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--emerald)' }}>${Number(item.total_price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Amendments */}
        {tender.amendments && tender.amendments.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Amendments ({tender.amendments.length})
            </div>
            {tender.amendments.map((a) => (
              <div key={a.id} style={{ padding: '0.65rem 0.85rem', background: 'rgba(251,191,36,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(251,191,36,0.15)', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--amber)' }}>Amendment #{a.amendment_number}: {a.title}</span>
                  <span className="code-font" style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{a.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Lifecycle Actions */}
        {nextStatuses.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            {nextStatuses.map((ns) => (
              <motion.button
                key={ns}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={ns === 'CANCELLED' ? 'btn-danger' : 'btn-action'}
                onClick={() => { onTransition(tender.id, ns); onClose(); }}
              >
                {React.createElement(statusConfig[ns]?.icon || ArrowRight, { size: 14 })}
                Transition → {statusConfig[ns]?.label}
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Tender Management Dashboard
   ══════════════════════════════════════════════════════════════ */

export default function TenderManagementDashboard() {
  const [tenders, setTenders] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTender, setSelectedTender] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tenderData, catData, tplData] = await Promise.all([
        tendersApi.getTenders({ search, status: statusFilter, category: categoryFilter, sort_by: sortBy }),
        tendersApi.getCategories(),
        tendersApi.getTemplates(),
      ]);
      setTenders(tenderData.tenders || []);
      setMetrics(tenderData.metrics || {});
      setCategories(catData || []);
      setTemplates(tplData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, sortBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTransition = async (tenderId, newStatus) => {
    try {
      await tendersApi.transitionTender(tenderId, newStatus);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        style={{ marginBottom: '1.5rem' }}
      >
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.35rem' }} className="text-gradient">
          Tender Management
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '600px' }}>
          Create, publish, manage tenders through their full lifecycle with BOQ specifications and amendments.
        </p>
      </motion.div>

      {/* Metrics */}
      <MetricsBar metrics={metrics} />

      {/* Filters Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card"
        style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}
      >
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '0.6rem', color: 'var(--text-faint)' }} />
          <input
            type="text"
            placeholder="Search tenders by title, number, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.85rem 0.5rem 2.2rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none' }}
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.82rem', outline: 'none' }}>
          <option value="">All Statuses</option>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.82rem', outline: 'none' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.82rem', outline: 'none' }}>
          <option value="-created_at">Newest First</option>
          <option value="created_at">Oldest First</option>
          <option value="-estimated_cost">Highest Value</option>
          <option value="estimated_cost">Lowest Value</option>
          <option value="submission_deadline">Deadline (Soonest)</option>
          <option value="-submission_deadline">Deadline (Latest)</option>
        </select>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-action"
          onClick={() => setShowCreate(true)}
          style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
        >
          <Plus size={15} /> New Tender
        </motion.button>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--rose-surface)', border: '1px solid rgba(251,113,133,0.2)', color: 'var(--rose)', fontSize: '0.82rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Tender Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Tenders ({tenders.length})</h3>
          </div>
          {loading && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RotateCw size={12} className="animate-spin" /> Loading...
            </span>
          )}
        </div>

        <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Tender #</th>
                <th>Title & Info</th>
                <th>Est. Value</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Ver.</th>
                <th>Actions</th>
              </tr>
            </thead>
            <motion.tbody variants={staggerContainer} initial="initial" animate="animate">
              {tenders.map((t) => (
                <TenderRow
                  key={t.id}
                  tender={t}
                  onTransition={handleTransition}
                  onViewDetail={setSelectedTender}
                />
              ))}
              {!loading && tenders.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                    <FileText size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600 }}>No tenders found</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>Create your first tender to get started.</div>
                  </td>
                </tr>
              )}
            </motion.tbody>
          </table>
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateTenderModal
            onClose={() => setShowCreate(false)}
            onSuccess={() => { setShowCreate(false); fetchData(); }}
            categories={categories}
            templates={templates}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTender && (
          <TenderDetailModal
            tender={selectedTender}
            onClose={() => setSelectedTender(null)}
            onTransition={handleTransition}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
