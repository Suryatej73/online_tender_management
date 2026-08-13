import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Monitor, Trash2, LogOut, CheckCircle2, Shield } from 'lucide-react';

export default function SessionManager() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const tokens = localStorage.getItem('tenderx_tokens') ? JSON.parse(localStorage.getItem('tenderx_tokens')) : null;
      const res = await fetch('http://localhost:8000/api/v1/auth/sessions/', {
        headers: { 'Authorization': `Bearer ${tokens?.access || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const revokeSession = async (sessionId, revokeAll = false) => {
    try {
      const tokens = localStorage.getItem('tenderx_tokens') ? JSON.parse(localStorage.getItem('tenderx_tokens')) : null;
      const res = await fetch('http://localhost:8000/api/v1/auth/sessions/revoke/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens?.access || ''}`
        },
        body: JSON.stringify({ session_id: sessionId, revoke_all: revokeAll })
      });
      if (res.ok) {
        setMsg(revokeAll ? 'All active sessions revoked!' : 'Session revoked successfully.');
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Monitor size={22} style={{ color: 'var(--primary)' }} />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Active JWT Sessions & Device Management</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Inspect active logged-in browser instances</p>
          </div>
        </div>
        <button 
          onClick={() => revokeSession(null, true)} 
          style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f87171', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <LogOut size={14} /> Revoke All Sessions
        </button>
      </div>

      {msg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.65rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={14} /> {msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sessions.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Current session active.
          </div>
        ) : (
          sessions.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-muted)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{s.device_type}</span>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Active</span>
                </div>
                <div className="code-font" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  IP: {s.ip_address || '127.0.0.1'} | Activity: {new Date(s.last_activity).toLocaleTimeString()}
                </div>
              </div>
              <button 
                onClick={() => revokeSession(s.id)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}
                title="Revoke session"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
