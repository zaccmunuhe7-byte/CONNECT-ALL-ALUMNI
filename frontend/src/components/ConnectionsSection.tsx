import React, { useEffect, useState } from 'react';
import { UserCheck, UserX, UserMinus, MessageSquare } from 'lucide-react';
import { api } from '../api/client';
import type { Profile } from '../pages/Dashboard';

type ConnProfile = Profile & { connectionId: string };

export function ConnectionsSection({ userId, flash, onUpdate }: { userId: string; flash: (m: string, t?: 'success'|'error') => void; onUpdate: () => void }) {
  const [tab, setTab] = useState<'mine'|'pending'|'sent'>('mine');
  const [connections, setConnections] = useState<ConnProfile[]>([]);
  const [pending, setPending] = useState<ConnProfile[]>([]);
  const [sent, setSent] = useState<ConnProfile[]>([]);

  async function load() {
    setConnections(await api('/api/connections/mine'));
    setPending(await api('/api/connections/pending'));
    setSent(await api('/api/connections/sent'));
    onUpdate();
  }
  useEffect(() => { load(); }, []);

  async function accept(id: string) { await api(`/api/connections/${id}/accept`, { method: 'PATCH' }); flash('Connection accepted!'); load(); }
  async function decline(id: string) { await api(`/api/connections/${id}/decline`, { method: 'PATCH' }); flash('Request declined'); load(); }
  async function remove(id: string) { if (!confirm('Remove connection?')) return; await api(`/api/connections/${id}`, { method: 'DELETE' }); flash('Connection removed'); load(); }

  const items = tab === 'mine' ? connections : tab === 'pending' ? pending : sent;

  return (
    <div className="panel">
      <h2 className="panel-title">My Connections</h2>
      <div className="tabs">
        <button className={`tab ${tab==='mine'?'active':''}`} onClick={() => setTab('mine')}>
          Connected <span className="badge" style={{background:'var(--accent)'}}>{connections.length}</span>
        </button>
        <button className={`tab ${tab==='pending'?'active':''}`} onClick={() => setTab('pending')}>
          Received {pending.length > 0 && <span className="badge" style={{background:'var(--danger)'}}>{pending.length}</span>}
        </button>
        <button className={`tab ${tab==='sent'?'active':''}`} onClick={() => setTab('sent')}>Sent ({sent.length})</button>
      </div>
      {items.length > 0 ? (
        <div className="cards-grid">
          {items.map(p => (
            <article className="profile-card" key={p.connectionId}>
              <img src={p.media.profilePictureUrl} alt="" />
              <div className="profile-card-info">
                <strong>{p.fullName}</strong>
                <span>{p.education.university || p.education.highSchool || ''}</span>
                <span>{p.professional.currentJob || ''}</span>
              </div>
              <div className="profile-card-actions">
                {tab === 'pending' && <>
                  <button className="btn btn-success btn-sm" onClick={() => accept(p.connectionId)}><UserCheck size={14}/></button>
                  <button className="btn btn-danger btn-sm" onClick={() => decline(p.connectionId)}><UserX size={14}/></button>
                </>}
                {tab === 'mine' && <button className="btn btn-ghost btn-sm" onClick={() => remove(p.connectionId)}><UserMinus size={14}/></button>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state"><p>{tab === 'mine' ? 'No connections yet. Discover alumni!' : tab === 'pending' ? 'No pending requests.' : 'No sent requests.'}</p></div>
      )}
    </div>
  );
}
