import React from 'react';
import { Search, Filter, X, ArrowUpDown, Building2, Shield, CheckCircle2 } from 'lucide-react';

export default function UserFiltersToolbar({ filters, setFilters, onClearFilters, organizations = [], departments = [] }) {
  const hasActiveFilters = Boolean(
    filters.search || filters.role || filters.organization || filters.department || filters.status || filters.is_verified
  );

  return (
    <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        
        {/* Search Bar */}
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-control"
            style={{ paddingLeft: '2.25rem', paddingRight: filters.search ? '2.25rem' : '0.9rem' }}
            placeholder="Search by name, email, org..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button
              onClick={() => setFilters({ ...filters, search: '' })}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <select
          className="input-control"
          style={{ width: '160px' }}
          value={filters.role || ''}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
        >
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ORG_ADMIN">Org Admin</option>
          <option value="TENDER_MANAGER">Tender Manager</option>
          <option value="VENDOR">Vendor</option>
          <option value="EVALUATOR">Evaluator</option>
          <option value="AUDITOR">Auditor</option>
        </select>

        {/* Organization Filter */}
        <select
          className="input-control"
          style={{ width: '170px' }}
          value={filters.organization || ''}
          onChange={(e) => setFilters({ ...filters, organization: e.target.value })}
        >
          <option value="">All Organizations</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          className="input-control"
          style={{ width: '150px' }}
          value={filters.status || ''}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING_VERIFICATION">Pending Verify</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>

        {/* Verification Filter */}
        <select
          className="input-control"
          style={{ width: '150px' }}
          value={filters.is_verified || ''}
          onChange={(e) => setFilters({ ...filters, is_verified: e.target.value })}
        >
          <option value="">All Verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>

        {/* Sort By */}
        <select
          className="input-control"
          style={{ width: '150px' }}
          value={filters.sort_by || '-created_at'}
          onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}
        >
          <option value="-created_at">Newest First</option>
          <option value="created_at">Oldest First</option>
          <option value="email">Email (A-Z)</option>
          <option value="-email">Email (Z-A)</option>
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="btn-secondary"
            style={{ padding: '0.65rem 0.9rem', fontSize: '0.8rem', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)' }}
          >
            <X size={14} /> Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
