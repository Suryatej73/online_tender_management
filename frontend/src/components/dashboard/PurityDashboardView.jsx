import React, { useState } from 'react';
import {
  FileText, Building2, Gavel, Award, ArrowRight,
  TrendingUp, CheckCircle2, Clock, RefreshCw,
  Plus, Eye, ChevronRight, DollarSign, ShieldCheck,
  Layers, Activity, Sparkles, Lock, FolderArchive,
  ExternalLink, Calendar
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

function formatDeadlineInfo(dateStr) {
  if (!dateStr) return { text: 'No deadline set', style: 'text-slate-400 bg-white/5 border-white/10' };
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    const formatted = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    if (diffDays < 0) {
      return { text: `Expired (${formatted})`, style: 'text-rose-400 bg-rose-500/10 border-rose-500/25' };
    }
    if (diffDays === 0) {
      return { text: 'Closes Today', style: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-bold' };
    }
    if (diffDays === 1) {
      return { text: 'Closes Tomorrow', style: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-bold' };
    }
    if (diffDays <= 7) {
      return { text: `${diffDays}d remaining`, style: 'text-amber-300 bg-amber-500/10 border-amber-500/20 font-semibold' };
    }
    return { text: formatted, style: 'text-slate-300 bg-white/5 border-white/10' };
  } catch {
    return { text: dateStr, style: 'text-slate-400 bg-white/5 border-white/10' };
  }
}

export default function PurityDashboardView({
  dashboardData,
  dashboardLoading = false,
  currentUser,
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
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  const stats = dashboardData?.statistics || {};
  const vendorStats = dashboardData?.vendorStats || {};
  const bidStats = dashboardData?.bidStats || {};
  const recentTenders = dashboardData?.recent_tenders || [];

  // Metrics
  const activeTenders = stats.active_tenders ?? (recentTenders.filter(t => t.status === 'ACTIVE').length || 0);
  const totalTenders = stats.total_tenders || recentTenders.length || 0;
  const submittedBids = bidStats.submitted_bids ?? stats.submitted_bids ?? 0;
  const totalBudget = stats.total_budget || 0;
  const awardedValue = stats.awarded_value || 0;
  const awardedContracts = stats.awarded_contracts || 0;

  // Pipeline stage counts
  const statusCounts = stats.status_counts || {
    draft: recentTenders.filter(t => t.status === 'DRAFT').length,
    published: recentTenders.filter(t => t.status === 'PUBLISHED').length,
    active: activeTenders,
    evaluation: recentTenders.filter(t => t.status === 'EVALUATION').length,
    awarded: awardedContracts,
  };

  const publishedActiveCount = (statusCounts.published || 0) + (statusCounts.active || 0);
  const totalStatusSum = Object.values(statusCounts).reduce((a, b) => a + b, 0) || totalTenders || 1;

  const getBadgeStyle = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'AWARDED': return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      case 'PUBLISHED': return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
      case 'EVALUATION': return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'DRAFT': return 'bg-slate-500/15 text-slate-300 border border-slate-500/30';
      case 'ARCHIVED':
      case 'CANCELLED': return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      default: return 'bg-white/10 text-slate-400 border border-white/10';
    }
  };

  const formatRole = (role) => {
    if (!role) return 'Procurement Officer';
    switch (role.toUpperCase()) {
      case 'SUPER_ADMIN': return 'Super Administrator';
      case 'ORG_ADMIN': return 'Organization Administrator';
      case 'TENDER_MANAGER': return 'Tender Manager';
      case 'BIDDER': return 'Vendor / Bidder';
      case 'EVALUATOR': return 'Committee Evaluator';
      case 'AUDITOR': return 'Compliance Auditor';
      default: return role.replace(/_/g, ' ');
    }
  };

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = currentUser?.full_name || currentUser?.username || 'Executive Officer';
  const userOrg = currentUser?.organization_name || currentUser?.effective_organization_name || 'Central Procurement Authority';

  return (
    <div className="space-y-6">
      
      {/* 1. Ambient Executive Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1424] via-[#0b0e18] to-[#141b2d] border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-32 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {timeGreeting}, {userName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300/80 mt-1 max-w-2xl font-normal leading-relaxed">
                Operating under <span className="text-orange-400 font-semibold">{userOrg}</span> as <span className="text-white font-semibold">{formatRole(currentUser?.role)}</span>. All procurement stages are synchronized in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing || dashboardLoading}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition disabled:opacity-50 shadow-xs"
              title="Synchronize real-time metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            {onNavigateToEvaluations && (
              <button
                onClick={onNavigateToEvaluations}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition shadow-xs"
              >
                <Award className="w-3.5 h-3.5 text-purple-400" />
                <span>Evaluations</span>
              </button>
            )}

            <button
              onClick={() => onNavigateToTenders ? onNavigateToTenders() : null}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Tender</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Primary Executive KPI Cards (Elevated 4-Grid with Accent Borders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Active Solicitations */}
        <div
          onClick={() => onNavigateToTenders ? onNavigateToTenders() : null}
          className="group cursor-pointer bg-gradient-to-br from-[#0f1422] to-[#0a0d16] hover:from-[#131b2e] hover:to-[#0d121f] p-5 rounded-2xl border border-white/10 hover:border-orange-500/40 border-t-2 border-t-orange-500 shadow-xl transition-all duration-200 relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-orange-400 transition-colors">
                Active Solicitations
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-white tracking-tight">
                  {dashboardLoading ? '...' : activeTenders}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / {totalTenders} total
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-400 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-all shadow-md shadow-orange-500/10">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Open for Submissions
            </span>
            <span className="text-slate-400 group-hover:text-white transition-colors flex items-center gap-0.5 font-medium">
              Explore <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Metric 2: Total Budget Allocated */}
        <div className="bg-gradient-to-br from-[#0f1422] to-[#0a0d16] p-5 rounded-2xl border border-white/10 border-t-2 border-t-emerald-500 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Authorized Budget
              </span>
              <div className="pt-1">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                  {dashboardLoading ? '...' : formatCurrency(totalBudget)}
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shadow-md shadow-emerald-500/10">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">
              Allocated across catalog
            </span>
            <span className="text-emerald-400 font-bold font-mono">
              INR Escrow
            </span>
          </div>
        </div>

        {/* Metric 3: Submitted Bids */}
        <div
          onClick={onNavigateToBids}
          className="group cursor-pointer bg-gradient-to-br from-[#0f1422] to-[#0a0d16] hover:from-[#131b2e] hover:to-[#0d121f] p-5 rounded-2xl border border-white/10 hover:border-sky-500/40 border-t-2 border-t-sky-500 shadow-xl transition-all duration-200 relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-sky-400 transition-colors">
                Proposals Received
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-white tracking-tight">
                  {dashboardLoading ? '...' : submittedBids}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  submitted
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center transition-all shadow-md shadow-sky-500/10">
              <Gavel className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-sky-400 font-medium flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Dual-Envelope Protected
            </span>
            <span className="text-slate-400 group-hover:text-white transition-colors flex items-center gap-0.5 font-medium">
              Review <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Metric 4: Awarded Volume */}
        <div
          onClick={onNavigateToEvaluations || onNavigateToTenders}
          className="group cursor-pointer bg-gradient-to-br from-[#0f1422] to-[#0a0d16] hover:from-[#131b2e] hover:to-[#0d121f] p-5 rounded-2xl border border-white/10 hover:border-purple-500/40 border-t-2 border-t-purple-500 shadow-xl transition-all duration-200 relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-purple-400 transition-colors">
                Awarded Volume
              </span>
              <div className="pt-1">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                  {dashboardLoading ? '...' : formatCurrency(awardedValue)}
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 group-hover:bg-purple-500 group-hover:text-white flex items-center justify-center transition-all shadow-md shadow-purple-500/10">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-purple-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {awardedContracts} Contracts Executed
            </span>
            <span className="text-slate-400 group-hover:text-white transition-colors flex items-center gap-0.5 font-medium">
              Board <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

      </div>

      {/* 3. Dual-Panel Strategic Operations Grid (Split 60% / 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Procurement Governance Pipeline (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b0e17] p-6 rounded-2xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-extrabold text-white tracking-wide">
                  Procurement Governance Pipeline
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Lifecycle distribution across regulatory gating stages
              </p>
            </div>
            <span className="font-mono text-xs text-orange-400 font-bold bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
              {totalTenders} Total Solicitations
            </span>
          </div>

          {/* Continuous Multi-Segment Visual Progress Bar */}
          <div className="space-y-2">
            <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden flex p-0.5 gap-1 border border-white/10">
              <div
                style={{ width: `${Math.max((statusCounts.draft / totalStatusSum) * 100, statusCounts.draft > 0 ? 5 : 0)}%` }}
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                title={`Draft: ${statusCounts.draft}`}
              />
              <div
                style={{ width: `${Math.max((publishedActiveCount / totalStatusSum) * 100, publishedActiveCount > 0 ? 5 : 0)}%` }}
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                title={`Published/Active: ${publishedActiveCount}`}
              />
              <div
                style={{ width: `${Math.max((statusCounts.evaluation / totalStatusSum) * 100, statusCounts.evaluation > 0 ? 5 : 0)}%` }}
                className="h-full rounded-full bg-purple-500 transition-all duration-500"
                title={`Evaluation: ${statusCounts.evaluation}`}
              />
              <div
                style={{ width: `${Math.max((statusCounts.awarded / totalStatusSum) * 100, statusCounts.awarded > 0 ? 5 : 0)}%` }}
                className="h-full rounded-full bg-sky-500 transition-all duration-500"
                title={`Awarded: ${statusCounts.awarded}`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
              <span>0% Inception</span>
              <span>100% Contract Award</span>
            </div>
          </div>

          {/* 4 Stage Detail Cards (2x2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            
            {/* Stage 1: Draft */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  1. Draft Phase
                </span>
                <span className="text-xs font-mono font-bold text-white bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {statusCounts.draft}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Specifications & BOQs authored; awaiting internal committee publication approval.
              </p>
            </div>

            {/* Stage 2: Published / Active */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  2. Active Bidding
                </span>
                <span className="text-xs font-mono font-bold text-white bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {publishedActiveCount}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Publicly advertised; verified vendors actively compiling dual-envelope bids.
              </p>
            </div>

            {/* Stage 3: Committee Evaluation */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  3. Under Evaluation
                </span>
                <span className="text-xs font-mono font-bold text-white bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {statusCounts.evaluation}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Bidding closed; evaluation board scoring technical proposals and unsealing financials.
              </p>
            </div>

            {/* Stage 4: Contract Awarded */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  4. Contract Finalized
                </span>
                <span className="text-xs font-mono font-bold text-white bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {statusCounts.awarded}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Winning vendor selected, legally executed contracts and binding milestones active.
              </p>
            </div>

          </div>
        </div>

        {/* Right: Fast-Track Operations Launchpad (5 cols) */}
        <div className="lg:col-span-5 bg-[#0b0e17] p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-between space-y-4">
          <div className="pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-extrabold text-white tracking-wide">
                Fast-Track Operations
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Instant access to core procurement modules
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Tile 1: Tenders */}
            <button
              onClick={() => onNavigateToTenders ? onNavigateToTenders() : null}
              className="group w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-orange-500/30 transition flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
                    Tenders & BOQs Catalog
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Publish RFPs, configure bill of quantities
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>

            {/* Tile 2: Evaluation Board */}
            <button
              onClick={onNavigateToEvaluations}
              className="group w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-purple-500/30 transition flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                      Committee Evaluation Board
                    </h4>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold">
                      Staff
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Technical scoring & contract award execution
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>

            {/* Tile 3: Proposals / Bids */}
            <button
              onClick={onNavigateToBids}
              className="group w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-sky-500/30 transition flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <Gavel className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                    Bid Submissions Registry
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Track sealed proposals and submission receipts
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>

            {/* Tile 4: Documents */}
            <button
              onClick={onNavigateToDocuments}
              className="group w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-emerald-500/30 transition flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Document & Audit Vault
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    S3 repository, OCR scanning & SHA-256 integrity
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-slate-500">
              Role: <strong className="text-slate-300 font-semibold">{formatRole(currentUser?.role)}</strong> • Level 5 Access
            </span>
          </div>
        </div>

      </div>

      {/* 4. Active Procurement Solicitations Registry (Real Created Tenders) */}
      <div className="bg-[#0b0e17] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white">Recent Created Solicitations</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                {recentTenders.length} Solicitations
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live procurement database entries (click any row to view full details or manage evaluation)
            </p>
          </div>

          <button
            onClick={() => onNavigateToTenders ? onNavigateToTenders() : null}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <span>Open Tender Directory</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTenders.length === 0 ? (
          <div className="py-14 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">No Solicitations Created Yet</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Start by authoring your first official tender or RFP solicitation.
              </p>
            </div>
            <button
              onClick={() => onNavigateToTenders ? onNavigateToTenders() : null}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Tender</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[10px] uppercase font-mono font-bold text-slate-400 border-b border-white/10 bg-white/[0.01]">
                <tr>
                  <th className="py-3 pl-3">Tender Number</th>
                  <th className="py-3">Title & Authority</th>
                  <th className="py-3">Category</th>
                  <th className="py-3">Authorized Budget</th>
                  <th className="py-3">Deadline</th>
                  <th className="py-3">Governance Status</th>
                  <th className="py-3 text-right pr-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentTenders.map((tender, idx) => {
                  const deadlineInfo = formatDeadlineInfo(tender.submission_deadline);
                  return (
                    <tr
                      key={tender.id || idx}
                      className="hover:bg-white/[0.04] transition-colors group"
                    >
                      <td className="py-3.5 pl-3 font-mono font-bold text-orange-400 whitespace-nowrap">
                        {tender.tender_number}
                      </td>
                      <td className="py-3.5 max-w-[280px]">
                        <div className="font-bold text-white truncate text-xs group-hover:text-orange-300 transition-colors">
                          {tender.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {tender.effective_org_name || tender.organization_name || 'Central Procurement Authority'}
                        </div>
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-slate-300 border border-white/10">
                          {tender.category_name || 'General Procurement'}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono font-bold text-white whitespace-nowrap">
                        {formatCurrency(tender.budget)}
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] border ${deadlineInfo.style}`}>
                          <Clock className="w-2.5 h-2.5" />
                          {deadlineInfo.text}
                        </span>
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(tender.status)}`}>
                          {tender.status || 'DRAFT'}
                        </span>
                        {tender.top_evaluation_score && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-extrabold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
                              ⭐ {tender.top_evaluation_score.score}/100 ({tender.top_evaluation_score.vendor_name})
                            </span>
                          </div>
                        )}
                        {tender.status === 'AWARDED' && tender.awarded_vendor_name && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                              🏆 Winner: {tender.awarded_vendor_name}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-right pr-3 whitespace-nowrap">
                        <button
                          onClick={() => onNavigateToTenders ? onNavigateToTenders(tender.id) : null}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/25 text-xs font-bold transition shadow-xs"
                          title="Open tender detail and management view"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View / Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
