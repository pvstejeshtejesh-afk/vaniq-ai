import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Business, User } from './types';

interface AuthState {
  user: User | null;
  business: Business | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setBusiness: (b: Business | null) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusinessState] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const data = await api.get<{ user: User; business: Business | null }>('/auth/me');
      setUser(data.user);
      setBusinessState(data.business ?? null);
    } catch {
      setUser(null);
      setBusinessState(null);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
    setBusinessState(null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, business, loading, refresh, logout, setBusiness: setBusinessState }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
