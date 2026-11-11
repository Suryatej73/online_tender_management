import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileText, Plus, Search, Filter, CheckCircle2, AlertCircle, Clock, 
  Gavel, Award, X, Save, History, FileCheck, Layers, ChevronRight, 
  Calendar, DollarSign, Building, RefreshCw, Eye, Edit, Trash2, 
  FilePlus, Send, ArrowRight
} from 'lucide-react';
import { tendersApi } from '../../api/tendersApi';
import { useAuth } from '../../context/AuthContext';
import TenderDetailManagerView from './TenderDetailManagerView';

const DEFAULT_REAL_WORLD_CATEGORIES = [
  {
    id: 'civil-works',
    name: 'Civil Works & Infrastructure',
    subcategories: [
      { id: 'roads-highways', name: 'Roads, Highways & Bridges' },
      { id: 'building-construction', name: 'Building Construction & Renovation' },
      { id: 'water-supply', name: 'Water Supply & Drainage Systems' },
      { id: 'urban-planning', name: 'Urban Planning & Public Works' },
    ]
  },
  {
    id: 'it-software',
    name: 'Information Technology & Software',
    subcategories: [
      { id: 'cloud-platforms', name: 'Enterprise Software & Cloud Platforms' },
      { id: 'hardware-datacenter', name: 'Hardware Supply & Data Center Equipment' },
      { id: 'cybersecurity', name: 'Cybersecurity & Identity Management' },
      { id: 'telecom-fiber', name: 'Telecommunications & Fiber Networks' },
    ]
  },
  {
    id: 'healthcare-medical',
    name: 'Healthcare & Medical Equipment',
    subcategories: [
      { id: 'diagnostic-machinery', name: 'Diagnostic & Imaging Machinery' },
      { id: 'pharma-vaccines', name: 'Pharmaceuticals & Clinical Vaccines' },
      { id: 'hospital-furniture', name: 'Hospital Furniture & Sterilization' },
    ]
  },
  {
    id: 'electrical-energy',
    name: 'Electrical & Energy Systems',
    subcategories: [
      { id: 'solar-renewable', name: 'Solar & Renewable Power Stations' },
      { id: 'transmission-grid', name: 'Transmission Lines & Substations' },
      { id: 'backup-generators', name: 'Industrial Backup Generators & UPS' },
    ]
  },
  {
    id: 'consulting-services',
    name: 'Consulting & Professional Services',
    subcategories: [
      { id: 'arch-engineering', name: 'Architectural & Structural Engineering' },
      { id: 'financial-audit', name: 'Financial Audit & Spend Assessment' },
      { id: 'environmental-studies', name: 'Environmental Impact Studies' },
    ]
  },
  {
    id: 'facilities-maintenance',
    name: 'Facilities Management & Maintenance',
    subcategories: [
      { id: 'hvac-mechanical', name: 'HVAC, Elevator & Mechanical Maintenance' },
      { id: 'corporate-security', name: 'Corporate Physical Security & CCTV' },
      { id: 'waste-management', name: 'Industrial Janitorial & Waste Management' },
    ]
  },
  {
    id: 'industrial-goods',
    name: 'Industrial Goods & Raw Materials',
    subcategories: [
      { id: 'heavy-machinery', name: 'Heavy Machinery & Fleet Vehicles' },
      { id: 'steel-materials', name: 'Structural Steel & Construction Materials' },
      { id: 'office-supplies', name: 'Office Furniture & Technical Stationery' },
    ]
  },
  {
    id: 'transport-logistics',
    name: 'Transportation & Logistics',
    subcategories: [
      { id: 'freight-customs', name: 'Freight Forwarding & Customs Clearance' },
      { id: 'fleet-leasing', name: 'Fleet Leasing & Operational Transport' },
      { id: 'cold-storage', name: 'Cold Chain & Temperature-Controlled Storage' },
    ]
  }
];

export default function TenderManagementDashboard({ initialSelectedTenderId, onNavigateToBid } = {}) {
  const { user } = useAuth();
  const [selectedTenderId, setSelectedTenderId] = useState(initialSelectedTenderId || null);
  const [tenders, setTenders] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_REAL_WORLD_CATEGORIES);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    minBudget: '',
    maxBudget: ''
  });

  // Modals State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // New Tender Form Data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    submission_deadline: '',
    opening_date: '',
    eligibility_criteria: '',
    technical_requirements: '',
    financial_requirements: ''
  });

  const displayCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    return DEFAULT_REAL_WORLD_CATEGORIES;
  }, [categories]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tendersRes, catsRes, tmplsRes] = await Promise.all([
        tendersApi.getTenders(filters),
        tendersApi.getCategories().catch(() => ({ data: [] })),
        tendersApi.getTemplates().catch(() => ({ data: [] }))
      ]);

      setTenders(tendersRes?.data || []);
      const loadedCats = catsRes?.data && catsRes.data.length > 0 ? catsRes.data : DEFAULT_REAL_WORLD_CATEGORIES;
      setCategories(loadedCats);
      setTemplates(tmplsRes?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load tender management data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (initialSelectedTenderId) {
      setSelectedTenderId(initialSelectedTenderId);
    }
  }, [initialSelectedTenderId]);

  // Listen to external tender change events
  useEffect(() => {
    const handleTendersChanged = () => loadData();
    window.addEventListener('tenders:changed', handleTendersChanged);
    return () => window.removeEventListener('tenders:changed', handleTendersChanged);
  }, [loadData]);

  const handleCreateTender = async (e) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You are not signed in. Please sign in as a Tender Manager or Administrator to create tenders.');
      return;
    }

    const canCreate = ['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER'].includes(user?.role);
    if (!canCreate) {
      setError(`Permission denied: Your current role is ${user?.role || 'Guest'}. Only Tender Managers, Organization Admins, and Super Admins can create tenders.`);
      return;
    }

    try {
      const payload = {
        ...formData,
        category: formData.category ? formData.category : null,
        budget: formData.budget ? parseFloat(formData.budget) : 0,
        submission_deadline: formData.submission_deadline ? new Date(formData.submission_deadline).toISOString() : null,
        opening_date: formData.opening_date ? new Date(formData.opening_date).toISOString() : null
      };

      const res = await tendersApi.createTender(payload);
      window.dispatchEvent(new Event('tenders:changed'));
      setSuccessMsg('Draft tender created successfully!');
      setCreateModalOpen(false);
      setFormData({
        title: '', description: '', category: '', budget: '',
        submission_deadline: '', opening_date: '', eligibility_criteria: '',
        technical_requirements: '', financial_requirements: ''
      });
      await loadData();
      if (res?.data?.id) {
        setSelectedTenderId(res.data.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to create tender.');
    }
  };

  const handleApplyTemplate = async (templateId) => {
    setError('');
    try {
      const res = await tendersApi.applyTemplate(templateId);
      window.dispatchEvent(new Event('tenders:changed'));
      setSuccessMsg('Tender created from template!');
      setTemplateModalOpen(false);
      await loadData();
      if (res?.data?.id) {
        setSelectedTenderId(res.data.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to apply template.');
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

  // If a tender is currently selected for inspection & evaluation, show dedicated page
  if (selectedTenderId) {
    return (
      <TenderDetailManagerView
        tenderId={selectedTenderId}
        onBack={() => {
          setSelectedTenderId(null);
          loadData();
        }}
        onNavigateToBid={onNavigateToBid}
      />
    );
  }

  const isTenderManager = ['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER'].includes(user?.role);

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Procurement Directory
            </span>
            <span className="text-xs text-slate-500">Live Database</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mt-1 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            <span>Tender Lifecycle & Solicitations</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage procurement solicitations, track live state machine transitions, and evaluate submissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition"
          >
            <FilePlus className="w-3.5 h-3.5 text-slate-400" />
            <span>Templates</span>
          </button>

          {isTenderManager && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Draft Tender</span>
            </button>
          )}
        </div>
      </div>

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

      {/* 3. Search & Filter Bar */}
      <div className="bg-[#0e131f] p-4 rounded-2xl border border-white/10 shadow-xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by tender number, title, keywords..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-[#07090e] border border-white/10 rounded-xl text-white text-xs placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="w-full sm:w-44 px-3 py-2 bg-[#07090e] border border-white/10 rounded-xl text-white text-xs focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="EVALUATION">EVALUATION</option>
          <option value="AWARDED">AWARDED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="w-full sm:w-56 px-3 py-2 bg-[#07090e] border border-white/10 rounded-xl text-white text-xs focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {displayCategories.map(c => (
            <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
          ))}
        </select>

        <button
          onClick={loadData}
          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* 4. Tenders Directory Table (Only actual created tenders shown) */}
      <div className="bg-[#0e131f] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-white">Active Tenders Registry</h3>
            <span className="font-mono text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
              {tenders.length} created
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Sorted by newest creation</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
            <span className="text-xs font-semibold">Retrieving tender solicitations...</span>
          </div>
        ) : tenders.length === 0 ? (
          <div className="py-16 text-center rounded-xl border border-dashed border-white/10 bg-white/5 space-y-3">
            <FileText className="w-8 h-8 text-slate-500 mx-auto" />
            <div>
              <p className="text-sm font-bold text-white">No Tenders Found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                No procurement tenders match your selected filters.
              </p>
            </div>
            {isTenderManager && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Tender Solicitation</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[10px] uppercase font-mono font-bold text-slate-400 border-b border-white/10">
                <tr>
                  <th className="pb-3 pl-2">Tender Number</th>
                  <th className="pb-3">Title & Organization</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Budget</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Deadline</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tenders.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3.5 pl-2 font-mono font-bold text-orange-400">
                      {t.tender_number}
                    </td>
                    <td className="py-3.5 max-w-[280px]">
                      <div className="font-bold text-white truncate text-xs">{t.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{t.effective_org_name || 'Procurement Authority'}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[11px]">
                        {t.category_name || 'General Procurement'}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono font-bold text-white">
                      ${parseFloat(t.budget || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                      {t.top_evaluation_score && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-extrabold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
                            ⭐ {t.top_evaluation_score.score} / 100 ({t.top_evaluation_score.vendor_name})
                          </span>
                        </div>
                      )}
                      {t.status === 'AWARDED' && t.awarded_vendor_name && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                            🏆 Winner: {t.awarded_vendor_name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                      {t.submission_deadline ? new Date(t.submission_deadline).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <button
                        onClick={() => setSelectedTenderId(t.id)}
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

      {/* 5. Create Draft Tender Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e131f] border border-white/15 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-extrabold text-white">Create New Procurement Tender</h3>
                <p className="text-xs text-slate-400 mt-0.5">Draft tender solicitation in accordance with compliance guidelines</p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTender} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Tender Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Supply & Installation of High-Performance Data Center Equipment"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Procurement Category *</label>
                  <select
                    className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">-- Select Category --</option>
                    {displayCategories.map(c => {
                      if (c.subcategories && c.subcategories.length > 0) {
                        return (
                          <optgroup key={c.id || c.name} label={c.name}>
                            <option value={c.id || c.name}>{c.name} (General)</option>
                            {c.subcategories.map(sub => (
                              <option key={sub.id || sub.name} value={sub.id || sub.name}>
                                &nbsp;&nbsp;↳ {sub.name}
                              </option>
                            ))}
                          </optgroup>
                        );
                      }
                      return (
                        <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Allocated Budget ($ USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="150000.00"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-xl text-white font-mono placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Submission Deadline *</label>
                  <input
                    type="datetime-local"
                    value={formData.submission_deadline}
                    onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Bid Opening Date</label>
                  <input
                    type="datetime-local"
                    value={formData.opening_date}
                    onChange={(e) => setFormData({ ...formData, opening_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Detailed Description & Scope of Work *</label>
                <textarea
                  rows={3}
                  placeholder="Exhaustive scope of work, technical specifications, deliverable schedules..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#07090e] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 text-white font-bold transition shadow-md shadow-orange-500/20"
                >
                  Save Draft Tender
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Template Selection Modal */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e131f] border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Pre-Configured Procurement Templates</h3>
              <button onClick={() => setTemplateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {templates.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No standard templates available.</p>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <h4 className="font-bold text-white">{t.name}</h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">{t.description || 'Standard procurement framework'}</p>
                    </div>
                    <button
                      onClick={() => handleApplyTemplate(t.id)}
                      className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold transition shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
