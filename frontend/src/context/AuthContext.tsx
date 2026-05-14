import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, AuthSession, clearAccessToken, setAccessToken, setOnUnauthorized } from '../api/client';

type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  primarySchool: string;
  highSchool: string;
  university?: string;
  currentWorkplace?: string;
  bio?: string;
  profilePictureUrl?: string;
};

type AuthContextValue = {
  session: AuthSession | null;
  justLoggedIn: boolean;
  clearJustLoggedIn(): void;
  login(email: string, password: string): Promise<void>;
  loginWithGoogle(credential: string): Promise<void>;
  register(input: RegisterInput, avatarFile?: File | null): Promise<void>;
  logout(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const raw = localStorage.getItem('session');
    return raw ? JSON.parse(raw) : null;
  });
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  async function accept(next: AuthSession) {
    setSession(next);
    setAccessToken(next.accessToken);
    localStorage.setItem('refreshToken', next.refreshToken);
    localStorage.setItem('session', JSON.stringify(next));
  }

  function doLogout() {
    clearAccessToken();
    setSession(null);
    setJustLoggedIn(false);
  }

  // Register the unauthorized handler so api client can auto-logout
  useEffect(() => {
    setOnUnauthorized(doLogout);
    return () => setOnUnauthorized(() => {});
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    justLoggedIn,
    clearJustLoggedIn: () => setJustLoggedIn(false),
    async login(email, password) {
      await accept(await api<AuthSession>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }));
      setJustLoggedIn(true);
    },
    async loginWithGoogle(credential: string) {
      await accept(await api<AuthSession>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential })
      }));
      setJustLoggedIn(true);
    },
    async register(input: RegisterInput, avatarFile?: File | null) {
      await accept(await api<AuthSession>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(input)
      }));
      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        await api('/api/profiles/me/avatar', { method: 'POST', body: fd }).catch(console.error);
      }
      setJustLoggedIn(true);
    },
    logout: doLogout
  }), [session, justLoggedIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
