import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { usersApi } from '../../api/usersApi';

export default function AddEditUserModal({ user, onClose, onSuccess, organizations = [], departments = [] }) {
  const isEditing = Boolean(user);

  const [formData, setFormData] = useState({
    first_name: user?.first_name || '', last_name: user?.last_name || '',
    email: user?.email || '', role: user?.role || 'VENDOR', status: user?.status || 'ACTIVE',
    organization: user?.organization || '', department: user?.department || '',
    position_title: user?.position_title || '', phone_number: user?.phone_number || '', password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.email || !formData.email.includes('@')) { setError('Enter a valid email.'); return; }
    setLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;
      if (!payload.organization) delete payload.organization;
      if (!payload.department) delete payload.department;
      if (isEditing) await usersApi.updateUser(user.id, payload);
      else await usersApi.createUser(payload);
      onSuccess(); onClose();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="modal-content" onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.02em' }}>
            <UserPlus size={20} color="var(--accent)" /> {isEditing ? 'Edit User Account' : 'Add New User'}
          </h3>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </motion.button>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--rose-surface)', border: '1px solid rgba(251,113,133,0.2)', color: 'var(--rose)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <div><label className="input-label">First Name</label><input type="text" className="input-control" placeholder="Jane" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required /></div>
            <div><label className="input-label">Last Name</label><input type="text" className="input-control" placeholder="Doe" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required /></div>
          </div>
          <div><label className="input-label">Email</label><input type="email" className="input-control" placeholder="user@organization.gov" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
          <div className="grid-2">
            <div>
              <label className="input-label">Role</label>
              <select className="input-control" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option><option value="ORG_ADMIN">ORG_ADMIN</option>
                <option value="TENDER_MANAGER">TENDER_MANAGER</option><option value="EVALUATOR">EVALUATOR</option>
                <option value="AUDITOR">AUDITOR</option><option value="VENDOR">VENDOR</option>
              </select>
            </div>
            <div>
              <label className="input-label">Status</label>
              <select className="input-control" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option>
                <option value="PENDING_VERIFICATION">PENDING</option><option value="DEACTIVATED">DEACTIVATED</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div>
              <label className="input-label">Organization</label>
              <select className="input-control" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })}>
                <option value="">Select...</option>{organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Department</label>
              <select className="input-control" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
                <option value="">Select...</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div><label className="input-label">Position</label><input type="text" className="input-control" placeholder="Senior Procurement Specialist" value={formData.position_title} onChange={(e) => setFormData({ ...formData, position_title: e.target.value })} /></div>
            <div><label className="input-label">Phone</label><input type="text" className="input-control" placeholder="+1 (555) 019-2834" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} /></div>
          </div>
          <div><label className="input-label">{isEditing ? 'New Password (blank = keep)' : 'Initial Password'}</label><input type="password" className="input-control" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!isEditing} /></div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button" className="btn-secondary" onClick={onClose}>Cancel</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="submit" className="btn-action" disabled={loading}>
              <Save size={15} /> {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create User')}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
