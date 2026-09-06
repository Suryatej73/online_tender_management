import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, Building2, FileText, AlertTriangle, FileSpreadsheet,
  Download, RefreshCw, CheckCircle2, XCircle, Search, Filter, Ban, AlertCircle,
  Settings, Award, Lock, Eye, MessageSquare, Plus, Bell, Activity, Flag, Trash2
} from 'lucide-react';

export default function AdminControlCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [dashboard, setDashboard] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [blacklists, setBlacklists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemSettings, setSystemSettings] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Action States
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [actionModalType, setActionModalType] = useState(null); // 'verify_org'|'suspend_vendor'|'blacklist_vendor'|'cancel_tender'|'resolve_complaint'|'add_category'
  const [reasonInput, setReasonInput] = useState('');
  const [evidenceInput, setEvidenceInput] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');

  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/dashboard/', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch admin dashboard.');
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/v1/admin/organizations/', { headers });
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch (err) { }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/v1/admin/vendors/', { headers });
      const data = await res.json();
      setVendors(data.vendors || []);
    } catch (err) { }
  };

  const fetchBlacklists = async () => {
    try {
      const res = await fetch('/api/v1/admin/blacklists/', { headers });
      const data = await res.json();
      setBlacklists(data.blacklists || []);
    } catch (err) { }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/admin/categories/', { headers });
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) { }
  };

  const fetchTenders = async () => {
    try {
      const res = await fetch('/api/v1/admin/tenders/', { headers });
      const data = await res.json();
      setTenders(data.tenders || []);
    } catch (err) { }
  };

  const fetchComplaints = async () => {
    try {
      const res = await fetch('/api/v1/admin/complaints/', { headers });
      const data = await res.json();
      setComplaints(data.complaints || []);
    } catch (err) { }
  };

  const fetchRiskAlerts = async () => {
    try {
      const res = await fetch('/api/v1/admin/risk-alerts/', { headers });
      const data = await res.json();
      setRiskAlerts(data.risk_alerts || []);
    } catch (err) { }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/admin/audit-logs/', { headers });
      const data = await res.json();
      setAuditLogs(data.audit_logs || []);
    } catch (err) { }
  };

  const fetchSystemSettings = async () => {
    try {
      const res = await fetch('/api/v1/admin/settings/', { headers });
      const data = await res.json();
      setSystemSettings(data.settings || []);
    } catch (err) { }
  };

  const fetchUsersList = async () => {
    try {
      const res = await fetch('/api/v1/admin/users/', { headers });
      const data = await res.json();
      setUsersList(data.users || []);
    } catch (err) { }
  };

  const handleUserRoleChange = async (user) => {
    const newRole = prompt(
      `Assign new role for ${user.email}:\nSUPER_ADMIN, ORG_ADMIN, TENDER_MANAGER, EVALUATOR, VENDOR, AUDITOR`,
      user.role
    );
    if (!newRole || newRole.trim().toUpperCase() === user.role) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}/role/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role: newRole.trim().toUpperCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role.');
      setSuccessMsg(data.message);
      fetchUsersList();
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUserStatusToggle = async (user) => {
    const targetAction = user.status === 'SUSPENDED' ? 'ACTIVATE' : 'SUSPEND';
    const reason = prompt(`Reason for ${targetAction.toLowerCase()}ing ${user.email}:`, targetAction === 'ACTIVATE' ? 'Account reinstated by admin' : 'Policy compliance review');
    if (reason === null) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}/status/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: targetAction, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status.');
      setSuccessMsg(data.message);
      fetchUsersList();
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchOrganizations();
    fetchVendors();
    fetchUsersList();
    fetchBlacklists();
    fetchCategories();
    fetchTenders();
    fetchComplaints();
    fetchRiskAlerts();
    fetchAuditLogs();
    fetchSystemSettings();
  }, []);

  const handleVendorAction = async (vendorId, actionType) => {
    if (!reasonInput && (actionType === 'suspend' || actionType === 'blacklist' || actionType === 'reject')) {
      alert('A reason is mandatory for this action.');
      return;
    }

    try {
      const endpoint = `/api/v1/admin/vendors/${vendorId}/${actionType}/`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: actionType.toUpperCase(), reason: reasonInput, evidence: evidenceInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed.');

      setSuccessMsg(data.message);
      setActionModalType(null);
      setReasonInput('');
      setEvidenceInput('');
      fetchVendors();
      fetchBlacklists();
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTenderCancel = async (tenderId) => {
    if (!reasonInput) {
      alert('Reason is mandatory for cancelling a tender.');
      return;
    }
    try {
      const res = await fetch(`/api/v1/admin/tenders/${tenderId}/cancel/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'CANCEL', reason: reasonInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancel failed.');

      setSuccessMsg(data.message);
      setActionModalType(null);
      setReasonInput('');
      fetchTenders();
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!categoryName) return;
    try {
      const res = await fetch('/api/v1/admin/categories/', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: categoryName, description: categoryDesc })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add category.');
      setSuccessMsg(data.message);
      setActionModalType(null);
      setCategoryName('');
      setCategoryDesc('');
      fetchCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResolveComplaint = async (complaintId) => {
    if (!reasonInput) {
      alert('Resolution notes are required.');
      return;
    }
    try {
      const res = await fetch(`/api/v1/admin/complaints/${complaintId}/resolve/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ resolution_notes: reasonInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve complaint.');
      setSuccessMsg(data.message);
      setActionModalType(null);
      setReasonInput('');
      fetchComplaints();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    if (!complaintSubject || !complaintDesc) return;
    try {
      const res = await fetch('/api/v1/admin/complaints/', {
        method: 'POST',
        headers,
        body: JSON.stringify({ subject: complaintSubject, description: complaintDesc, category: 'PLATFORM' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit complaint.');
      setSuccessMsg(data.message);
      setActionModalType(null);
      setComplaintSubject('');
      setComplaintDesc('');
      fetchComplaints();
    } catch (err) {
      alert(err.message);
    }
  };

  const exportAuditLogsCSV = () => {
    window.open('/api/v1/admin/audit-logs/export/', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-orange-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span>Admin Governance Command Center</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                Platform Administrator
              </span>
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Enterprise Governance, Verifications, Blacklists, Moderation, Audit Logs & System Policy Control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchDashboard(); fetchAuditLogs(); }}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-2 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>

          <button
            onClick={exportAuditLogsCSV}
            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Trail (CSV)</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-white/60 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap border-b border-white/10 gap-1 pb-1">
        {[
          { id: 'overview', label: 'Platform Overview', icon: Activity },
          { id: 'users', label: 'User Directory & Roles', icon: Users },
          { id: 'organizations', label: 'Organizations', icon: Building2 },
          { id: 'vendors', label: 'Vendor Governance & Blacklist', icon: ShieldCheck },
          { id: 'categories', label: 'Categories', icon: FileSpreadsheet },
          { id: 'tenders', label: 'Tender Moderation', icon: FileText },
          { id: 'complaints', label: 'Complaints & Disputes', icon: MessageSquare },
          { id: 'risk', label: 'Risk & Fraud Alerts', icon: AlertTriangle },
          { id: 'audit', label: 'Audit Trail & Security', icon: ShieldCheck },
          { id: 'settings', label: 'Platform Settings', icon: Settings },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
                isActive
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-sm shadow-orange-500/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Platform Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0d1117] p-5 rounded-2xl border border-white/10 shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Users & Orgs</span>
                <Users className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-2xl font-black text-white">{dashboard?.user_statistics?.total_users || 0}</p>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-bold">{dashboard?.user_statistics?.active_users || 0} Active</span>
                <span>•</span>
                <span className="text-amber-400 font-bold">{dashboard?.user_statistics?.pending_verifications || 0} Pending</span>
              </div>
            </div>

            <div className="bg-[#0d1117] p-5 rounded-2xl border border-white/10 shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Tenders Catalog</span>
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white">{dashboard?.tender_statistics?.total_tenders || 0}</p>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                <span className="text-blue-400 font-bold">{dashboard?.tender_statistics?.open_tenders || 0} Open</span>
                <span>•</span>
                <span className="text-purple-400 font-bold">{dashboard?.tender_statistics?.evaluation_tenders || 0} Evaluation</span>
              </div>
            </div>

            <div className="bg-[#0d1117] p-5 rounded-2xl border border-white/10 shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Vendor Roster</span>
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-white">{dashboard?.vendor_statistics?.verified_vendors || 0}</p>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-bold">{dashboard?.vendor_statistics?.verified_vendors || 0} Verified</span>
                <span>•</span>
                <span className="text-red-400 font-bold">{dashboard?.vendor_statistics?.blacklisted_vendors || 0} Blacklisted</span>
              </div>
            </div>

            <div className="bg-[#0d1117] p-5 rounded-2xl border border-white/10 shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Governance Queue</span>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-white">{dashboard?.activity_statistics?.pending_complaints || 0}</p>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                <span className="text-rose-400 font-bold">{dashboard?.activity_statistics?.pending_complaints || 0} Complaints</span>
                <span>•</span>
                <span className="text-amber-400 font-bold">{dashboard?.activity_statistics?.active_risk_alerts || 0} Risk Alerts</span>
              </div>
            </div>
          </div>

          {/* Recent Audit Trail */}
          <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl">
            <h3 className="text-sm font-extrabold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <span>Real-Time Administrative Action Log</span>
            </h3>
            <div className="space-y-2">
              {(dashboard?.recent_audit_logs || []).map(log => (
                <div key={log.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      {log.action}
                    </span>
                    <span className="text-white font-medium">{log.description}</span>
                  </div>
                  <span className="text-white/40 text-[11px]">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: User Accounts & Role Governance */}
      {activeTab === 'users' && (
        <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                <span>All Platform Registered User Accounts ({usersList.length})</span>
              </h3>
              <p className="text-[11px] text-white/50 mt-0.5">
                Central user directory listing all team members, super admins, organization admins, evaluators, and vendors
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500/50"
              >
                <option value="" className="bg-[#0d1117] text-white">All Roles</option>
                <option value="SUPER_ADMIN" className="bg-[#0d1117] text-white">Super Admin</option>
                <option value="ORG_ADMIN" className="bg-[#0d1117] text-white">Organization Admin</option>
                <option value="TENDER_MANAGER" className="bg-[#0d1117] text-white">Tender Manager</option>
                <option value="EVALUATOR" className="bg-[#0d1117] text-white">Evaluator</option>
                <option value="VENDOR" className="bg-[#0d1117] text-white">Vendor</option>
                <option value="AUDITOR" className="bg-[#0d1117] text-white">Auditor</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/5 uppercase text-[10px] text-slate-400 font-bold">
                <tr>
                  <th className="p-3">User Account</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Organization</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Email Verified</th>
                  <th className="p-3">Registered Date</th>
                  <th className="p-3 text-right">RBAC Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {usersList
                  .filter(u => {
                    const matchSearch = !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()) || (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()));
                    const matchRole = !roleFilter || u.role === roleFilter;
                    const matchStatus = !statusFilter || u.status === statusFilter;
                    return matchSearch && matchRole && matchStatus;
                  })
                  .map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition">
                      <td className="p-3 font-bold text-white">
                        <div>{u.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono font-normal">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          {u.role_display}
                        </span>
                      </td>
                      <td className="p-3">{u.organization_name}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          u.status === 'SUSPENDED' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {u.status_display}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.is_email_verified ? (
                          <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold text-[11px]">Unverified</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleUserRoleChange(u)}
                          className="px-2.5 py-1 bg-white/10 text-white rounded text-[11px] font-bold hover:bg-white/20 transition"
                        >
                          Change Role
                        </button>
                        <button
                          onClick={() => handleUserStatusToggle(u)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                            u.status === 'SUSPENDED' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                          }`}
                        >
                          {u.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-white/40 text-xs">No user accounts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Organization Management & Verification */}
      {activeTab === 'organizations' && (
        <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-white">Registered Tender Authorities & Organizations</h3>
            <span className="text-xs text-white/50">Total Organizations: {organizations.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/5 uppercase text-[10px] text-slate-400 font-bold">
                <tr>
                  <th className="p-3">Organization Name</th>
                  <th className="p-3">Code / Type</th>
                  <th className="p-3">Tax ID</th>
                  <th className="p-3">Users</th>
                  <th className="p-3">Tenders</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Governance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {organizations.map(org => (
                  <tr key={org.id} className="hover:bg-white/5 transition">
                    <td className="p-3 font-bold text-white">{org.name}</td>
                    <td className="p-3 font-mono">{org.code} ({org.org_type})</td>
                    <td className="p-3">{org.tax_id}</td>
                    <td className="p-3">{org.user_count}</td>
                    <td className="p-3">{org.tender_count}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {org.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedEntity(org);
                          setActionModalType('verify_org');
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold transition"
                      >
                        Verify / Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Vendor Governance, Blacklist & Suspension */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          {/* Vendor Roster */}
          <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-white">Vendor Directory & Verification Roster</h3>
              <span className="text-xs text-white/50">Total Vendors: {vendors.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/5 uppercase text-[10px] text-slate-400 font-bold">
                  <tr>
                    <th className="p-3">Company Name</th>
                    <th className="p-3">Registration #</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Rating</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {vendors.map(v => (
                    <tr key={v.id} className="hover:bg-white/5 transition">
                      <td className="p-3 font-bold text-white">{v.company_name}</td>
                      <td className="p-3 font-mono">{v.registration_number}</td>
                      <td className="p-3">{v.email}</td>
                      <td className="p-3 text-amber-400 font-bold">★ {v.overall_rating}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          v.status === 'BLACKLISTED' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                          v.status === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-white/10 text-white/60'
                        }`}>
                          {v.status_display}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleVendorAction(v.id, 'verify')}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[11px] font-bold hover:bg-emerald-500/30 transition"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => { setSelectedEntity(v); setActionModalType('suspend_vendor'); }}
                          className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-[11px] font-bold hover:bg-amber-500/30 transition"
                        >
                          Suspend
                        </button>
                        <button
                          onClick={() => { setSelectedEntity(v); setActionModalType('blacklist_vendor'); }}
                          className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[11px] font-bold hover:bg-red-500/30 transition"
                        >
                          Blacklist
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Blacklist Records Table */}
          <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-400" />
              <span>Official Platform Vendor Blacklist Registry</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/5 uppercase text-[10px] text-slate-400 font-bold">
                  <tr>
                    <th className="p-3">Vendor Name</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Blacklisted By</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {blacklists.map(b => (
                    <tr key={b.id}>
                      <td className="p-3 font-bold text-white">{b.vendor_name}</td>
                      <td className="p-3 text-red-300">{b.reason}</td>
                      <td className="p-3">{b.is_permanent ? 'Permanent' : 'Term-Based'}</td>
                      <td className="p-3">{b.created_by}</td>
                      <td className="p-3">{new Date(b.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {blacklists.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-white/40 text-xs">No vendors currently blacklisted.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Categories */}
      {activeTab === 'categories' && (
        <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-white">Global Procurement Categories</h3>
            <button
              onClick={() => setActionModalType('add_category')}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(c => (
              <div key={c.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="font-extrabold text-sm text-white">{c.name}</h4>
                <p className="text-xs text-white/50 mt-1">{c.description || 'No description provided.'}</p>
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
                  <span>Slug: {c.slug}</span>
                  <span className="text-emerald-400 font-bold">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Tender Moderation */}
      {activeTab === 'tenders' && (
        <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-white">Platform-Wide Tender Monitoring</h3>
              <p className="text-[11px] text-white/50">
                Admin monitors policy compliance. Note: Admin cannot directly select the tender winner.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/5 uppercase text-[10px] text-slate-400 font-bold">
                <tr>
                  <th className="p-3">Tender #</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Organization</th>
                  <th className="p-3">Budget</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tenders.map(t => (
                  <tr key={t.id}>
                    <td className="p-3 font-mono text-orange-400 font-bold">{t.tender_number}</td>
                    <td className="p-3 font-bold text-white">{t.title}</td>
                    <td className="p-3">{t.organization_name}</td>
                    <td className="p-3 font-mono">{t.currency} {t.budget.toLocaleString()}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white">
                        {t.status_display}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() => { setSelectedEntity(t); setActionModalType('cancel_tender'); }}
                        className="px-2.5 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-[11px] font-bold transition"
                      >
                        Cancel / Block
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: Complaints & Disputes */}
      {activeTab === 'complaints' && (
        <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-white">Platform Complaints & Disputes Inbox</h3>
            <button
              onClick={() => setActionModalType('create_complaint')}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Complaint</span>
            </button>
          </div>

          <div className="space-y-3">
            {complaints.map(cmp => (
              <div key={cmp.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-orange-400 font-bold">{cmp.complaint_number}</span>
                    <span className="font-bold text-white text-sm">{cmp.subject}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      {cmp.priority}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-1">Raised by: {cmp.raised_by} • Date: {new Date(cmp.created_at).toLocaleDateString()}</p>
                </div>
                {cmp.status !== 'RESOLVED' ? (
                  <button
                    onClick={() => { setSelectedEntity(cmp); setActionModalType('resolve_complaint'); }}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl text-xs font-bold transition"
                  >
                    Resolve Complaint
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Resolved
                  </span>
                )}
              </div>
            ))}
            {complaints.length === 0 && (
              <p className="text-xs text-white/40 text-center py-6">No complaints pending review.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: Risk Alerts */}
      {activeTab === 'risk' && (
        <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Fraud & Suspicious Risk Telemetry Alerts</span>
          </h3>

          <div className="space-y-3">
            {riskAlerts.map(r => (
              <div key={r.id} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-amber-400">{r.alert_code}</span>
                    <span className="font-bold text-white text-xs">{r.entity_type}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                      {r.severity}
                    </span>
                  </div>
                  <p className="text-xs text-white/70 mt-1">{r.reason}</p>
                </div>
                <span className="text-xs font-bold text-amber-400">{r.status}</span>
              </div>
            ))}
            {riskAlerts.length === 0 && (
              <p className="text-xs text-white/40 text-center py-6">Zero risk alerts detected by security heuristics.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-white">Append-Only Platform Audit Trail</h3>
            <button
              onClick={exportAuditLogsCSV}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/5 uppercase text-[10px] text-slate-400 font-bold">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map(l => (
                  <tr key={l.id}>
                    <td className="p-3 font-mono text-white/40 text-[11px]">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-bold text-white">{l.user_email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px]">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{l.entity_type}</td>
                    <td className="p-3 text-white/80">{l.description}</td>
                    <td className="p-3 font-mono text-white/40">{l.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: Settings */}
      {activeTab === 'settings' && (
        <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <h3 className="text-sm font-extrabold text-white">Global Platform Governance Settings</h3>
          <div className="space-y-3">
            {systemSettings.map(s => (
              <div key={s.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs text-orange-400 font-bold">{s.key}</span>
                  <p className="text-xs text-white/50">{s.description}</p>
                </div>
                <div className="font-mono text-sm font-extrabold text-white px-3 py-1 bg-white/10 rounded-lg">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTION MODAL DIALOG */}
      {actionModalType && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-extrabold text-white">
              {actionModalType === 'suspend_vendor' && `Suspend Vendor: ${selectedEntity?.company_name}`}
              {actionModalType === 'blacklist_vendor' && `Blacklist Vendor: ${selectedEntity?.company_name}`}
              {actionModalType === 'cancel_tender' && `Cancel Tender: ${selectedEntity?.tender_number}`}
              {actionModalType === 'add_category' && 'Create New Platform Category'}
              {actionModalType === 'create_complaint' && 'Submit Platform Complaint'}
              {actionModalType === 'resolve_complaint' && `Resolve Complaint: ${selectedEntity?.complaint_number}`}
            </h3>

            {actionModalType === 'add_category' ? (
              <form onSubmit={handleAddCategory} className="space-y-3">
                <input
                  type="text" placeholder="Category Name" value={categoryName} onChange={e => setCategoryName(e.target.value)} required
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs"
                />
                <textarea
                  placeholder="Category Description" value={categoryDesc} onChange={e => setCategoryDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs h-20"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setActionModalType(null)} className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold">Save Category</button>
                </div>
              </form>
            ) : actionModalType === 'create_complaint' ? (
              <form onSubmit={handleCreateComplaint} className="space-y-3">
                <input
                  type="text" placeholder="Complaint Subject" value={complaintSubject} onChange={e => setComplaintSubject(e.target.value)} required
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs"
                />
                <textarea
                  placeholder="Description of the issue" value={complaintDesc} onChange={e => setComplaintDesc(e.target.value)} required
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs h-24"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setActionModalType(null)} className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold">Submit</button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/70 block mb-1 font-bold">Mandatory Action Reason</label>
                  <textarea
                    placeholder="Enter explicit justification/reason for audit record..."
                    value={reasonInput} onChange={e => setReasonInput(e.target.value)} required
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs h-24"
                  />
                </div>

                {actionModalType === 'blacklist_vendor' && (
                  <div>
                    <label className="text-xs text-white/70 block mb-1 font-bold">Evidence URL / Reference</label>
                    <input
                      type="text" placeholder="https://evidence.gov/file.pdf" value={evidenceInput} onChange={e => setEvidenceInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setActionModalType(null)} className="px-4 py-2 bg-white/5 text-white rounded-xl text-xs font-bold">Cancel</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (actionModalType === 'suspend_vendor') handleVendorAction(selectedEntity.id, 'suspend');
                      if (actionModalType === 'blacklist_vendor') handleVendorAction(selectedEntity.id, 'blacklist');
                      if (actionModalType === 'cancel_tender') handleTenderCancel(selectedEntity.id);
                      if (actionModalType === 'resolve_complaint') handleResolveComplaint(selectedEntity.id);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold"
                  >
                    Confirm Action
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
