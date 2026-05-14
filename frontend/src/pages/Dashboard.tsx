import React, { useEffect, useState, useCallback } from 'react';
import { LogOut, UserRound, Search, Send, Briefcase, Shield, Users, Home, Bell, X, Check, CheckCheck } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FeedSection } from '../components/FeedSection';
import { ProfileSection } from '../components/ProfileSection';
import { DiscoverSection } from '../components/DiscoverSection';
import { MessagesSection } from '../components/MessagesSection';
import { OpportunitiesSection } from '../components/OpportunitiesSection';
import { ConnectionsSection } from '../components/ConnectionsSection';
import { AdminSection } from '../components/AdminSection';

export type Profile = {
  userId: string; fullName: string; email?: string; phoneNumber?: string; bio?: string;
  education: { primarySchool?: string; highSchool?: string; university?: string;
    primarySchoolStartYear?: number; primarySchoolEndYear?: number;
    highSchoolStartYear?: number; highSchoolEndYear?: number;
    universityStartYear?: number; universityEndYear?: number; };
  professional: { currentJob?: string; currentWorkplace?: string; pastJobs?: any[]; workExperience?: string; };
  media: { profilePictureUrl: string; images: any[]; };
  privacy?: { emailVisibility: string; phoneVisibility: string; dobVisibility?: string; };
  usernameChangedAt?: string;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
};

export function Dashboard() {
  const { session, logout, justLoggedIn, clearJustLoggedIn } = useAuth();
  const [view, setView] = useState('feed');
  const [me, setMe] = useState<Profile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [notice, setNotice] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const p = await api<Profile>('/api/profiles/me');
      setMe(p);
      const pending = await api<any[]>('/api/connections/pending');
      setPendingCount(pending.length);
    } catch (e: any) { setNotice({ msg: e.message, type: 'error' }); }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const [notifs, countResult] = await Promise.all([
        api<Notification[]>('/api/notifications'),
        api<{ count: number }>('/api/notifications/unread-count')
      ]);
      setNotifications(notifs);
      setUnreadCount(countResult.count);
    } catch {}
  }, []);

  useEffect(() => { loadMe(); loadNotifications(); }, [loadMe, loadNotifications]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(null), 4000); return () => clearTimeout(t); } }, [notice]);

  const flash = (msg: string, type: 'success' | 'error' = 'success') => setNotice({ msg, type });

  // Welcome toast on login
  useEffect(() => {
    if (justLoggedIn && session?.user) {
      const name = session.user.fullName || session.user.email;
      flash(`WELCOME to ALUMNI CONNECT ${name}`);
      clearJustLoggedIn();
    }
  }, [justLoggedIn]);

  async function markNotifRead(id: string) {
    await api(`/api/notifications/${id}/read`, { method: 'PATCH' });
    loadNotifications();
  }

  async function markAllRead() {
    await api('/api/notifications/read-all', { method: 'PATCH' });
    loadNotifications();
  }

  function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }

  function getNotifIcon(type: string) {
    switch (type) {
      case 'connection_request': return '🤝';
      case 'connection_accepted': return '✅';
      case 'account_suspended': return '⚠️';
      case 'account_deleted': return '🚫';
      case 'account_active': return '🎉';
      default: return '🔔';
    }
  }

  const navItems = [
    { id: 'feed', icon: Home, label: 'Feed' },
    { id: 'discover', icon: Search, label: 'Discover' },
    { id: 'connections', icon: Users, label: 'Connections', badge: pendingCount },
    { id: 'messages', icon: Send, label: 'Messages' },
    { id: 'opportunities', icon: Briefcase, label: 'Opportunities' },
    { id: 'profile', icon: UserRound, label: 'Profile' },
    ...(session?.user.role === 'ADMIN' ? [{ id: 'admin', icon: Shield, label: 'Admin' }] : [])
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/connect-logo.svg" alt="" />
          <h1>CONNECT ALUMNI</h1>
        </div>
        <nav>
          {navItems.map(n => (
            <button key={n.id} className={`nav-item ${view === n.id ? 'active' : ''}`} onClick={() => setView(n.id)}>
              <n.icon size={18} /> <span>{n.label}</span>
              {n.badge ? <span className="badge">{n.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {/* Notification Bell */}
          <button
            className="nav-item notification-bell-btn"
            onClick={() => { setShowNotifPanel(!showNotifPanel); if (!showNotifPanel) loadNotifications(); }}
          >
            <Bell size={18} />
            <span>Notifications</span>
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
          {me && (
            <div className="sidebar-user">
              <img src={me.media.profilePictureUrl} alt="" />
              <div className="sidebar-user-info">
                <strong>{me.fullName}</strong>
                <small>{session?.user.email}</small>
              </div>
            </div>
          )}
          <button className="nav-item" onClick={logout}><LogOut size={18} /> <span>Logout</span></button>
        </div>
      </aside>
      <section className="main-content">
        {notice && <div className={`notice ${notice.type}`}>{notice.msg}</div>}

        {/* Notification Panel */}
        {showNotifPanel && (
          <div className="notification-panel fade-in">
            <div className="notif-panel-header">
              <h3>Notifications</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {unreadCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={markAllRead} title="Mark all as read">
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
                <button className="btn btn-ghost btn-icon" onClick={() => setShowNotifPanel(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="notif-panel-list">
              {notifications.length === 0 ? (
                <div className="empty-state"><p>No notifications yet</p></div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`notif-item ${n.isRead ? '' : 'unread'}`}
                    onClick={() => { if (!n.isRead) markNotifRead(n.id); }}
                  >
                    <span className="notif-icon">{getNotifIcon(n.type)}</span>
                    <div className="notif-item-content">
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                      <small>{timeAgo(n.createdAt)}</small>
                    </div>
                    {!n.isRead && (
                      <span className="notif-unread-dot" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'feed' && <FeedSection me={me} flash={flash} />}
        {view === 'discover' && <DiscoverSection userId={session!.user.id} flash={flash} />}
        {view === 'connections' && <ConnectionsSection userId={session!.user.id} flash={flash} onUpdate={loadMe} />}
        {view === 'messages' && <MessagesSection userId={session!.user.id} />}
        {view === 'opportunities' && <OpportunitiesSection flash={flash} />}
        {view === 'profile' && <ProfileSection me={me} onSave={loadMe} flash={flash} />}
        {view === 'admin' && session?.user.role === 'ADMIN' && <AdminSection flash={flash} />}
      </section>
    </main>
  );
}
