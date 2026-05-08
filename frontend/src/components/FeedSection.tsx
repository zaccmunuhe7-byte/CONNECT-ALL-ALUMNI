import { useEffect, useState, useRef } from 'react';
import { MessageCircle, Image, Trash2, Globe, Users, Send, Mic, X } from 'lucide-react';
import { api } from '../api/client';
import type { Profile } from '../pages/Dashboard';

type Reaction = { reaction: string; count: number };
type Post = {
  id: string; body: string; imageUrl?: string; visibility: string; createdAt: string;
  author: { id: string; fullName: string; profilePictureUrl: string };
  reactions: Reaction[];
  myReaction: string | null;
  reactionCount: number;
  comments: { id: string; body: string; authorId: string; authorName: string; createdAt: string }[];
};

const REACTION_EMOJIS: { type: string; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'clap', emoji: '👏', label: 'Clap' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
];

export function FeedSection({ me, flash }: { me: Profile | null; flash: (m: string, t?: 'success'|'error') => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [visibility, setVisibility] = useState<'EVERYONE' | 'CONNECTIONS'>('EVERYONE');
  const [openReactionPicker, setOpenReactionPicker] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Voice note state for posts
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceTime, setVoiceTime] = useState(0);
  const voiceMediaRef = useRef<MediaRecorder | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() { setPosts(await api<Post[]>('/api/posts')); }
  useEffect(() => { load(); }, []);

  // Close reaction picker on click outside
  useEffect(() => {
    if (openReactionPicker) {
      const handler = () => setOpenReactionPicker(null);
      setTimeout(() => document.addEventListener('click', handler), 0);
      return () => document.removeEventListener('click', handler);
    }
  }, [openReactionPicker]);

  async function createPost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (posting) return; // Prevent double-click
    setPosting(true);
    setPosted(false);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set('visibility', visibility);
      if (imgFile) fd.append('image', imgFile);
      await api('/api/posts', { method: 'POST', body: fd });
      e.currentTarget.reset();
      setImgFile(null);
      setImgPreview(null);
      setVoiceBlob(null);
      setVisibility('EVERYONE');
      setPosted(true);
      flash('Posted!');
      load();
      // Hide "Posted" after 3 seconds
      setTimeout(() => setPosted(false), 3000);
    } catch (err: any) {
      flash(err.message || 'Failed to post', 'error');
    } finally {
      setPosting(false);
    }
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setImgFile(f); setImgPreview(URL.createObjectURL(f)); }
  }

  function removeImage() {
    setImgFile(null);
    setImgPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function react(postId: string, reaction: string) {
    setOpenReactionPicker(null);
    await api(`/api/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction })
    });
    load();
  }

  async function comment(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = fd.get('body') as string;
    if (!body.trim()) return;
    await api(`/api/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
    e.currentTarget.reset();
    load();
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return;
    await api(`/api/posts/${id}`, { method: 'DELETE' }); load();
  }

  function toggleComments(postId: string) {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }

  function getReactionSummary(reactions: Reaction[]) {
    return reactions
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .map(r => {
        const emoji = REACTION_EMOJIS.find(e => e.type === r.reaction)?.emoji || '👍';
        return `${emoji} ${r.count}`;
      })
      .join('  ');
  }

  function formatRecordingTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <>
      <div className="panel">
        <h2 className="panel-title" style={{marginBottom:14}}>Alumni Feed</h2>
        <form onSubmit={createPost} className="post-composer">
          <div className="post-composer-row">
            {me && <img src={me.media.profilePictureUrl} alt="" />}
            <textarea name="body" placeholder="Share an update, thoughts, or opportunity..." required />
          </div>
          {imgPreview && (
            <div className="post-image-preview-wrapper">
              <img src={imgPreview} alt="preview" className="post-image-preview" />
              <button type="button" className="btn btn-ghost btn-icon post-image-remove" onClick={removeImage} title="Remove image">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="post-composer-actions">
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                <Image size={16} /> Photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImage} />
              <div className="visibility-toggle">
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm visibility-btn ${visibility === 'EVERYONE' ? 'active' : ''}`}
                  onClick={() => setVisibility('EVERYONE')}
                  title="Visible to everyone"
                >
                  <Globe size={14} /> All
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm visibility-btn ${visibility === 'CONNECTIONS' ? 'active' : ''}`}
                  onClick={() => setVisibility('CONNECTIONS')}
                  title="Visible to connections only"
                >
                  <Users size={14} /> Connections
                </button>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={posting}
            >
              {posting ? (
                <><span className="spinner" /> Posting...</>
              ) : posted ? (
                <>✓ Posted</>
              ) : (
                <><Send size={14} /> Post</>
              )}
            </button>
          </div>
          {posted && (
            <div className="posted-notice">
              ✅ Your post has been published!
            </div>
          )}
        </form>
      </div>
      {posts.map(post => (
        <article className="post" key={post.id}>
          <div className="post-header">
            <img src={post.author.profilePictureUrl} alt="" />
            <div className="post-header-info">
              <strong>{post.author.fullName}</strong>
              <small>
                {timeAgo(post.createdAt)}
                {' · '}
                {post.visibility === 'CONNECTIONS' ? (
                  <span className="vis-badge connections"><Users size={11} /> Connections</span>
                ) : (
                  <span className="vis-badge everyone"><Globe size={11} /> Everyone</span>
                )}
              </small>
            </div>
            {me?.userId === post.author.id && (
              <button className="btn btn-ghost btn-icon" style={{marginLeft:'auto'}} onClick={() => deletePost(post.id)}><Trash2 size={15}/></button>
            )}
          </div>
          <p className="post-body">{post.body}</p>
          {post.imageUrl && <img src={post.imageUrl} alt="" className="post-image" />}

          {/* Reaction summary */}
          {post.reactionCount > 0 && (
            <div className="reaction-summary">
              {getReactionSummary(post.reactions)}
              <span className="reaction-total">{post.reactionCount} reaction{post.reactionCount !== 1 ? 's' : ''}</span>
            </div>
          )}

          <div className="post-actions">
            {/* Reaction button with picker */}
            <div className="reaction-container">
              <button
                className={`btn btn-ghost btn-sm reaction-trigger ${post.myReaction ? 'reacted' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (post.myReaction) {
                    react(post.id, post.myReaction);
                  } else {
                    setOpenReactionPicker(openReactionPicker === post.id ? null : post.id);
                  }
                }}
              >
                {post.myReaction
                  ? <>{REACTION_EMOJIS.find(e => e.type === post.myReaction)?.emoji || '👍'} {REACTION_EMOJIS.find(e => e.type === post.myReaction)?.label}</>
                  : <>👍 Like</>}
              </button>
              {openReactionPicker === post.id && (
                <div className="reaction-picker" onClick={e => e.stopPropagation()}>
                  {REACTION_EMOJIS.map(r => (
                    <button
                      key={r.type}
                      className={`reaction-option ${post.myReaction === r.type ? 'active' : ''}`}
                      onClick={() => react(post.id, r.type)}
                      title={r.label}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => toggleComments(post.id)}>
              <MessageCircle size={15}/> {post.comments.length} Comment{post.comments.length !== 1 ? 's' : ''}
            </button>
          </div>

          {/* Comments section - shown when expanded or has comments */}
          {(expandedComments.has(post.id) || post.comments.length > 0) && (
            <>
              {post.comments.length > 0 && (
                <div className="post-comments">
                  {post.comments.slice(0, expandedComments.has(post.id) ? undefined : 2).map(c => (
                    <div className="comment" key={c.id}>
                      <strong>{c.authorName}</strong>
                      <span>{c.body}</span>
                    </div>
                  ))}
                  {!expandedComments.has(post.id) && post.comments.length > 2 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleComments(post.id)}>
                      View all {post.comments.length} comments
                    </button>
                  )}
                </div>
              )}
              <form className="comment-form" onSubmit={e => comment(e, post.id)}>
                <input name="body" placeholder="Write a comment..." required />
                <button className="btn btn-secondary btn-sm">Comment</button>
              </form>
            </>
          )}
        </article>
      ))}
      {posts.length === 0 && <div className="empty-state"><p>No posts yet. Be the first to share!</p></div>}
    </>
  );
}
