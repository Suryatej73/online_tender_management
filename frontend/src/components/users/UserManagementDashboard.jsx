import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, ShieldAlert, CheckCircle2, Clock, 
  UserCheck, RefreshCw, AlertCircle, ShieldCheck
} from 'lucide-react';
import { usersApi } from '../../api/usersApi';
import UserFiltersToolbar from './UserFiltersToolbar';
import UserTable from './UserTable';
import UserProfileModal from './UserProfileModal';
import AddEditUserModal from './AddEditUserModal';

export default function UserManagementDashboard() {
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, active: 0, pending: 0, suspended: 0 });
  const [organizations, setOrganizations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    organization: '',
    department: '',
    status: '',
    is_verified: '',
    sort_by: '-created_at'
  });

  // Modal States
  const [selectedUser, setSelectedUser] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { type, user, message, action }

  // Load Data
  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.getUsers(filters);
      setUsers(data.users || []);
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filters]);

  useEffect(() => {
    usersApi.getOrganizations().then(setOrganizations).catch(() => []);
    usersApi.getDepartments().then(setDepartments).catch(() => []);
  }, []);

  const handleClearFilters = () => {
    setFilters({
      search: '',
      role: '',
      organization: '',
      department: '',
      status: '',
      is_verified: '',
      sort_by: '-created_at'
    });
  };

  // Table Action Handler
  const handleTableAction = async (actionType, user) => {
    setSelectedUser(user);
    if (actionType === 'view') {
      setProfileModalOpen(true);
    } else if (actionType === 'edit') {
      setUserToEdit(user);
      setAddEditModalOpen(true);
    } else if (actionType === 'suspend') {
      setConfirmDialog({
        type: 'suspend',
        user,
        title: `Suspend Account ${user.email}?`,
        message: 'Suspended users cannot access the portal and their active sessions will be revoked instantly.',
        action: async () => {
          await usersApi.suspendUser(user.id);
          loadUsers();
        }
      });
    } else if (actionType === 'activate') {
      await usersApi.activateUser(user.id);
      loadUsers();
    } else if (actionType === 'verify') {
      await usersApi.verifyUser(user.id);
      loadUsers();
    } else if (actionType === 'reset-password') {
      const newPass = prompt(`Enter new password for ${user.email}:`, 'ResetPass123!');
      if (newPass) {
        await usersApi.resetUserPassword(user.id, newPass);
        alert(`Password has been reset for ${user.email}. Active sessions revoked.`);
        loadUsers();
      }
    } else if (actionType === 'revoke-sessions') {
      setConfirmDialog({
        type: 'revoke',
        user,
        title: `Revoke All Sessions for ${user.email}?`,
        message: 'This will force log out the user from all active browsers and mobile devices.',
        action: async () => {
          await usersApi.revokeUserSessions(user.id);
          loadUsers();
        }
      });
    } else if (actionType === 'delete') {
      setConfirmDialog({
        type: 'delete',
        user,
        title: `Deactivate Account ${user.email}?`,
        message: 'This action soft-deletes the user from active procurement directories.',
        action: async () => {
          await usersApi.deleteUser(user.id);
          loadUsers();
        }
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Title & Primary Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>User Management Dashboard</h2>
            <span className="badge badge-primary"><ShieldCheck size={12} /> RBAC Controlled</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Enterprise procurement directory, multi-tenant role assignments, verification status, and audit controls.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={loadUsers}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="btn-action" onClick={() => { setUserToEdit(null); setAddEditModalOpen(true); }}>
            <UserPlus size={16} /> Add User
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid-4">
        <div className="glass-card" style={{ padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Total Users</span>
            <Users size={18} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.35rem' }}>{metrics.total || users.length}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Registered accounts</div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Active Accounts</span>
            <UserCheck size={18} color="var(--emerald)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--emerald)', marginTop: '0.35rem' }}>{metrics.active || 0}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Authorized active logins</div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Pending Verification</span>
            <Clock size={18} color="var(--amber)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--amber)', marginTop: '0.35rem' }}>{metrics.pending || 0}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Awaiting email validation</div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Suspended Accounts</span>
            <ShieldAlert size={18} color="var(--rose)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--rose)', marginTop: '0.35rem' }}>{metrics.suspended || 0}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Security access revoked</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <UserFiltersToolbar
        filters={filters}
        setFilters={setFilters}
        onClearFilters={handleClearFilters}
        organizations={organizations}
        departments={departments}
      />

      {/* Error Message */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Main Users Table */}
      <UserTable users={users} onAction={handleTableAction} />

      {/* Modals */}
      {profileModalOpen && (
        <UserProfileModal
          user={selectedUser}
          onClose={() => setProfileModalOpen(false)}
          onRefresh={loadUsers}
        />
      )}

      {addEditModalOpen && (
        <AddEditUserModal
          user={userToEdit}
          onClose={() => setAddEditModalOpen(false)}
          onSuccess={loadUsers}
          organizations={organizations}
          departments={departments}
        />
      )}

      {/* Destructive Action Confirm Dialog */}
      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#f87171' }}>
              <ShieldAlert size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>{confirmDialog.title}</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => setConfirmDialog(null)}>Cancel</button>
              <button
                className="btn-danger"
                onClick={async () => {
                  await confirmDialog.action();
                  setConfirmDialog(null);
                }}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
