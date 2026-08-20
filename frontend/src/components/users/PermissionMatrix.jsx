import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Check, Save, AlertCircle } from 'lucide-react';
import { usersApi } from '../../api/usersApi';

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const scrollFadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
};

const scrollStagger = {
  whileInView: { opacity: 1, y: 0, transition: { staggerChildren: 0.06 } },
  viewport: { once: true, margin: '-30px' },
};

const scrollChild = {
  initial: { opacity: 0, y: 20 },
};

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
      if (roleObj) setActivePermissions(roleObj.permissions || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const roleObj = roles.find(r => r.code === selectedRole);
    if (roleObj) setActivePermissions(roleObj.permissions || []);
  }, [selectedRole, roles]);

  const togglePermission = (code) => {
    setActivePermissions(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await usersApi.updateRolePermissions(selectedRole, activePermissions);
      setMessage(`Updated RBAC permissions for ${selectedRole}!`);
      setRoles(roles.map(r => r.code === selectedRole ? { ...r, permissions: activePermissions } : r));
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally { setSaving(false); }
  };

  const categories = Array.from(new Set(permissions.map(p => p.category_display || p.category)));

  return (
    <motion.div {...scrollFadeUp} transition={{ type: 'spring', stiffness: 150, damping: 20 }} className="glass-card" style={{ padding: '1.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="badge badge-purple" style={{ marginBottom: '0.4rem' }}><ShieldCheck size={11} /> Fine-Grained RBAC</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em' }} className="text-gradient">Permission Matrix Configuration</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Select a role to view or customize its authorized actions.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select className="input-control" style={{ width: '180px', fontWeight: '700' }} value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            {['SUPER_ADMIN', 'ORG_ADMIN', 'TENDER_MANAGER', 'EVALUATOR', 'AUDITOR', 'VENDOR'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn-action" onClick={handleSave} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save Matrix'}
          </motion.button>
        </div>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: message.includes('Updated') ? 'var(--emerald-surface)' : 'var(--rose-surface)',
            border: `1px solid ${message.includes('Updated') ? 'rgba(52,211,153,0.2)' : 'rgba(251,113,133,0.2)'}`,
            color: message.includes('Updated') ? 'var(--emerald)' : 'var(--rose)',
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', marginBottom: '1.25rem',
          }}>
          {message}
        </motion.div>
      )}

      <motion.div variants={scrollStagger} initial="initial" whileInView="whileInView" viewport={scrollStagger.viewport} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {categories.map(cat => {
          const catPerms = permissions.filter(p => (p.category_display || p.category) === cat);
          return (
            <motion.div key={cat} variants={scrollChild} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ background: 'rgba(10, 16, 32, 0.5)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary-light)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {cat}
              </h4>
              <div className="grid-2" style={{ gap: '0.75rem' }}>
                {catPerms.map(perm => {
                  const isChecked = activePermissions.includes(perm.code);
                  return (
                    <motion.label
                      key={perm.code}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        padding: '0.85rem', borderRadius: 'var(--radius-md)',
                        background: isChecked ? 'var(--primary-surface)' : 'rgba(30, 41, 59, 0.3)',
                        border: `1px solid ${isChecked ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer', transition: 'all 150ms',
                      }}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => togglePermission(perm.code)} style={{ marginTop: '0.15rem', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: isChecked ? '#ffffff' : 'var(--text-muted)' }}>{perm.name}</div>
                        <div className="code-font" style={{ fontSize: '0.68rem', color: 'var(--accent)', marginTop: '0.1rem' }}>{perm.code}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>{perm.description || 'Controls authorization for this action.'}</div>
                      </div>
                    </motion.label>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
