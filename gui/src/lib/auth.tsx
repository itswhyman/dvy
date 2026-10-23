'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@/types';
import { api, authApi, setToken } from './api';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await authApi.me();
    if (res.success && res.data) setUser(res.data);
    else {
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('best_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (!res.success || !res.data) {
      return { ok: false, error: res.error || 'Login failed' };
    }
    setToken(res.data.token);
    setUser(res.data.user);
    return { ok: true };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await authApi.register(name, email, password);
    if (!res.success || !res.data) {
      return { ok: false, error: res.error || 'Register failed' };
    }
    setToken(res.data.token);
    setUser(res.data.user);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { api };
