import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { bidsApi } from '../../api/bidsApi';
import { tendersApi } from '../../api/tendersApi';

const STEPS = [
  'Tender Eligibility',
  'Bidder Information',
  'Technical Proposal',
  'Documents',
  'Financial Proposal',
  'Declarations',
  'Review',
  'Final Submission',
];

export default function BidSubmissionWizard({ tenderId, onBack }) {
  const [step, setStep] = useState(0);
  const [tender, setTender] = useState(null);
  const [bidId, setBidId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [techForm, setTechForm] = useState({
    methodology: '', technical_description: '', implementation_plan: '',
    delivery_plan: '', team_information: '', compliance_statement: '',
    equipment_details: '', quality_assurance: '',
  });
  const [finForm, setFinForm] = useState({
    currency: 'INR', total_amount: 0, tax_amount: 0,
    discount: 0, final_amount: 0, pricing_breakdown: {},
  });
  const [declarations, setDeclarations] = useState({
    confirmAccuracy: false,
    confirmFinal: false,
    noConflict: false,
  });
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const tenderRes = await tendersApi.getTenderDetail(tenderId);
        setTender(tenderRes.data);

        // Create bid if not exists
        try {
          const bidRes = await bidsApi.createBid(tenderId);
          setBidId(bidRes.data.id);
        } catch (err) {
          // Bid may already exist — try to find it
          const existingBids = await bidsApi.getBids({ tender: tenderId });
          if (existingBids.data && existingBids.data.length > 0) {
            setBidId(existingBids.data[0].id);
          } else {
            setError(err.message);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenderId]);

  const handleSaveTech = async () => {
    try {
      await bidsApi.saveTechnicalBid(bidId, techForm);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveFin = async () => {
    try {
      const total = parseFloat(finForm.total_amount) || 0;
      const tax = parseFloat(finForm.tax_amount) || 0;
      const disc = parseFloat(finForm.discount) || 0;
      finForm.final_amount = total + tax - disc;
      await bidsApi.saveFinancialBid(bidId, finForm);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await handleSaveTech();
      await handleSaveFin();
      const res = await bidsApi.submitBid(bidId);
      setSubmissionResult(res.data);
      setStep(7);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Setting up bid submission...
      </div>
    );
  }

  if (error && !bidId) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
        <button onClick={onBack} className="btn-action">← Back</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          ← Back
        </button>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '800' }}>📋 Bid Submission Wizard</h2>
        {tender && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {tender.title} • {tender.tender_number}
          </p>
        )}
      </div>

      {/* Step Indicator */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                flex: '0 0 auto', padding: '0.35rem 0.75rem', borderRadius: '9999px',
                fontSize: '0.7rem', fontWeight: '700', whiteSpace: 'nowrap',
                background: i < step ? '#10b981' : i === step ? 'var(--primary)' : 'rgba(148,163,184,0.15)',
                color: i <= step ? '#fff' : 'var(--text-muted)',
              }}
            >
              {i < step ? '✓ ' : ''}{s}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card" style={{ padding: '1.5rem' }}>
          
          {step === 0 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>✅ Step 1: Tender Eligibility</h3>
              {tender && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <strong>✓ Tender is open for bidding</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Budget: </span><strong>{tender.budget} {tender.currency}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Deadline: </span><strong>{tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleString() : 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Category: </span><strong>{tender.category_name || 'General'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Method: </span><strong>{tender.procurement_method}</strong></div>
                  </div>
                  {tender.eligibility_criteria && (
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem' }}>Eligibility Criteria:</div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{tender.eligibility_criteria}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>👤 Step 2: Bidder Information</h3>
              <div className="glass-card" style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <p style={{ fontSize: '0.9rem' }}>Bidder information is automatically populated from your vendor profile.</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Ensure your vendor profile is complete and all required documents are verified before submission.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>🔧 Step 3: Technical Proposal</h3>
              {Object.entries(techForm).map(([key, val]) => (
                <div key={key} style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                    {key.replace(/_/g, ' ')}
                  </label>
                  <textarea
                    value={val}
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
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>📄 Step 4: Documents</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Upload required bid documents. Supported formats: PDF, DOCX, XLSX, PNG, JPG.
              </p>
              <div style={{ padding: '2rem', border: '2px dashed var(--border-muted)', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Document upload will be available after initial bid creation.</p>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  You can manage documents from the bid detail page.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>💰 Step 5: Financial Proposal</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                🔒 Financial data is encrypted at rest and sealed until authorized opening.
              </p>
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
            </div>
          )}

          {step === 5 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>📜 Step 6: Declarations</h3>
              {[
                { key: 'confirmAccuracy', label: 'I confirm that the information provided in this bid is accurate and complete to the best of my knowledge.' },
                { key: 'confirmFinal', label: 'I confirm that this submission is final and supersedes all previous versions.' },
                { key: 'noConflict', label: 'I declare that there is no conflict of interest with any party involved in this procurement.' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-muted)', marginBottom: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={declarations[key]}
                    onChange={(e) => setDeclarations({ ...declarations, [key]: e.target.checked })}
                    style={{ marginTop: '2px' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>{label}</span>
                </label>
              ))}
            </div>
          )}

          {step === 6 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>🔍 Step 7: Review</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="glass-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tender</div>
                  <div style={{ fontWeight: '700' }}>{tender?.title}</div>
                </div>
                <div className="glass-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Technical Proposal</div>
                  <div style={{ fontSize: '0.85rem' }}>{techForm.methodology ? '✓ Completed' : '⚠ Missing methodology'}</div>
                </div>
                <div className="glass-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Financial Proposal</div>
                  <div style={{ fontSize: '0.85rem' }}>{finForm.total_amount > 0 ? `✓ ${finForm.currency} ${finForm.total_amount}` : '⚠ Not provided'}</div>
                </div>
                <div className="glass-card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Declarations</div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {Object.values(declarations).every(v => v) ? '✓ All confirmed' : '⚠ Missing confirmations'}
                  </div>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', fontSize: '0.85rem' }}>
                  ⚠ I confirm that the information provided is accurate and that this submission is final.
                </div>
              </div>
            </div>
          )}

          {step === 7 && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.5rem' }}>Bid Submitted Successfully!</h3>
              <div className="glass-card" style={{ padding: '1rem', maxWidth: '400px', margin: '1rem auto', textAlign: 'left' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Bid Reference: </span>
                  <strong style={{ fontFamily: 'monospace' }}>{submissionResult?.bid_reference || bidId}</strong>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status: </span>
                  <strong style={{ color: '#10b981' }}>SUBMITTED</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Submitted At: </span>
                  <strong>{new Date().toLocaleString()}</strong>
                </div>
              </div>
              <button onClick={onBack} className="btn-action" style={{ marginTop: '1rem' }}>
                View Bid Details
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      {step < 7 && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            style={{
              padding: '0.5rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-muted)',
              background: 'transparent', color: step === 0 ? 'var(--text-dim)' : 'var(--text-muted)',
              cursor: step === 0 ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
            }}
          >
            ← Previous
          </button>
          {step === 6 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !Object.values(declarations).every(v => v)}
              className="btn-action"
              style={{
                padding: '0.5rem 1.5rem', background: 'linear-gradient(135deg, #10b981, #059669)',
                opacity: (submitting || !Object.values(declarations).every(v => v)) ? 0.5 : 1,
              }}
            >
              {submitting ? 'Submitting...' : '🚀 Submit Bid'}
            </button>
          ) : (
            <button
              onClick={() => {
                if (step === 2) handleSaveTech();
                if (step === 4) handleSaveFin();
                setStep(Math.min(STEPS.length - 1, step + 1));
              }}
              className="btn-action"
            >
              Next →
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
