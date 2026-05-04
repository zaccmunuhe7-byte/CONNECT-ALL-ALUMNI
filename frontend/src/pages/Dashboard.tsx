import { useEffect, useState } from 'react';
import { LogOut, MessageSquare, Search, Send, Shield, ThumbsUp, UserRound } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Profile = {
  userId: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  education: { primarySchool?: string; highSchool?: string; university?: string };
  professional: { currentJob?: string; currentWorkplace?: string; pastJobs?: unknown[]; workExperience?: string };
  media: { profilePictureUrl: string; images: unknown[] };
  privacy?: { emailVisibility: 'PUBLIC' | 'PRIVATE'; phoneVisibility: 'PUBLIC' | 'PRIVATE' };
};

type Post = {
  id: string;
  body: string;
  author: { id: string; fullName: string };
  likeCount: number;
  comments: { id: string; body: string; authorId: string; createdAt: string }[];
};

type Conversation = {
  id: string;
  members: { id: string; fullName: string }[];
  lastMessageAt?: string;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  phoneNumber?: string;
  primarySchool?: string;
  highSchool?: string;
  university?: string;
  currentWorkplace?: string;
};

type AdminPost = {
  id: string;
  body: string;
  moderationStatus: 'VISIBLE' | 'HIDDEN' | 'REMOVED';
  author: { fullName: string; email: string };
};

export function Dashboard() {
  const { session, logout } = useAuth();
  const [me, setMe] = useState<Profile | null>(null);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [results, setResults] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminPosts, setAdminPosts] = useState<AdminPost[]>([]);
  const [notice, setNotice] = useState('');

  async function loadCore() {
    setMe(await api<Profile>('/api/profiles/me'));
    setSuggestions(await api<Profile[]>('/api/connections/suggestions'));
    setPosts(await api<Post[]>('/api/posts'));
    setConversations(await api<Conversation[]>('/api/messages/conversations'));
  }

  async function loadAdmin() {
    if (session?.user.role !== 'ADMIN') return;
    setAdminUsers(await api<AdminUser[]>('/api/admin/users'));
    setAdminPosts(await api<AdminPost[]>('/api/admin/posts'));
  }

  useEffect(() => {
    loadCore().catch((error) => setNotice(error.message));
    loadAdmin().catch((error) => setNotice(error.message));
  }, []);

  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    setMe(await api<Profile>('/api/profiles/me'));
    setNotice('Profile saved');
  }

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(new FormData(event.currentTarget) as any);
    setResults(await api<Profile[]>(`/api/search?${params.toString()}`));
  }

  async function createPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/posts', { method: 'POST', body: JSON.stringify({ body: form.get('body') }) });
    event.currentTarget.reset();
    setPosts(await api<Post[]>('/api/posts'));
  }

  async function likePost(postId: string) {
    await api(`/api/posts/${postId}/like`, { method: 'POST' });
    setPosts(await api<Post[]>('/api/posts'));
  }

  async function commentOnPost(event: React.FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: form.get('body') })
    });
    event.currentTarget.reset();
    setPosts(await api<Post[]>('/api/posts'));
  }

  async function startConversation(personId: string) {
    const conversation = await api<Conversation>('/api/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ participantId: personId })
    });
    const refreshed = await api<Conversation[]>('/api/messages/conversations');
    setConversations(refreshed);
    const selected = refreshed.find((item) => item.id === conversation.id) ?? conversation;
    setActiveConversation(selected);
    setMessages(await api<Message[]>(`/api/messages/conversations/${conversation.id}/messages`));
  }

  async function openConversation(conversation: Conversation) {
    setActiveConversation(conversation);
    setMessages(await api<Message[]>(`/api/messages/conversations/${conversation.id}/messages`));
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeConversation) return;
    const form = new FormData(event.currentTarget);
    await api(`/api/messages/conversations/${activeConversation.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: form.get('body') })
    });
    event.currentTarget.reset();
    setMessages(await api<Message[]>(`/api/messages/conversations/${activeConversation.id}/messages`));
  }

  async function updateUserStatus(userId: string, status: AdminUser['status']) {
    await api(`/api/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await loadAdmin();
  }

  async function moderatePost(postId: string, moderationStatus: AdminPost['moderationStatus']) {
    await api(`/api/admin/posts/${postId}/moderation`, {
      method: 'PATCH',
      body: JSON.stringify({ moderationStatus })
    });
    await loadAdmin();
    setPosts(await api<Post[]>('/api/posts'));
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/connect-logo.svg" alt="" />
          <h1>CONNECT_ALUMNI</h1>
        </div>
        <nav>
          <a href="#profile"><UserRound size={18} /> Profile</a>
          <a href="#discover"><Search size={18} /> Discover</a>
          <a href="#messages"><Send size={18} /> Messages</a>
          {session?.user.role === 'ADMIN' && <a href="#admin"><Shield size={18} /> Admin</a>}
        </nav>
        <button className="ghost" onClick={logout}><LogOut size={18} /> Logout</button>
      </aside>

      <section className="content-grid">
        {notice && <p className="notice">{notice}</p>}

        <section id="profile" className="panel">
          <h2>Your profile</h2>
          {me && (
            <form className="profile-grid" onSubmit={updateProfile}>
              <input name="fullName" defaultValue={me.fullName} placeholder="Full name" />
              <input name="phoneNumber" defaultValue={me.phoneNumber ?? ''} placeholder="Phone number" />
              <input name="primarySchool" defaultValue={me.education.primarySchool ?? ''} placeholder="Primary school" />
              <input name="highSchool" defaultValue={me.education.highSchool ?? ''} placeholder="High school" />
              <input name="university" defaultValue={me.education.university ?? ''} placeholder="University/college" />
              <input name="currentJob" defaultValue={me.professional.currentJob ?? ''} placeholder="Current job" />
              <input name="currentWorkplace" defaultValue={me.professional.currentWorkplace ?? ''} placeholder="Current workplace" />
              <select name="emailVisibility" defaultValue={me.privacy?.emailVisibility ?? 'PRIVATE'}>
                <option value="PRIVATE">Email private</option>
                <option value="PUBLIC">Email public</option>
              </select>
              <select name="phoneVisibility" defaultValue={me.privacy?.phoneVisibility ?? 'PRIVATE'}>
                <option value="PRIVATE">Phone private</option>
                <option value="PUBLIC">Phone public</option>
              </select>
              <textarea name="workExperience" defaultValue={me.professional.workExperience ?? ''} placeholder="Work experience" />
              <button className="primary">Save profile</button>
            </form>
          )}
        </section>

        <section id="discover" className="panel">
          <h2>People you may know</h2>
          <div className="cards">
            {suggestions.map((person) => <ProfileCard key={person.userId} person={person} onMessage={startConversation} />)}
          </div>
          <form className="search-row" onSubmit={search}>
            <input name="school" placeholder="School name" />
            <input name="workplace" placeholder="Workplace" />
            <button className="primary"><Search size={16} /> Search</button>
          </form>
          <div className="cards">
            {results.map((person) => <ProfileCard key={person.userId} person={person} onMessage={startConversation} />)}
          </div>
        </section>

        <section id="messages" className="panel">
          <h2>Messages</h2>
          <div className="messages-layout">
            <div className="conversation-list">
              {conversations.map((conversation) => (
                <button key={conversation.id} onClick={() => openConversation(conversation)}>
                  <MessageSquare size={16} />
                  {conversation.members.filter((member) => member.id !== session?.user.id).map((member) => member.fullName).join(', ') || 'Conversation'}
                </button>
              ))}
            </div>
            <div className="chat-panel">
              <div className="message-stream">
                {messages.map((message) => (
                  <p className={message.senderId === session?.user.id ? 'mine' : ''} key={message.id}>{message.body}</p>
                ))}
              </div>
              <form className="message-form" onSubmit={sendMessage}>
                <input name="body" placeholder="Write a message" disabled={!activeConversation} required />
                <button className="primary" disabled={!activeConversation}><Send size={16} /> Send</button>
              </form>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>Alumni feed</h2>
          <form className="post-form" onSubmit={createPost}>
            <textarea name="body" placeholder="Share an update" required />
            <button className="primary">Post</button>
          </form>
          <div className="feed">{posts.map((post) => (
            <article className="post" key={post.id}>
              <strong>{post.author.fullName}</strong>
              <p>{post.body}</p>
              <button className="inline-action" onClick={() => likePost(post.id)}><ThumbsUp size={16} /> {post.likeCount}</button>
              <form className="comment-form" onSubmit={(event) => commentOnPost(event, post.id)}>
                <input name="body" placeholder="Add comment" required />
                <button className="primary">Comment</button>
              </form>
              {post.comments.map((comment) => <small key={comment.id}>{comment.body}</small>)}
            </article>
          ))}</div>
        </section>

        {session?.user.role === 'ADMIN' && (
          <section id="admin" className="panel">
            <h2>Admin panel</h2>
            <div className="admin-grid">
              <div>
                <h3>Users</h3>
                {adminUsers.map((user) => (
                  <article className="admin-row" key={user.id}>
                    <div>
                      <strong>{user.fullName}</strong>
                      <span>{user.email} | {user.status} | {user.role}</span>
                      <span>{user.primarySchool || user.highSchool || user.university || user.currentWorkplace}</span>
                    </div>
                    <button className="secondary" onClick={() => updateUserStatus(user.id, user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}>
                      {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </article>
                ))}
              </div>
              <div>
                <h3>Posts</h3>
                {adminPosts.map((post) => (
                  <article className="admin-row" key={post.id}>
                    <div>
                      <strong>{post.author.fullName}</strong>
                      <span>{post.moderationStatus}</span>
                      <p>{post.body}</p>
                    </div>
                    <button className="secondary" onClick={() => moderatePost(post.id, post.moderationStatus === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE')}>
                      {post.moderationStatus === 'VISIBLE' ? 'Hide' : 'Show'}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function ProfileCard({ person, onMessage }: { person: Profile; onMessage: (userId: string) => void }) {
  return (
    <article className="profile-card">
      <img src={person.media.profilePictureUrl} alt="" />
      <div>
        <strong>{person.fullName}</strong>
        <span>{person.education.university || person.education.highSchool || person.education.primarySchool}</span>
        <span>{person.professional.currentWorkplace}</span>
      </div>
      <button className="icon-button" aria-label={`Message ${person.fullName}`} onClick={() => onMessage(person.userId)}>
        <MessageSquare size={17} />
      </button>
    </article>
  );
}
