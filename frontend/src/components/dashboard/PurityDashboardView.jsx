import React from 'react';
import {
  Wallet, Users, FileText, ShoppingCart, ArrowRight,
  TrendingUp, TrendingDown, CheckCircle2, Award, Gavel,
  Bell, CreditCard, Lock, Server, MoreVertical, Sparkles,
  Layers, ChevronRight, Activity, Building2
} from 'lucide-react';

export default function PurityDashboardView({ dashboardData, onNavigateToTenders, onNavigateToDocuments }) {
  const stats = dashboardData?.statistics || {};
  const recentTenders = dashboardData?.recent_tenders || [];

  return (
    <div className="space-y-6">
      
      {/* 1. TOP METRICS ROW (4 Cards matching Purity UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Today's Money */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Procurement Budget
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-extrabold text-slate-800">$53,000</span>
              <span className="text-xs font-bold text-emerald-500 flex items-center">
                +55%
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-500/30">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Today's Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Vendors
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-extrabold text-slate-800">2,300</span>
              <span className="text-xs font-bold text-emerald-500">
                +5%
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-500/30">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: New Clients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Submitted Bids
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-extrabold text-slate-800">+3,052</span>
              <span className="text-xs font-bold text-red-500">
                -14%
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-500/30">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Awarded Volume
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-extrabold text-slate-800">$173,000</span>
              <span className="text-xs font-bold text-emerald-500">
                +8%
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-500/30">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. DUAL HERO BANNER CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hero Card: Built by developers */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Built by developers
              </p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-snug">
                Purity tenderX Dashboard
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                From colors, cards, typography to complex procurement workflows, reverse auctions, and document OCR intelligence.
              </p>
            </div>

            {/* Chakra / Teal Emblem Box */}
            <div className="w-full md:w-56 h-36 rounded-2xl bg-gradient-to-tr from-teal-400 via-teal-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 shrink-0">
              <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span>chakra / tenderX</span>
              </div>
            </div>
          </div>

          <button
            onClick={onNavigateToTenders}
            className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-teal-600 transition group"
          >
            <span>Read more</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Right Hero Card: Work with the Rockets */}
        <div className="lg:col-span-5 rounded-2xl relative overflow-hidden shadow-xs min-h-[220px] bg-slate-900 text-white p-6 flex flex-col justify-between">
          {/* Background image & gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent z-10" />
          <img
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
            alt="Collaboration"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />

          <div className="relative z-20 space-y-2">
            <h3 className="text-xl font-extrabold tracking-tight">
              Work with the Rockets
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
              Wealth creation is an evolutionarily recent positive-sum game. It is all about who takes the opportunity first.
            </p>
          </div>

          <div className="relative z-20 pt-4">
            <button
              onClick={onNavigateToDocuments}
              className="inline-flex items-center gap-2 text-xs font-bold text-white hover:text-teal-300 transition group"
            >
              <span>Read more</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. CHARTS ROW (Bar Chart & Area Chart matching Purity UI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Active Users Bar Chart */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-4">
          {/* Dark bar chart container matching picture */}
          <div className="bg-slate-900 rounded-xl p-5 text-white">
            <div className="h-44 flex items-end justify-between gap-2 px-2 pt-2">
              {[60, 45, 85, 30, 95, 20, 100, 75, 40].map((h, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    style={{ height: `${h}%` }}
                    className="w-1.5 sm:w-2 bg-white rounded-full transition-all hover:bg-teal-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">Active Users</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="font-bold text-emerald-500">(+23)</span> than last week
            </p>
          </div>

          {/* 4 Mini indicators */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Users</p>
              <p className="text-xs font-extrabold text-slate-800 mt-0.5">32,984</p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-teal-500 h-full w-3/4 rounded-full" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Clicks</p>
              <p className="text-xs font-extrabold text-slate-800 mt-0.5">2,42m</p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-teal-500 h-full w-4/5 rounded-full" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sales</p>
              <p className="text-xs font-extrabold text-slate-800 mt-0.5">2,400$</p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-teal-500 h-full w-1/2 rounded-full" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Items</p>
              <p className="text-xs font-extrabold text-slate-800 mt-0.5">320</p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-teal-500 h-full w-2/3 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sales Overview Area Chart */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">Procurement & Sales overview</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="font-bold text-emerald-500">(+5%) more</span> in 2026
            </p>
          </div>

          {/* Clean SVG Area Chart curve matching reference image */}
          <div className="my-4 h-48 w-full relative">
            <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#319795" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#319795" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeDasharray="3 3" />

              {/* Area Fill */}
              <path
                d="M 0,110 Q 50,20 100,90 T 200,60 T 300,95 T 400,30 T 500,70 L 500,160 L 0,160 Z"
                fill="url(#areaGradient)"
              />
              {/* Teal Line */}
              <path
                d="M 0,110 Q 50,20 100,90 T 200,60 T 300,95 T 400,30 T 500,70"
                fill="none"
                stroke="#319795"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Grey Darker Line */}
              <path
                d="M 0,40 Q 50,80 100,110 T 200,120 T 300,80 T 400,100 T 500,85"
                fill="none"
                stroke="#475569"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Month labels */}
          <div className="flex justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span>
            <span>May</span><span>Jun</span><span>Jul</span><span>Aug</span>
            <span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM SECTION (Projects Table & Orders Overview Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Projects Table */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm">Projects & Tenders</h4>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold text-slate-600">30 done</span> this month
              </p>
            </div>
            <button className="text-slate-400 hover:text-slate-600 p-1">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="pb-3">COMPANIES / TENDERS</th>
                  <th className="pb-3">MEMBERS</th>
                  <th className="pb-3">BUDGET</th>
                  <th className="pb-3">COMPLETION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { name: 'Chakra Soft UI Version', budget: '$14,000', progress: 60, icon: 'Xd' },
                  { name: 'Add Progress Track', budget: '$3,000', progress: 10, icon: 'At' },
                  { name: 'Fix Platform Errors', budget: 'Not set', progress: 100, icon: 'Slack' },
                  { name: 'Launch our Mobile App', budget: '$32,000', progress: 100, icon: 'Spotify' },
                  { name: 'Add the New Pricing Page', budget: '$400', progress: 25, icon: 'Jira' },
                  { name: 'Redesign New Online Shop', budget: '$7,600', progress: 40, icon: 'In' },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 font-extrabold text-[11px] flex items-center justify-center shadow-xs">
                        {row.icon}
                      </div>
                      <span className="font-bold text-slate-800">{row.name}</span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex -space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-teal-400 border border-white" />
                        <div className="w-5 h-5 rounded-full bg-blue-400 border border-white" />
                        <div className="w-5 h-5 rounded-full bg-purple-400 border border-white" />
                      </div>
                    </td>
                    <td className="py-3.5 font-bold text-slate-800">{row.budget}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2 max-w-[120px]">
                        <span className="font-bold text-[11px] text-teal-600">{row.progress}%</span>
                        <div className="flex-1 bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${row.progress}%` }}
                            className="bg-teal-500 h-full rounded-full"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Orders overview Timeline */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">Orders & Activity overview</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="font-bold text-emerald-500">+30%</span> this month
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {[
              { text: '$2400, Design changes', time: '22 DEC 7:20 PM', icon: Bell, color: 'text-teal-500 bg-teal-50' },
              { text: 'New order #4219423', time: '21 DEC 11:21 PM', icon: FileText, color: 'text-red-500 bg-red-50' },
              { text: 'Server Payments for April', time: '21 DEC 9:28 PM', icon: Server, color: 'text-blue-500 bg-blue-50' },
              { text: 'New card added for order #3210145', time: '20 DEC 3:52 PM', icon: CreditCard, color: 'text-amber-500 bg-amber-50' },
              { text: 'Unlock packages for Development', time: '19 DEC 11:35 PM', icon: Lock, color: 'text-purple-500 bg-purple-50' },
              { text: 'New order #9851258', time: '18 DEC 4:41 PM', icon: ShoppingCart, color: 'text-slate-500 bg-slate-100' },
            ].map((event, idx) => {
              const Icon = event.icon;
              return (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className={`p-1.5 rounded-lg ${event.color} shrink-0 mt-0.5`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{event.text}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{event.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer matching reference screenshot */}
      <footer className="pt-6 pb-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <p>
          © 2026, Made with <span className="text-red-500">❤️</span> by <span className="font-bold text-slate-700">tenderX & Simmmple / Creative Tim</span> for a better web
        </p>
        <div className="flex items-center gap-6 font-semibold text-slate-500">
          <button onClick={onNavigateToTenders} className="hover:text-teal-600">Tenders</button>
          <button onClick={onNavigateToDocuments} className="hover:text-teal-600">Documents</button>
          <button onClick={() => window.open('https://github.com/Suryatej73/online_tender_management', '_blank')} className="hover:text-teal-600">License</button>
        </div>
      </footer>
    </div>
  );
}
