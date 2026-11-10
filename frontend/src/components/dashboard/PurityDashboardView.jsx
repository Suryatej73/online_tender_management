import React, { useState } from 'react';
import {
  FileText, Building2, Gavel, Award, ArrowRight,
  TrendingUp, CheckCircle2, Clock, RefreshCw,
  Plus, Eye, ChevronRight, DollarSign
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
  if (!dateStr) return 'No deadline';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays}d left`;
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
      setTimeout(() => setRefreshing(false), 500);
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

  const totalStatusSum = Object.values(statusCounts).reduce((a, b) => a + b, 0) || totalTenders || 1;

  const getBadgeStyle = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'AWARDED': return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'PUBLISHED': return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
      case 'EVALUATION': return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      case 'DRAFT': return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
      default: return 'bg-white/10 text-slate-400 border border-white/10';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Live Procurement Center
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
            Executive Command Center
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational overview of solicitations, vendor bids, and awarded contracts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing || dashboardLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => onNavigateToTenders ? onNavigateToTenders() : null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Tender</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Row (4 Clean Real-Data KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Active Tenders */}
        <div
          onClick={() => onNavigateToTenders ? onNavigateToTenders() : null}
          className="group cursor-pointer bg-[#0e131f] hover:bg-[#121929] p-5 rounded-2xl border border-white/10 hover:border-orange-500/40 shadow-xl transition-all duration-200 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-orange-400 transition-colors">
              Active Solicitations
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                {dashboardLoading ? '...' : activeTenders}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                / {totalTenders} total
              </span>
            </div>
            <p className="text-[11px] text-orange-400/90 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>In Open Bidding</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-all">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Total Budget Allocated */}
        <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Allocated Budget
            </p>
            <div className="mt-1">
              <span className="text-2xl font-black text-white font-mono">
                {dashboardLoading ? '...' : formatCurrency(totalBudget)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Across active solicitations
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Submitted Bids */}
        <div
          onClick={onNavigateToBids}
          className="group cursor-pointer bg-[#0e131f] hover:bg-[#121929] p-5 rounded-2xl border border-white/10 hover:border-sky-500/40 shadow-xl transition-all duration-200 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-sky-400 transition-colors">
              Proposals Received
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                {dashboardLoading ? '...' : submittedBids}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                submitted
              </span>
            </div>
            <p className="text-[11px] text-sky-400/90 font-medium mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Dual-Envelope Protected</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center transition-all">
            <Gavel className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Awarded Volume */}
        <div
          onClick={onNavigateToEvaluations || onNavigateToTenders}
          className="group cursor-pointer bg-[#0e131f] hover:bg-[#121929] p-5 rounded-2xl border border-white/10 hover:border-amber-500/40 shadow-xl transition-all duration-200 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-400 transition-colors">
              Awarded Volume
            </p>
            <div className="mt-1">
              <span className="text-2xl font-black text-white font-mono">
                {dashboardLoading ? '...' : formatCurrency(awardedValue)}
              </span>
            </div>
            <p className="text-[11px] text-amber-400/90 font-medium mt-1 flex items-center gap-1">
              <Award className="w-3 h-3" />
              <span>{awardedContracts} Contracts Awarded</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition-all">
            <Award className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 3. Pipeline Breakdown Bar */}
      <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Procurement Lifecycle Pipeline
            </h3>
            <p className="text-[11px] text-slate-500">Distribution across active governance stages</p>
          </div>
          <span className="font-mono text-xs text-orange-400 font-bold bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10">
            {totalTenders} Total Tenders
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[
            { label: 'Draft Solicitations', count: statusCounts.draft, color: 'text-amber-400', barColor: 'bg-amber-400' },
            { label: 'Published / Active', count: (statusCounts.published || 0) + (statusCounts.active || 0), color: 'text-emerald-400', barColor: 'bg-emerald-500' },
            { label: 'Under Evaluation', count: statusCounts.evaluation, color: 'text-purple-400', barColor: 'bg-purple-500' },
            { label: 'Awarded Contracts', count: statusCounts.awarded, color: 'text-sky-400', barColor: 'bg-sky-500' },
          ].map((stage, idx) => {
            const pct = Math.round((stage.count / totalStatusSum) * 100);
            return (
              <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-400 text-[11px]">{stage.label}</span>
                  <span className={`font-mono font-bold ${stage.color}`}>{stage.count}</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.max(pct, stage.count > 0 ? 8 : 0)}%` }}
                    className={`h-full rounded-full ${stage.barColor}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Active Procurement Solicitations Registry (Only created tenders) */}
      <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <h3 className="text-sm font-extrabold text-white">Recent Created Solicitations</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live procurement pipeline ({recentTenders.length} tenders displayed)
            </p>
          </div>
          <button
            onClick={() => onNavigateToTenders ? onNavigateToTenders() : null}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition"
          >
            <span>Open Tenders Workspace</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTenders.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-white/5 space-y-3">
            <FileText className="w-8 h-8 text-slate-500 mx-auto" />
            <div>
              <p className="text-sm font-bold text-white">No Tenders Created Yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Start by creating your first tender solicitation.</p>
            </div>
            <button
              onClick={() => onNavigateToTenders ? onNavigateToTenders() : null}
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
                  <th className="pb-3 pl-2">Tender Number</th>
                  <th className="pb-3">Title & Organization</th>
                  <th className="pb-3">Budget</th>
                  <th className="pb-3">Deadline</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentTenders.map((tender, idx) => (
                  <tr key={tender.id || idx} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3.5 pl-2 font-mono font-bold text-orange-400">
                      {tender.tender_number}
                    </td>
                    <td className="py-3.5 max-w-[280px]">
                      <div className="font-bold text-white truncate text-xs">{tender.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{tender.effective_org_name || 'Procurement Authority'}</div>
                    </td>
                    <td className="py-3.5 font-mono font-bold text-white">
                      ${parseFloat(tender.budget || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                      {formatTenderDate(tender.submission_deadline)}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(tender.status)}`}>
                        {tender.status || 'DRAFT'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <button
                        onClick={() => onNavigateToTenders ? onNavigateToTenders(tender.id) : null}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/25 text-xs font-bold transition shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View / Manage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
