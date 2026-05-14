import React, { useEffect, useState } from 'react';
import { Shield, Ban, CheckCircle, Eye, EyeOff, Trash2, AlertTriangle, X, Users, FileText, BarChart3, Search, Mail, Phone, MapPin, School, Briefcase, Calendar, MessageSquare, Link2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { api } from '../api/client';

type AdminUser = {
  id: string; fullName: string; email: string; role: string; status: string;
  phoneNumber?: string; primarySchool?: string; highSchool?: string; university?: string;
  currentJob?: string; currentWorkplace?: string; lastLoginAt?: string; createdAt: string;
  profilePictureUrl?: string; statusReason?: string; appealReason?: string; bio?: string;
  postCount?: number; connectionCount?: number; dateOfBirth?: string;
  emailVisibility?: string; phoneVisibility?: string;
};
type AdminPost = {
  id: string; body: string; imageUrl?: string; moderationStatus: string; createdAt: string;
  author: { id: string; fullName: string; email: string };
};
type Stats = {
  users: { total: number; active: number; suspended: number; deleted: number; recentLogins: number; newThisWeek: number; newThisMonth: number; newThisYear: number };
  posts: { total: number; visible: number; hidden: number; removed: number };
  connections: { total: number; accepted: number; pending: number };
  messages: { total: number };
};

export function AdminSection({ flash }: { flash: (m: string, t?: 'success'|'error') => void }) {
  const [tab, setTab] = useState<'overview'|'users'|'posts'|'appeals'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [userFilter, setUserFilter] = useState<'ALL'|'ACTIVE'|'SUSPENDED'|'DELETED'>('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Modal state for suspend/delete actions
  const [actionModal, setActionModal] = useState<{
    userId: string; userName: string; action: 'SUSPENDED' | 'DELETED'; reason: string;
  } | null>(null);

  async function load() {
    try {
      const [s, u, p] = await Promise.all([
        api('/api/admin/stats'), api('/api/admin/users'), api('/api/admin/posts')
      ]);
      setStats(s as Stats); setUsers(u as AdminUser[]); setPosts(p as AdminPost[]);
    } catch (err: any) { flash(err.message || 'Failed to load admin data', 'error'); }
  }
  useEffect(() => { load(); }, []);

  // Filtered users
  const filteredUsers = users.filter(u => {
    if (userFilter !== 'ALL' && u.status !== userFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        || u.primarySchool?.toLowerCase().includes(q) || u.highSchool?.toLowerCase().includes(q)
        || u.university?.toLowerCase().includes(q) || u.currentWorkplace?.toLowerCase().includes(q);
    }
    return true;
  });

  const appealUsers = users.filter(u => u.appealReason && u.status !== 'ACTIVE');

  async function confirmAction() {
    if (!actionModal) return;
    try {
      await api(`/api/admin/users/${actionModal.userId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: actionModal.action, reason: actionModal.reason || undefined })
      });
      flash(`User ${actionModal.action === 'SUSPENDED' ? 'suspended' : 'deleted'} — notification sent`);
      setActionModal(null); load();
    } catch (err: any) { flash(err.message || 'Action failed', 'error'); }
  }

  async function activateUser(id: string) {
    await api(`/api/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'ACTIVE' }) });
    flash('User reactivated — notification sent'); load();
  }

  async function rejectAppeal(id: string) {
    await api(`/api/admin/users/${id}/clear-appeal`, { method: 'PATCH' });
    flash('Appeal rejected'); load();
  }

  async function approveAppeal(id: string) {
    await api(`/api/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'ACTIVE' }) });
    flash('Appeal approved — account reactivated'); load();
  }

  async function deleteUserPermanent(id: string) {
    if (!confirm('⚠️ PERMANENTLY delete this user and ALL their data? This cannot be undone.')) return;
    await api(`/api/admin/users/${id}`, { method: 'DELETE' });
    flash('User permanently purged'); load();
  }

  async function moderatePost(id: string, newStatus: string) {
    await api(`/api/admin/posts/${id}/moderation`, { method: 'PATCH', body: JSON.stringify({ moderationStatus: newStatus }) });
    flash(`Post ${newStatus.toLowerCase()}`); load();
  }

  async function deletePost(id: string) {
    if (!confirm('Permanently delete this post?')) return;
    await api(`/api/admin/posts/${id}`, { method: 'DELETE' });
    flash('Post permanently deleted'); load();
  }

  function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
  }

  return (
    <>
      {/* ─── Action Modal ─── */}
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
                ? `Suspend ${actionModal.userName}'s account? They will be logged out immediately and notified.`
                : `Delete ${actionModal.userName}'s account? They will be logged out and notified.`}
            </p>
            <div className="field-group" style={{ marginTop: 12 }}>
              <label className="field-label">Reason (shown to the user)</label>
              <textarea placeholder="e.g. Violation of community guidelines..." value={actionModal.reason}
                onChange={e => setActionModal({ ...actionModal, reason: e.target.value })} style={{ minHeight: 60 }} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              <button className={`btn ${actionModal.action === 'DELETED' ? 'btn-danger' : 'btn-warning'}`} onClick={confirmAction}>
                {actionModal.action === 'SUSPENDED' ? <><Ban size={14} /> Suspend</> : <><Trash2 size={14} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab Header ─── */}
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="panel-title"><Shield size={20} style={{verticalAlign:'middle',marginRight:8}}/> Admin Control Panel</h2>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
        </div>
        <div className="admin-tabs">
          {([['overview','Overview',BarChart3],['users','Users',Users],['posts','Posts',FileText],['appeals','Appeals',MessageSquare]] as const).map(([k,l,Icon]) => (
            <button key={k} className={`admin-tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>
              <Icon size={14} style={{marginRight:4,verticalAlign:'middle'}}/> {l}
              {k === 'appeals' && appealUsers.length > 0 && <span style={{background:'var(--danger)',color:'#fff',fontSize:10,padding:'1px 6px',borderRadius:99,marginLeft:6}}>{appealUsers.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {tab === 'overview' && stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-value">{stats.users.total}</div><div className="stat-label">Total Users</div></div>
            <div className="stat-card"><div className="stat-value">{stats.users.active}</div><div className="stat-label">Active</div></div>
            <div className="stat-card"><div className="stat-value">{stats.users.suspended}</div><div className="stat-label">Suspended</div></div>
            <div className="stat-card"><div className="stat-value">{stats.users.deleted}</div><div className="stat-label">Deleted</div></div>
            <div className="stat-card"><div className="stat-value">{stats.users.recentLogins}</div><div className="stat-label">24h Logins</div></div>
            <div className="stat-card"><div className="stat-value">{stats.users.newThisWeek}</div><div className="stat-label">New This Week</div></div>
            <div className="stat-card"><div className="stat-value">{stats.users.newThisMonth}</div><div className="stat-label">New This Month</div></div>
            <div className="stat-card"><div className="stat-value">{stats.users.newThisYear}</div><div className="stat-label">New This Year</div></div>
          </div>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-value">{stats.posts.total}</div><div className="stat-label">Total Posts</div></div>
            <div className="stat-card"><div className="stat-value">{stats.posts.visible}</div><div className="stat-label">Visible Posts</div></div>
            <div className="stat-card"><div className="stat-value">{stats.posts.hidden}</div><div className="stat-label">Hidden Posts</div></div>
            <div className="stat-card"><div className="stat-value">{stats.posts.removed}</div><div className="stat-label">Removed Posts</div></div>
            <div className="stat-card"><div className="stat-value">{stats.connections.accepted}</div><div className="stat-label">Connections</div></div>
            <div className="stat-card"><div className="stat-value">{stats.connections.pending}</div><div className="stat-label">Pending Requests</div></div>
            <div className="stat-card"><div className="stat-value">{stats.messages.total}</div><div className="stat-label">Total Messages</div></div>
            <div className="stat-card"><div className="stat-value">{appealUsers.length}</div><div className="stat-label">Pending Appeals</div></div>
          </div>
        </>
      )}

      {/* ─── USERS TAB ─── */}
      {tab === 'users' && (
        <div className="panel">
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
                style={{ paddingLeft: 34 }} />
            </div>
            {(['ALL','ACTIVE','SUSPENDED','DELETED'] as const).map(f => (
              <button key={f} className={`btn btn-sm ${userFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setUserFilter(f)}>{f} {f !== 'ALL' ? `(${users.filter(u=>u.status===f).length})` : `(${users.length})`}</button>
            ))}
          </div>
          <h3 style={{fontSize:14,marginBottom:10,color:'var(--text-dim)'}}>Showing {filteredUsers.length} users</h3>
          {filteredUsers.map(u => (
            <div key={u.id} className="admin-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                <img src={u.profilePictureUrl || '/uploads/default-avatar.png'} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0, background: 'var(--bg-input)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 14 }}>{u.fullName}</strong>
                    <span className={`status-badge ${u.status.toLowerCase()}`}>{u.status}</span>
                    {u.role === 'ADMIN' && <span style={{ fontSize: 10, background: 'var(--gradient)', color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>ADMIN</span>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    <Mail size={11} style={{verticalAlign:'middle',marginRight:3}}/>{u.email}
                    {u.phoneNumber && <> · <Phone size={11} style={{verticalAlign:'middle',marginRight:2}}/>{u.phoneNumber}</>}
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    <span>{u.postCount ?? 0} posts · {u.connectionCount ?? 0} connections · </span>
                    <span>Joined {new Date(u.createdAt).toLocaleDateString()} · Login {u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</span>
                  </div>
                </div>
                <div className="admin-row-actions" style={{ flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)} title="View details">
                    {expandedUser === u.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} Details
                  </button>
                  {u.status === 'ACTIVE' && u.role !== 'ADMIN' && (
                    <button className="btn btn-sm btn-warning" onClick={() => setActionModal({ userId: u.id, userName: u.fullName, action: 'SUSPENDED', reason: '' })}>
                      <Ban size={13}/> Suspend
                    </button>
                  )}
                  {u.status === 'SUSPENDED' && (
                    <button className="btn btn-sm btn-success" onClick={() => activateUser(u.id)}><CheckCircle size={13}/> Activate</button>
                  )}
                  {u.status === 'DELETED' && (
                    <button className="btn btn-sm btn-success" onClick={() => activateUser(u.id)}><CheckCircle size={13}/> Reinstate</button>
                  )}
                  {u.role !== 'ADMIN' && u.status !== 'DELETED' && (
                    <button className="btn btn-danger btn-sm" onClick={() => setActionModal({ userId: u.id, userName: u.fullName, action: 'DELETED', reason: '' })}>
                      <Trash2 size={13}/> Delete
                    </button>
                  )}
                  {u.role !== 'ADMIN' && (
                    <button className="btn btn-danger btn-sm" onClick={() => deleteUserPermanent(u.id)} title="Permanently purge user and all data">
                      <Trash2 size={13}/> Purge
                    </button>
                  )}
                </div>
              </div>

              {/* Status reason */}
              {u.statusReason && u.status !== 'ACTIVE' && (
                <div style={{ fontSize: 12, color: 'var(--warning)', fontStyle: 'italic', marginTop: 4, paddingLeft: 56 }}>
                  ⚠️ Reason: {u.statusReason}
                </div>
              )}
              {/* Appeal badge */}
              {u.appealReason && u.status !== 'ACTIVE' && (
                <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, paddingLeft: 56, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📩 Appeal pending: "{u.appealReason.slice(0, 80)}{u.appealReason.length > 80 ? '...' : ''}"
                </div>
              )}

              {/* Expanded detail */}
              {expandedUser === u.id && (
                <div className="fade-in" style={{ marginTop: 10, paddingLeft: 56, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: 12, color: 'var(--text-dim)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div><School size={11} style={{verticalAlign:'middle',marginRight:4}}/>Primary: {u.primarySchool || '—'}</div>
                  <div><School size={11} style={{verticalAlign:'middle',marginRight:4}}/>High School: {u.highSchool || '—'}</div>
                  <div><School size={11} style={{verticalAlign:'middle',marginRight:4}}/>University: {u.university || '—'}</div>
                  <div><Briefcase size={11} style={{verticalAlign:'middle',marginRight:4}}/>Workplace: {u.currentWorkplace || '—'}</div>
                  <div><Mail size={11} style={{verticalAlign:'middle',marginRight:4}}/>Email Visibility: {u.emailVisibility || 'PUBLIC'}</div>
                  <div><Phone size={11} style={{verticalAlign:'middle',marginRight:4}}/>Phone Visibility: {u.phoneVisibility || 'PUBLIC'}</div>
                  <div><Calendar size={11} style={{verticalAlign:'middle',marginRight:4}}/>DOB: {u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString() : '—'}</div>
                  <div><FileText size={11} style={{verticalAlign:'middle',marginRight:4}}/>Bio: {u.bio || '—'}</div>
                </div>
              )}
            </div>
          ))}
          {filteredUsers.length === 0 && <div className="empty-state"><p>No users match your filters</p></div>}
        </div>
      )}

      {/* ─── POSTS TAB ─── */}
      {tab === 'posts' && (
        <div className="panel">
          <h3 style={{fontSize:15,marginBottom:12}}>All Posts ({posts.length})</h3>
          {posts.map(p => (
            <div className="admin-row" key={p.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: 13 }}>{p.author.fullName}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.author.email}</span>
                    <span className={`status-badge ${p.moderationStatus === 'VISIBLE' ? 'active' : p.moderationStatus === 'HIDDEN' ? 'suspended' : 'deleted'}`}>
                      {p.moderationStatus}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(p.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {p.body.slice(0, 200)}{p.body.length > 200 ? '...' : ''}
                  </p>
                  {p.imageUrl && <img src={p.imageUrl} alt="" style={{ maxHeight: 120, borderRadius: 8, marginTop: 6 }} />}
                </div>
                <div className="admin-row-actions" style={{ flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  {p.moderationStatus === 'VISIBLE' ? (
                    <button className="btn btn-sm btn-secondary" onClick={() => moderatePost(p.id, 'HIDDEN')}><EyeOff size={13}/> Hide</button>
                  ) : (
                    <button className="btn btn-sm btn-success" onClick={() => moderatePost(p.id, 'VISIBLE')}><Eye size={13}/> Show</button>
                  )}
                  <button className="btn btn-sm btn-danger" onClick={() => deletePost(p.id)}><Trash2 size={13}/> Delete</button>
                </div>
              </div>
            </div>
          ))}
          {posts.length === 0 && <div className="empty-state"><p>No posts yet</p></div>}
        </div>
      )}

      {/* ─── APPEALS TAB ─── */}
      {tab === 'appeals' && (
        <div className="panel">
          <h3 style={{fontSize:15,marginBottom:12}}>Pending Appeals ({appealUsers.length})</h3>
          {appealUsers.length === 0 && <div className="empty-state"><p>No pending appeals</p></div>}
          {appealUsers.map(u => (
            <div key={u.id} className="admin-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={u.profilePictureUrl || '/uploads/default-avatar.png'} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', background: 'var(--bg-input)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>{u.fullName}</strong>
                    <span className={`status-badge ${u.status.toLowerCase()}`}>{u.status}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{u.email}</span>
                  {u.statusReason && (
                    <div style={{ fontSize: 11, color: 'var(--warning)', fontStyle: 'italic', marginTop: 2 }}>
                      Suspended for: {u.statusReason}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 10, padding: 12, background: 'rgba(59,130,246,.06)', borderRadius: 8, border: '1px solid rgba(59,130,246,.12)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  User's Appeal Reason:
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{u.appealReason}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-danger btn-sm" onClick={() => rejectAppeal(u.id)}>
                  <X size={13}/> Reject Appeal
                </button>
                <button className="btn btn-success btn-sm" onClick={() => approveAppeal(u.id)}>
                  <CheckCircle size={13}/> Approve & Reactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}