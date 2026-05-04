import { useState } from 'react';
import { GraduationCap, Network, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      if (mode === 'register') {
        await register(String(form.get('fullName')), String(form.get('email')), String(form.get('password')));
      } else {
        await login(String(form.get('email')), String(form.get('password')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-glow" />
        <div className="brand">
          <img src="/connect-logo.svg" alt="" />
          <div>
            <h1>CONNECT_ALUMNI</h1>
            <p>Find classmates, mentors, and career doors in one trusted alumni space.</p>
          </div>
        </div>
        <div className="auth-highlights">
          <span><Network size={15} /> Smart matching</span>
          <span><ShieldCheck size={15} /> Private by design</span>
          <span><Sparkles size={15} /> Real community</span>
        </div>
        <div className="segmented">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>
        <form onSubmit={submit} className="stack">
          {mode === 'register' && <input name="fullName" placeholder="Full name" minLength={2} required />}
          <input name="email" placeholder="Email" type="email" required />
          <input name="password" placeholder="Password" type="password" minLength={8} required />
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit">
            <GraduationCap size={17} />
            {mode === 'register' ? 'Create account' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}
