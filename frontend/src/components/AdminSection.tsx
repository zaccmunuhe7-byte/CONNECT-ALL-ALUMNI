import { useEffect, useState } from 'react';
import { Shield, Ban, CheckCircle, Eye, EyeOff, Trash2, AlertTriangle, X } from 'lucide-react';
import { api } from '../api/client';

type AdminUser = {
  id: string; fullName: string; email: string; role: string; status: string;
  phoneNumber?: string; primarySchool?: string; highSchool?: string; university?: string;
  currentWorkplace?: string; lastLoginAt?: string; createdAt: string; profilePictureUrl?: string;
  statusReason?: string;
};
type AdminPost = {
  id: string; body: string; imageUrl?: string; moderationStatus: string; createdAt: string;
  author: { id: string; fullName: string; email: string };
};
type Stats = {
  users: { total: number; active: number; suspended: number; deleted?: number; recentLogins: number; newThisWeek: number };
  posts: { total: number; visible: number; hidden: number; removed: number };
  connections: { total: number; accepted: number; pending: number };
  messages: { total: number };
};

export function AdminSection({ flash }: { flash: (m: string, t?: 'success'|'error') => void }) {
  const [tab, setTab] = useState<'overview'|'users'|'posts'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);

  // Modal state for suspend/delete actions
  const [actionModal, setActionModal] = useState<{
    userId: string;
    userName: string;
    action: 'SUSPENDED' | 'DELETED';
    reason: string;
  } | null>(null);

  async function load() {
    setStats(await api('/api/admin/stats'));
    setUsers(await api('/api/admin/users'));
    setPosts(await api('/api/admin/posts'));
  }
  useEffect(() => { load(); }, []);

  function openActionModal(userId: string, userName: string, action: 'SUSPENDED' | 'DELETED') {
    setActionModal({ userId, userName, action, reason: '' });
  }

  async function confirmAction() {
    if (!actionModal) return;
    try {
      await api(`/api/admin/users/${actionModal.userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: actionModal.action, reason: actionModal.reason || undefined })
      });
      flash(`User ${actionModal.action === 'SUSPENDED' ? 'suspended' : 'deleted'} — notification sent to user`);
      setActionModal(null);
      load();
    } catch (err: any) {
      flash(err.message || 'Action failed', 'error');
    }
  }

  async function activateUser(id: string) {
    await api(`/api/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'ACTIVE' }) });
    flash('User reactivated — notification sent'); load();
  }

  async function deleteUserPermanent(id: string) {
    if (!confirm('⚠️ This will PERMANENTLY delete this user and ALL their data (posts, messages, connections). This cannot be undone. Are you sure?')) return;
    await api(`/api/admin/users/${id}`, { method: 'DELETE' });
    flash('User permanently deleted'); load();
  }

  async function moderatePost(id: string, status: string) {
    const next = status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';
    await api(`/api/admin/posts/${id}/moderation`, { method: 'PATCH', body: JSON.stringify({ moderationStatus: next }) });
    flash(`Post ${next.toLowerCase()}`); load();
  }

  return (
    <>
      {/* Action Modal for Suspend/Delete */}
      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <AlertTriangle size={20} style={{ color: actionModal.action === 'DELETED' ? 'var(--danger)' : 'var(--warning)' }} />
              <h3>{actionModal.action === 'SUSPENDED' ? 'Suspend Account' : 'Delete Account'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setActionModal(null)}><X size={16} /></button>
            </div>
            <p className="modal-desc">
              {actionModal.action === 'SUSPENDED'
                ? `Are you sure you want to suspend ${actionModal.userName}'s account? They will be logged out immediately and notified via email.`
                : `Are you sure you want to permanently delete ${actionModal.userName}'s account? They will be logged out and notified. Their email cannot be reused unless you approve it.`
              }
            </p>
            <div className="field-group" style={{ marginTop: 12 }}>
              <label className="field-label">Reason (will be shown to the user)</label>
              <textarea
                placeholder="e.g. Violation of community guidelines..."
                value={actionModal.reason}
                onChange={e => setActionModal({ ...actionModal, reason: e.target.value })}
                style={{ minHeight: 60 }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              <button
                className={`btn ${actionModal.action === 'DELETED' ? 'btn-danger' : 'btn-warning'}`}
                onClick={confirmAction}
              >
                {actionModal.action === 'SUSPENDED' ? <><Ban size={14} /> Suspend Account</> : <><Trash2 size={14} /> Delete Account</>}
              </button>
            </div>
          </div>
        </div>
      )}

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
                {u.statusReason && u.status !== 'ACTIVE' && (
                  <span className="status-reason">Reason: {u.statusReason}</span>
                )}
              </div>
              <span className={`status-badge ${u.status.toLowerCase()}`}>{u.status}</span>
              <div className="admin-row-actions">
                {u.status === 'ACTIVE' && (
                  <button className="btn btn-sm btn-danger" onClick={() => openActionModal(u.id, u.fullName, 'SUSPENDED')}>
                    <Ban size={13}/> Suspend
                  </button>
                )}
                {u.status === 'SUSPENDED' && (
                  <button className="btn btn-sm btn-success" onClick={() => activateUser(u.id)}>
                    <CheckCircle size={13}/> Activate
                  </button>
                )}
                {u.status !== 'DELETED' && (
                  <button className="btn btn-danger btn-sm" onClick={() => openActionModal(u.id, u.fullName, 'DELETED')}>
                    <Trash2 size={13}/> Delete
                  </button>
                )}
                {u.status === 'DELETED' && (
                  <>
                    <button className="btn btn-sm btn-success" onClick={() => activateUser(u.id)}>
                      <CheckCircle size={13}/> Reinstate
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteUserPermanent(u.id)}>
                      <Trash2 size={13}/> Purge
                    </button>
                  </>
                )}
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
