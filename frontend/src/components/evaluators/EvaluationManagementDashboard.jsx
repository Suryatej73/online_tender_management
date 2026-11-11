import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, Gavel, FileText, CheckCircle2, AlertCircle, RefreshCw,
  Search, Eye, Filter, UserCheck, ShieldCheck, Clock, ArrowRight,
  Save, AlertTriangle, Building2, DollarSign, Lock, Unlock,
  ChevronDown, XCircle, FileCheck, Check, Paperclip
} from 'lucide-react';
import { tendersApi } from '../../api/tendersApi';
import { bidsApi } from '../../api/bidsApi';
import { useAuth } from '../../context/AuthContext';

function formatCurrency(amount) {
  const num = Number(amount || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `$${num.toLocaleString()}`;
}

export default function EvaluationManagementDashboard({ onNavigateToTender }) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('tenders'); // 'tenders', 'bids', 'awarded'
  const [tenders, setTenders] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Scoring form state mapped by bidId
  const [scores, setScores] = useState({});
  const [remarks, setRemarks] = useState({});
  const [expandedDocs, setExpandedDocs] = useState({});
  const toggleDocs = (bidId) => setExpandedDocs(prev => ({ ...prev, [bidId]: !prev[bidId] }));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tendersRes, bidsRes] = await Promise.all([
        tendersApi.getTenders().catch(() => ({ data: [] })),
        bidsApi.getBids({ limit: 100 }).catch(() => ({ data: [] }))
      ]);

      const tList = tendersRes?.data || [];
      const bList = bidsRes?.data || [];

      setTenders(tList);
      setBids(bList);

      const initialScores = {};
      const initialRemarks = {};
      bList.forEach(b => {
        if (b.technical_bid) {
          initialScores[b.id] = b.technical_bid.technical_score ?? '';
          initialRemarks[b.id] = b.technical_bid.evaluation_remarks ?? '';
        }
      });
      setScores(initialScores);
      setRemarks(initialRemarks);
    } catch (err) {
      setError(err.message || 'Failed to load evaluation governance data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleScoreBid = async (bidId, action = 'evaluate', customRemark = '') => {
    setError('');
    setActionLoading(true);
    try {
      const score = scores[bidId];
      const remark = customRemark || remarks[bidId] || '';
      const res = await bidsApi.evaluateBid(bidId, {
        technical_score: score ? parseFloat(score) : undefined,
        evaluation_remarks: remark,
        action
      });
      setSuccessMsg(res.message || (action === 'disqualify' ? 'Bid disqualified successfully.' : 'Evaluation recorded successfully!'));
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to process evaluation action.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAwardContract = async (bid) => {
    const vendorName = bid.vendor?.company_name || 'selected vendor';
    if (!window.confirm(`OFFICIAL CONTRACT AWARD: Confirm award to ${vendorName} for Tender ${bid.tender?.tender_number || bid.tender}?`)) {
      return;
    }
    setError('');
    setActionLoading(true);
    try {
      const res = await bidsApi.awardBid(bid.id, {
        notes: `Contract officially awarded to ${vendorName} based on evaluation board ranking.`
      });
      setSuccessMsg(res.message || `Contract successfully awarded to ${vendorName}!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      window.dispatchEvent(new Event('tenders:changed'));
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to award contract.');
    } finally {
      setActionLoading(false);
    }
  };

  const isTenderManager = ['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER'].includes(user?.role);
  const isAdmin = ['SUPER_ADMIN', 'ORG_ADMIN'].includes(user?.role);

  // Filtered collections
  const evaluationTenders = tenders.filter(t => ['EVALUATION', 'ACTIVE', 'PUBLISHED'].includes(t.status));
  const awardedTenders = tenders.filter(t => t.status === 'AWARDED');
  const evaluatedBids = bids.filter(b => b.technical_bid?.technical_score != null);

  const filteredBids = bids.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      b.bid_reference?.toLowerCase().includes(s) ||
      b.vendor?.company_name?.toLowerCase().includes(s) ||
      b.tender?.title?.toLowerCase().includes(s) ||
      b.tender?.tender_number?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Evaluation Board & Awards
            </span>
            <span className="text-xs text-slate-500">Governance Engine</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mt-1 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-400" />
            <span>Committee Evaluation & Contract Awarding</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate vendor technical dossiers, unseal commercial pricing, record committee ratings, and execute official contract awards.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading || actionLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Board</span>
        </button>
      </div>

      {/* Administrator Sovereign Oversight Banner */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-purple-900/20 border border-purple-500/30 text-purple-200">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <span className="text-xs font-bold block text-white">Administrator Integrity &amp; Compliance Oversight</span>
              <span className="text-[11px] text-purple-300/80">You have sovereign authority over the evaluation committee. You can audit scoring consistency, certify compliant evaluations, investigate irregularities, or reset contested submissions.</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Feedback Alerts */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 3. Evaluation KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tenders In Evaluation</p>
            <span className="text-2xl font-black text-purple-400 mt-1 block">
              {tenders.filter(t => t.status === 'EVALUATION').length}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">{evaluationTenders.length} active pipelines</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Gavel className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Proposals Received</p>
            <span className="text-2xl font-black text-white mt-1 block font-mono">
              {bids.length}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Dual-envelope submissions</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Evaluations Completed</p>
            <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">
              {evaluatedBids.length}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Scored by committee</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Contracts Awarded</p>
            <span className="text-2xl font-black text-amber-400 mt-1 block font-mono">
              {awardedTenders.length}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Finalized solicitations</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveSubTab('tenders')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'tenders'
              ? 'border-purple-500 text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-lg'
          }`}
        >
          <Gavel className="w-4 h-4 text-purple-400" />
          <span>Tenders in Evaluation ({evaluationTenders.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bids')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'bids'
              ? 'border-purple-500 text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-lg'
          }`}
        >
          <FileText className="w-4 h-4 text-sky-400" />
          <span>Proposals Scoring Queue ({bids.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('awarded')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'awarded'
              ? 'border-purple-500 text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-lg'
          }`}
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>Awarded Contracts ({awardedTenders.length})</span>
        </button>
      </div>

      {/* 5. Sub-Tab Content */}

      {/* SUB-TAB 1: TENDERS UNDER EVALUATION */}
      {activeSubTab === 'tenders' && (
        <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 className="text-sm font-extrabold text-white">Active Procurement Solicitations for Evaluation</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a tender to access its dual-envelope opening controls, decrypted submissions, and scoring matrix.
              </p>
            </div>
          </div>

          {evaluationTenders.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-white/5 space-y-2">
              <Gavel className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">No Tenders Currently in Evaluation</p>
              <p className="text-xs text-slate-400">
                Move an active tender to the EVALUATION state after its bidding deadline closes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {evaluationTenders.map(t => {
                const tenderBids = bids.filter(b => b.tender?.id === t.id || b.tender === t.id || b.tender_number === t.tender_number);
                const scoredBids = tenderBids.filter(b => b.technical_bid?.technical_score != null);

                return (
                  <div
                    key={t.id}
                    className="p-5 rounded-xl bg-[#0a0d16] border border-white/10 transition-all space-y-4 shadow-lg"
                  >
                    {/* Tender Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/20">
                            {t.tender_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            t.status === 'EVALUATION'
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {t.status}
                          </span>
                          <span className="text-xs text-slate-400">• {t.effective_org_name || 'Procurement Authority'}</span>
                        </div>
                        <h4 className="font-extrabold text-white text-base">{t.title}</h4>
                        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono pt-1">
                          <span>Budget: <strong className="text-white">${parseFloat(t.budget || 0).toLocaleString()}</strong></span>
                          <span>Total Proposals: <strong className="text-purple-400">{tenderBids.length}</strong></span>
                          <span>Scored by Evaluators: <strong className="text-emerald-400 font-bold">{scoredBids.length}</strong></span>
                          <span>Deadline: {t.submission_deadline ? new Date(t.submission_deadline).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSearch(t.tender_number || t.title);
                            setActiveSubTab('bids');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition"
                        >
                          <Gavel className="w-3.5 h-3.5" />
                          <span>Scoring Queue ({tenderBids.length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Evaluated Proposals & Direct Scoring Matrix */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-white flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-400" />
                          <span>Submitted Vendor Proposals & Committee Evaluation Scores</span>
                        </span>
                        {scoredBids.length > 0 && isTenderManager && (
                          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            ✓ Ready for Contract Award
                          </span>
                        )}
                      </div>

                      {tenderBids.length === 0 ? (
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-slate-400">
                          No vendor proposals have been submitted for this tender yet.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {tenderBids.map((b, bIdx) => {
                            const tech = b.technical_bid;
                            const fin = b.financial_bid;
                            const isAwarded = b.status === 'AWARDED';
                            const vendorName = b.vendor_name || b.vendor?.company_name || 'Vendor Entity';
                            const score = tech?.technical_score;

                            return (
                              <div
                                key={b.id || bIdx}
                                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                  isAwarded
                                    ? 'bg-emerald-950/25 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                                    : 'bg-[#060910] border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-orange-400 bg-white/5 px-2 py-0.5 rounded">
                                      {b.bid_reference}
                                    </span>
                                    <span className="font-extrabold text-white text-sm">
                                      {vendorName}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      isAwarded ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                      b.status === 'EVALUATED' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                      b.status === 'DISQUALIFIED' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                      'bg-white/5 text-slate-300'
                                    }`}>
                                      {b.status}
                                    </span>
                                  </div>

                                  {/* Evaluation Score Display */}
                                  <div className="flex items-center gap-3 flex-wrap pt-1">
                                    {score != null ? (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/25 text-purple-200 border border-purple-500/50 font-mono font-black text-xs shadow-sm">
                                          ⭐ Technical Score: {score} / 100
                                        </span>
                                        {tech.evaluation_remarks && (
                                          <span className="text-xs text-slate-200 italic font-medium">
                                            "{tech.evaluation_remarks}"
                                          </span>
                                        )}
                                      </div>
                                    ) : b.status === 'DISQUALIFIED' ? (
                                      <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                                        <XCircle className="w-3.5 h-3.5" /> Disqualified by Evaluation Committee
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-400 italic flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-purple-400" /> Under Evaluation (Awaiting Committee Score)
                                      </span>
                                    )}
                                  </div>

                                  {/* Financial pricing if unsealed */}
                                  {fin?.final_amount ? (
                                    <div className="text-xs text-slate-400 font-mono pt-0.5">
                                      Commercial Quote: <strong className="text-emerald-400 font-bold">${parseFloat(fin.final_amount).toLocaleString()} {fin.currency || 'INR'}</strong>
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-slate-500 font-mono pt-0.5">
                                      Commercial Quote: Sealed in escrow until final award
                                    </div>
                                  )}
                                </div>

                                {/* Award Actions for Tender Manager */}
                                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                  {isTenderManager && !isAwarded && b.status === 'EVALUATED' && (
                                    <button
                                      onClick={() => handleAwardContract(b)}
                                      disabled={actionLoading}
                                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 transition"
                                      title="Officially award procurement contract to this winning bidder"
                                    >
                                      <Award className="w-4 h-4" />
                                      <span>Award Contract</span>
                                    </button>
                                  )}

                                  {isAwarded && (
                                    <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-xs flex items-center gap-1.5 shadow-sm">
                                      <Award className="w-4 h-4" />
                                      <span>🏆 Contract Awarded</span>
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSearch(b.bid_reference || vendorName);
                                      setActiveSubTab('bids');
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Details</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PROPOSALS SCORING QUEUE */}
      {activeSubTab === 'bids' && (
        <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div>
              <h3 className="text-sm font-extrabold text-white">Proposal Scoring & Compliance Queue</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Grade technical proposals, inspect unsealed quotes, and award contracts to winning bidders.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search proposals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#07090e] border border-white/10 rounded-xl text-white text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {filteredBids.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-white/5 space-y-2">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">No Submitted Proposals Found</p>
              <p className="text-xs text-slate-400">Vendor bids will populate here once submitted.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBids.map((b) => {
                const tech = b.technical_bid;
                const fin = b.financial_bid;
                const isAwarded = b.status === 'AWARDED';

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isAwarded
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-orange-400 bg-white/5 px-2 py-0.5 rounded">
                            {b.bid_reference}
                          </span>
                          <span className="font-bold text-white text-sm">
                            {b.vendor_name || b.vendor?.company_name || 'Vendor Entity'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isAwarded ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-300'
                          }`}>
                            {b.status}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 mt-1 block">
                          Tender: <strong className="text-white">{b.tender_title || b.tender?.title || b.tender_number || b.tender}</strong>
                        </span>
                      </div>

                      {isTenderManager && !isAwarded && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAwardContract(b)}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Award Contract</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Proposal Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3 text-xs">
                      <div className="p-3 rounded-lg bg-white/5 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-sky-400 block">Technical Summary</span>
                        <p className="text-slate-300 line-clamp-2">{tech?.methodology || 'Technical proposal submitted.'}</p>
                        <div className="flex justify-between pt-1 border-t border-white/5 font-mono">
                          <span className="text-slate-400">Current Score:</span>
                          <strong className="text-white">{tech?.technical_score != null ? `${tech.technical_score} / 100` : 'Not Scored'}</strong>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white/5 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-emerald-400 block">Commercial Bid</span>
                        {fin?.final_amount ? (
                          <div className="space-y-0.5 font-mono">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Total Amount:</span>
                              <span className="text-white">${parseFloat(fin.final_amount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Status:</span>
                              <span className="text-emerald-400 font-bold">Unsealed & Verified</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 py-1">
                            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Financial proposal sealed under dual-envelope encryption.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Documentation & Proposal Inspection Toggle */}
                    <div className="mt-2 flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => toggleDocs(b.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
                      >
                        <FileText className="w-3.5 h-3.5 text-orange-400" />
                        <span>{expandedDocs[b.id] ? 'Hide Proposal Dossier' : 'Inspect Submitted Documents & Dossier'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedDocs[b.id] ? 'rotate-180' : ''}`} />
                      </button>

                      {b.status === 'DISQUALIFIED' ? (
                        <span className="text-[10px] font-bold text-red-400 px-2.5 py-1 rounded bg-red-500/10 border border-red-500/30">
                          DECLINED / DISQUALIFIED
                        </span>
                      ) : b.status === 'EVALUATED' ? (
                        <span className="text-[10px] font-bold text-purple-400 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/30">
                          SCORED & EVALUATED
                        </span>
                      ) : null}
                    </div>

                    {/* Expandable Proposal Dossier & Verification Panel */}
                    {expandedDocs[b.id] && (
                      <div className="mt-3 p-3.5 rounded-xl bg-[#07090e] border border-white/10 space-y-3 text-xs animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Delivery Schedule:</span>
                            <p className="text-white font-mono bg-white/5 p-2 rounded-lg">{tech?.delivery_plan || '180 Calendar Days'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Compliance Confirmation:</span>
                            <p className="text-white bg-white/5 p-2 rounded-lg">{tech?.compliance_statement || 'Affirmed complete compliance with tender specifications and BOQ items.'}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Technical Execution Methodology:</span>
                          <p className="text-slate-300 bg-white/5 p-2.5 rounded-lg leading-relaxed whitespace-pre-wrap">{tech?.methodology || 'Conforming technical proposal submitted.'}</p>
                        </div>

                        {/* Attached Bid Proposal Documents */}
                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                          <span className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            Submitted Proposal Documents &amp; Certificates ({b.documents?.length || 0})
                          </span>
                          {b.documents && b.documents.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                              {b.documents.map((doc, idx) => (
                                <div key={doc.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/10">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="font-semibold text-white truncate text-[11px]">{doc.title || doc.file_name || `Attachment_${idx+1}`}</p>
                                      <p className="text-[9px] text-slate-400 uppercase font-mono">{doc.document_type || 'PROPOSAL_ATTACHMENT'}</p>
                                    </div>
                                  </div>
                                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                                    VERIFIED
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-500 italic text-[11px] bg-white/[0.02] p-2 rounded">
                              Standard technical dossier verified & registered via TenderX dual-envelope portal.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Scoring & Evaluator Action Controls */}
                    <div className="pt-2 flex flex-col sm:flex-row items-end gap-2 text-xs">
                      <div className="w-full sm:w-36">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Score (0-100)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={scores[b.id] ?? ''}
                          onChange={(e) => setScores({ ...scores, [b.id]: e.target.value })}
                          placeholder="Score"
                          className="w-full px-2.5 py-1.5 bg-[#07090e] border border-white/10 rounded-lg text-white font-mono"
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Evaluator Remarks</label>
                        <input
                          type="text"
                          value={remarks[b.id] ?? ''}
                          onChange={(e) => setRemarks({ ...remarks, [b.id]: e.target.value })}
                          placeholder="Enter compliance justification or non-conformance notes..."
                          className="w-full px-2.5 py-1.5 bg-[#07090e] border border-white/10 rounded-lg text-white"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleScoreBid(b.id, 'evaluate')}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-1"
                          title="Save evaluation score and compliance comments"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Score</span>
                        </button>

                        {/* Evaluator Disqualify / Decline Wrong Bid Action */}
                        <button
                          type="button"
                          onClick={() => {
                            const currentRemark = remarks[b.id];
                            const reason = window.prompt(
                              `Decline / Disqualify Bid ${b.bid_reference}? Enter rejection reason (e.g. Non-compliant technical parameters, missing mandatory certifications):`,
                              currentRemark || 'Proposal failed mandatory technical requirements.'
                            );
                            if (reason !== null && reason.trim()) {
                              handleScoreBid(b.id, 'disqualify', reason.trim());
                            }
                          }}
                          disabled={actionLoading || b.status === 'DISQUALIFIED'}
                          className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                            b.status === 'DISQUALIFIED'
                              ? 'bg-red-500/10 text-red-400/50 border border-red-500/20 cursor-not-allowed'
                              : 'bg-red-600/20 hover:bg-red-600/35 text-red-300 border border-red-500/30'
                          }`}
                          title="Decline / Disqualify non-compliant or erroneous bid"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{b.status === 'DISQUALIFIED' ? 'Disqualified' : 'Decline Bid'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Admin Audit Stamp if certified */}
                    {tech?.evaluation_remarks?.includes('[ADMIN AUDIT PASSED') && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Legally Certified &amp; Audited by Platform Administrator</span>
                      </div>
                    )}

                    {/* Administrator Audit & Oversight Controls */}
                    {isAdmin && (
                      <div className="mt-3 pt-3 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-2 bg-purple-950/20 p-2.5 rounded-lg">
                        <div className="flex items-center gap-1.5 text-[11px] text-purple-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                          <span className="font-bold">Admin Governance Actions:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => handleScoreBid(b.id, 'audit_certify')}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] transition flex items-center gap-1"
                            title="Certify evaluation compliance"
                          >
                            <span>🛡️ Certify Audit</span>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Disqualify bid ${b.bid_reference} for non-compliance or irregularity?`)) {
                                handleScoreBid(b.id, 'disqualify');
                              }
                            }}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-md bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 font-bold text-[10px] transition flex items-center gap-1"
                            title="Disqualify for non-compliance"
                          >
                            <span>⚠️ Disqualify</span>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Reset evaluation for ${b.bid_reference}? The score will be cleared and returned to the scoring queue.`)) {
                                handleScoreBid(b.id, 'reset_evaluation');
                              }
                            }}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-md bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 font-bold text-[10px] transition flex items-center gap-1"
                            title="Reset evaluation for re-scoring"
                          >
                            <span>🔄 Reset Score</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: AWARDED CONTRACTS */}
      {activeSubTab === 'awarded' && (
        <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 className="text-sm font-extrabold text-white">Officially Awarded Procurement Contracts</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Archived records of finalized contract awards, winning vendors, and agreed contract values.
              </p>
            </div>
          </div>

          {awardedTenders.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-white/5 space-y-2">
              <Award className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">No Finalized Contract Awards Yet</p>
              <p className="text-xs text-slate-400">
                Awarded contracts will appear here once the evaluation committee confirms a winning bidder.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[10px] uppercase font-mono font-bold text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="pb-3 pl-2">Tender Solicitation</th>
                    <th className="pb-3">Awarded Vendor</th>
                    <th className="pb-3">Contract Value</th>
                    <th className="pb-3">Award Date</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {awardedTenders.map(t => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 pl-2">
                        <span className="font-mono text-orange-400 font-bold block">{t.tender_number}</span>
                        <span className="font-bold text-white">{t.title}</span>
                      </td>
                      <td className="py-3.5 font-bold text-emerald-400">
                        {t.awarded_vendor_name || 'Selected Contractor'}
                      </td>
                      <td className="py-3.5 font-mono font-bold text-white">
                        ${parseFloat(t.budget || 0).toLocaleString()} {t.currency || 'USD'}
                      </td>
                      <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                        {t.award_date ? new Date(t.award_date).toLocaleDateString() : 'Finalized'}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <button
                          onClick={() => onNavigateToTender ? onNavigateToTender(t.id) : null}
                          className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 hover:text-orange-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
