import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { authApi } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function unwrapUser(payload: unknown): User {
  const obj = payload as Record<string, unknown>;
  const rawUser = ((obj?.user as Record<string, unknown> | undefined) ?? obj) || {};
  const sub = rawUser.subscription as { plan?: { name?: string } } | undefined;
  return {
    id: Number(rawUser.id ?? 0),
    name: String(rawUser.name ?? ''),
    email: String(rawUser.email ?? ''),
    plan: String(rawUser.plan || sub?.plan?.name || 'free'),
    created_at: String(rawUser.created_at ?? ''),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(unwrapUser(data.data));
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    const t = data.data.access_token || (data.data as unknown as { token?: string }).token || '';
    localStorage.setItem('token', t);
    setToken(t);
    const { data: meData } = await authApi.me();
    setUser(unwrapUser(meData.data));
  };

  const register = async (name: string, email: string, password: string, passwordConfirmation: string) => {
    await authApi.register(name, email, password, passwordConfirmation);
  };

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const { data } = await authApi.me();
      setUser(unwrapUser(data.data));
    } catch {
      /* ignore transient refresh failure */
    }
  }, []);

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
