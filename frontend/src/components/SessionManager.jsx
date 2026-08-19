import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokens?.access || ''}` },
        body: JSON.stringify({ session_id: sessionId, revoke_all: revokeAll })
      });
      if (res.ok) {
        setMsg(revokeAll ? 'All sessions revoked!' : 'Session revoked.');
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
      className="glass-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <motion.div whileHover={{ rotate: -10, scale: 1.1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
            <Monitor size={22} style={{ color: 'var(--primary-light)' }} />
          </motion.div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '750' }}>Active JWT Sessions</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Manage logged-in device sessions</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => revokeSession(null, true)}
          style={{
            background: 'var(--rose-surface)', border: '1px solid rgba(251,113,133,0.2)',
            color: 'var(--rose)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)',
            fontSize: '0.72rem', fontWeight: '650', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}
        >
          <LogOut size={13} /> Revoke All
        </motion.button>
      </div>

      {msg && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--emerald-surface)', border: '1px solid rgba(52,211,153,0.2)', color: 'var(--emerald)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={14} /> {msg}
        </motion.div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {sessions.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.82rem' }}>
            Current session active.
          </div>
        ) : (
          sessions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.04)' }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '650' }}>{s.device_type}</span>
                  <span className="badge badge-success" style={{ fontSize: '0.62rem', padding: '0.08rem 0.35rem' }}>Active</span>
                </div>
                <div className="code-font" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  IP: {s.ip_address || '127.0.0.1'} · {new Date(s.last_activity).toLocaleTimeString()}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.15, color: 'var(--rose)' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => revokeSession(s.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '0.4rem' }}
                title="Revoke session"
              >
                <Trash2 size={16} />
              </motion.button>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
