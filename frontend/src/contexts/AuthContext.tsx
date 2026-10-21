import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, disconnectSocket } from '../services/api';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
  accountIds: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isSuperAdmin: () => boolean;
  canAccessAccount: (accountId: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Only use sessionStorage for active tab sessions. When opening the web anew, it starts on the Login Page.
  const [token, setToken] = useState<string | null>(() => {
    try {
      localStorage.removeItem('wa_token'); // Purge any legacy persistent token
      return sessionStorage.getItem('wa_token');
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      return !!sessionStorage.getItem('wa_token');
    } catch {
      return false;
    }
  });

  // Synchronize authentication state across browser tabs in the current session
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('auth_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'LOGOUT') {
          sessionStorage.removeItem('wa_token');
          localStorage.removeItem('wa_token');
          delete api.defaults.headers.common['Authorization'];
          setToken(null);
          setUser(null);
        } else if (event.data?.type === 'SESSION_UPDATED') {
          // [F-2 FIX] Read from sessionStorage securely, do not accept token from event
          const freshToken = sessionStorage.getItem('wa_token');
          if (freshToken) setToken(freshToken);
        }
      };
    } catch {}
    return () => {
      channel?.close();
    };
  }, []);

  // Set auth header on api instance
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { logout(); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    disconnectSocket();
    const res = await api.post('/auth/login', { username, password });
    const { token: t, user: u } = res.data;
    sessionStorage.setItem('wa_token', t);
    localStorage.removeItem('wa_token'); // Ensure localStorage doesn't bypass login on next visit
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    try {
      const channel = new BroadcastChannel('auth_sync');
      // [F-2 FIX] Broadcast signal only, never the plaintext token
      channel.postMessage({ type: 'SESSION_UPDATED' });
      channel.close();
    } catch {}
  };

  const logout = () => {
    if (user) {
      api.post('/auth/logout', {
        username: user.username,
        displayName: user.displayName,
      }).catch(() => null);
    }
    disconnectSocket();
    sessionStorage.removeItem('wa_token');
    localStorage.removeItem('wa_token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    try {
      const channel = new BroadcastChannel('auth_sync');
      channel.postMessage({ type: 'LOGOUT' });
      channel.close();
    } catch {}
  };

  const isSuperAdmin = () => user?.role === 'SUPER_ADMIN';

  const canAccessAccount = (accountId: string) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.accountIds.includes(accountId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        loading: isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        isSuperAdmin,
        canAccessAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
