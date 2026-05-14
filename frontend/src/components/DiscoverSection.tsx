import React, { useEffect, useState, useRef } from 'react';
import { Search, UserPlus, Clock, X } from 'lucide-react';
import { api } from '../api/client';
import type { Profile } from '../pages/Dashboard';

type SentRequest = { connectionId: string; userId: string };

export function DiscoverSection({ userId, flash }: { userId: string; flash: (m: string, t?: 'success'|'error') => void }) {
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [results, setResults] = useState<Profile[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [school, setSchool] = useState('');
  const [workplace, setWorkplace] = useState('');

  // Lightbox for profile picture
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    api<Profile[]>('/api/connections/suggestions').then(setSuggestions).catch(() => {});
    // Load sent requests to track pending state
    api<(Profile & { connectionId: string })[]>('/api/connections/sent').then(sent => {
      setSentRequests(new Set(sent.map(s => s.userId)));
    }).catch(() => {});
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (school) params.set('school', school);
    if (workplace) params.set('workplace', workplace);
    if (!q && !school && !workplace) return;
    setResults(await api<Profile[]>(`/api/search?${params}`));
  }

  async function connect(addresseeId: string) {
    try {
      await api('/api/connections/request', { method: 'POST', body: JSON.stringify({ addresseeId }) });
      flash('Connection request sent!');
      // Mark as pending
      setSentRequests(prev => new Set(prev).add(addresseeId));
    } catch (e: any) { flash(e.message, 'error'); }
  }

  function Card({ person, showConnect = true }: { person: Profile; showConnect?: boolean }) {
    const isPending = sentRequests.has(person.userId);

    return (
      <article className="profile-card">
        <img
          src={person.media.profilePictureUrl}
          alt=""
          className="clickable"
          onClick={() => setLightboxUrl(person.media.profilePictureUrl)}
          title="Click to view full size"
        />
        <div className="profile-card-info">
          <strong>{person.fullName}</strong>
          <span>{person.education.university || person.education.highSchool || person.education.primarySchool || ''}</span>
          <span>{person.professional.currentJob ? `${person.professional.currentJob} at ${person.professional.currentWorkplace || ''}` : ''}</span>
        </div>
        {showConnect && person.userId !== userId && (
          <div className="profile-card-actions">
            {isPending ? (
              <button className="btn btn-secondary btn-sm pending-btn" disabled>
                <Clock size={14}/> Pending
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => connect(person.userId)}>
                <UserPlus size={14}/> Connect
              </button>
            )}
          </div>
        )}
      </article>
    );
  }

  return (
    <>
      {/* Profile Picture Lightbox */}
      {lightboxUrl && (
        <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
          <button className="lightbox-close" onClick={() => setLightboxUrl(null)}>
            <X size={24} />
          </button>
          <img src={lightboxUrl} alt="Full size" className="lightbox-image" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className="panel">
        <h2 className="panel-title">Search People</h2>
        <form className="search-bar" onSubmit={search}>
          <input placeholder="Search by name..." value={q} onChange={e => setQ(e.target.value)} />
          <input placeholder="School / University" value={school} onChange={e => setSchool(e.target.value)} />
          <input placeholder="Workplace" value={workplace} onChange={e => setWorkplace(e.target.value)} />
          <button className="btn btn-primary"><Search size={16}/></button>
        </form>
        {results.length > 0 && (
          <>
            <h3 style={{fontSize:14,color:'var(--text-dim)',marginBottom:10}}>Search Results ({results.length})</h3>
            <div className="cards-grid">{results.map(p => <Card key={p.userId} person={p} />)}</div>
          </>
        )}
      </div>
      <div className="panel">
        <h2 className="panel-title">People You May Know</h2>
        <p style={{fontSize:13,color:'var(--text-dim)',marginBottom:14}}>Based on shared schools and workplaces</p>
        {suggestions.length > 0 ? (
          <div className="cards-grid">{suggestions.map(p => <Card key={p.userId} person={p} />)}</div>
        ) : (
          <div className="empty-state"><p>Complete your profile to see suggestions!</p></div>
        )}
      </div>
    </>
  );
}
