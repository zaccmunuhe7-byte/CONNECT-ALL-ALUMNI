import { useEffect, useState } from 'react';
import { Briefcase, MapPin, Plus, Building2, Trash2 } from 'lucide-react';
import { api } from '../api/client';

type Opportunity = {
  id: string; title: string; description: string; company: string;
  location?: string; opportunityType: string; createdAt: string;
  author: { id: string; fullName: string; profilePictureUrl: string };
};

export function OpportunitiesSection({ flash }: { flash: (m: string, t?: 'success'|'error') => void }) {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() { setItems(await api('/api/opportunities')); }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api('/api/opportunities', {
      method: 'POST',
      body: JSON.stringify({
        title: fd.get('title'), description: fd.get('description'),
        company: fd.get('company'), location: fd.get('location'),
        opportunityType: fd.get('opportunityType')
      })
    });
    e.currentTarget.reset(); setShowForm(false); flash('Opportunity posted!'); load();
  }

  function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Opportunities</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}><Plus size={14}/> Post Opportunity</button>
        </div>
        {showForm && (
          <form className="opportunity-form" onSubmit={create} style={{marginBottom:20}}>
            <input name="title" placeholder="Job title / Role" required />
            <input name="company" placeholder="Company name" required />
            <input name="location" placeholder="Location (optional)" />
            <select name="opportunityType">
              <option value="Job">Job</option>
              <option value="Internship">Internship</option>
              <option value="Freelance">Freelance</option>
              <option value="Volunteer">Volunteer</option>
            </select>
            <textarea name="description" placeholder="Describe the opportunity..." required style={{minHeight:80}} />
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary btn-sm">Post</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
      {items.map(o => (
        <article className="opportunity-card" key={o.id}>
          <h3>{o.title}</h3>
          <div className="meta">
            <span><Building2 size={13}/> {o.company}</span>
            {o.location && <span><MapPin size={13}/> {o.location}</span>}
            <span><Briefcase size={13}/> {o.opportunityType}</span>
            <span style={{marginLeft:'auto'}}>{timeAgo(o.createdAt)}</span>
          </div>
          <p>{o.description}</p>
          <div style={{marginTop:10,fontSize:12,color:'var(--text-muted)'}}>Posted by {o.author.fullName}</div>
        </article>
      ))}
      {items.length === 0 && <div className="empty-state"><p>No opportunities posted yet.</p></div>}
    </>
  );
}
