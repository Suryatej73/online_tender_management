import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { bidsApi } from '../../api/bidsApi';
import { tendersApi } from '../../api/tendersApi';

export default function BidOpeningPanel({ tenderId, onBack }) {
  const [tender, setTender] = useState(null);
  const [opening, setOpening] = useState(null);
  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState(tenderId);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionLog, setActionLog] = useState([]);

  const loadOpening = useCallback(async (tid) => {
    if (!tid) return;
    try {
      setLoading(true);
      const [openingRes, tenderRes] = await Promise.all([
        bidsApi.getOpeningStatus(tid),
        tendersApi.getTenderDetail(tid),
      ]);
      setOpening(openingRes.data);
      setTender(tenderRes.data);
    } catch (err) {
      console.error('Failed to load opening:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTender) loadOpening(selectedTender);
  }, [selectedTender, loadOpening]);

  useEffect(() => {
    if (!tenderId) {
      tendersApi.getTenders({ status: 'ACTIVE', limit: 20 }).then(res => setTenders(res.data || [])).catch(() => {});
    }
  }, [tenderId]);

  const handleAction = async (action) => {
    if (!selectedTender) return;
    const confirmMsg = {
      authorize_technical: 'Authorize technical bid opening?',
      open_technical: 'Open technical bids? This will reveal technical proposals to evaluators.',
      authorize_financial: 'Authorize financial bid opening? Only Super/Org Admin can do this.',
      open_financial: 'Open financial bids? This will reveal financial data to evaluators.',
    };
    if (!window.confirm(confirmMsg[action] || 'Execute this action?')) return;

    try {
      setActionLoading(true);
      const res = await bidsApi.executeOpeningAction(selectedTender, action, notes);
      setOpening(res.data);
      setActionLog(prev => [...prev, {
        action,
        timestamp: new Date().toLocaleString(),
        message: res.message,
      }]);
      setNotes('');
      loadOpening(selectedTender);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!tenderId && !selectedTender) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            ← Back to Bids
          </button>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>🔓 Bid Opening Control Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Select a tender to manage its bid opening workflow</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tenders.map((t) => (
            <motion.div
              key={t.id}
              whileHover={{ background: 'rgba(255,255,255,0.05)' }}
              onClick={() => setSelectedTender(t.id)}
              className="glass-card"
              style={{ padding: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontWeight: '700' }}>{t.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.tender_number}</div>
              </div>
              <span className="badge badge-success">{t.status}</span>
            </motion.div>
          ))}
          {tenders.length === 0 && (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No active tenders available.
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          ← Back to Bids
        </button>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>🔓 Bid Opening Control Center</h2>
        {tender && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {tender.title} • {tender.tender_number}
          </p>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : opening ? (
        <>
          {/* Status Overview */}
          <div className="grid-4">
            <motion.div className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid #60a5fa' }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0 }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bids Received</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#60a5fa' }}>{opening.total_bids_received}</div>
            </motion.div>
            <motion.div className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid #c084fc' }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Locked Bids</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#c084fc' }}>{opening.total_bids_locked}</div>
            </motion.div>
            <motion.div className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid #34d399' }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Integrity Passed</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#34d399' }}>{opening.integrity_checks_passed}</div>
            </motion.div>
            <motion.div className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid #ef4444' }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Integrity Failed</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444' }}>{opening.integrity_checks_failed}</div>
            </motion.div>
          </div>

          {/* Opening Stages */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1rem' }}>📋 Opening Workflow</h3>
            
            {/* Stage Indicator */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { key: 'NOT_STARTED', label: 'Not Started', color: '#94a3b8' },
                { key: 'TECHNICAL_AUTHORIZED', label: 'Tech Authorized', color: '#fbbf24' },
                { key: 'TECHNICAL_OPENED', label: 'Tech Opened', color: '#38bdf8' },
                { key: 'FINANCIAL_AUTHORIZED', label: 'Fin Authorized', color: '#fb923c' },
                { key: 'FINANCIAL_OPENED', label: 'Fin Opened', color: '#10b981' },
                { key: 'COMPLETED', label: 'Completed', color: '#818cf8' },
              ].map((s) => (
                <div key={s.key} style={{
                  padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700',
                  background: opening.stage === s.key ? s.color : 'rgba(148,163,184,0.1)',
                  color: opening.stage === s.key ? '#fff' : 'var(--text-muted)',
                  border: `1px solid ${opening.stage === s.key ? s.color : 'var(--border-muted)'}`,
                }}>
                  {opening.stage === s.key ? '● ' : ''}{s.label}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="glass-card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.75rem' }}>🔧 Technical Opening</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleAction('authorize_technical')}
                    disabled={actionLoading || opening.stage !== 'NOT_STARTED'}
                    className="btn-action"
                    style={{ padding: '0.5rem', fontSize: '0.8rem', opacity: (opening.stage !== 'NOT_STARTED') ? 0.5 : 1 }}
                  >
                    Authorize Technical Opening
                  </button>
                  <button
                    onClick={() => handleAction('open_technical')}
                    disabled={actionLoading || opening.stage !== 'TECHNICAL_AUTHORIZED'}
                    className="btn-action"
                    style={{ padding: '0.5rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', opacity: (opening.stage !== 'TECHNICAL_AUTHORIZED') ? 0.5 : 1 }}
                  >
                    Open Technical Bids
                  </button>
                  {opening.technical_opened_at && (
                    <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                      ✓ Opened at {new Date(opening.technical_opened_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.75rem' }}>💰 Financial Opening</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleAction('authorize_financial')}
                    disabled={actionLoading || opening.stage !== 'TECHNICAL_OPENED'}
                    className="btn-action"
                    style={{ padding: '0.5rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #f97316, #ea580c)', opacity: (opening.stage !== 'TECHNICAL_OPENED') ? 0.5 : 1 }}
                  >
                    Authorize Financial Opening
                  </button>
                  <button
                    onClick={() => handleAction('open_financial')}
                    disabled={actionLoading || opening.stage !== 'FINANCIAL_AUTHORIZED'}
                    className="btn-action"
                    style={{ padding: '0.5rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #059669)', opacity: (opening.stage !== 'FINANCIAL_AUTHORIZED') ? 0.5 : 1 }}
                  >
                    Open Financial Bids
                  </button>
                  {opening.financial_opened_at && (
                    <div style={{ fontSize: '0.75rem', color: '#fb923c' }}>
                      ✓ Opened at {new Date(opening.financial_opened_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginTop: '1rem' }}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opening notes / remarks..."
                rows={2}
                style={{
                  width: '100%', padding: '0.5rem', borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)',
                  color: '#fff', fontSize: '0.85rem', resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Action Log */}
          {actionLog.length > 0 && (
            <div className="glass-card" style={{ padding: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem' }}>📜 Session Log</h4>
              {actionLog.map((entry, i) => (
                <div key={i} style={{ fontSize: '0.8rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{entry.action}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{entry.message}</span>
                  <span style={{ color: 'var(--text-dim)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>{entry.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading opening status...
        </div>
      )}
    </motion.div>
  );
}
