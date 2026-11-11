import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, FileText, CheckCircle2, AlertCircle, Clock, Gavel, Award,
  X, Save, History, FileCheck, Layers, ChevronRight, Calendar, DollarSign,
  Building, RefreshCw, Eye, Edit, Trash2, FilePlus, Send, ShieldCheck,
  Lock, Unlock, UserCheck, AlertTriangle, Mail
} from 'lucide-react';
import { tendersApi } from '../../api/tendersApi';
import { bidsApi } from '../../api/bidsApi';
import { useAuth } from '../../context/AuthContext';

export default function TenderDetailManagerView({ tenderId, onBack, onNavigateToBid }) {
  const { user } = useAuth();
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [openingStatus, setOpeningStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('evaluation'); // 'evaluation', 'overview', 'amendments'

  // Modals & Action States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [amendmentModalOpen, setAmendmentModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Scoring form state mapped by bidId
  const [evaluationScores, setEvaluationScores] = useState({});
  const [evaluationRemarks, setEvaluationRemarks] = useState({});

  // Edit Tender Form Data
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    submission_deadline: '',
    opening_date: '',
    eligibility_criteria: '',
    technical_requirements: '',
    financial_requirements: '',
    version: 1
  });

  // Amendment Form Data
  const [amendmentData, setAmendmentData] = useState({
    title: '',
    reason: '',
    description: ''
  });

  const loadTenderData = useCallback(async () => {
    if (!tenderId) return;
    setLoading(true);
    setError('');
    try {
      const [tenderRes, bidsRes, openingRes] = await Promise.all([
        tendersApi.getTenderDetail(tenderId),
        bidsApi.getBids({ tender: tenderId }).catch(() => ({ data: [] })),
        bidsApi.getOpeningStatus(tenderId).catch(() => ({ data: null })),
      ]);

      const tData = tenderRes?.data;
      setTender(tData);
      const bList = bidsRes?.data || [];
      setBids(bList);
      setOpeningStatus(openingRes?.data || null);

      // Pre-fill existing evaluation scores
      const initialScores = {};
      const initialRemarks = {};
      bList.forEach(b => {
        if (b.technical_bid) {
          initialScores[b.id] = b.technical_bid.technical_score ?? '';
          initialRemarks[b.id] = b.technical_bid.evaluation_remarks ?? '';
        }
      });
      setEvaluationScores(initialScores);
      setEvaluationRemarks(initialRemarks);

      if (tData) {
        setEditFormData({
          title: tData.title || '',
          description: tData.description || '',
          category: tData.category?.id || tData.category || '',
          budget: tData.budget || '',
          submission_deadline: tData.submission_deadline ? tData.submission_deadline.substring(0, 16) : '',
          opening_date: tData.opening_date ? tData.opening_date.substring(0, 16) : '',
          eligibility_criteria: tData.eligibility_criteria || '',
          technical_requirements: tData.technical_requirements || '',
          financial_requirements: tData.financial_requirements || '',
          version: tData.version || 1
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load tender details.');
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    loadTenderData();
  }, [loadTenderData]);

  const handleTransition = async (targetStatus, reason) => {
    setError('');
    setActionLoading(true);
    try {
      const res = await tendersApi.transitionTender(tender.id, targetStatus, reason);
      setSuccessMsg(res.message || `Tender status transitioned to ${targetStatus}`);
      window.dispatchEvent(new Event('tenders:changed'));
      await loadTenderData();
    } catch (err) {
      setError(err.message || 'Lifecycle transition failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteOpening = async (action) => {
    if (!window.confirm(`Are you sure you want to execute '${action}'?`)) return;
    setError('');
    setActionLoading(true);
    try {
      const res = await bidsApi.executeOpeningAction(tender.id, action);
      setSuccessMsg(res.message || `Opening action '${action}' completed successfully.`);
      await loadTenderData();
    } catch (err) {
      setError(err.message || `Failed to execute ${action}.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleScoreBid = async (bidId, action = 'evaluate') => {
    setError('');
    setActionLoading(true);
    try {
      const score = evaluationScores[bidId];
      const remarks = evaluationRemarks[bidId];
      const res = await bidsApi.evaluateBid(bidId, {
        technical_score: score,
        evaluation_remarks: remarks,
        action
      });
      setSuccessMsg(res.message || 'Bid evaluation saved.');
      await loadTenderData();
    } catch (err) {
      setError(err.message || 'Failed to evaluate bid.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAwardContract = async (bid) => {
    const vendorName = bid.vendor?.company_name || 'this vendor';
    if (!window.confirm(`CONFIRM CONTRACT AWARD: Are you sure you want to award this contract to ${vendorName} for Tender ${tender.tender_number}? This will finalize the evaluation.`)) {
      return;
    }
    setError('');
    setActionLoading(true);
    try {
      const res = await bidsApi.awardBid(bid.id, {
        notes: `Contract officially awarded to ${vendorName} based on evaluation score.`
      });
      setSuccessMsg(res.message || `Contract successfully awarded to ${vendorName}!`);
      window.dispatchEvent(new Event('tenders:changed'));
      await loadTenderData();
    } catch (err) {
      setError(err.message || 'Failed to award contract.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTender = async (e) => {
    e.preventDefault();
    setError('');
    setActionLoading(true);
    try {
      const res = await tendersApi.updateTender(tender.id, editFormData);
      setSuccessMsg(res.message || 'Tender updated successfully');
      setEditModalOpen(false);
      window.dispatchEvent(new Event('tenders:changed'));
      await loadTenderData();
    } catch (err) {
      setError(err.message || 'Failed to update tender.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTender = async () => {
    if (!window.confirm(`Permanently delete draft tender ${tender.tender_number}?`)) return;
    setError('');
    setActionLoading(true);
    try {
      await tendersApi.deleteTender(tender.id);
      window.dispatchEvent(new Event('tenders:changed'));
      onBack();
    } catch (err) {
      setError(err.message || 'Failed to delete tender.');
      setActionLoading(false);
    }
  };

  const handleCreateAmendment = async (e) => {
    e.preventDefault();
    setError('');
    setActionLoading(true);
    try {
      const res = await tendersApi.createAmendment(tender.id, amendmentData);
      await tendersApi.publishAmendment(tender.id, res.data.id);
      setSuccessMsg(`Amendment #${res.data.amendment_number} published! Tender version incremented.`);
      setAmendmentModalOpen(false);
      setAmendmentData({ title: '', reason: '', description: '' });
      window.dispatchEvent(new Event('tenders:changed'));
      await loadTenderData();
    } catch (err) {
      setError(err.message || 'Failed to publish amendment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendBidsSummaryEmail = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await tendersApi.sendBidsSummaryEmail(tender.id);
      setSuccessMsg(res.message || `Summary email dispatched to Tender Manager (${bids.length} bids recorded).`);
    } catch (err) {
      setError(err.message || 'Failed to dispatch summary email.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'PUBLISHED': return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
      case 'ACTIVE': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'EVALUATION': return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      case 'AWARDED': return 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40';
      case 'CLOSED': return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
      case 'CANCELLED': return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      default: return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-orange-400" />
        <span className="text-sm font-semibold">Loading tender management workspace...</span>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="p-8 text-center bg-[#0e131f] rounded-2xl border border-white/10 space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Tender Not Found</h3>
        <p className="text-xs text-slate-400">The requested procurement tender does not exist or has been deleted.</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tenders Directory</span>
        </button>
      </div>
    );
  }

  const isTenderManager = ['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER'].includes(user?.role);
  const isEvaluator = ['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER', 'EVALUATOR'].includes(user?.role);

  return (
    <div className="space-y-6">
      
      {/* 1. TOP BREADCRUMB & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-orange-400 transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Tenders</span>
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-extrabold text-orange-400 bg-orange-500/10 border border-orange-500/25 px-2.5 py-0.5 rounded-lg">
              {tender.tender_number}
            </span>
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${getStatusBadge(tender.status)}`}>
              {tender.status}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-white/5 border border-white/10 text-slate-300">
              v{tender.version}
            </span>
            <span className="text-xs text-slate-400">• {tender.effective_org_name || 'General Procurement'}</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mt-1.5 tracking-tight">
            {tender.title}
          </h2>
        </div>

        {/* Quick Lifecycle Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {tender.status === 'DRAFT' && isTenderManager && (
            <>
              <button
                onClick={() => handleTransition('PUBLISHED', 'Published by Tender Manager')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Tender</span>
              </button>
              <button
                onClick={() => setEditModalOpen(true)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition disabled:opacity-50"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleDeleteTender}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}

          {tender.status === 'PUBLISHED' && isTenderManager && (
            <>
              <button
                onClick={() => handleTransition('ACTIVE', 'Tender bidding launched')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Set ACTIVE Bidding</span>
              </button>
              <button
                onClick={() => setAmendmentModalOpen(true)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition disabled:opacity-50"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>Issue Amendment</span>
              </button>
            </>
          )}

          {tender.status === 'ACTIVE' && isTenderManager && (
            <>
              <button
                onClick={() => handleTransition('EVALUATION', 'Submission window closed; moved to committee evaluation')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition disabled:opacity-50"
              >
                <Gavel className="w-3.5 h-3.5" />
                <span>Move to EVALUATION</span>
              </button>
              <button
                onClick={() => setAmendmentModalOpen(true)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition disabled:opacity-50"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>Issue Amendment</span>
              </button>
            </>
          )}

          {tender.status === 'EVALUATION' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span>Under Evaluation</span>
              </span>
              {tender.top_evaluation_score && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/30">
                  ⭐ Scored: {tender.top_evaluation_score.score} / 100 ({tender.top_evaluation_score.vendor_name}) — Ready to Award
                </span>
              )}
            </div>
          )}

          {isTenderManager && bids.length > 0 && (
            <button
              onClick={handleSendBidsSummaryEmail}
              disabled={actionLoading}
              title="Dispatch consolidated bids summary email for this tender"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-bold transition disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Bids Summary ({bids.length})</span>
            </button>
          )}

          {tender.status === 'AWARDED' && isTenderManager && (
            <button
              onClick={() => handleTransition('CLOSED', 'Procurement fulfilled and contract closed')}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition disabled:opacity-50"
            >
              <span>Close Tender</span>
            </button>
          )}

          {['PUBLISHED', 'ACTIVE'].includes(tender.status) && onNavigateToBid && (
            <button
              onClick={() => onNavigateToBid(tender.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Submit Bid</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. ALERTS */}
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

      {/* 3. WORKSPACE TABS */}
      <div className="flex items-center gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('evaluation')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'evaluation'
              ? 'border-orange-500 text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-lg'
          }`}
        >
          <Gavel className="w-4 h-4 text-orange-400" />
          <span>Bid Evaluation & Submissions ({bids.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-orange-500 text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-lg'
          }`}
        >
          <FileText className="w-4 h-4 text-sky-400" />
          <span>Procurement Specs & Parameters</span>
        </button>

        <button
          onClick={() => setActiveTab('amendments')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'amendments'
              ? 'border-orange-500 text-white bg-white/5 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-lg'
          }`}
        >
          <History className="w-4 h-4 text-purple-400" />
          <span>Amendments & Audit History ({tender.status_history?.length || 0})</span>
        </button>
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: EVALUATION & BIDS MATRIX */}
      {activeTab === 'evaluation' && (
        <div className="space-y-6">
          
          {/* Dual-Envelope Opening Control Panel */}
          <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Dual-Envelope Security & Cryptographic Opening Stage</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Current Stage: <span className="font-mono font-bold text-orange-400">{openingStatus?.stage || 'NOT_STARTED'}</span> • Locked Bids: <span className="text-white font-bold">{openingStatus?.total_bids_locked ?? bids.length}</span>
                </p>
              </div>

              {isTenderManager && (
                <div className="flex items-center gap-2 flex-wrap">
                  {(!openingStatus?.stage || openingStatus.stage === 'NOT_STARTED') && (
                    <button
                      onClick={() => handleExecuteOpening('authorize_technical')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      Authorize Technical Opening
                    </button>
                  )}
                  {openingStatus?.stage === 'TECHNICAL_AUTHORIZED' && (
                    <button
                      onClick={() => handleExecuteOpening('open_technical')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      Decrypt & Open Technical Bids
                    </button>
                  )}
                  {openingStatus?.stage === 'TECHNICAL_OPENED' && (
                    <button
                      onClick={() => handleExecuteOpening('authorize_financial')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      Authorize Financial Opening
                    </button>
                  )}
                  {openingStatus?.stage === 'FINANCIAL_AUTHORIZED' && (
                    <button
                      onClick={() => handleExecuteOpening('open_financial')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      Decrypt & Open Financial Proposals
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Received</span>
                <span className="text-lg font-black text-white block mt-0.5">{bids.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Technical Evaluated</span>
                <span className="text-lg font-black text-sky-400 block mt-0.5">
                  {bids.filter(b => b.technical_bid?.technical_score != null).length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Integrity Verified</span>
                <span className="text-lg font-black text-emerald-400 block mt-0.5">
                  {openingStatus?.integrity_checks_passed ?? bids.length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current State</span>
                <span className="text-xs font-mono font-bold text-orange-400 block mt-1.5">
                  {tender.status}
                </span>
              </div>
            </div>
          </div>

          {/* Submissions & Scoring Table */}
          <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white">Vendor Bids & Evaluation Dossiers</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect technical methodologies, evaluate commercial proposals, enter grading scores, and award contract.
                </p>
              </div>
              <button
                onClick={loadTenderData}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Bids</span>
              </button>
            </div>

            {bids.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-white/5 space-y-2">
                <Gavel className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-bold text-white">No Bids Submitted Yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Registered vendors will appear here once they submit their dual-envelope technical and financial proposals.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bids.map((b, index) => {
                  const tech = b.technical_bid;
                  const fin = b.financial_bid;
                  const isWinningBid = b.status === 'AWARDED' || tender.status === 'AWARDED' && b.status === 'AWARDED';

                  return (
                    <div
                      key={b.id || index}
                      className={`p-5 rounded-xl border transition-all ${
                        isWinningBid
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                          : 'bg-[#090d16] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Bid Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isWinningBid ? 'bg-emerald-500 text-white' : 'bg-white/5 text-orange-400 border border-white/10'
                          }`}>
                            #{index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-white">
                                {b.vendor_name || b.vendor?.company_name || 'Vendor Entity'}
                              </h4>
                              <span className="font-mono text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                                {b.bid_reference}
                              </span>
                              {isWinningBid && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  <Award className="w-3 h-3" />
                                  <span>Contract Winner</span>
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">
                              Submitted: {b.submitted_at ? new Date(b.submitted_at).toLocaleString() : 'In Progress'} • Status: <strong className="text-white">{b.status}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Top Action for this Bid */}
                        {isTenderManager && tender.status !== 'CLOSED' && (
                          <div className="flex items-center gap-2">
                            {b.status !== 'AWARDED' && (
                              <button
                                onClick={() => handleAwardContract(b)}
                                disabled={actionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Award Contract</span>
                              </button>
                            )}
                            {b.status !== 'DISQUALIFIED' && b.status !== 'AWARDED' && (
                              <button
                                onClick={() => handleScoreBid(b.id, 'disqualify')}
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition disabled:opacity-50"
                              >
                                Disqualify
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Technical & Commercial Dossier Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                        
                        {/* Technical Proposal */}
                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                            Technical Proposal Details
                          </span>
                          <div>
                            <span className="text-slate-400 font-semibold block">Approach & Methodology:</span>
                            <p className="text-white mt-0.5 line-clamp-3">
                              {tech?.methodology || 'No technical methodology provided.'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">Implementation Timeline:</span>
                            <p className="text-white mt-0.5 line-clamp-2">
                              {tech?.implementation_plan || 'Standard implementation schedule.'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <span className="text-slate-400 font-bold">Committee Technical Score:</span>
                            <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              {tech?.technical_score != null ? `⭐ ${tech.technical_score} / 100` : 'Pending Evaluation'}
                            </span>
                          </div>
                          {tech?.evaluation_remarks && (
                            <div className="pt-1 text-[11px] text-slate-300 italic">
                              Remarks: "{tech.evaluation_remarks}"
                            </div>
                          )}
                        </div>

                        {/* Financial Proposal */}
                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                            Commercial / Financial Bid
                          </span>
                          {fin?.final_amount ? (
                            <div className="space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Base Bid Amount:</span>
                                <span className="font-mono text-white">${parseFloat(fin.total_amount || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Tax & Fees:</span>
                                <span className="font-mono text-slate-300">${parseFloat(fin.tax_amount || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-white/5 text-sm font-bold">
                                <span className="text-white">Final Proposal Value:</span>
                                <span className="font-mono text-emerald-400">${parseFloat(fin.final_amount).toLocaleString()} {fin.currency || 'USD'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="py-4 text-center text-slate-400 space-y-1">
                              <Lock className="w-5 h-5 text-amber-400 mx-auto" />
                              <p className="font-semibold text-white">Financial Details Sealed</p>
                              <p className="text-[11px]">Protected until authorized financial opening stage.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Evaluator Scoring & Remarks Form */}
                      {isEvaluator && (
                        <div className="pt-3 border-t border-white/5 bg-white/[0.02] p-3 rounded-lg flex flex-col sm:flex-row items-end gap-3">
                          <div className="w-full sm:w-40">
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Technical Score (0-100)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={evaluationScores[b.id] ?? ''}
                              onChange={(e) => setEvaluationScores({
                                ...evaluationScores,
                                [b.id]: e.target.value
                              })}
                              placeholder="e.g. 88.5"
                              className="w-full px-3 py-1.5 bg-[#07090e] border border-white/10 rounded-lg text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
                            />
                          </div>

                          <div className="flex-1 w-full">
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">
                              Evaluator Assessment Notes & Justification
                            </label>
                            <input
                              type="text"
                              value={evaluationRemarks[b.id] ?? ''}
                              onChange={(e) => setEvaluationRemarks({
                                ...evaluationRemarks,
                                [b.id]: e.target.value
                              })}
                              placeholder="Evaluation comments, compliance remarks, strengths & risks..."
                              className="w-full px-3 py-1.5 bg-[#07090e] border border-white/10 rounded-lg text-white text-xs focus:border-orange-500 focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleScoreBid(b.id, 'evaluate')}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shrink-0 disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Evaluation</span>
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OVERVIEW & PROCUREMENT PARAMETERS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-extrabold text-white">Detailed Scope of Work & Description</h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {tender.description || 'No detailed scope of work provided.'}
              </p>
            </div>

            <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <h3 className="text-sm font-extrabold text-white">Technical & Eligibility Criteria</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-400 block">Eligibility Requirements:</span>
                  <p className="text-slate-300 mt-0.5">{tender.eligibility_criteria || 'General vendor eligibility applies.'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block">Technical Specifications:</span>
                  <p className="text-slate-300 mt-0.5">{tender.technical_requirements || 'As per tender documentation.'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block">Financial & Commercial Requirements:</span>
                  <p className="text-slate-300 mt-0.5">{tender.financial_requirements || 'Standard commercial terms apply.'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-3 text-xs">
              <h3 className="text-sm font-extrabold text-white pb-2 border-b border-white/5">
                Key Parameters
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Allocated Budget:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    ${parseFloat(tender.budget || 0).toLocaleString()} {tender.currency || 'USD'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="text-white font-semibold">{tender.category_name || 'General Goods & Services'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Organization:</span>
                  <span className="text-white font-semibold">{tender.effective_org_name || 'General Authority'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Submission Deadline:</span>
                  <span className="text-white font-mono">
                    {tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleString() : 'Not Set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bid Opening Date:</span>
                  <span className="text-white font-mono">
                    {tender.opening_date ? new Date(tender.opening_date).toLocaleString() : 'Not Set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Version:</span>
                  <span className="text-orange-400 font-mono font-bold">v{tender.version}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AMENDMENTS & STATUS HISTORY */}
      {activeTab === 'amendments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Amendments Panel */}
          <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">Tender Amendments</h3>
              {isTenderManager && ['PUBLISHED', 'ACTIVE'].includes(tender.status) && (
                <button
                  onClick={() => setAmendmentModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Issue Amendment</span>
                </button>
              )}
            </div>

            {tender.amendments?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No amendments issued for this solicitation.</p>
            ) : (
              <div className="space-y-3">
                {tender.amendments?.map(a => (
                  <div key={a.id} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Amendment #{a.amendment_number}: {a.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{a.published_at ? new Date(a.published_at).toLocaleDateString() : 'Draft'}</span>
                    </div>
                    <p className="text-slate-300">{a.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit History */}
          <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              <span>Lifecycle State Transitions</span>
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {tender.status_history?.map(h => (
                <div key={h.id} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-400 font-mono">
                      {h.from_status} → {h.to_status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(h.changed_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{h.reason || 'Status updated'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Draft Tender Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e131f] border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Edit Draft Tender</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTender} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Tender Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-lg text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Budget ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.budget}
                    onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                    className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-lg text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Deadline</label>
                  <input
                    type="datetime-local"
                    value={editFormData.submission_deadline}
                    onChange={(e) => setEditFormData({ ...editFormData, submission_deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-lg text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Amendment Modal */}
      {amendmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e131f] border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Issue Versioned Amendment</h3>
              <button onClick={() => setAmendmentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAmendment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Amendment Title</label>
                <input
                  type="text"
                  placeholder="e.g. Extended Deadline & Technical Addendum"
                  value={amendmentData.title}
                  onChange={(e) => setAmendmentData({ ...amendmentData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Reason for Amendment</label>
                <textarea
                  rows={2}
                  placeholder="Explain justification for modifying published tender..."
                  value={amendmentData.reason}
                  onChange={(e) => setAmendmentData({ ...amendmentData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-lg text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAmendmentModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold"
                >
                  Publish Amendment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
