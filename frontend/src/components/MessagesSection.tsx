import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Mic, MicOff, Image, Trash2, StopCircle, Play, Pause } from 'lucide-react';
import { api } from '../api/client';

type Conversation = {
  id: string; members: { id: string; fullName: string; profilePictureUrl: string }[];
  lastMessageAt?: string; lastMessage?: string;
};
type Message = {
  id: string; conversationId: string; senderId: string; body?: string;
  fileUrl?: string; fileType?: string; createdAt: string;
};

export function MessagesSection({ userId }: { userId: string }) {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sending, setSending] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { api<Conversation[]>('/api/messages/conversations').then(setConvos); }, []);

  // Poll for new messages when conversation is active
  useEffect(() => {
    if (active) {
      pollRef.current = setInterval(async () => {
        try {
          const msgs = await api<Message[]>(`/api/messages/conversations/${active.id}/messages`);
          setMessages(prev => {
            if (msgs.length !== prev.length) {
              setTimeout(() => streamRef.current?.scrollTo(0, 999999), 50);
              return msgs;
            }
            return prev;
          });
        } catch {}
      }, 4000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [active]);

  const scrollBottom = useCallback(() => {
    setTimeout(() => streamRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 100);
  }, []);

  async function open(c: Conversation) {
    setActive(c);
    setMessages(await api(`/api/messages/conversations/${c.id}/messages`));
    scrollBottom();
  }

  async function sendText(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!active || sending) return;
    const fd = new FormData(e.currentTarget);
    const body = String(fd.get('body')).trim();
    if (!body) return;
    setSending(true);
    try {
      await api(`/api/messages/conversations/${active.id}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
      e.currentTarget.reset();
      setMessages(await api(`/api/messages/conversations/${active.id}/messages`));
      scrollBottom();
    } finally { setSending(false); }
  }

  async function sendFile(file: File) {
    if (!active) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api(`/api/messages/conversations/${active.id}/files`, { method: 'POST', body: fd });
      setMessages(await api(`/api/messages/conversations/${active.id}/messages`));
      scrollBottom();
      // Refresh conversation list to update last message
      api<Conversation[]>('/api/messages/conversations').then(setConvos);
    } finally { setSending(false); }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) sendFile(f);
    e.target.value = '';
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      const chunks: Blob[] = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunks.length > 0) {
          const mimeType = mr.mimeType || 'audio/webm';
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunks, { type: mimeType });
          sendFile(new File([blob], `voice-note.${ext}`, { type: mimeType }));
        }
      };
      mr.start(100); // Collect data every 100ms for smoother handling
      mediaRef.current = mr;
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      alert('Microphone access is required for voice notes. Please allow microphone access in your browser settings.');
    }
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
    }
    mediaRef.current = null;
    setRecording(false);
    setRecordingTime(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function cancelRecording() {
    if (mediaRef.current) {
      // Clear the onstop handler to prevent sending
      mediaRef.current.onstop = () => {
        // Just stop tracks, don't send
        try {
          const stream = (mediaRef.current as any)?.stream;
          if (stream) stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        } catch {}
      };
      if (mediaRef.current.state !== 'inactive') {
        mediaRef.current.stop();
      }
    }
    mediaRef.current = null;
    setRecording(false);
    setRecordingTime(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function formatRecordingTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const other = (c: Conversation) => c.members.filter(m => m.id !== userId);
  const otherName = (c: Conversation) => other(c).map(m => m.fullName).join(', ') || 'Chat';

  function formatTime(d: string) {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(d: string) {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function shouldShowDateSep(messages: Message[], idx: number) {
    if (idx === 0) return true;
    const prev = new Date(messages[idx - 1].createdAt).toDateString();
    const curr = new Date(messages[idx].createdAt).toDateString();
    return prev !== curr;
  }

  return (
    <div className="panel" style={{ padding: 0 }}>
      <div className="messages-layout">
        <div className="conversation-list">
          <div className="conversation-list-header">
            <span>Messages</span>
            {convos.length > 0 && <span className="convo-count">{convos.length}</span>}
          </div>
          <div className="conversation-list-items">
            {convos.map(c => (
              <button key={c.id} className={`conversation-item ${active?.id === c.id ? 'active' : ''}`} onClick={() => open(c)}>
                <img src={other(c)[0]?.profilePictureUrl || '/uploads/default-avatar.png'} alt="" />
                <div className="conversation-item-info">
                  <strong>{otherName(c)}</strong>
                  <small>{c.lastMessage || 'No messages yet'}</small>
                </div>
                {c.lastMessageAt && (
                  <span className="convo-time">{formatDate(c.lastMessageAt)}</span>
                )}
              </button>
            ))}
            {convos.length === 0 && <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>No conversations yet. Connect with alumni to start chatting!</p>}
          </div>
        </div>
        <div className="chat-panel">
          {active ? (
            <>
              <div className="chat-header">
                <img src={other(active)[0]?.profilePictureUrl || '/uploads/default-avatar.png'} alt="" />
                <div className="chat-header-info">
                  <strong>{otherName(active)}</strong>
                  <span className="online-status">Tap to view profile</span>
                </div>
              </div>
              <div className="message-stream" ref={streamRef}>
                {messages.map((m, idx) => {
                  const mine = m.senderId === userId;
                  return (
                    <div key={m.id}>
                      {shouldShowDateSep(messages, idx) && (
                        <div className="date-separator">
                          <span>{formatDate(m.createdAt)}</span>
                        </div>
                      )}
                      <div className={`message-bubble ${mine ? 'mine' : 'other'}`}>
                        {m.fileUrl && m.fileType === 'image' && <img src={m.fileUrl} alt="" />}
                        {m.fileUrl && m.fileType === 'audio' && (
                          <div className="voice-note-player">
                            <div className="voice-wave-bars">
                              {Array.from({ length: 20 }, (_, i) => (
                                <div key={i} className="wave-bar" style={{ height: `${12 + Math.random() * 18}px` }} />
                              ))}
                            </div>
                            <audio controls src={m.fileUrl} />
                          </div>
                        )}
                        {m.fileUrl && m.fileType === 'video' && <video controls src={m.fileUrl} style={{maxWidth:240,borderRadius:8}} />}
                        {m.body && <div>{m.body}</div>}
                      </div>
                      <div className={`message-time ${mine ? 'mine' : ''}`}>{formatTime(m.createdAt)}</div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="chat-empty-messages">
                    <p>👋 Say hello!</p>
                    <small>Send a message to start the conversation</small>
                  </div>
                )}
              </div>

              {/* Recording overlay */}
              {recording && (
                <div className="recording-overlay">
                  <div className="recording-indicator">
                    <div className="recording-pulse" />
                    <span className="recording-label">Recording</span>
                    <span className="recording-timer">{formatRecordingTime(recordingTime)}</span>
                  </div>
                  <div className="recording-waveform">
                    {Array.from({ length: 30 }, (_, i) => (
                      <div
                        key={i}
                        className="waveform-bar"
                        style={{ animationDelay: `${i * 0.05}s` }}
                      />
                    ))}
                  </div>
                  <div className="recording-actions">
                    <button className="btn btn-danger btn-sm" onClick={cancelRecording} title="Cancel">
                      <Trash2 size={14} /> Cancel
                    </button>
                    <button className="btn btn-success btn-sm" onClick={stopRecording} title="Send voice note">
                      <Send size={14} /> Send
                    </button>
                  </div>
                </div>
              )}

              {!recording && (
                <form className="chat-input" onSubmit={sendText}>
                  <label className="btn btn-ghost btn-icon chat-attach-btn" style={{cursor:'pointer'}} title="Attach file">
                    <Paperclip size={16} /><input type="file" hidden accept="image/*,audio/*,video/*" onChange={handleFileSelect} />
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon chat-mic-btn"
                    onClick={startRecording}
                    title="Record voice note"
                  >
                    <Mic size={16}/>
                  </button>
                  <input name="body" placeholder="Type a message..." autoComplete="off" />
                  <button className="btn btn-primary btn-icon chat-send-btn" disabled={sending} title="Send">
                    <Send size={16}/>
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="chat-empty">
              <div className="chat-empty-content">
                <Send size={40} style={{ opacity: 0.15, marginBottom: 12 }} />
                <p>Select a conversation</p>
                <small>Choose a conversation from the list to start messaging</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
