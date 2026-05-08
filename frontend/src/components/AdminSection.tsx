import { useEffect, useState } from 'react';
import { Users, FileText, Shield, Ban, CheckCircle, Eye, EyeOff, Trash2 } from 'lucide-react';
import { api } from '../api/client';

type AdminUser = {
  id: string; fullName: string; email: string; role: string; status: string;
  phoneNumber?: string; primarySchool?: string; highSchool?: string; university?: string;
  currentWorkplace?: string; lastLoginAt?: string; createdAt: string; profilePictureUrl?: string;
};
type AdminPost = {
  id: string; body: string; imageUrl?: string; moderationStatus: string; createdAt: string;
  author: { id: string; fullName: string; email: string };
};
type Stats = {
  users: { total: number; active: number; suspended: number; recentLogins: number; newThisWeek: number };
  posts: { total: number; visible: number; hidden: number; removed: number };
  connections: { total: number; accepted: number; pending: number };
  messages: { total: number };
};

export function AdminSection({ flash }: { flash: (m: string, t?: 'success'|'error') => void }) {
  const [tab, setTab] = useState<'overview'|'users'|'posts'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);

  async function load() {
    setStats(await api('/api/admin/stats'));
    setUsers(await api('/api/admin/users'));
    setPosts(await api('/api/admin/posts'));
  }
  useEffect(() => { load(); }, []);

  async function toggleUser(id: string, status: string) {
    const next = status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await api(`/api/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
    flash(`User ${next.toLowerCase()}`); load();
  }

  async function deleteUser(id: string) {
    if (!confirm('Permanently delete this user?')) return;
    await api(`/api/admin/users/${id}`, { method: 'DELETE' });
    flash('User deleted'); load();
  }

  async function moderatePost(id: string, status: string) {
    const next = status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';
    await api(`/api/admin/posts/${id}/moderation`, { method: 'PATCH', body: JSON.stringify({ moderationStatus: next }) });
    flash(`Post ${next.toLowerCase()}`); load();
  }

  return (
    <>
      <div className="panel">
        <h2 className="panel-title"><Shield size={20} style={{verticalAlign:'middle',marginRight:8}}/> Admin Panel</h2>
        <div className="admin-tabs">
          <button className={`admin-tab ${tab==='overview'?'active':''}`} onClick={() => setTab('overview')}>Overview</button>
          <button className={`admin-tab ${tab==='users'?'active':''}`} onClick={() => setTab('users')}>Users</button>
          <button className={`admin-tab ${tab==='posts'?'active':''}`} onClick={() => setTab('posts')}>Posts</button>
        </div>
      </div>

      {tab === 'overview' && stats && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{stats.users.total}</div><div className="stat-label">Total Users</div></div>
          <div className="stat-card"><div className="stat-value">{stats.users.active}</div><div className="stat-label">Active</div></div>
          <div className="stat-card"><div className="stat-value">{stats.users.recentLogins}</div><div className="stat-label">24h Logins</div></div>
          <div className="stat-card"><div className="stat-value">{stats.users.newThisWeek}</div><div className="stat-label">New This Week</div></div>
          <div className="stat-card"><div className="stat-value">{stats.posts.total}</div><div className="stat-label">Total Posts</div></div>
          <div className="stat-card"><div className="stat-value">{stats.connections.accepted}</div><div className="stat-label">Connections</div></div>
          <div className="stat-card"><div className="stat-value">{stats.messages.total}</div><div className="stat-label">Messages</div></div>
          <div className="stat-card"><div className="stat-value">{stats.users.suspended}</div><div className="stat-label">Suspended</div></div>
        </div>
      )}

      {tab === 'users' && (
        <div className="panel">
          <h3 style={{fontSize:15,marginBottom:12}}>All Users ({users.length})</h3>
          {users.map(u => (
            <div className="admin-row" key={u.id}>
              <div className="admin-row-info">
                <strong>{u.fullName}</strong>
                <span>{u.email} · {u.primarySchool || u.highSchool || u.university || u.currentWorkplace || 'No info'}</span>
                <span>Joined: {new Date(u.createdAt).toLocaleDateString()} · Last login: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</span>
              </div>
              <span className={`status-badge ${u.status.toLowerCase()}`}>{u.status}</span>
              <div className="admin-row-actions">
                <button className={`btn btn-sm ${u.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleUser(u.id, u.status)}>
                  {u.status === 'ACTIVE' ? <><Ban size={13}/> Suspend</> : <><CheckCircle size={13}/> Activate</>}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'posts' && (
        <div className="panel">
          <h3 style={{fontSize:15,marginBottom:12}}>All Posts ({posts.length})</h3>
          {posts.map(p => (
            <div className="admin-row" key={p.id}>
              <div className="admin-row-info">
                <strong>{p.author.fullName} ({p.author.email})</strong>
                <span className={`status-badge ${p.moderationStatus === 'VISIBLE' ? 'active' : 'suspended'}`}>{p.moderationStatus}</span>
                <span style={{marginTop:4}}>{p.body.slice(0, 120)}{p.body.length > 120 ? '...' : ''}</span>
              </div>
              <div className="admin-row-actions">
                <button className="btn btn-sm btn-secondary" onClick={() => moderatePost(p.id, p.moderationStatus)}>
                  {p.moderationStatus === 'VISIBLE' ? <><EyeOff size={13}/> Hide</> : <><Eye size={13}/> Show</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
