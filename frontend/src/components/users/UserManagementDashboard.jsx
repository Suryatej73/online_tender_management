import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users, UserPlus, ShieldAlert, CheckCircle2, Clock,
  UserCheck, RefreshCw, AlertCircle, ShieldCheck
} from 'lucide-react';
import { usersApi } from '../../api/usersApi';
import UserFiltersToolbar from './UserFiltersToolbar';
import UserTable from './UserTable';
import UserProfileModal from './UserProfileModal';
import AddEditUserModal from './AddEditUserModal';

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

const scrollFadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

const scrollStagger = {
  whileInView: { opacity: 1, y: 0, transition: { staggerChildren: 0.07 } },
  viewport: { once: true, margin: '-30px' },
};

const scrollChild = {
  initial: { opacity: 0, y: 20 },
};

export default function UserManagementDashboard() {
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, active: 0, pending: 0, suspended: 0 });
  const [organizations, setOrganizations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    search: '', role: '', organization: '', department: '',
    status: '', is_verified: '', sort_by: '-created_at'
  });

  const [selectedUser, setSelectedUser] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.getUsers(filters);
      setUsers(data.users || []);
      if (data.metrics) setMetrics(data.metrics);
    } catch (err) {
      setError(err.message || 'Failed to fetch user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [filters]);
  useEffect(() => {
    usersApi.getOrganizations().then(setOrganizations).catch(() => []);
    usersApi.getDepartments().then(setDepartments).catch(() => []);
  }, []);

  const handleClearFilters = () => {
    setFilters({ search: '', role: '', organization: '', department: '', status: '', is_verified: '', sort_by: '-created_at' });
  };

  const handleTableAction = async (actionType, user) => {
    setSelectedUser(user);
    if (actionType === 'view') setProfileModalOpen(true);
    else if (actionType === 'edit') { setUserToEdit(user); setAddEditModalOpen(true); }
    else if (actionType === 'suspend') {
      setConfirmDialog({ type: 'suspend', user, title: `Suspend ${user.email}?`, message: 'Suspended users cannot access the portal.', action: async () => { await usersApi.suspendUser(user.id); loadUsers(); } });
    } else if (actionType === 'activate') { await usersApi.activateUser(user.id); loadUsers(); }
    else if (actionType === 'verify') { await usersApi.verifyUser(user.id); loadUsers(); }
    else if (actionType === 'reset-password') {
      const newPass = prompt(`New password for ${user.email}:`, 'ResetPass123!');
      if (newPass) { await usersApi.resetUserPassword(user.id, newPass); alert(`Password reset for ${user.email}.`); loadUsers(); }
    } else if (actionType === 'revoke-sessions') {
      setConfirmDialog({ type: 'revoke', user, title: `Revoke sessions for ${user.email}?`, message: 'Force log out from all devices.', action: async () => { await usersApi.revokeUserSessions(user.id); loadUsers(); } });
    } else if (actionType === 'delete') {
      setConfirmDialog({ type: 'delete', user, title: `Deactivate ${user.email}?`, message: 'Soft-delete from active directories.', action: async () => { await usersApi.deleteUser(user.id); loadUsers(); } });
    }
  };

  const metricCards = [
    { label: 'Total Users', value: metrics.total || users.length, sub: 'Registered accounts', icon: Users, color: 'var(--accent)' },
    { label: 'Active Accounts', value: metrics.active || 0, sub: 'Authorized logins', icon: UserCheck, color: 'var(--emerald)' },
    { label: 'Pending Verification', value: metrics.pending || 0, sub: 'Awaiting validation', icon: Clock, color: 'var(--amber)' },
    { label: 'Suspended', value: metrics.suspended || 0, sub: 'Access revoked', icon: ShieldAlert, color: 'var(--rose)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-0.03em' }} className="text-gradient">User Management</h2>
            <span className="badge badge-primary"><ShieldCheck size={11} /> RBAC</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Enterprise procurement directory, multi-tenant roles, verification, and audit controls.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn-secondary" onClick={loadUsers}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn-action" onClick={() => { setUserToEdit(null); setAddEditModalOpen(true); }}>
            <UserPlus size={15} /> Add User
          </motion.button>
        </div>
      </motion.div>

      {/* Metric Cards — scroll-triggered */}
      <motion.div variants={scrollStagger} initial="initial" whileInView="whileInView" viewport={scrollStagger.viewport} className="grid-4">
        {metricCards.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div key={i} variants={scrollChild} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ scale: 1.02, y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="glass-card glass-card--compact" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-dim)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '650', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</span>
                <Icon size={17} color={m.color} />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: '900', marginTop: '0.35rem', color: m.color, letterSpacing: '-0.03em' }}>{m.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '0.15rem' }}>{m.sub}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Filters */}
      <UserFiltersToolbar filters={filters} setFilters={setFilters} onClearFilters={handleClearFilters} organizations={organizations} departments={departments} />

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--rose-surface)', border: '1px solid rgba(251,113,133,0.2)', color: 'var(--rose)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} /> {error}
        </motion.div>
      )}

      {/* Table */}
      <UserTable users={users} onAction={handleTableAction} />

      {/* Modals */}
      {profileModalOpen && <UserProfileModal user={selectedUser} onClose={() => setProfileModalOpen(false)} onRefresh={loadUsers} />}
      {addEditModalOpen && <AddEditUserModal user={userToEdit} onClose={() => setAddEditModalOpen(false)} onSuccess={loadUsers} organizations={organizations} departments={departments} />}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="modal-content" style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem', color: 'var(--rose)' }}>
              <ShieldAlert size={24} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{confirmDialog.title}</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.5rem', lineHeight: '1.6' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn-secondary" onClick={() => setConfirmDialog(null)}>Cancel</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn-danger" onClick={async () => { await confirmDialog.action(); setConfirmDialog(null); }}>Confirm</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
