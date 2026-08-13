import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Check, X, Users, UserCheck, Eye, FileText, Gavel, FileCheck } from 'lucide-react';

export default function RbacInspector() {
  const { user, saveAuth } = useAuth();
  const [selectedRole, setSelectedRole] = useState(user?.role || 'VENDOR');

  const rolesConfig = [
    { key: 'SUPER_ADMIN', name: 'Super Admin', color: 'var(--rose)', icon: Shield, desc: 'Full system control, global configuration, user management' },
    { key: 'ORG_ADMIN', name: 'Organization Admin', color: 'var(--amber)', icon: Users, desc: 'Organization setup, member roles, org policy control' },
    { key: 'TENDER_MANAGER', name: 'Tender Manager', color: 'var(--primary)', icon: FileText, desc: 'Creates & publishes tenders, manages BOQ, sets bidding dates' },
    { key: 'VENDOR', name: 'Vendor / Bidder', color: 'var(--cyan)', icon: Gavel, desc: 'Views published tenders, submits encrypted technical/financial bids' },
    { key: 'EVALUATOR', name: 'Evaluator', color: 'var(--emerald)', icon: FileCheck, desc: 'Evaluates assigned technical & financial bids, submits scores' },
    { key: 'AUDITOR', name: 'Auditor', color: 'var(--accent)', icon: Eye, desc: 'Read-only compliance access to immutable audit trails & activity logs' },
  ];

  const permissionsMatrix = [
    { feature: "System Config & User Role Management", roles: { SUPER_ADMIN: true, ORG_ADMIN: true, TENDER_MANAGER: false, VENDOR: false, EVALUATOR: false, AUDITOR: false } },
    { feature: "Create & Publish Tenders / BOQ Specs", roles: { SUPER_ADMIN: true, ORG_ADMIN: true, TENDER_MANAGER: true, VENDOR: false, EVALUATOR: false, AUDITOR: false } },
    { feature: "Submit Technical & Financial Bids", roles: { SUPER_ADMIN: false, ORG_ADMIN: false, TENDER_MANAGER: false, VENDOR: true, EVALUATOR: false, AUDITOR: false } },
    { feature: "Evaluate Bids & Score Technical Submissions", roles: { SUPER_ADMIN: true, ORG_ADMIN: true, TENDER_MANAGER: true, VENDOR: false, EVALUATOR: true, AUDITOR: false } },
    { feature: "Participate in Real-time Reverse Auction", roles: { SUPER_ADMIN: false, ORG_ADMIN: false, TENDER_MANAGER: false, VENDOR: true, EVALUATOR: false, AUDITOR: false } },
    { feature: "Award Contract & Generate PO", roles: { SUPER_ADMIN: true, ORG_ADMIN: true, TENDER_MANAGER: true, VENDOR: false, EVALUATOR: false, AUDITOR: false } },
    { feature: "View Security Audit Logs & Immutable History", roles: { SUPER_ADMIN: true, ORG_ADMIN: true, TENDER_MANAGER: false, VENDOR: false, EVALUATOR: false, AUDITOR: true } },
  ];

  const simulateRole = (roleKey) => {
    setSelectedRole(roleKey);
    if (user) {
      saveAuth({ ...user, role: roleKey }, JSON.parse(localStorage.getItem('tenderx_tokens')));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 6-Role Selector Bar */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Role-Based Access Control (RBAC) 6-Role Engine</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Simulate and inspect granular permissions for each defined tenderX role</p>
          </div>
          <span className="badge badge-primary">
            Active Role: {selectedRole}
          </span>
        </div>

        <div className="grid-3" style={{ gap: '0.75rem' }}>
          {rolesConfig.map((r) => {
            const IconComp = r.icon;
            const isSelected = selectedRole === r.key;
            return (
              <button 
                key={r.key} 
                onClick={() => simulateRole(r.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: isSelected ? 'rgba(59, 130, 246, 0.18)' : 'rgba(0,0,0,0.3)',
                  border: isSelected ? `2px solid ${r.color}` : '1px solid var(--border-muted)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: r.color, display: 'flex' }}>
                  <IconComp size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: isSelected ? '#ffffff' : 'var(--text-main)' }}>{r.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="glass-card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem' }}>Granular Permission Matrix Across 6 Roles</h4>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>System Feature / Module Action</th>
              {rolesConfig.map(r => (
                <th key={r.key} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: selectedRole === r.key ? r.color : 'inherit' }}>
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionsMatrix.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.15)' : 'transparent' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{row.feature}</td>
                {rolesConfig.map(r => {
                  const allowed = row.roles[r.key];
                  const isHighlighted = selectedRole === r.key;
                  return (
                    <td key={r.key} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', background: isHighlighted ? 'rgba(59,130,246,0.08)' : 'transparent' }}>
                      {allowed ? (
                        <span style={{ display: 'inline-flex', padding: '0.25rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                          <Check size={14} />
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', padding: '0.25rem', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.15)', color: '#f87171' }}>
                          <X size={14} />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
