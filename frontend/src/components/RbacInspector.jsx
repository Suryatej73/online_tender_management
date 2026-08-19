import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Shield, Check, X, Users, UserCheck, Eye, FileText, Gavel, FileCheck } from 'lucide-react';

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export default function RbacInspector() {
  const { user, saveAuth } = useAuth();
  const [selectedRole, setSelectedRole] = useState(user?.role || 'VENDOR');

  const rolesConfig = [
    { key: 'SUPER_ADMIN', name: 'Super Admin', color: 'var(--rose)', icon: Shield, desc: 'Full system control' },
    { key: 'ORG_ADMIN', name: 'Org Admin', color: 'var(--amber)', icon: Users, desc: 'Organization management' },
    { key: 'TENDER_MANAGER', name: 'Tender Manager', color: 'var(--primary)', icon: FileText, desc: 'Creates & publishes tenders' },
    { key: 'VENDOR', name: 'Vendor', color: 'var(--cyan)', icon: Gavel, desc: 'Submits encrypted bids' },
    { key: 'EVALUATOR', name: 'Evaluator', color: 'var(--emerald)', icon: FileCheck, desc: 'Scores technical submissions' },
    { key: 'AUDITOR', name: 'Auditor', color: 'var(--accent)', icon: Eye, desc: 'Read-only compliance access' },
  ];

  const permissionsMatrix = [
    { feature: "System Config & User Management", roles: { SUPER_ADMIN: true, ORG_ADMIN: true, TENDER_MANAGER: false, VENDOR: false, EVALUATOR: false, AUDITOR: false } },
    { feature: "Create & Publish Tenders / BOQ", roles: { SUPER_ADMIN: true, ORG_ADMIN: true, TENDER_MANAGER: true, VENDOR: false, EVALUATOR: false, AUDITOR: false } },
    { feature: "Submit Technical & Financial Bids", roles: { SUPER_ADMIN: false, ORG_ADMIN: false, TENDER_MANAGER: false, VENDOR: true, EVALUATOR: false, AUDITOR: false } },
    { feature: "Evaluate Bids & Score Submissions", roles: { SUPER_ADMIN: true, ORG_ADMIN: true, TENDER_MANAGER: true, VENDOR: false, EVALUATOR: true, AUDITOR: false } },
    { feature: "Reverse Auction Participation", roles: { SUPER_ADMIN: false, ORG_ADMIN: false, TENDER_MANAGER: false, VENDOR: true, EVALUATOR: false, AUDITOR: false } },
    { feature: "Award Contract & Generate PO", roles: { SUPER_ADMIN: true, ORG_ADMIN: true, TENDER_MANAGER: true, VENDOR: false, EVALUATOR: false, AUDITOR: false } },
    { feature: "View Audit Logs & History", roles: { SUPER_ADMIN: true, ORG_ADMIN: true, TENDER_MANAGER: false, VENDOR: false, EVALUATOR: false, AUDITOR: true } },
  ];

  const simulateRole = (roleKey) => {
    setSelectedRole(roleKey);
    if (user) saveAuth({ ...user, role: roleKey }, JSON.parse(localStorage.getItem('tenderx_tokens')));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Role Selector */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 25 }} className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.02em' }} className="text-gradient">RBAC 6-Role Engine</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Simulate and inspect granular permissions for each role</p>
          </div>
          <span className="badge badge-primary">Active: {selectedRole}</span>
        </div>

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid-3" style={{ gap: '0.75rem' }}>
          {rolesConfig.map((r) => {
            const IconComp = r.icon;
            const isSelected = selectedRole === r.key;
            return (
              <motion.button
                key={r.key}
                variants={fadeUp}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => simulateRole(r.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)',
                  background: isSelected ? `${r.color}15` : 'rgba(0,0,0,0.2)',
                  border: isSelected ? `2px solid ${r.color}` : '1px solid var(--border-subtle)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 200ms',
                }}
              >
                <motion.div whileHover={{ rotate: -8 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.04)', color: r.color, display: 'flex' }}>
                  <IconComp size={18} />
                </motion.div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: isSelected ? '#ffffff' : 'var(--text-primary)' }}>{r.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>{r.desc}</div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Permissions Matrix */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 25 }} className="glass-card" style={{ overflowX: 'auto' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '750', marginBottom: '1.25rem' }}>Permission Matrix</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-dim)' }}>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: '650' }}>Feature / Action</th>
              {rolesConfig.map(r => (
                <th key={r.key} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: '650', color: selectedRole === r.key ? r.color : 'inherit' }}>{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionsMatrix.map((row, idx) => (
              <motion.tr key={idx} variants={fadeUp} style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' }}>
                <td style={{ padding: '0.85rem 0.5rem', fontWeight: '650' }}>{row.feature}</td>
                {rolesConfig.map(r => {
                  const allowed = row.roles[r.key];
                  const hl = selectedRole === r.key;
                  return (
                    <td key={r.key} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', background: hl ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                      {allowed ? (
                        <span style={{ display: 'inline-flex', padding: '0.2rem', borderRadius: '50%', background: 'var(--emerald-surface)', color: 'var(--emerald)' }}><Check size={13} /></span>
                      ) : (
                        <span style={{ display: 'inline-flex', padding: '0.2rem', borderRadius: '50%', background: 'var(--rose-surface)', color: 'var(--rose)' }}><X size={13} /></span>
                      )}
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
