import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, Save, RotateCcw, Lock, AlertCircle } from 'lucide-react';
import { usersApi } from '../../api/usersApi';

export default function PermissionMatrix() {
  const [selectedRole, setSelectedRole] = useState('EVALUATOR');
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [activePermissions, setActivePermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      usersApi.getRoles().catch(() => []),
      usersApi.getPermissions().catch(() => [])
    ]).then(([rolesData, permsData]) => {
      setRoles(rolesData);
      setPermissions(permsData);
      const roleObj = rolesData.find(r => r.code === selectedRole);
      if (roleObj) {
        setActivePermissions(roleObj.permissions || []);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const roleObj = roles.find(r => r.code === selectedRole);
    if (roleObj) {
      setActivePermissions(roleObj.permissions || []);
    }
  }, [selectedRole, roles]);

  const togglePermission = (code) => {
    if (activePermissions.includes(code)) {
      setActivePermissions(activePermissions.filter(c => c !== code));
    } else {
      setActivePermissions([...activePermissions, code]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await usersApi.updateRolePermissions(selectedRole, activePermissions);
      setMessage(`Successfully updated RBAC permission matrix for ${selectedRole}!`);
      // Update local role definition
      setRoles(roles.map(r => r.code === selectedRole ? { ...r, permissions: activePermissions } : r));
    } catch (err) {
      setMessage(`Error saving permissions: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by category
  const categories = Array.from(new Set(permissions.map(p => p.category_display || p.category)));

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="badge badge-purple" style={{ marginBottom: '0.35rem' }}>
            <ShieldCheck size={12} /> Fine-Grained Role Permissions Matrix
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Configure Role-Based Access Control (RBAC)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Select a target role to view or customize its authorized action capabilities.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            className="input-control"
            style={{ width: '180px', fontWeight: '700' }}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ORG_ADMIN">ORG_ADMIN</option>
            <option value="TENDER_MANAGER">TENDER_MANAGER</option>
            <option value="EVALUATOR">EVALUATOR</option>
            <option value="AUDITOR">AUDITOR</option>
            <option value="VENDOR">VENDOR</option>
          </select>

          <button className="btn-action" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving Matrix...' : 'Save Matrix'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ background: message.includes('Successfully') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${message.includes('Successfully') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: message.includes('Successfully') ? '#34d399' : '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
          {message}
        </div>
      )}

      {/* Permission Categories Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {categories.map(cat => {
          const catPerms = permissions.filter(p => (p.category_display || p.category) === cat);
          return (
            <div key={cat} style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '10px', padding: '1.25rem', border: '1px solid var(--border-muted)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--accent)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {cat}
              </h4>
              <div className="grid-2">
                {catPerms.map(perm => {
                  const isChecked = activePermissions.includes(perm.code);
                  return (
                    <label
                      key={perm.code}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        background: isChecked ? 'rgba(37,99,235,0.12)' : 'rgba(30,41,59,0.4)',
                        border: `1px solid ${isChecked ? 'rgba(37,99,235,0.4)' : 'var(--border-muted)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(perm.code)}
                        style={{ marginTop: '0.15rem', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: isChecked ? '#ffffff' : 'var(--text-muted)' }}>
                          {perm.name}
                        </div>
                        <div className="code-font" style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: '0.1rem' }}>
                          {perm.code}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                          {perm.description || 'Controls authorization capability for this action.'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
