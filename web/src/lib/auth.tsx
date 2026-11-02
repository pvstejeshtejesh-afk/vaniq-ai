import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, isDemoMode, setDemoMode } from './api';
import type { Business, User } from './types';

interface AuthState {
  user: User | null;
  business: Business | null;
  loading: boolean;
  isDemo: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  startDemo: () => Promise<void>;
  setBusiness: (b: Business | null) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusinessState] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(isDemoMode());

  async function refresh() {
    try {
      const data = await api.get<{ user: User; business: Business | null }>('/auth/me');
      setUser(data.user);
      setBusinessState(data.business ?? null);
      setIsDemo(isDemoMode());
    } catch {
      setUser(null);
      setBusinessState(null);
      setIsDemo(false);
    } finally {
      setLoading(false);
    }
  }

  async function startDemo() {
    setDemoMode(true);
    await refresh();
  }

  async function logout() {
    await api.post('/auth/logout');
    setDemoMode(false);
    setUser(null);
    setBusinessState(null);
    setIsDemo(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        loading,
        isDemo,
        refresh,
        logout,
        startDemo,
        setBusiness: setBusinessState,
      }}
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
