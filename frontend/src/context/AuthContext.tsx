'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { AuthResponse, AuthUser } from '@/lib/types';
import { authApi, tokenStorage } from '@/lib/api';

const USER_KEY = 'vita_care_user';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  setSession: (auth: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Holds the signed-in user and token. The token lives in localStorage so the
 * session survives page reloads; the API client reads it automatically.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore any existing session on first load.
  useEffect(() => {
    const stored =
      typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
    if (stored && tokenStorage.get()) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Ignore corrupt data.
      }
    }
    setLoading(false);
  }, []);

  const setSession = (auth: AuthResponse) => {
    tokenStorage.set(auth.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    setUser(auth.user);
  };

  const login = async (email: string, password: string) => {
    const auth = await authApi.loginRequest(email, password);
    setSession(auth);
    return auth.user;
  };

  const logout = () => {
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
