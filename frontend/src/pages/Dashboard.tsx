import { useEffect, useState, useCallback } from 'react';
import { LogOut, UserRound, Search, Send, Briefcase, Shield, Users, Home, Bell } from 'lucide-react';
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
};

export function Dashboard() {
  const { session, logout } = useAuth();
  const [view, setView] = useState('feed');
  const [me, setMe] = useState<Profile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [notice, setNotice] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const p = await api<Profile>('/api/profiles/me');
      setMe(p);
      const pending = await api<any[]>('/api/connections/pending');
      setPendingCount(pending.length);
    } catch (e: any) { setNotice({ msg: e.message, type: 'error' }); }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(null), 4000); return () => clearTimeout(t); } }, [notice]);

  const flash = (msg: string, type: 'success' | 'error' = 'success') => setNotice({ msg, type });

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
