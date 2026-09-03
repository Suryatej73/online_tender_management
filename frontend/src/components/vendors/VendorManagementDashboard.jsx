import React, { useState, useEffect, useCallback } from 'react';
import { vendorsApi } from '../../api/vendorsApi';
import {
  Building2, Users, ShieldCheck, ShieldAlert, ShieldOff, Ban,
  CheckCircle2, XCircle, Clock, Star, TrendingUp, Award,
  Search, Filter, ChevronDown, ChevronRight, Eye, Edit3,
  Trash2, FileText, Upload, AlertTriangle, BarChart3,
  ArrowUpDown, RefreshCw, Download, MessageSquare, Bell,
  Briefcase, MapPin, Globe, Phone, Mail, Calendar,
  BadgeCheck, X, Plus, AlertCircle, Loader2, Gavel,
  ThumbsUp, ThumbsDown, Percent
} from 'lucide-react';

const STATUS_COLORS = {
  PENDING_VERIFICATION: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  VERIFIED: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  REJECTED: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  SUSPENDED: { bg: 'rgba(249,115,22,0.15)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
  BLACKLISTED: { bg: 'rgba(220,38,38,0.15)', text: '#dc2626', border: 'rgba(220,38,38,0.3)' },
  DEACTIVATED: { bg: 'rgba(107,114,128,0.15)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' },
};

const badgeStyle = (status) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.PENDING_VERIFICATION;
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.2rem 0.6rem', borderRadius: '6px',
    background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap',
  };
};

const cardStyle = {
  background: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '14px', padding: '1.1rem',
  backdropFilter: 'blur(12px)',
};

const inputStyle = {
  width: '100%', padding: '0.55rem 0.85rem',
  borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(0,0,0,0.3)', color: '#ffffff', fontSize: '0.85rem',
  outline: 'none',
};

const btnPrimary = {
  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
  color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem',
  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
};

const btnDanger = { ...btnPrimary, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' };
const btnSuccess = { ...btnPrimary, background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' };
const btnWarn = { ...btnPrimary, background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' };
const btnGhost = { ...btnPrimary, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' };

const tabBtn = (active) => ({
  padding: '0.45rem 0.9rem', borderRadius: '8px',
  background: active ? 'var(--primary)' : 'transparent',
  border: 'none', color: active ? '#fff' : 'var(--text-muted)',
  fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem',
  display: 'flex', alignItems: 'center', gap: '0.35rem',
});

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 1000, padding: '1.5rem',
};

const modalStyle = {
  background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px', width: '100%', maxWidth: '900px',
  maxHeight: '90vh', overflow: 'auto', padding: '1.5rem',
};

function StarRating({ rating, size = 14 }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return (
    <span style={{ display: 'inline-flex', gap: '1px', color: '#fbbf24' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} fill={i < full || (i === full && half) ? '#fbbf24' : 'none'} stroke="#fbbf24" />
      ))}
      <span style={{ marginLeft: '0.3rem', color: '#94a3b8', fontSize: '0.8rem' }}>{rating?.toFixed(1)}</span>
    </span>
  );
}

function ProgressBar({ value, max = 5, color = '#3b82f6', label }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color: '#fff', fontWeight: '600' }}>{value?.toFixed(1) || '0.0'}</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '3px', background: color, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function VendorManagementDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorDetail, setVendorDetail] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [detailTab, setDetailTab] = useState('overview');

  const loadDashboard = useCallback(async () => {
    try {
      const res = await vendorsApi.getDashboard();
      if (res.success) setDashboard(res.data);
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  }, []);

  const loadVendors = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await vendorsApi.getVendors({ search, status: statusFilter, sortBy, page, limit: 20 });
      if (res.success) {
        setVendors(res.data);
        setPagination(res.pagination);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [search, statusFilter, sortBy]);

  const loadPending = useCallback(async () => {
    try {
      const res = await vendorsApi.getPendingVendors();
      if (res.success) { setVendors(res.data); setPendingCount(res.count); }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadDashboard(); loadVendors(); }, []);

  useEffect(() => {
    if (activeTab === 'overview') { loadDashboard(); loadVendors(); }
    else if (activeTab === 'pending') loadPending();
    else if (activeTab === 'categories') loadCategories();
    else if (activeTab === 'audit') loadAllAudit();
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      const res = await vendorsApi.getVendorCategories();
      if (res.success) setCategories(res.data);
    } catch (e) { console.error(e); }
  };

  const loadAllAudit = async () => {
    try {
      const res = await vendorsApi.getAllAuditLogs();
      if (res.success) setAuditLogs(res.data);
    } catch (e) { console.error(e); }
  };

  const openVendorDetail = async (v) => {
    setSelectedVendor(v);
    setDetailTab('overview');
    try {
      const res = await vendorsApi.getVendorDetail(v.id);
      if (res.success) setVendorDetail(res.data);
    } catch (e) { console.error(e); }
    try {
      const perfRes = await vendorsApi.getVendorPerformance(v.id);
      if (perfRes.success) setPerformance(perfRes.data);
    } catch (e) { console.error(e); }
    try {
      const auditRes = await vendorsApi.getVendorAuditLogs(v.id);
      if (auditRes.success) setAuditLogs(auditRes.data);
    } catch (e) { console.error(e); }
  };

  const handleVerify = async (vendorId, reason) => {
    try {
      await vendorsApi.verifyVendor(vendorId, reason);
      setSuccess('Vendor verified successfully');
      setModalType(null);
      loadVendors(); loadDashboard();
      if (selectedVendor?.id === vendorId) openVendorDetail(selectedVendor);
    } catch (e) { setError(e.message); }
  };

  const handleReject = async (vendorId, reason) => {
    try {
      await vendorsApi.rejectVendor(vendorId, reason);
      setSuccess('Vendor rejected');
      setModalType(null);
      loadVendors(); loadDashboard();
    } catch (e) { setError(e.message); }
  };

  const handleSuspend = async (vendorId, reason, remarks) => {
    try {
      await vendorsApi.suspendVendor(vendorId, reason, remarks);
      setSuccess('Vendor suspended');
      setModalType(null);
      loadVendors(); loadDashboard();
      if (selectedVendor?.id === vendorId) openVendorDetail(selectedVendor);
    } catch (e) { setError(e.message); }
  };

  const handleBlacklist = async (vendorId, reason, description) => {
    try {
      await vendorsApi.blacklistVendor(vendorId, reason, description);
      setSuccess('Vendor blacklisted');
      setModalType(null);
      loadVendors(); loadDashboard();
      if (selectedVendor?.id === vendorId) openVendorDetail(selectedVendor);
    } catch (e) { setError(e.message); }
  };

  const handleReinstate = async (vendorId) => {
    try {
      await vendorsApi.reinstateVendor(vendorId, 'Reinstated by admin');
      setSuccess('Vendor reinstated to Verified');
      loadVendors(); loadDashboard();
      if (selectedVendor?.id === vendorId) openVendorDetail(selectedVendor);
    } catch (e) { setError(e.message); }
  };

  const handleSearch = () => { loadVendors(1); };
  const handlePageChange = (p) => loadVendors(p);

  // Clear messages after 4s
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const d = dashboard || {};
  const summaryCards = [
    { label: 'Total Vendors', value: d.total_vendors || 0, icon: <Building2 size={18} />, color: '#3b82f6' },
    { label: 'Verified', value: d.verified_vendors || 0, icon: <ShieldCheck size={18} />, color: '#22c55e' },
    { label: 'Pending Verification', value: d.pending_vendors || 0, icon: <Clock size={18} />, color: '#fbbf24' },
    { label: 'Suspended', value: d.suspended_vendors || 0, icon: <ShieldAlert size={18} />, color: '#f97316' },
    { label: 'Blacklisted', value: d.blacklisted_vendors || 0, icon: <Ban size={18} />, color: '#dc2626' },
    { label: 'Avg. Rating', value: `${(d.average_rating || 0).toFixed(1)} / 5.0`, icon: <Star size={18} />, color: '#8b5cf6' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Messages */}
      {success && (
        <div style={{ ...cardStyle, border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e' }}>
          <CheckCircle2 size={16} /> {success}
        </div>
      )}
      {error && (
        <div style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>
        {summaryCards.map((c, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {[
          { key: 'overview', label: 'Vendor Directory', icon: <Building2 size={14} /> },
          { key: 'pending', label: 'Pending Verification', icon: <Clock size={14} /> },
          { key: 'categories', label: 'Categories', icon: <Briefcase size={14} /> },
          { key: 'audit', label: 'Audit Logs', icon: <FileText size={14} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={tabBtn(activeTab === t.key)}>
            {t.icon} {t.label}
            {t.key === 'pending' && pendingCount > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '0 0.4rem', fontSize: '0.65rem', fontWeight: '800' }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '0.6rem', color: 'var(--text-dim)' }} />
            <input style={{ ...inputStyle, paddingLeft: '2.2rem' }} placeholder="Search vendors by name, email, registration..."
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <select style={{ ...inputStyle, width: 'auto', minWidth: '150px' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTimeout(() => loadVendors(1), 50); }}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_COLORS).map(([k]) => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
          </select>
          <select style={{ ...inputStyle, width: 'auto', minWidth: '150px' }} value={sortBy} onChange={e => { setSortBy(e.target.value); setTimeout(() => loadVendors(1), 50); }}>
            <option value="-created_at">Newest</option>
            <option value="created_at">Oldest</option>
            <option value="-overall_rating">Highest Rating</option>
            <option value="-performance_score">Top Performance</option>
            <option value="company_name">Name A-Z</option>
            <option value="-completed_projects">Most Projects</option>
          </select>
          <button onClick={handleSearch} style={btnPrimary}><Search size={14} /> Search</button>
          <button onClick={() => loadVendors(1)} style={btnGhost}><RefreshCw size={14} /> Refresh</button>
        </div>
      )}

      {/* Vendor Table */}
      {(activeTab === 'overview' || activeTab === 'pending') && (
        <div style={cardStyle}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.7rem' }}>Company</th>
                  <th style={{ padding: '0.7rem' }}>Registration</th>
                  <th style={{ padding: '0.7rem' }}>Email</th>
                  <th style={{ padding: '0.7rem' }}>Location</th>
                  <th style={{ padding: '0.7rem' }}>Status</th>
                  <th style={{ padding: '0.7rem' }}>Rating</th>
                  <th style={{ padding: '0.7rem' }}>Performance</th>
                  <th style={{ padding: '0.7rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Building2 size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                      <div>No vendors found</div>
                    </td>
                  </tr>
                )}
                {vendors.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.7rem' }}>
                      <div style={{ fontWeight: '700', color: '#fff' }}>{v.company_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.industry || v.business_type || '—'}</div>
                    </td>
                    <td style={{ padding: '0.7rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>{v.registration_number}</td>
                    <td style={{ padding: '0.7rem' }}>{v.email}</td>
                    <td style={{ padding: '0.7rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={12} /> {[v.city, v.state, v.country].filter(Boolean).join(', ') || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem' }}>
                      <span style={badgeStyle(v.status)}>{v.status?.replace(/_/g, ' ')}</span>
                    </td>
                    <td style={{ padding: '0.7rem' }}>
                      {v.overall_rating > 0 ? <StarRating rating={Number(v.overall_rating)} /> : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.7rem' }}>
                      {v.performance_score > 0 ? (
                        <div>
                          <div style={{ fontWeight: '700', color: '#3b82f6' }}>{v.performance_score}%</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{v.completed_projects} projects</div>
                        </div>
                      ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.7rem' }}>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => openVendorDetail(v)} style={{ ...btnGhost, padding: '0.3rem 0.5rem', fontSize: '0.72rem' }} title="View Details">
                          <Eye size={13} />
                        </button>
                        {v.status === 'PENDING_VERIFICATION' && (
                          <>
                            <button onClick={() => { setSelectedVendor(v); setModalType('verify'); }} style={{ ...btnSuccess, padding: '0.3rem 0.5rem', fontSize: '0.72rem' }} title="Verify">
                              <CheckCircle2 size={13} />
                            </button>
                            <button onClick={() => { setSelectedVendor(v); setModalType('reject'); }} style={{ ...btnDanger, padding: '0.3rem 0.5rem', fontSize: '0.72rem' }} title="Reject">
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                        {v.status === 'VERIFIED' && (
                          <button onClick={() => { setSelectedVendor(v); setModalType('suspend'); }} style={{ ...btnWarn, padding: '0.3rem 0.5rem', fontSize: '0.72rem' }} title="Suspend">
                            <ShieldAlert size={13} />
                          </button>
                        )}
                        {v.status === 'SUSPENDED' && (
                          <button onClick={() => handleReinstate(v.id)} style={{ ...btnSuccess, padding: '0.3rem 0.5rem', fontSize: '0.72rem' }} title="Reinstate">
                            <ShieldCheck size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.3rem', marginTop: '1rem' }}>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => handlePageChange(p)}
                  style={{ ...btnGhost, padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: p === pagination.page ? 'var(--primary)' : 'rgba(255,255,255,0.06)' }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: '800' }}>Vendor Categories</h3>
            <button onClick={() => setModalType('addCategory')} style={btnPrimary}><Plus size={14} /> Add Category</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ ...cardStyle, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{cat.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{cat.description || 'No description'}</div>
                <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.4rem' }}>{cat.vendor_count || 0} vendors</div>
                {cat.subcategories && cat.subcategories.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {cat.subcategories.map(sub => (
                      <span key={sub.id} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>{sub.name}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {categories.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No categories defined yet</div>}
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div style={cardStyle}>
          <h3 style={{ fontWeight: '800', marginBottom: '1rem' }}>Vendor Audit Logs</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.6rem' }}>Timestamp</th>
                  <th style={{ padding: '0.6rem' }}>Vendor</th>
                  <th style={{ padding: '0.6rem' }}>User</th>
                  <th style={{ padding: '0.6rem' }}>Action</th>
                  <th style={{ padding: '0.6rem' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.6rem', fontFamily: 'monospace', fontSize: '0.73rem' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.6rem' }}>{log.vendor_name || '—'}</td>
                    <td style={{ padding: '0.6rem' }}>{log.user_name || 'System'}</td>
                    <td style={{ padding: '0.6rem' }}>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: '0.72rem', fontWeight: '600' }}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && <tr><td colSpan="5" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────── VENDOR DETAIL MODAL ──────────────── */}
      {selectedVendor && vendorDetail && (
        <div style={overlayStyle} onClick={() => { setSelectedVendor(null); setVendorDetail(null); }}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#fff', fontSize: '1rem' }}>
                  {vendorDetail.company_name?.charAt(0)}
                </div>
                <div>
                  <h2 style={{ fontWeight: '800', fontSize: '1.15rem' }}>{vendorDetail.company_name}</h2>
                  <span style={badgeStyle(vendorDetail.status)}>{vendorDetail.status?.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <button onClick={() => { setSelectedVendor(null); setVendorDetail(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Detail Tabs */}
            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {['overview', 'documents', 'ratings', 'performance', 'audit'].map(tab => (
                <button key={tab} onClick={() => setDetailTab(tab)} style={tabBtn(detailTab === tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {detailTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ ...cardStyle }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>BASIC INFO</h4>
                  <InfoRow label="Company" value={vendorDetail.company_name} />
                  <InfoRow label="Registration" value={vendorDetail.registration_number} />
                  <InfoRow label="Business Type" value={vendorDetail.business_type} />
                  <InfoRow label="Industry" value={vendorDetail.industry} />
                  <InfoRow label="Year Established" value={vendorDetail.year_established} />
                  <InfoRow label="Description" value={vendorDetail.description} />
                </div>
                <div style={{ ...cardStyle }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>CONTACT</h4>
                  <InfoRow label="Email" value={vendorDetail.email} icon={<Mail size={12} />} />
                  <InfoRow label="Phone" value={vendorDetail.phone} icon={<Phone size={12} />} />
                  <InfoRow label="Website" value={vendorDetail.website} icon={<Globe size={12} />} />
                  <InfoRow label="Address" value={[vendorDetail.address, vendorDetail.city, vendorDetail.state, vendorDetail.country].filter(Boolean).join(', ')} icon={<MapPin size={12} />} />
                  <InfoRow label="Contact Person" value={[vendorDetail.contact_person_name, vendorDetail.contact_person_designation].filter(Boolean).join(' - ')} />
                </div>
                <div style={{ ...cardStyle }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>FINANCIAL</h4>
                  <InfoRow label="Tax Number" value={vendorDetail.tax_number} />
                  <InfoRow label="Employees" value={vendorDetail.num_employees} />
                  <InfoRow label="Annual Turnover" value={vendorDetail.annual_turnover ? `$${Number(vendorDetail.annual_turnover).toLocaleString()}` : '—'} />
                </div>
                <div style={{ ...cardStyle }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>PROFILE COMPLETION</h4>
                  <div style={{ textAlign: 'center', margin: '0.75rem 0' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '800', color: vendorDetail.profile_completion >= 80 ? '#22c55e' : vendorDetail.profile_completion >= 50 ? '#fbbf24' : '#ef4444' }}>
                      {vendorDetail.profile_completion || 0}%
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', marginTop: '0.5rem' }}>
                      <div style={{ height: '100%', width: `${vendorDetail.profile_completion || 0}%`, borderRadius: '3px', background: vendorDetail.profile_completion >= 80 ? '#22c55e' : vendorDetail.profile_completion >= 50 ? '#fbbf24' : '#ef4444' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    {vendorDetail.profile_completion >= 80 ? 'Profile is strong!' : 'Encourage vendor to complete profile'}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {vendorDetail.status === 'PENDING_VERIFICATION' && (
                    <>
                      <button onClick={() => setModalType('verify')} style={btnSuccess}><CheckCircle2 size={14} /> Verify Vendor</button>
                      <button onClick={() => setModalType('reject')} style={btnDanger}><XCircle size={14} /> Reject</button>
                    </>
                  )}
                  {vendorDetail.status === 'VERIFIED' && (
                    <button onClick={() => setModalType('suspend')} style={btnWarn}><ShieldAlert size={14} /> Suspend</button>
                  )}
                  {(vendorDetail.status === 'SUSPENDED' || vendorDetail.status === 'BLACKLISTED') && (
                    <button onClick={() => handleReinstate(vendorDetail.id)} style={btnSuccess}><ShieldCheck size={14} /> Reinstate</button>
                  )}
                  {vendorDetail.status !== 'BLACKLISTED' && vendorDetail.status !== 'DEACTIVATED' && (
                    <button onClick={() => setModalType('blacklist')} style={btnDanger}><Ban size={14} /> Blacklist</button>
                  )}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {detailTab === 'documents' && (
              <div>
                <h4 style={{ fontWeight: '700', marginBottom: '0.75rem' }}>Uploaded Documents</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.5rem' }}>Type</th>
                      <th style={{ padding: '0.5rem' }}>File Name</th>
                      <th style={{ padding: '0.5rem' }}>Status</th>
                      <th style={{ padding: '0.5rem' }}>Expiry</th>
                      <th style={{ padding: '0.5rem' }}>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(vendorDetail.documents || []).map(doc => (
                      <tr key={doc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.5rem' }}>{doc.document_type?.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{doc.file_name}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600',
                            background: doc.status === 'VERIFIED' ? 'rgba(34,197,94,0.15)' : doc.status === 'REJECTED' ? 'rgba(239,68,68,0.15)' : doc.status === 'EXPIRED' ? 'rgba(249,115,22,0.15)' : 'rgba(251,191,36,0.15)',
                            color: doc.status === 'VERIFIED' ? '#22c55e' : doc.status === 'REJECTED' ? '#ef4444' : doc.status === 'EXPIRED' ? '#f97316' : '#fbbf24',
                          }}>
                            {doc.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem' }}>{doc.expiry_date || '—'}</td>
                        <td style={{ padding: '0.5rem', fontSize: '0.73rem' }}>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {(!vendorDetail.documents || vendorDetail.documents.length === 0) && (
                      <tr><td colSpan="5" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No documents uploaded</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ratings Tab */}
            {detailTab === 'ratings' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={cardStyle}>
                    <h4 style={{ fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.85rem' }}>RATING SUMMARY</h4>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#fbbf24' }}>
                        {vendorDetail.overall_rating || '0.0'}
                      </div>
                      <StarRating rating={Number(vendorDetail.overall_rating || 0)} size={18} />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        Based on {vendorDetail.rating_count || 0} rating(s)
                      </div>
                    </div>
                    <ProgressBar value={Number(vendorDetail.quality_rating || 0)} label="Quality" color="#22c55e" />
                    <ProgressBar value={Number(vendorDetail.technical_rating || 0)} label="Technical" color="#3b82f6" />
                    <ProgressBar value={Number(vendorDetail.timeliness_rating || 0)} label="Timeliness" color="#f97316" />
                    <ProgressBar value={Number(vendorDetail.communication_rating || 0)} label="Communication" color="#8b5cf6" />
                    <ProgressBar value={Number(vendorDetail.compliance_rating || 0)} label="Compliance" color="#06b6d4" />
                  </div>
                  <div style={cardStyle}>
                    <h4 style={{ fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.85rem' }}>RECENT REVIEWS</h4>
                    {(vendorDetail.status_history || []).length === 0 && (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        <MessageSquare size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <div>No reviews yet</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {detailTab === 'performance' && performance && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={cardStyle}>
                  <h4 style={{ fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.85rem' }}>PERFORMANCE METRICS</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <MetricCard label="Performance Score" value={`${performance.performance_score || 0}%`} icon={<TrendingUp size={16} />} color="#3b82f6" />
                    <MetricCard label="Completed Projects" value={performance.completed_projects || 0} icon={<Award size={16} />} color="#22c55e" />
                    <MetricCard label="Active Projects" value={performance.active_projects || 0} icon={<Briefcase size={16} />} color="#f97316" />
                    <MetricCard label="On-Time %" value={`${performance.on_time_percentage || 0}%`} icon={<Percent size={16} />} color="#8b5cf6" />
                  </div>
                </div>
                <div style={cardStyle}>
                  <h4 style={{ fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.85rem' }}>SCORE BREAKDOWN</h4>
                  <ProgressBar value={Number(performance.quality_rating || 0)} label="Quality (30%)" color="#22c55e" />
                  <ProgressBar value={Number(performance.timeliness_rating || 0)} label="Timeliness (20%)" color="#f97316" />
                  <ProgressBar value={Number(performance.technical_rating || 0)} label="Technical (20%)" color="#3b82f6" />
                  <ProgressBar value={Number(performance.communication_rating || 0)} label="Communication (10%)" color="#8b5cf6" />
                  <ProgressBar value={Number(performance.compliance_rating || 0)} label="Compliance (10%)" color="#06b6d4" />
                </div>
                {performance.records && performance.records.length > 0 && (
                  <div style={{ gridColumn: '1/-1', ...cardStyle }}>
                    <h4 style={{ fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.85rem' }}>PERFORMANCE HISTORY</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.5rem' }}>Project</th>
                          <th style={{ padding: '0.5rem' }}>Organization</th>
                          <th style={{ padding: '0.5rem' }}>Quality</th>
                          <th style={{ padding: '0.5rem' }}>Timeliness</th>
                          <th style={{ padding: '0.5rem' }}>Overall</th>
                          <th style={{ padding: '0.5rem' }}>Weighted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performance.records.map(rec => (
                          <tr key={rec.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '0.5rem' }}>{rec.tender_title || '—'}</td>
                            <td style={{ padding: '0.5rem' }}>{rec.organization_name || '—'}</td>
                            <td style={{ padding: '0.5rem' }}>{rec.quality_score}</td>
                            <td style={{ padding: '0.5rem' }}>{rec.timeliness_score}</td>
                            <td style={{ padding: '0.5rem' }}>{rec.overall_rating}</td>
                            <td style={{ padding: '0.5rem', fontWeight: '700', color: '#3b82f6' }}>{rec.weighted_score?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Audit Tab */}
            {detailTab === 'audit' && (
              <div style={cardStyle}>
                <h4 style={{ fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.85rem' }}>VENDOR AUDIT TRAIL</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.5rem' }}>Time</th>
                      <th style={{ padding: '0.5rem' }}>User</th>
                      <th style={{ padding: '0.5rem' }}>Action</th>
                      <th style={{ padding: '0.5rem' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.72rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                        <td style={{ padding: '0.5rem' }}>{log.user_name || 'System'}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontSize: '0.72rem' }}>
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem' }}>{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── ACTION MODALS ──────────────── */}
      {modalType && (
        <div style={overlayStyle} onClick={() => setModalType(null)}>
          <div style={{ ...modalStyle, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            {modalType === 'verify' && (
              <VerifyRejectModal title="Verify Vendor" icon={<CheckCircle2 size={24} color="#22c55e" />}
                vendor={selectedVendor} onConfirm={(reason) => handleVerify(selectedVendor.id, reason)} onCancel={() => setModalType(null)} color="#22c55e" />
            )}
            {modalType === 'reject' && (
              <VerifyRejectModal title="Reject Vendor" icon={<XCircle size={24} color="#ef4444" />}
                vendor={selectedVendor} onConfirm={(reason) => handleReject(selectedVendor.id, reason)} onCancel={() => setModalType(null)} color="#ef4444" />
            )}
            {modalType === 'suspend' && (
              <SuspendModal vendor={selectedVendor}
                onConfirm={(reason, remarks) => handleSuspend(selectedVendor.id, reason, remarks)}
                onCancel={() => setModalType(null)} />
            )}
            {modalType === 'blacklist' && (
              <BlacklistModal vendor={selectedVendor}
                onConfirm={(reason, desc) => handleBlacklist(selectedVendor.id, reason, desc)}
                onCancel={() => setModalType(null)} />
            )}
            {modalType === 'addCategory' && (
              <AddCategoryModal onConfirm={async (data) => {
                await vendorsApi.createVendorCategory(data);
                setSuccess('Category created');
                setModalType(null);
                loadCategories();
              }} onCancel={() => setModalType(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.82rem' }}>
      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{icon} {label}</span>
      <span style={{ fontWeight: '600', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</span>
    </div>
  );
}

function MetricCard({ label, value, icon, color }) {
  return (
    <div style={{ ...cardStyle, textAlign: 'center' }}>
      <div style={{ color, marginBottom: '0.3rem' }}>{icon}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: '800', color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function VerifyRejectModal({ title, icon, vendor, onConfirm, onCancel, color }) {
  const [reason, setReason] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        {icon}
        <div>
          <h3 style={{ fontWeight: '800' }}>{title}</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{vendor?.company_name}</p>
        </div>
      </div>
      <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Reason..."
        value={reason} onChange={e => setReason(e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={onCancel} style={btnGhost}>Cancel</button>
        <button onClick={() => onConfirm(reason)} style={{ ...btnPrimary, background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
          {title}
        </button>
      </div>
    </div>
  );
}

function SuspendModal({ vendor, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <ShieldAlert size={24} color="#f97316" />
        <div>
          <h3 style={{ fontWeight: '800' }}>Suspend Vendor</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{vendor?.company_name}</p>
        </div>
      </div>
      <input style={inputStyle} placeholder="Reason (required)" value={reason} onChange={e => setReason(e.target.value)} />
      <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', marginTop: '0.5rem' }} placeholder="Additional remarks..."
        value={remarks} onChange={e => setRemarks(e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={onCancel} style={btnGhost}>Cancel</button>
        <button onClick={() => { if (reason) onConfirm(reason, remarks); }} style={btnWarn}>Suspend</button>
      </div>
    </div>
  );
}

function BlacklistModal({ vendor, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Ban size={24} color="#dc2626" />
        <div>
          <h3 style={{ fontWeight: '800' }}>Blacklist Vendor</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{vendor?.company_name}</p>
        </div>
      </div>
      <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#f87171' }}>
        <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
        This action will permanently restrict the vendor from participating in tenders. An audit log will be recorded.
      </div>
      <input style={inputStyle} placeholder="Reason (required)" value={reason} onChange={e => setReason(e.target.value)} />
      <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', marginTop: '0.5rem' }} placeholder="Detailed description..."
        value={description} onChange={e => setDescription(e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={onCancel} style={btnGhost}>Cancel</button>
        <button onClick={() => { if (reason) onConfirm(reason, description); }} style={btnDanger}>Blacklist</button>
      </div>
    </div>
  );
}

function AddCategoryModal({ onConfirm, onCancel }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  return (
    <div>
      <h3 style={{ fontWeight: '800', marginBottom: '1rem' }}>Add Vendor Category</h3>
      <input style={inputStyle} placeholder="Category Name" value={name} onChange={e => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')); }} />
      <input style={{ ...inputStyle, marginTop: '0.5rem' }} placeholder="Slug" value={slug} readOnly />
      <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', marginTop: '0.5rem' }} placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={onCancel} style={btnGhost}>Cancel</button>
        <button onClick={() => { if (name && slug) onConfirm({ name, slug, description }); }} style={btnPrimary}>Create</button>
      </div>
    </div>
  );
}
