import { createContext, useContext, useMemo, useState } from 'react';
import { api, AuthSession, clearAccessToken, setAccessToken } from '../api/client';

type AuthContextValue = {
  session: AuthSession | null;
  login(email: string, password: string): Promise<void>;
  register(fullName: string, email: string, password: string): Promise<void>;
  logout(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const raw = localStorage.getItem('session');
    return raw ? JSON.parse(raw) : null;
  });

  async function accept(next: AuthSession) {
    setSession(next);
    setAccessToken(next.accessToken);
    localStorage.setItem('refreshToken', next.refreshToken);
    localStorage.setItem('session', JSON.stringify(next));
  }

  const value = useMemo<AuthContextValue>(() => ({
    session,
    async login(email, password) {
      await accept(await api<AuthSession>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }));
    },
    async register(fullName, email, password) {
      await accept(await api<AuthSession>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password })
      }));
    },
    logout() {
      clearAccessToken();
      localStorage.removeItem('session');
      setSession(null);
    }
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
