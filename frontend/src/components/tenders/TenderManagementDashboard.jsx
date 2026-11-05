import React, { useState, useEffect, useMemo } from 'react';

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

import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Gavel, 
  Award, 
  X, 
  Save, 
  History, 
  FileCheck, 
  Layers, 
  ChevronRight, 
  Calendar, 
  DollarSign, 
  Building,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  FilePlus,
  Send
} from 'lucide-react';
import { tendersApi } from '../../api/tendersApi';
import { useAuth } from '../../context/AuthContext';

export default function TenderManagementDashboard({ initialSelectedTenderId, onNavigateToBid } = {}) {
  const { user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_REAL_WORLD_CATEGORIES);

  const displayCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories;
    }
    return DEFAULT_REAL_WORLD_CATEGORIES;
  }, [categories]);
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

  // Modals & Drawers State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTender, setSelectedTender] = useState(null);
  const [amendmentModalOpen, setAmendmentModalOpen] = useState(false);

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

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [tendersRes, catsRes, tmplsRes] = await Promise.all([
        tendersApi.getTenders(filters),
        tendersApi.getCategories().catch(() => ({ data: [] })),
        tendersApi.getTemplates().catch(() => ({ data: [] }))
      ]);

      setTenders(tendersRes.data || []);
      const loadedCats = catsRes?.data && catsRes.data.length > 0 ? catsRes.data : DEFAULT_REAL_WORLD_CATEGORIES;
      setCategories(loadedCats);
      setTemplates(tmplsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load tender management data.');
    } finally {
      setLoading(false);
    }
  };

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

      await tendersApi.createTender(payload);
      window.dispatchEvent(new Event('tenders:changed'));
      setSuccessMsg('Draft tender created successfully!');
      setCreateModalOpen(false);
      setFormData({
        title: '', description: '', category: '', budget: '',
        submission_deadline: '', opening_date: '', eligibility_criteria: '',
        technical_requirements: '', financial_requirements: ''
      });
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create tender.');
    }
  };

  const handleApplyTemplate = async (templateId) => {
    setError('');
    try {
      await tendersApi.applyTemplate(templateId);
      window.dispatchEvent(new Event('tenders:changed'));
      setSuccessMsg('Tender created from template!');
      setTemplateModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to apply template.');
    }
  };

  const handleTransition = async (tenderId, targetStatus, reason) => {
    setError('');
    try {
      const res = await tendersApi.transitionTender(tenderId, targetStatus, reason);
      window.dispatchEvent(new Event('tenders:changed'));
      setSuccessMsg(res.message || `Tender status updated to ${targetStatus}`);
      if (selectedTender && selectedTender.id === tenderId) {
        const detailRes = await tendersApi.getTenderDetail(tenderId);
        setSelectedTender(detailRes.data);
      }
      loadData();
    } catch (err) {
      setError(err.message || 'Lifecycle transition failed.');
    }
  };

  const handleCreateAmendment = async (e) => {
    e.preventDefault();
    if (!selectedTender) return;
    setError('');
    try {
      const res = await tendersApi.createAmendment(selectedTender.id, amendmentData);
      // Auto publish amendment for demo
      await tendersApi.publishAmendment(selectedTender.id, res.data.id);
      setSuccessMsg(`Amendment #${res.data.amendment_number} issued and published! Tender version incremented.`);
      setAmendmentModalOpen(false);
      const detailRes = await tendersApi.getTenderDetail(selectedTender.id);
      setSelectedTender(detailRes.data);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to issue amendment.');
    }
  };

  useEffect(() => {
    if (initialSelectedTenderId) {
      tendersApi.getTenderDetail(initialSelectedTenderId).then(res => {
        if (res?.data) {
          setSelectedTender(res.data);
          setTimeout(() => {
            document.getElementById('tender-inspector-drawer')?.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        }
      }).catch(err => console.error('Failed to load initial tender:', err));
    }
  }, [initialSelectedTenderId]);

  const handleOpenEditModal = () => {
    if (!selectedTender) return;
    setEditFormData({
      title: selectedTender.title || '',
      description: selectedTender.description || '',
      category: selectedTender.category?.id || selectedTender.category || '',
      budget: selectedTender.budget || '',
      submission_deadline: selectedTender.submission_deadline ? selectedTender.submission_deadline.substring(0, 16) : '',
      opening_date: selectedTender.opening_date ? selectedTender.opening_date.substring(0, 16) : '',
      eligibility_criteria: selectedTender.eligibility_criteria || '',
      technical_requirements: selectedTender.technical_requirements || '',
      financial_requirements: selectedTender.financial_requirements || '',
      version: selectedTender.version
    });
    setEditModalOpen(true);
  };

  const handleUpdateTender = async (e) => {
    e.preventDefault();
    if (!selectedTender) return;
    setError('');
    try {
      const res = await tendersApi.updateTender(selectedTender.id, editFormData);
      setSuccessMsg(res.message || 'Tender updated successfully');
      setEditModalOpen(false);
      const detailRes = await tendersApi.getTenderDetail(selectedTender.id);
      setSelectedTender(detailRes.data);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update tender.');
    }
  };

  const handleDeleteTender = async () => {
    if (!selectedTender) return;
    if (!window.confirm(`Are you sure you want to permanently delete draft tender ${selectedTender.tender_number}?`)) {
      return;
    }
    setError('');
    try {
      await tendersApi.deleteTender(selectedTender.id);
      setSuccessMsg('Draft tender deleted successfully');
      setSelectedTender(null);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete tender.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return 'badge-warning';
      case 'PUBLISHED': return 'badge-primary';
      case 'ACTIVE': return 'badge-success';
      case 'EVALUATION': return 'badge-info';
      case 'AWARDED': return 'badge-success';
      case 'CLOSED': return 'badge-secondary';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-primary';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header & Quick Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FileText size={24} color="var(--primary)" /> Enterprise Tender Lifecycle Engine
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage procurement workflows, draft creation, state machine transitions, templates & amendments
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setTemplateModalOpen(true)} className="btn-secondary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>
            <FilePlus size={16} /> Apply Template
          </button>
          <button onClick={() => setCreateModalOpen(true)} className="btn-action" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>
            <Plus size={16} /> Create Draft Tender
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--emerald)', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.65rem', color: 'var(--text-dim)' }} />
            <input 
              type="text" 
              placeholder="Filter by title, tender number, description..." 
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input-control" 
              style={{ paddingLeft: '2.2rem' }}
            />
          </div>

          <select 
            value={filters.status} 
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input-control" 
            style={{ width: '180px' }}
          >
            <option value="">All Lifecycle Statuses</option>
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
            className="input-control" 
            style={{ width: '220px' }}
          >
            <option value="">All Categories</option>
            {displayCategories.map(c => (
              <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
            ))}
          </select>

          <button onClick={loadData} className="btn-secondary" style={{ padding: '0.5rem 0.85rem' }}>
            <RefreshCw size={15} /> Reset
          </button>
        </div>
      </div>

      {/* Tenders Directory Grid / Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Tender Directory ({tenders.length})</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sorted by latest creation date</span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading tender management records...</div>
        ) : tenders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No tenders found matching filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Tender Number</th>
                  <th style={{ padding: '0.75rem' }}>Title & Organization</th>
                  <th style={{ padding: '0.75rem' }}>Category</th>
                  <th style={{ padding: '0.75rem' }}>Budget</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Ver.</th>
                  <th style={{ padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.75rem' }} className="code-font">{t.tender_number}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: '700' }}>{t.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.effective_org_name}</div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{t.category_name || 'General'}</span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: '700' }}>${parseFloat(t.budget).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${getStatusBadge(t.status)}`}>{t.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem' }} className="code-font">v{t.version}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button 
                          onClick={async () => {
                            const res = await tendersApi.getTenderDetail(t.id);
                            setSelectedTender(res.data);
                            setTimeout(() => {
                              document.getElementById('tender-inspector-drawer')?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }} 
                          className="btn-secondary" 
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <Eye size={13} /> View / Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Tender Drawer / Inspector */}
      {selectedTender && (
        <div id="tender-inspector-drawer" className="glass-card" style={{ border: '1px solid var(--border-glow)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-muted)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <span className="code-font" style={{ fontSize: '1rem', color: 'var(--accent)', fontWeight: '800' }}>{selectedTender.tender_number}</span>
                <span className={`badge ${getStatusBadge(selectedTender.status)}`}>{selectedTender.status}</span>
                <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>Version v{selectedTender.version}</span>
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800' }}>{selectedTender.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedTender.effective_org_name}</p>
            </div>
            <button onClick={() => setSelectedTender(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={22} />
            </button>
          </div>

          {/* Quick Lifecycle Action Bar */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--border-muted)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              State Machine Transition Controller
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              {selectedTender.status === 'DRAFT' && (
                <>
                  <button onClick={() => handleTransition(selectedTender.id, 'PUBLISHED', 'Published by Tender Manager')} className="btn-action">
                    <Send size={15} /> Publish Tender
                  </button>
                  <button onClick={handleOpenEditModal} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Edit size={14} /> Edit Draft
                  </button>
                  <button onClick={handleDeleteTender} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Trash2 size={14} /> Delete Draft
                  </button>
                </>
              )}
              {['PUBLISHED', 'ACTIVE'].includes(selectedTender.status) && (
                <button 
                  onClick={() => {
                    if (onNavigateToBid) {
                      onNavigateToBid(selectedTender.id);
                    }
                  }} 
                  className="btn-action" 
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}
                >
                  <Award size={15} /> Submit Bid / Proposal
                </button>
              )}
              {selectedTender.status === 'PUBLISHED' && (
                <>
                  <button onClick={() => handleTransition(selectedTender.id, 'ACTIVE', 'Tender bidding launched')} className="btn-action" style={{ background: 'var(--emerald)' }}>
                    <CheckCircle2 size={15} /> Set ACTIVE Bidding
                  </button>
                  <button onClick={() => setAmendmentModalOpen(true)} className="btn-secondary">
                    <FilePlus size={15} /> Issue Amendment
                  </button>
                </>
              )}
              {selectedTender.status === 'ACTIVE' && (
                <>
                  <button onClick={() => handleTransition(selectedTender.id, 'EVALUATION', 'Submission deadline passed')} className="btn-action" style={{ background: 'var(--cyan)' }}>
                    <Gavel size={15} /> Move to EVALUATION
                  </button>
                  <button onClick={() => setAmendmentModalOpen(true)} className="btn-secondary">
                    <FilePlus size={15} /> Issue Amendment
                  </button>
                </>
              )}
              {selectedTender.status === 'EVALUATION' && (
                <button onClick={() => handleTransition(selectedTender.id, 'AWARDED', 'L1 Bidder selected')} className="btn-action" style={{ background: 'var(--emerald)' }}>
                  <Award size={15} /> AWARD Contract
                </button>
              )}
              {selectedTender.status === 'AWARDED' && (
                <button onClick={() => handleTransition(selectedTender.id, 'CLOSED', 'Contract executed & closed')} className="btn-secondary">
                  Close Tender
                </button>
              )}
              {['PUBLISHED', 'ACTIVE', 'EVALUATION'].includes(selectedTender.status) && (
                <button onClick={() => handleTransition(selectedTender.id, 'CANCELLED', 'Tender cancelled by authority')} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Cancel Tender
                </button>
              )}
            </div>
          </div>

          {/* Tender Details & History Tabs */}
          <div className="grid-2" style={{ gap: '1.5rem' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>Procurement Parameters</h4>
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div><strong>Budget:</strong> ${parseFloat(selectedTender.budget).toLocaleString()} {selectedTender.currency}</div>
                <div><strong>Submission Deadline:</strong> {selectedTender.submission_deadline ? new Date(selectedTender.submission_deadline).toLocaleString() : 'Not Set'}</div>
                <div><strong>Opening Date:</strong> {selectedTender.opening_date ? new Date(selectedTender.opening_date).toLocaleString() : 'Not Set'}</div>
                <div><strong>Description:</strong> {selectedTender.description}</div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <History size={16} /> Audit Status History ({selectedTender.status_history?.length || 0})
              </h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedTender.status_history?.map((h) => (
                  <div key={h.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                    <div style={{ fontWeight: '700' }}>{h.from_status} → {h.to_status}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{h.reason} | {new Date(h.changed_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Draft Tender Modal */}
      {createModalOpen && (
        <div className="modal-overlay" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-muted)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Create New Procurement Tender</h3>
              <button onClick={() => setCreateModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {!user ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>You are currently not signed in. Please sign in as a <strong>Tender Manager</strong> or <strong>Administrator</strong> to create tenders.</span>
              </div>
            ) : !['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER'].includes(user?.role) ? (
              <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>Your current account role is <strong>{user?.role || 'User'}</strong>. To publish tenders, please sign in with a <strong>Tender Manager</strong> or <strong>Administrator</strong> account.</span>
              </div>
            ) : null}

            <form onSubmit={handleCreateTender} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label">Tender Title</label>
                <input type="text" className="input-control" placeholder="e.g., Supply & Installation of High-Performance Server Racks" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>

              <div className="grid-2">
                <div>
                  <label className="input-label">Tender Category *</label>
                  <select 
                    className="input-control" 
                    value={formData.category} 
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">-- Select Procurement Category --</option>
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
                        <option key={c.id || c.name} value={c.id || c.name}>
                          {c.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="input-label">Budget ($ USD)</label>
                  <input type="number" step="0.01" className="input-control" placeholder="100000.00" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} required />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label className="input-label">Submission Deadline</label>
                  <input type="datetime-local" className="input-control" value={formData.submission_deadline} onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })} required />
                </div>
                <div>
                  <label className="input-label">Bid Opening Date</label>
                  <input type="datetime-local" className="input-control" value={formData.opening_date} onChange={(e) => setFormData({ ...formData, opening_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="input-label">Detailed Description</label>
                <textarea className="input-control" rows={3} placeholder="Exhaustive scope of work, technical specifications..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
              </div>

              <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-action"><Save size={16} /> Save Draft Tender</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {templateModalOpen && (
        <div className="modal-overlay" onClick={() => setTemplateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-muted)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Select Pre-Configured Tender Template</h3>
              <button onClick={() => setTemplateModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {templates.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No templates available.</div>
              ) : (
                templates.map(t => (
                  <div key={t.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontWeight: '700' }}>{t.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.description || 'Pre-configured procurement requirements'}</p>
                    </div>
                    <button onClick={() => handleApplyTemplate(t.id)} className="btn-action" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                      Apply Template
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Draft Tender Modal */}
      {editModalOpen && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-muted)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Edit Draft Tender</h3>
                <span className="code-font" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{selectedTender?.tender_number}</span>
              </div>
              <button onClick={() => setEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateTender} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label">Tender Title</label>
                <input type="text" className="input-control" value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} required />
              </div>

              <div className="grid-2">
                <div>
                  <label className="input-label">Tender Category</label>
                  <select className="input-control" value={editFormData.category} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Budget ($ USD)</label>
                  <input type="number" step="0.01" className="input-control" value={editFormData.budget} onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })} required />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label className="input-label">Submission Deadline</label>
                  <input type="datetime-local" className="input-control" value={editFormData.submission_deadline} onChange={(e) => setEditFormData({ ...editFormData, submission_deadline: e.target.value })} required />
                </div>
                <div>
                  <label className="input-label">Bid Opening Date</label>
                  <input type="datetime-local" className="input-control" value={editFormData.opening_date} onChange={(e) => setEditFormData({ ...editFormData, opening_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="input-label">Detailed Description</label>
                <textarea className="input-control" rows={3} value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} />
              </div>

              <div>
                <label className="input-label">Eligibility Criteria</label>
                <textarea className="input-control" rows={2} value={editFormData.eligibility_criteria} onChange={(e) => setEditFormData({ ...editFormData, eligibility_criteria: e.target.value })} />
              </div>

              <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-action"><Save size={16} /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Amendment Modal */}
      {amendmentModalOpen && (
        <div className="modal-overlay" onClick={() => setAmendmentModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-muted)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Issue Versioned Tender Amendment</h3>
              <button onClick={() => setAmendmentModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateAmendment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label">Amendment Title</label>
                <input type="text" className="input-control" placeholder="e.g., Extension of Submission Deadline" value={amendmentData.title} onChange={(e) => setAmendmentData({ ...amendmentData, title: e.target.value })} required />
              </div>
              <div>
                <label className="input-label">Reason for Amendment</label>
                <textarea className="input-control" rows={2} placeholder="Explain justification for modify published tender..." value={amendmentData.reason} onChange={(e) => setAmendmentData({ ...amendmentData, reason: e.target.value })} required />
              </div>

              <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setAmendmentModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-action"><Send size={16} /> Publish Amendment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
