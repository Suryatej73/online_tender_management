import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { bidsApi } from '../../api/bidsApi';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  DRAFT: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  SUBMITTED: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  LOCKED: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  TECHNICAL_OPENED: { bg: 'rgba(14,165,233,0.15)', color: '#38bdf8' },
  FINANCIAL_OPENED: { bg: 'rgba(251,146,60,0.15)', color: '#fb923c' },
  AWARDED: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  REJECTED: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  WITHDRAWN: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
};

function SectionCard({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '1rem 1.25rem', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', color: '#fff',
          cursor: 'pointer', fontSize: '0.95rem', fontWeight: '700',
        }}
      >
        <span>{icon} {title}</span>
        <span style={{ fontSize: '1.2rem', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border-muted)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BidDetailPage({ bidId, onBack }) {
  const { user } = useAuth();
  const [bid, setBid] = useState(null);
  const [techBid, setTechBid] = useState(null);
  const [financialBid, setFinancialBid] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [versions, setVersions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [integrity, setIntegrity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTechForm, setShowTechForm] = useState(false);
  const [showFinForm, setShowFinForm] = useState(false);

  // Forms
  const [techForm, setTechForm] = useState({
    methodology: '', technical_description: '', implementation_plan: '',
    delivery_plan: '', team_information: '', compliance_statement: '',
    equipment_details: '', quality_assurance: '',
  });
  const [finForm, setFinForm] = useState({
    currency: 'INR', total_amount: 0, tax_amount: 0,
    discount: 0, final_amount: 0, pricing_breakdown: {},
  });
  const [amendReason, setAmendReason] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');

  const loadBid = useCallback(async () => {
    try {
      setLoading(true);
      const [bidRes, versionsRes] = await Promise.all([
        bidsApi.getBidDetail(bidId),
        bidsApi.getBidVersions(bidId),
      ]);
      const bidData = bidRes.data;
      setBid(bidData);
      setVersions(versionsRes.data || []);

      if (bidData.technical_bid) {
        setTechBid(bidData.technical_bid);
        setTechForm(bidData.technical_bid);
      }
      if (bidData.documents) setDocuments(bidData.documents);

      // Load financial bid
      try {
        const finRes = await bidsApi.getFinancialBid(bidId);
        if (finRes.data && finRes.data.status !== 'SEALED') {
          setFinancialBid(finRes.data);
          setFinForm(finRes.data);
        } else {
          setFinancialBid({ status: 'SEALED' });
        }
      } catch {
        setFinancialBid({ status: 'NOT_SUBMITTED' });
      }

      // Load integrity
      try {
        const intRes = await bidsApi.getIntegrityStatus(bidId);
        setIntegrity(intRes.data);
      } catch {}

      // Load audit logs
      try {
        const logRes = await bidsApi.getBidAuditLogs(bidId);
        setAuditLogs(logRes.data || []);
      } catch {}
    } catch (err) {
      console.error('Failed to load bid:', err);
    } finally {
      setLoading(false);
    }
  }, [bidId]);

  useEffect(() => { loadBid(); }, [loadBid]);

  const handleSaveTech = async () => {
    try {
      await bidsApi.saveTechnicalBid(bidId, techForm);
      setShowTechForm(false);
      loadBid();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveFin = async () => {
    try {
      const total = parseFloat(finForm.total_amount) || 0;
      const tax = parseFloat(finForm.tax_amount) || 0;
      const disc = parseFloat(finForm.discount) || 0;
      finForm.final_amount = total + tax - disc;
      await bidsApi.saveFinancialBid(bidId, finForm);
      setShowFinForm(false);
      loadBid();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmitBid = async () => {
    if (!window.confirm('I confirm that the information provided is accurate and this submission is final.')) return;
    try {
      await bidsApi.submitBid(bidId);
      loadBid();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAmend = async () => {
    if (!amendReason.trim()) return alert('Reason required');
    try {
      await bidsApi.createAmendment(bidId, { reason: amendReason });
      setShowAmendModal(false);
      setAmendReason('');
      loadBid();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawReason.trim()) return alert('Reason required');
    try {
      await bidsApi.withdrawBid(bidId, withdrawReason);
      setShowWithdrawModal(false);
      setWithdrawReason('');
      loadBid();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading || !bid) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Loading bid details...
      </div>
    );
  }

  const sc = STATUS_COLORS[bid.status] || STATUS_COLORS.DRAFT;
  const isFinancialSealed = financialBid?.status === 'SEALED' || !financialBid;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            ← Back to Bids
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'monospace' }}>{bid.bid_reference}</h2>
            <span style={{
              padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem',
              fontWeight: '700', background: sc.bg, color: sc.color,
            }}>
              {bid.status_display || bid.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {bid.tender_title} • {bid.tender_number} • v{bid.current_version}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {bid.is_modifiable && (
            <button onClick={() => setShowTechForm(true)} className="btn-action" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
              ✏️ Edit Technical
            </button>
          )}
          {bid.is_modifiable && (
            <button onClick={() => setShowFinForm(true)} className="btn-action" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
              💰 Edit Financial
            </button>
          )}
          {bid.status === 'DRAFT' && (
            <button onClick={handleSubmitBid} className="btn-action" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              🚀 Submit Bid
            </button>
          )}
          {bid.is_modifiable && (
            <button onClick={() => setShowAmendModal(true)} className="btn-action" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              📝 Amend
            </button>
          )}
          {bid.can_withdraw && (
            <button onClick={() => setShowWithdrawModal(true)} className="btn-action" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              🚫 Withdraw
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-muted)', paddingBottom: '0.5rem' }}>
        {['overview', 'technical', 'financial', 'documents', 'versions', 'timeline', 'audit'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem',
              fontWeight: '700', textTransform: 'capitalize',
              background: activeTab === tab ? 'var(--primary)' : 'transparent',
              border: 'none', color: activeTab === tab ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-3">
              <div className="glass-card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Bidder</div>
                <div style={{ fontWeight: '700' }}>{bid.vendor_company}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{bid.vendor_name}</div>
              </div>
              <div className="glass-card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Submitted</div>
                <div style={{ fontWeight: '700' }}>
                  {bid.submitted_at ? new Date(bid.submitted_at).toLocaleString() : 'Not yet submitted'}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Integrity</div>
                <div style={{ fontWeight: '700', color: integrity?.status === 'VERIFIED' ? '#10b981' : integrity?.status === 'FAILURE' ? '#ef4444' : '#fbbf24' }}>
                  {integrity?.status || 'Pending'}
                </div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Bid Notes</div>
              <p style={{ fontSize: '0.9rem' }}>{bid.notes || 'No notes added.'}</p>
            </div>
          </motion.div>
        )}

        {activeTab === 'technical' && (
          <motion.div key="tech" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {techBid ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {['methodology', 'technical_description', 'implementation_plan', 'delivery_plan', 'team_information', 'compliance_statement'].map((field) => (
                  <div key={field} className="glass-card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                      {field.replace(/_/g, ' ')}
                    </div>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>{techBid[field] || 'Not provided'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>No technical proposal submitted yet.</p>
                {bid.is_modifiable && (
                  <button onClick={() => setShowTechForm(true)} className="btn-action" style={{ marginTop: '1rem' }}>
                    Add Technical Proposal
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'financial' && (
          <motion.div key="fin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {isFinancialSealed ? (
              <div className="glass-card" style={{
                padding: '2rem', textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.08))',
                border: '2px dashed rgba(168,85,247,0.3)',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#c084fc', marginBottom: '0.5rem' }}>
                  SEALED — Financial Proposal Confidential
                </h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                  Financial details will be available only after authorized financial opening by the bid opening committee.
                </p>
                {bid.is_modifiable && (
                  <button onClick={() => setShowFinForm(true)} className="btn-action" style={{ marginTop: '1rem' }}>
                    💰 Add Financial Proposal
                  </button>
                )}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1rem' }}>💰 Financial Proposal</h3>
                <div className="grid-2">
                  <div><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Currency: </span><strong>{financialBid.currency}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Amount: </span><strong>{financialBid.total_amount}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tax: </span><strong>{financialBid.tax_amount}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Discount: </span><strong>{financialBid.discount}</strong></div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Final Amount: </span>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--emerald)' }}>{financialBid.final_amount}</strong>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'documents' && (
          <motion.div key="docs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {documents.map((doc) => (
                <div key={doc.id} className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📄</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{doc.original_filename}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.document_type_display}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '700',
                      background: doc.verification_status === 'VERIFIED' ? 'rgba(16,185,129,0.15)' :
                                  doc.verification_status === 'REJECTED' ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.15)',
                      color: doc.verification_status === 'VERIFIED' ? '#34d399' :
                             doc.verification_status === 'REJECTED' ? '#ef4444' : '#94a3b8',
                    }}>
                      {doc.verification_status_display}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                    </span>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No documents uploaded yet.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'versions' && (
          <motion.div key="versions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {versions.map((v) => (
                <div key={v.id} className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontFamily: 'monospace' }}>v{v.version_number}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.change_summary}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.change_type}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{new Date(v.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
              {versions.length === 0 && (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No version history yet.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'timeline' && (
          <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {(bid.timeline || []).map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px' }}>
                      <div style={{
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: step.completed ? '#10b981' : i === (bid.timeline || []).findIndex(s => !s.completed) ? '#fbbf24' : 'rgba(148,163,184,0.3)',
                        border: step.completed ? 'none' : '2px solid rgba(148,163,184,0.5)',
                      }} />
                      {i < (bid.timeline || []).length - 1 && (
                        <div style={{ width: '2px', height: '24px', background: step.completed ? '#10b981' : 'rgba(148,163,184,0.2)' }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: '1rem' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', color: step.completed ? '#fff' : 'var(--text-muted)' }}>
                        {step.completed ? '✓' : step.timestamp ? '●' : '○'} {step.step}
                      </div>
                      {step.timestamp && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {new Date(step.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {auditLogs.map((log) => (
                <div key={log.id} className="glass-card" style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--primary)' }}>{log.action}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>by {log.actor_display}</span>
                  </div>
                  <div style={{ color: 'var(--text-dim)' }}>{new Date(log.timestamp).toLocaleString()}</div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No audit records yet.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tech Form Modal */}
      <AnimatePresence>
        {showTechForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowTechForm(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="glass-card"
              style={{ padding: '1.5rem', width: '90%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto' }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>✏️ Technical Proposal</h3>
              {Object.entries(techForm).map(([key, val]) => (
                <div key={key} style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                    {key.replace(/_/g, ' ')}
                  </label>
                  <textarea
                    value={val || ''}
                    onChange={(e) => setTechForm({ ...techForm, [key]: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%', padding: '0.5rem', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)',
                      color: '#fff', fontSize: '0.85rem', resize: 'vertical',
                    }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={handleSaveTech} className="btn-action" style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  Save Technical Proposal
                </button>
                <button onClick={() => setShowTechForm(false)} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-muted)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Financial Form Modal */}
      <AnimatePresence>
        {showFinForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowFinForm(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="glass-card"
              style={{ padding: '1.5rem', width: '90%', maxWidth: '500px' }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>💰 Financial Proposal</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {['currency', 'total_amount', 'tax_amount', 'discount', 'final_amount'].map((field) => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                      {field.replace(/_/g, ' ')}
                    </label>
                    <input
                      type={field === 'currency' ? 'text' : 'number'}
                      value={finForm[field] || ''}
                      onChange={(e) => setFinForm({ ...finForm, [field]: e.target.value })}
                      style={{
                        width: '100%', padding: '0.5rem', borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)',
                        color: '#fff', fontSize: '0.85rem',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={handleSaveFin} className="btn-action" style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  Save Financial Proposal
                </button>
                <button onClick={() => setShowFinForm(false)} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-muted)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Amendment Modal */}
      <AnimatePresence>
        {showAmendModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAmendModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="glass-card"
              style={{ padding: '1.5rem', width: '90%', maxWidth: '500px' }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem' }}>📝 Amend Bid</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Current Version: v{bid.current_version} → This amendment will create v{(bid.current_version || 1) + 1}
              </p>
              <textarea
                value={amendReason}
                onChange={(e) => setAmendReason(e.target.value)}
                placeholder="Reason for amendment..."
                rows={4}
                style={{
                  width: '100%', padding: '0.5rem', borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)',
                  color: '#fff', fontSize: '0.85rem', resize: 'vertical', marginBottom: '1rem',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleAmend} className="btn-action" style={{ flex: 1, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  Submit Amendment
                </button>
                <button onClick={() => setShowAmendModal(false)} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-muted)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowWithdrawModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="glass-card"
              style={{ padding: '1.5rem', width: '90%', maxWidth: '500px', borderLeft: '3px solid #ef4444' }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem', color: '#ef4444' }}>🚫 Withdraw Bid</h3>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <strong>Bid Reference:</strong> {bid.bid_reference}<br />
                <strong>Tender:</strong> {bid.tender_title}<br />
                <strong>Status:</strong> {bid.status_display}
              </div>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="Reason for withdrawal..."
                rows={3}
                style={{
                  width: '100%', padding: '0.5rem', borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)',
                  color: '#fff', fontSize: '0.85rem', resize: 'vertical', marginBottom: '1rem',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleWithdraw} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Withdraw Bid
                </button>
                <button onClick={() => setShowWithdrawModal(false)} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-muted)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
