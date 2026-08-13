import React from 'react';
import SystemStatus from './components/SystemStatus';
import { 
  ShieldCheck, 
  GitBranch, 
  Workflow, 
  Box, 
  CheckCircle,
  ExternalLink,
  Code2,
  Terminal,
  Cpu
} from 'lucide-react';

export default function App() {
  const modulesList = [
    { id: 1, title: "M1: Project Setup", desc: "Docker, Git, CI/CD, Django + React", status: "completed" },
    { id: 2, title: "M2: User Auth & RBAC", desc: "JWT, Roles (Admin, Buyer, Vendor)", status: "pending" },
    { id: 3, title: "M3: Tender Creation", desc: "Category, Specs, BOQ, Attachments", status: "pending" },
    { id: 4, title: "M4: Bid Submission", desc: "Encrypted Financial & Tech Bids", status: "pending" },
    { id: 5, title: "M5: Tender Evaluation", desc: "Scoring, Comparison, Shortlisting", status: "pending" },
    { id: 6, title: "M6: Reverse Auction", desc: "Real-time Live Bidding Engine", status: "pending" },
    { id: 7, title: "M7: Award & Contract", desc: "PO Generation, Digital Signatures", status: "pending" },
    { id: 8, title: "M8: Payment Gateway", desc: "EMD, Tender Fee, Wallet", status: "pending" },
    { id: 9, title: "M9: Audit & Security", desc: "Immutable Activity Logs", status: "pending" },
    { id: 10, title: "M10: Notifications", desc: "Email, SMS, WebSockets", status: "pending" },
    { id: 11, title: "M11: Analytics & Reports", desc: "Spend Analysis, Vendor Performance", status: "pending" },
    { id: 12, title: "M12: Production & Ops", desc: "K8s, Monitoring, SSL, Hardening", status: "pending" },
  ];

  return (
    <div>
      {/* Top Navigation */}
      <nav style={{ 
        borderBottom: '1px solid var(--border-muted)', 
        background: 'rgba(9, 13, 22, 0.85)', 
        backdropFilter: 'blur(16px)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 50 
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', 
              width: '38px', 
              height: '38px', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '1.25rem',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}>
              tX
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                tenderX
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Online Tender Management Platform</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="badge badge-primary">
              <ShieldCheck size={14} /> M1 Infrastructure Verified
            </span>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
            >
              <GitBranch size={16} /> Repository Ready
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1rem' }}>
        
        {/* Module 1 Banner */}
        <div className="glass-card" style={{ 
          background: 'radial-gradient(ellipse at top right, rgba(59, 130, 246, 0.2) 0%, rgba(17, 24, 39, 0.8) 70%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ maxWidth: '720px' }}>
              <div className="badge badge-success" style={{ marginBottom: '1rem' }}>
                <CheckCircle size={14} /> Module 1 - Infrastructure Setup Complete
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.75rem', lineHeight: '1.2' }}>
                Full-Stack Architecture & Environment Initialized
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                <strong>tenderX</strong> project infrastructure is successfully established. Features multi-container Docker setup, 
                Django 4.2 REST backend, Vite React 18 frontend, PostgreSQL persistence database, Redis caching layer, Celery background worker queue, and GitHub Actions CI/CD pipeline.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><Cpu size={12} /> Python 3.11</span>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><Code2 size={12} /> React 18 + Vite</span>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><Box size={12} /> PostgreSQL 15</span>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><Workflow size={12} /> Redis + Celery</span>
                <span className="badge badge-primary" style={{ textTransform: 'none' }}><Terminal size={12} /> Docker Compose</span>
              </div>
            </div>

            {/* Quick Stats Box */}
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.35)', 
              borderRadius: '12px', 
              padding: '1.25rem', 
              border: '1px solid var(--border-muted)',
              minWidth: '240px'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                System Metrics
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Containers:</span>
                  <span className="code-font" style={{ color: 'var(--cyan)', fontWeight: '600' }}>5 Services</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>API Status:</span>
                  <span className="code-font" style={{ color: 'var(--emerald)', fontWeight: '600' }}>Operational</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>CI/CD Pipeline:</span>
                  <span className="code-font" style={{ color: 'var(--accent)', fontWeight: '600' }}>GitHub Actions</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stack Status Grid */}
        <SystemStatus />

        {/* 12-Module Roadmap Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>TenderX Project Module Roadmap (1 to 12)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sequential development modules overview</p>
            </div>
            <span className="badge badge-success">1 / 12 Completed</span>
          </div>

          <div className="grid-4">
            {modulesList.map((m) => (
              <div 
                key={m.id} 
                className="glass-card" 
                style={{ 
                  padding: '1rem',
                  borderColor: m.status === 'completed' ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-muted)',
                  background: m.status === 'completed' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="code-font" style={{ fontSize: '0.75rem', fontWeight: '700', color: m.status === 'completed' ? 'var(--emerald)' : 'var(--text-dim)' }}>
                    MODULE {m.id}
                  </span>
                  {m.status === 'completed' ? (
                    <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>Completed</span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', border: '1px solid var(--border-muted)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>Upcoming</span>
                  )}
                </div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.25rem' }}>{m.title}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ marginTop: '4rem', borderTop: '1px solid var(--border-muted)', padding: '2rem 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        <p>tenderX © 2026 | Online Tender Management System | Module 1 Setup Verification</p>
      </footer>
    </div>
  );
}
