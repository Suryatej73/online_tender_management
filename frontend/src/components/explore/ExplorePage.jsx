import React, { useState, useEffect } from 'react';
import {
  FileText, Shield, Gavel, Users, Lock, CheckCircle2,
  TrendingUp, Award, ArrowRight, Search, Building2,
  ExternalLink, Sparkles, Cpu, Clock, Layers, HelpCircle,
  LogIn, UserPlus, Eye, ChevronRight
} from 'lucide-react';
import { tendersApi } from '../../api/tendersApi';

export default function ExplorePage({ onOpenLogin, onOpenRegister }) {
  const [publicTenders, setPublicTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
        // Fallback sample tenders for preview if backend is offline
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 to-teal-400 flex items-center justify-center text-white font-black text-xl shadow-md shadow-teal-500/20 tracking-tight">
              tX
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 block leading-tight">
                tender<span className="text-teal-600">X</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Online Tender Management
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#about" className="hover:text-teal-600 transition">About System</a>
            <a href="#features" className="hover:text-teal-600 transition">Features</a>
            <a href="#tenders" className="hover:text-teal-600 transition">Public Tenders</a>
            <a href="#security" className="hover:text-teal-600 transition">Security & Trust</a>
          </nav>

          {/* Auth Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:text-teal-700 hover:bg-teal-50/60 transition border border-slate-200"
            >
              <LogIn className="w-4 h-4 text-teal-600" />
              <span>Sign In</span>
            </button>
            <button
              onClick={onOpenRegister}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/25 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register / Sign Up</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 bg-gradient-to-b from-white via-slate-50 to-[#f8fafc]">
        {/* Subtle glowing background orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-40">
          <div className="absolute top-12 left-1/4 w-72 h-72 rounded-full bg-teal-200/50 blur-3xl" />
          <div className="absolute top-20 right-1/4 w-80 h-80 rounded-full bg-sky-200/50 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-700 text-xs font-bold uppercase tracking-wider mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Next-Gen Enterprise Procurement Platform
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Transparent, Secure & Intelligent <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-sky-600 bg-clip-text text-transparent">Online Tenders</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            tenderX simplifies end-to-end government and enterprise procurement with cryptographically sealed two-envelope bidding, automated evaluation scoring, and S3 document intelligence.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-xl shadow-teal-500/30 transition flex items-center justify-center gap-3"
            >
              <span>Get Started as Vendor / Buyer</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#tenders"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-sm transition flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4 text-teal-600" />
              <span>Explore Public Opportunities</span>
            </a>
          </div>

          {/* Quick Metrics Banner */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs text-left">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Tenders</p>
              <p className="text-3xl font-black text-slate-900 mt-1">140+</p>
              <p className="text-xs font-semibold text-teal-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Open for bids
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs text-left">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Value</p>
              <p className="text-3xl font-black text-slate-900 mt-1">$48.5M</p>
              <p className="text-xs font-semibold text-teal-600 mt-1">Transparently awarded</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs text-left">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Vendors</p>
              <p className="text-3xl font-black text-slate-900 mt-1">2,300+</p>
              <p className="text-xs font-semibold text-teal-600 mt-1">GST / PAN certified</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs text-left">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit & Security</p>
              <p className="text-3xl font-black text-slate-900 mt-1">100%</p>
              <p className="text-xs font-semibold text-teal-600 mt-1">SHA-256 Tamper Proof</p>
            </div>
          </div>
        </div>
      </section>

      {/* Public Tenders Section */}
      <section id="tenders" className="py-20 bg-white border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Public Opportunities</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">Explore Active Tenders</h2>
              <p className="text-slate-500 text-sm mt-1">Transparent procurement notices published by government and enterprise buyers</p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title, ID, or category..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-slate-50/50"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading tenders catalog...</div>
          ) : filteredTenders.length === 0 ? (
            <div className="py-16 text-center text-slate-400">No matching tenders found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredTenders.map(tender => (
                <div
                  key={tender.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-600">
                        {tender.tender_number}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {tender.status || 'ACTIVE'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg leading-snug line-clamp-2">
                      {tender.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{tender.effective_organization_name || 'Government Authority'}</p>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <div>
                        <p className="text-[11px] text-slate-400">Estimated Budget</p>
                        <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: tender.currency || 'USD', maximumFractionDigits: 0 }).format(tender.budget || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-400">Deadline</p>
                        <p className="font-semibold text-slate-700 mt-0.5">
                          {tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleDateString() : 'Active'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={onOpenLogin}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50/80 hover:bg-teal-100 transition flex items-center justify-center gap-1.5"
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

      {/* Features & Architecture Section */}
      <section id="features" className="py-20 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Enterprise Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">Why Leading Organizations Choose tenderX</h2>
            <p className="text-slate-500 text-base mt-2">Engineered to meet national e-procurement standards with complete transparency and zero leakage.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-xl">Two-Envelope Encrypted Bidding</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Technical proposals are evaluated objectively before financial envelopes are opened. Unsealing is cryptographically authorized by committee consensus.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-xl">Document Intelligence & S3</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Automated OCR text extraction, SHA-256 integrity verification, antivirus quarantine, and version history for all specifications, BOQs, and tax certificates.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-xl">Immutable Audit Logging</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Every tender transition, document download, bid opening, and evaluator scoring action is permanently recorded for regulatory and anti-corruption audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-sm">
              tX
            </div>
            <span className="font-bold text-slate-800 text-sm">tenderX Online Tender Management</span>
          </div>

          <p className="text-xs text-slate-500">
            © 2026 tenderX System. Built for compliant government & enterprise procurement.
          </p>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <button onClick={onOpenLogin} className="hover:text-teal-600">Sign In</button>
            <button onClick={onOpenRegister} className="hover:text-teal-600">Register</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
