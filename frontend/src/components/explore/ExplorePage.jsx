import React, { useState, useEffect } from 'react';
import {
  FileText, Shield, Gavel, Users, Lock, CheckCircle2,
  TrendingUp, Award, ArrowRight, Search, Building2,
  ExternalLink, Sparkles, Cpu, Clock, Layers, HelpCircle,
  LogIn, UserPlus, Eye, ChevronRight, Activity, Zap, Check,
  BarChart3, Globe, ShieldCheck, ArrowUpRight, Play
} from 'lucide-react';
import { tendersApi } from '../../api/tendersApi';

export default function ExplorePage({ onOpenLogin, onOpenRegister }) {
  const [publicTenders, setPublicTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFeatureTab, setActiveFeatureTab] = useState('tenders');

  useEffect(() => {
    async function loadPublicTenders() {
      try {
        const res = await tendersApi.getTenders({ limit: 6 });
        if (res.success && res.data) {
          setPublicTenders(res.data);
        } else if (res.tenders) {
          setPublicTenders(res.tenders);
        }
      } catch (err) {
        setPublicTenders([
          {
            id: '1',
            tender_number: 'TND-2026-000101',
            title: 'High-Capacity Cloud Data Center Infrastructure',
            category_name: 'IT & Cloud Services',
            budget: 2500000,
            currency: 'USD',
            status: 'ACTIVE',
            submission_deadline: '2026-10-15',
            effective_organization_name: 'Ministry of Digital Affairs'
          },
          {
            id: '2',
            tender_number: 'TND-2026-000102',
            title: 'Solar Photovoltaic Microgrid & Battery Storage',
            category_name: 'Renewable Energy',
            budget: 4800000,
            currency: 'USD',
            status: 'ACTIVE',
            submission_deadline: '2026-10-30',
            effective_organization_name: 'National Energy Commission'
          },
          {
            id: '3',
            tender_number: 'TND-2026-000103',
            title: 'Express Highway Civil Expansion & Smart Tolls',
            category_name: 'Civil Infrastructure',
            budget: 12500000,
            currency: 'USD',
            status: 'PUBLISHED',
            submission_deadline: '2026-11-12',
            effective_organization_name: 'Department of Public Works'
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadPublicTenders();
  }, []);

  const filteredTenders = publicTenders.filter(t => 
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tender_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 font-sans selection:bg-orange-500 selection:text-white relative overflow-hidden">
      
      {/* Background Ambient Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-30">
        <div className="absolute top-10 left-1/4 w-[500px] h-[500px] rounded-full bg-orange-600/30 blur-[140px]" />
        <div className="absolute top-32 right-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/20 blur-[130px]" />
      </div>

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 bg-[#070a12]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/30 tracking-tight">
              tX
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white block leading-tight">
                tender<span className="text-orange-500">X</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Enterprise e-Procurement
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#features" className="hover:text-orange-400 transition">Features</a>
            <a href="#showcase" className="hover:text-orange-400 transition">Dashboard Showcase</a>
            <a href="#tenders" className="hover:text-orange-400 transition">Public Tenders</a>
            <a href="#pricing" className="hover:text-orange-400 transition">Plans & Pricing</a>
          </nav>

          {/* Auth Action CTA Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-200 hover:text-white hover:bg-slate-800/80 transition border border-slate-700/80"
            >
              <LogIn className="w-4 h-4 text-orange-400" />
              <span>Sign In</span>
            </button>
            <button
              onClick={onOpenRegister}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 transition transform active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Book Demo / Register</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section matching Video style */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-md shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            Next-Generation Procurement Infrastructure
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight max-w-5xl mx-auto leading-[1.1]">
            Transform Your Work with <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">tenderX</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Ensure a transformative journey of procurement excellence. Cryptographically sealed two-envelope bidding, automated OCR intelligence, and immutable audit logs.
          </p>

          {/* Quick Search / CTA Bar */}
          <div className="mt-10 max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-3 p-2 bg-[#0e1626]/90 border border-slate-800/90 rounded-2xl shadow-2xl backdrop-blur-xl">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Enter email or tender topic..."
                className="w-full pl-11 pr-4 py-3 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
              />
            </div>
            <button
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm rounded-xl shadow-md shadow-orange-500/30 transition flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Video Showcase Frame: Interactive Dashboard Mockup Cards */}
          <div id="showcase" className="mt-16 p-4 sm:p-8 rounded-3xl bg-[#0b101d]/90 border border-slate-800/80 shadow-2xl backdrop-blur-xl relative max-w-5xl mx-auto text-left">
            
            {/* Top Showcase Toolbar */}
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
                  tX
                </div>
                <div>
                  <span className="font-extrabold text-white text-base block leading-tight">RED<span className="text-orange-500">SUN</span> Dashboard View</span>
                  <span className="text-xs text-slate-400">Import & track all procurement data from frontend</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={onOpenLogin} className="px-3.5 py-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-xs font-bold transition">
                  Launch Importer
                </button>
              </div>
            </div>

            {/* Showcase Grid Cards matching video timestamps 0:02 - 0:09 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Balance & Tender Volume */}
              <div className="bg-[#121929] p-5 rounded-2xl border border-slate-800/80 space-y-4 hover:border-orange-500/40 transition">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Balance / Tender Budget</span>
                  <span className="text-orange-400 font-extrabold">Active</span>
                </div>
                <div className="text-3xl font-black text-white">$48,500,000</div>
                <p className="text-xs text-slate-400">Total verified budget allocated across active procurement contracts.</p>
                <div className="pt-2 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    PER-01
                  </span>
                  <span className="text-xs text-slate-300">Create a working prototype</span>
                </div>
              </div>

              {/* Card 2: Users & Vendor Directory */}
              <div className="bg-[#121929] p-5 rounded-2xl border border-slate-800/80 space-y-4 hover:border-orange-500/40 transition">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Verified Users & Vendors</span>
                  <span className="text-emerald-400 font-extrabold">+8.5%</span>
                </div>
                <div className="text-3xl font-black text-white">72,250</div>
                <p className="text-xs text-slate-400">Registered contractors, evaluators, and procurement officers.</p>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-400 h-full w-[78%]" />
                </div>
              </div>

              {/* Card 3: AI Sessions & Audit Widget */}
              <div className="bg-gradient-to-br from-orange-600 to-amber-600 p-6 rounded-2xl text-white space-y-4 shadow-xl shadow-orange-500/20 relative overflow-hidden">
                <div className="absolute right-3 top-3 text-white/20">
                  <Sparkles className="w-16 h-16" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-orange-100">Quick Create Widget</div>
                <div className="text-2xl font-black">AI Tender Builder & Audit Logs</div>
                <p className="text-xs text-orange-100/90 leading-relaxed">
                  Automate RFP drafting, vendor scoring rubrics, and compliance verification.
                </p>
                <button onClick={onOpenRegister} className="px-4 py-2 bg-white text-orange-600 rounded-xl font-extrabold text-xs shadow-md hover:bg-orange-50 transition">
                  Create Tender
                </button>
              </div>

            </div>

          </div>

          {/* Marquee Trust Indicator */}
          <div className="mt-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
            Join 4,000+ companies already growing with tenderX
          </div>

        </div>
      </section>

      {/* Public Tenders Section */}
      <section id="tenders" className="py-20 bg-[#0b101c] border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Public Procurement Opportunities</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">Explore Active Tenders</h2>
              <p className="text-slate-400 text-sm mt-1">Transparent procurement notices published by government and enterprise authorities</p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search title, ID, or category..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-orange-500 bg-[#121929] text-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500">Loading tenders catalog...</div>
          ) : filteredTenders.length === 0 ? (
            <div className="py-16 text-center text-slate-500">No matching tenders found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredTenders.map(tender => (
                <div
                  key={tender.id}
                  className="bg-[#121929] rounded-2xl border border-slate-800/90 p-6 hover:border-orange-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-800 text-slate-300">
                        {tender.tender_number}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        {tender.status || 'ACTIVE'}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-lg leading-snug line-clamp-2">
                      {tender.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{tender.effective_organization_name || 'Government Authority'}</p>

                    <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <div>
                        <p className="text-[11px] text-slate-500">Estimated Budget</p>
                        <p className="font-extrabold text-white text-sm mt-0.5">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: tender.currency || 'USD', maximumFractionDigits: 0 }).format(tender.budget || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-500">Deadline</p>
                        <p className="font-semibold text-slate-300 mt-0.5">
                          {tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleDateString() : 'Active'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800">
                    <button
                      onClick={onOpenLogin}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 transition flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Sign In to View RFP & Submit Bid</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Powerful Features Section matching Video timestamp 0:10 */}
      <section id="features" className="py-20 bg-[#070a12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Powerful Features</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-1">Top Management, to help you see the bigger picture</h2>
            <p className="text-slate-400 text-base mt-2">Explore the frontier of coding evolution with tenderX Unleashed.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-[#0e1626] p-8 rounded-3xl border border-slate-800/80 space-y-4 hover:border-orange-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-xl">Two-Envelope Encrypted Bidding</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Technical proposals are evaluated objectively before financial envelopes are opened. Unsealing is cryptographically authorized by committee consensus.
              </p>
              <div className="pt-2">
                <button onClick={onOpenRegister} className="text-xs font-bold text-orange-400 flex items-center gap-1 hover:underline">
                  <span>See Doc</span> <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-[#0e1626] p-8 rounded-3xl border border-slate-800/80 space-y-4 hover:border-orange-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-xl">Document Intelligence & S3</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Automated OCR text extraction, SHA-256 integrity verification, antivirus quarantine, and version history for all specifications, BOQs, and tax certificates.
              </p>
              <div className="pt-2">
                <button onClick={onOpenRegister} className="text-xs font-bold text-orange-400 flex items-center gap-1 hover:underline">
                  <span>See Doc</span> <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-[#0e1626] p-8 rounded-3xl border border-slate-800/80 space-y-4 hover:border-orange-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-xl">Immutable Audit Logging</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Every tender transition, document download, bid opening, and evaluator scoring action is permanently recorded for regulatory and anti-corruption audit trails.
              </p>
              <div className="pt-2">
                <button onClick={onOpenRegister} className="text-xs font-bold text-orange-400 flex items-center gap-1 hover:underline">
                  <span>See Doc</span> <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Plans Section matching Video timestamp 0:14 */}
      <section id="pricing" className="py-20 bg-[#0b101c] border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Pricing & Subscription Plans</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-1">Pricing Plans for Success</h2>
            <p className="text-slate-400 text-base mt-2">Discover the perfect plan for your procurement journey with tenderX Unlimited.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Basic Plan */}
            <div className="bg-[#121929] p-8 rounded-3xl border border-slate-800/90 space-y-6 flex flex-col justify-between">
              <div>
                <div className="text-4xl font-black text-white">$49 <span className="text-sm font-bold text-slate-400">USD</span></div>
                <h3 className="text-xl font-bold text-white mt-1">Basic Plan</h3>
                <p className="text-xs text-slate-400 mt-2">Essential features for individual buyers and small vendors.</p>
                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> Access to all basic features</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> Basic reporting & analytics</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> Up to 10 individual users</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> 20GB Individual data each user</li>
                </ul>
              </div>
              <button onClick={onOpenRegister} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition">
                Get Started
              </button>
            </div>

            {/* Business Plan (Recommended / Highlighted) */}
            <div className="bg-gradient-to-b from-[#162035] to-[#0e1626] p-8 rounded-3xl border-2 border-orange-500 space-y-6 flex flex-col justify-between shadow-2xl shadow-orange-500/20 relative">
              <div className="absolute -top-3.5 right-6 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-md">
                Popular Choice
              </div>
              <div>
                <div className="text-4xl font-black text-white">$79 <span className="text-sm font-bold text-slate-400">USD</span></div>
                <h3 className="text-xl font-bold text-white mt-1">Business Plan</h3>
                <p className="text-xs text-slate-400 mt-2">Designed for growing companies and tender evaluation committees.</p>
                <ul className="mt-6 space-y-3 text-xs text-slate-200">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> Access to all basic features</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> Advanced reporting & analytics</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> Unlimited tender submissions</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> 200GB Individual data storage</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> 24/7 Priority support & SLA</li>
                </ul>
              </div>
              <button onClick={onOpenRegister} className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/30 transition">
                Get Started Now
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-[#121929] p-8 rounded-3xl border border-slate-800/90 space-y-6 flex flex-col justify-between">
              <div>
                <div className="text-4xl font-black text-white">$90 <span className="text-sm font-bold text-slate-400">USD</span></div>
                <h3 className="text-xl font-bold text-white mt-1">Enterprise Plan</h3>
                <p className="text-xs text-slate-400 mt-2">Full government & multi-department procurement suite.</p>
                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> Dedicated S3 storage cluster</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> Custom approval workflows</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> SSO & Active Directory integration</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> Immutable audit log backup</li>
                </ul>
              </div>
              <button onClick={onOpenRegister} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition">
                Get Started
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Footer matching Video */}
      <footer className="bg-[#070a12] border-t border-slate-800/80 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
              tX
            </div>
            <span className="font-bold text-white text-sm">tenderX Enterprise Procurement Platform</span>
          </div>

          <p className="text-xs text-slate-500">
            © 2026 tenderX System. Built for compliant government & enterprise procurement.
          </p>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <button onClick={onOpenLogin} className="hover:text-orange-400">Sign In</button>
            <button onClick={onOpenRegister} className="hover:text-orange-400">Register</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
