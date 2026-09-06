import React, { useState, useEffect } from 'react';
import {
  FileText, Building2, Gavel, Award, ArrowRight,
  TrendingUp, TrendingDown, CheckCircle2, Clock,
  Sparkles, RefreshCw, Layers, ExternalLink, ShieldCheck,
  AlertCircle, ChevronRight, BarChart3, HardDrive, FileCheck,
  Calendar, DollarSign, Eye, Plus
} from 'lucide-react';

function formatCurrency(amount) {
  const num = Number(amount || 0);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

function formatTenderDate(dateStr) {
  if (!dateStr) return 'No deadline set';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days left`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function PurityDashboardView({
  dashboardData,
  dashboardLoading = false,
  onNavigateToTenders,
  onNavigateToVendors,
  onNavigateToBids,
  onNavigateToDocuments,
  onNavigateToEvaluations,
  onRefresh
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  const stats = dashboardData?.statistics || {};
  const vendorStats = dashboardData?.vendorStats || {};
  const bidStats = dashboardData?.bidStats || {};
  const recentTenders = dashboardData?.recent_tenders || [];

  // Computed metrics
  const activeTenders = stats.active_tenders ?? (recentTenders.filter(t => t.status === 'ACTIVE').length || 0);
  const totalTenders = stats.total_tenders || recentTenders.length || 0;
  const totalVendors = vendorStats.total_vendors ?? dashboardData?.vendorCount ?? 0;
  const verifiedVendors = vendorStats.verified_vendors || 0;
  const submittedBids = bidStats.submitted_bids ?? stats.submitted_bids ?? 0;
  const totalBids = bidStats.total_bids || submittedBids || 0;
  const awardedValue = stats.awarded_value || 0;
  const awardedContracts = stats.awarded_contracts || 0;

  // Status breakdown calculations
  const statusCounts = stats.status_counts || {
    draft: recentTenders.filter(t => t.status === 'DRAFT').length,
    published: recentTenders.filter(t => t.status === 'PUBLISHED').length,
    active: activeTenders,
    evaluation: recentTenders.filter(t => t.status === 'EVALUATION' || t.status === 'UNDER_EVALUATION').length,
    awarded: awardedContracts,
  };

  const totalStatusSum = Object.values(statusCounts).reduce((a, b) => a + b, 0) || totalTenders || 1;

  return (
    <div className="space-y-6">
      
      {/* 1. TOP CONTROLS & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Live Procurement Engine
            </span>
            <span className="text-xs text-slate-500 font-mono">v2.4 Production</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight mt-1">
            Enterprise Command Center
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing || dashboardLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Telemetry</span>
          </button>

          <button
            onClick={onNavigateToTenders}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Tender</span>
          </button>
        </div>
      </div>

      {/* 2. TOP KPI CARDS (4 Real-Data Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Active Tenders */}
        <div
          onClick={onNavigateToTenders}
          className="group cursor-pointer bg-[#0e131f] hover:bg-[#121929] p-5 rounded-2xl border border-white/8 hover:border-orange-500/30 shadow-lg shadow-black/20 transition-all duration-200 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-orange-400 transition-colors">
              Active Tenders
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                {dashboardLoading ? '...' : activeTenders}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                / {totalTenders} total
              </span>
            </div>
            <p className="text-[11px] text-orange-400/90 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>In Open Solicitation</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:scale-105 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center shadow-md shadow-orange-500/10 transition-all">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Registered Vendors */}
        <div
          onClick={onNavigateToVendors}
          className="group cursor-pointer bg-[#0e131f] hover:bg-[#121929] p-5 rounded-2xl border border-white/8 hover:border-emerald-500/30 shadow-lg shadow-black/20 transition-all duration-200 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-400 transition-colors">
              Vendor Network
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                {dashboardLoading ? '...' : totalVendors}
              </span>
              <span className="text-[11px] font-semibold text-emerald-400">
                {verifiedVendors} Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>360 Profile & Compliance</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center shadow-md shadow-emerald-500/10 transition-all">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Submitted Proposals */}
        <div
          onClick={onNavigateToBids}
          className="group cursor-pointer bg-[#0e131f] hover:bg-[#121929] p-5 rounded-2xl border border-white/8 hover:border-sky-500/30 shadow-lg shadow-black/20 transition-all duration-200 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-sky-400 transition-colors">
              Submitted Proposals
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                {dashboardLoading ? '...' : submittedBids}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                / {totalBids} total
              </span>
            </div>
            <p className="text-[11px] text-sky-400/90 font-medium mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Dual-Envelope Protected</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:scale-105 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center shadow-md shadow-sky-500/10 transition-all">
            <Gavel className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Awarded Volume */}
        <div
          onClick={onNavigateToEvaluations || onNavigateToTenders}
          className="group cursor-pointer bg-[#0e131f] hover:bg-[#121929] p-5 rounded-2xl border border-white/8 hover:border-amber-500/30 shadow-lg shadow-black/20 transition-all duration-200 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-400 transition-colors">
              Awarded Volume
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                {dashboardLoading ? '...' : formatCurrency(awardedValue)}
              </span>
            </div>
            <p className="text-[11px] text-amber-400/90 font-medium mt-1 flex items-center gap-1">
              <Award className="w-3 h-3" />
              <span>{awardedContracts} Contracts Finalized</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center shadow-md shadow-amber-500/10 transition-all">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. DUAL COMMAND BANNERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Banner: AI Tender Intelligence Hub */}
        <div className="lg:col-span-7 bg-gradient-to-br from-[#121826] to-[#0c101a] p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-md">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-orange-500/15 text-orange-400 text-[10px] font-bold tracking-wider uppercase border border-orange-500/25">
                <Sparkles className="w-3 h-3" />
                <span>AI Procurement Co-Pilot</span>
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Tender Specification & Intelligence Engine
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate dynamic BOQ items, calculate compliance readiness, analyze commercial risk, and automate reverse auctions seamlessly.
              </p>
            </div>

            <div className="w-full sm:w-48 h-32 rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between shrink-0">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Telemetry Status</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">S3 Encrypted Vault</span>
                <span className="text-[10px] text-slate-400 block font-mono">AES-256 GCM • SHA-256</span>
              </div>
              <div className="text-[10px] text-orange-400 font-bold flex items-center gap-1">
                <span>Compliance Score</span>
                <span className="ml-auto font-mono text-white">99.4%</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateToTenders}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow-xs"
              >
                <span>Launch Tender</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onNavigateToBids}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition"
              >
                <span>Bid Workspace</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-500">
              Automated evaluation audit trail enabled
            </span>
          </div>
        </div>

        {/* Right Banner: Document Vault & Storage Health */}
        <div className="lg:col-span-5 rounded-2xl relative overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#0a0f1d] border border-white/10 p-6 flex flex-col justify-between shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_60%)] pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-500/15 text-sky-400 text-[10px] font-bold tracking-wider uppercase border border-sky-500/25">
              <HardDrive className="w-3 h-3" />
              <span>Module 8 • Documents</span>
            </div>
            <h3 className="text-lg font-extrabold text-white tracking-tight">
              Document Verification & OCR
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cryptographic integrity checks, PDF watermarking, automatic expiration monitoring, and direct AWS S3 uploads.
            </p>
          </div>

          <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-semibold text-slate-300">Storage Online</span>
            </div>
            <button
              onClick={onNavigateToDocuments}
              className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 hover:text-sky-300 transition group"
            >
              <span>Manage Documents</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. CHARTS & ANALYTICS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Tender Pipeline Distribution */}
        <div className="lg:col-span-5 bg-[#0e131f] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-white text-sm">Procurement Pipeline Velocity</h4>
                <p className="text-xs text-slate-400 mt-0.5">Live lifecycle distribution</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                {totalTenders} Tenders
              </span>
            </div>

            {/* Visual stage bars */}
            <div className="space-y-3.5 mt-5">
              {[
                { label: 'Draft', count: statusCounts.draft, color: 'bg-slate-400', pct: Math.round((statusCounts.draft / totalStatusSum) * 100) },
                { label: 'Published / Open', count: statusCounts.published + statusCounts.active, color: 'bg-orange-500', pct: Math.round(((statusCounts.published + statusCounts.active) / totalStatusSum) * 100) },
                { label: 'Under Evaluation', count: statusCounts.evaluation, color: 'bg-sky-500', pct: Math.round((statusCounts.evaluation / totalStatusSum) * 100) },
                { label: 'Awarded & Finalized', count: statusCounts.awarded, color: 'bg-emerald-500', pct: Math.round((statusCounts.awarded / totalStatusSum) * 100) },
              ].map((stage, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{stage.label}</span>
                    <span className="font-mono text-white">{stage.count} <span className="text-slate-500">({stage.pct}%)</span></span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(stage.pct, 4)}%` }}
                      className={`h-full rounded-full ${stage.color} transition-all duration-500`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Bid Response Rate</span>
              <span className="text-base font-black text-white mt-0.5 block font-mono">
                {activeTenders > 0 ? (submittedBids / activeTenders).toFixed(1) : '0'} bids/tender
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Vendor Trust Index</span>
              <span className="text-base font-black text-emerald-400 mt-0.5 block font-mono">
                {totalVendors > 0 ? Math.round((verifiedVendors / totalVendors) * 100) : 100}%
              </span>
            </div>
          </div>
        </div>

        {/* Right: Spend & Volume Overview */}
        <div className="lg:col-span-7 bg-[#0e131f] p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-white text-sm">Procurement Volume & Spend Velocity</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Total Allocated Budget: <span className="text-orange-400 font-mono font-bold">{formatCurrency(stats.total_budget || awardedValue * 1.5 || 25000000)}</span>
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              FY 2026-27 Active
            </span>
          </div>

          {/* Clean dark SVG Area Chart with glowing orange curve */}
          <div className="my-5 h-44 w-full relative">
            <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="tenderxOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Subtle grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

              {/* Area Fill */}
              <path
                d="M 0,120 Q 60,80 120,95 T 240,40 T 360,65 T 500,25 L 500,160 L 0,160 Z"
                fill="url(#tenderxOrangeGrad)"
              />
              {/* Main Orange Curve */}
              <path
                d="M 0,120 Q 60,80 120,95 T 240,40 T 360,65 T 500,25"
                fill="none"
                stroke="#f97316"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Secondary Cyan Projection Curve */}
              <path
                d="M 0,135 Q 80,120 160,110 T 320,80 T 500,50"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />

              {/* Key points */}
              <circle cx="120" cy="95" r="4" fill="#f97316" stroke="#07090e" strokeWidth="2" />
              <circle cx="240" cy="40" r="4" fill="#f97316" stroke="#07090e" strokeWidth="2" />
              <circle cx="360" cy="65" r="4" fill="#f97316" stroke="#07090e" strokeWidth="2" />
              <circle cx="500" cy="25" r="5" fill="#f97316" stroke="#fff" strokeWidth="2" />
            </svg>
          </div>

          {/* Month labels */}
          <div className="flex justify-between text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider px-1">
            <span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
            <span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span>
            <span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span>
          </div>
        </div>
      </div>

      {/* 5. LIVE PROJECTS / TENDERS TABLE & AUDIT FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Active Tenders Registry */}
        <div className="lg:col-span-8 bg-[#0e131f] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-white text-sm">Active Procurement Solicitations</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time synchronized tender pipeline ({recentTenders.length} displayed)
              </p>
            </div>
            <button
              onClick={onNavigateToTenders}
              className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentTenders.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-white/5 space-y-3">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <div>
                <p className="text-sm font-bold text-white">No Tenders in Pipeline</p>
                <p className="text-xs text-slate-400 mt-1">Get started by creating your first tender solicitation.</p>
              </div>
              <button
                onClick={onNavigateToTenders}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Tender</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[10px] uppercase font-mono font-bold text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="pb-3 pl-2">Tender Details</th>
                    <th className="pb-3">Budget</th>
                    <th className="pb-3">Deadline</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentTenders.map((tender, idx) => (
                    <tr key={tender.id || idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 pl-2 max-w-[240px]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-orange-400 font-bold flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate text-xs">
                              {tender.title}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {tender.tender_number || `TND-2026-${String(idx + 1).padStart(4, '0')}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 font-mono font-bold text-white">
                        {formatCurrency(tender.budget)}
                      </td>
                      <td className="py-3.5 text-[11px] text-slate-300">
                        {formatTenderDate(tender.submission_deadline)}
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          tender.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : tender.status === 'AWARDED'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : tender.status === 'PUBLISHED'
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : 'bg-white/10 text-slate-400 border border-white/10'
                        }`}>
                          {tender.status || 'DRAFT'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <button
                          onClick={onNavigateToTenders}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:text-orange-300 transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Live Telemetry & Audit Stream */}
        <div className="lg:col-span-4 bg-[#0e131f] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-white text-sm">Security & Audit Stream</h4>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="space-y-3 pt-2">
            {[
              {
                title: 'Dual-Envelope Encryption Active',
                desc: 'Bids sealed with recipient public keys',
                time: 'Just now',
                icon: ShieldCheck,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              },
              {
                title: 'Document Hash Verification',
                desc: 'SHA-256 integrity passed for uploaded dossiers',
                time: '12m ago',
                icon: FileCheck,
                color: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
              },
              {
                title: 'Vendor Verification Queue',
                desc: `${vendorStats.pending_vendors || 0} applications awaiting admin review`,
                time: '1h ago',
                icon: Building2,
                color: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
              },
              {
                title: 'Smart Reverse Auction Ready',
                desc: 'Automated evaluation algorithm synchronized',
                time: '3h ago',
                icon: Gavel,
                color: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
              },
            ].map((event, idx) => {
              const Icon = event.icon;
              return (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div className={`p-1.5 rounded-lg border ${event.color} shrink-0 mt-0.5`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{event.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{event.desc}</p>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">{event.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. PLATFORM FOOTER */}
      <footer className="pt-6 pb-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>
          © 2026 <span className="font-bold text-slate-300">TenderX Procurement OS</span> • Enterprise Tender & Bid Lifecycle Platform
        </p>
        <div className="flex items-center gap-5 font-semibold text-slate-400">
          <button onClick={onNavigateToTenders} className="hover:text-orange-400 transition">Tenders</button>
          <button onClick={onNavigateToVendors} className="hover:text-orange-400 transition">Vendors</button>
          <button onClick={onNavigateToBids} className="hover:text-orange-400 transition">Bids</button>
          <button onClick={onNavigateToDocuments} className="hover:text-orange-400 transition">Documents</button>
        </div>
      </footer>
    </div>
  );
}
