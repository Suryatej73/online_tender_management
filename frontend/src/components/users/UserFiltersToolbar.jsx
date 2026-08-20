import React from 'react';
import { motion } from 'motion/react';
import { Search, X } from 'lucide-react';

export default function UserFiltersToolbar({ filters, setFilters, onClearFilters, organizations = [], departments = [] }) {
  const hasActiveFilters = Boolean(filters.search || filters.role || filters.organization || filters.department || filters.status || filters.is_verified);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 25 }}
      className="glass-card glass-card--compact"
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <Search size={15} color="var(--text-faint)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text" className="input-control"
            style={{ paddingLeft: '2.25rem', paddingRight: filters.search ? '2.25rem' : '0.9rem' }}
            placeholder="Search by name, email, org..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => setFilters({ ...filters, search: '' })}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>
              <X size={14} />
            </motion.button>
          )}
        </div>

        <select className="input-control" style={{ width: '155px' }} value={filters.role || ''} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
          <option value="">All Roles</option>
          {['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER', 'VENDOR', 'EVALUATOR', 'AUDITOR'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select className="input-control" style={{ width: '165px' }} value={filters.organization || ''} onChange={(e) => setFilters({ ...filters, organization: e.target.value })}>
          <option value="">All Organizations</option>
          {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
        </select>

        <select className="input-control" style={{ width: '145px' }} value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option>
          <option value="PENDING_VERIFICATION">Pending</option><option value="DEACTIVATED">Inactive</option>
        </select>

        <select className="input-control" style={{ width: '145px' }} value={filters.is_verified || ''} onChange={(e) => setFilters({ ...filters, is_verified: e.target.value })}>
          <option value="">All Verification</option>
          <option value="true">Verified</option><option value="false">Unverified</option>
        </select>

        <select className="input-control" style={{ width: '145px' }} value={filters.sort_by || '-created_at'} onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}>
          <option value="-created_at">Newest First</option><option value="created_at">Oldest First</option>
          <option value="email">Email A-Z</option><option value="-email">Email Z-A</option>
        </select>

        {hasActiveFilters && (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClearFilters}
            className="btn-secondary"
            style={{ padding: '0.65rem 0.9rem', fontSize: '0.78rem', color: 'var(--rose)', border: '1px solid rgba(251,113,133,0.2)', background: 'var(--rose-surface)' }}>
            <X size={13} /> Clear
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
