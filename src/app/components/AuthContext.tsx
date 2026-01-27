import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

type User = {
  id: number;
  name: string;
  surname?: string | null;
  email: string;
  role?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<User>;
  register: (name: string, surname: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  authLoading: boolean;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // prefer sessionStorage (short-lived) if present, otherwise localStorage
    const sessionToken = sessionStorage.getItem('auth_token');
    const sessionUser = sessionStorage.getItem('auth_user');
    if (sessionToken) {
      setToken(sessionToken);
      if (sessionUser) setUser(JSON.parse(sessionUser));
      return;
    }

    const t = localStorage.getItem('auth_token');
    const u = localStorage.getItem('auth_user');
    const exp = localStorage.getItem('auth_expiry');
    if (t && exp) {
      const when = Number(exp || 0);
      if (!when || Date.now() > when) {
        // expired
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_expiry');
        setToken(null);
        setUser(null);
      } else {
        setToken(t);
        if (u) setUser(JSON.parse(u));
      }
    }
  }, []);

  const save = (u: any, t: string, remember = false) => {
    const normalized = {
      id: u.Id ?? u.id,
      name: u.Name ?? u.name,
      surname: u.Surname ?? u.LastName ?? u.Last_name ?? null,
      email: u.Email ?? u.email,
      role: u.Role ?? u.role,
    };
    setUser(normalized);
    setToken(t);
    if (remember) {
      const expiry = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
      localStorage.setItem('auth_token', t);
      localStorage.setItem('auth_user', JSON.stringify(normalized));
      localStorage.setItem('auth_expiry', String(expiry));
      // remove any session storage fallback
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
    } else {
      // session-only
      sessionStorage.setItem('auth_token', t);
      sessionStorage.setItem('auth_user', JSON.stringify(normalized));
      // clear any localStorage persistent token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_expiry');
    }
  };

  const login = async (email: string, password: string, remember = false) => {
    setAuthLoading(true);
    const start = Date.now();
    try {
      const res = await axios.post('/api/login', { email, password });
      if (res.data?.ok) {
        save(res.data.user, res.data.token, remember);
        const u = res.data.user;
        return {
          id: u.Id ?? u.id,
          name: u.Name ?? u.name,
          email: u.Email ?? u.email,
          role: u.Role ?? u.role,
        } as User;
      }
      throw new Error(res.data?.error || 'Login failed');
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error;
      throw new Error(serverMsg || err.message || 'Login failed');
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));
      setAuthLoading(false);
    }
  };

  const register = async (name: string, surname: string, email: string, password: string) => {
    setAuthLoading(true);
    const start = Date.now();
    try {
      const res = await axios.post('/api/register', { name, surname, email, password });
      if (res.data?.ok) {
        // preserve existing behavior: new registrations create a persistent session
        save(res.data.user, res.data.token, true);
        const u = res.data.user;
        return {
          id: u.Id ?? u.id,
          name: u.Name ?? u.name,
          surname: u.Surname ?? u.LastName ?? null,
          email: u.Email ?? u.email,
          role: u.Role ?? u.role,
        } as User;
      } else {
        throw new Error(res.data?.error || 'Registration failed');
      }
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error;
      throw new Error(serverMsg || err.message || 'Registration failed');
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setAuthLoading(true);
    const start = Date.now();
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    const elapsed = Date.now() - start;
    if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));
    setAuthLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, authLoading, isAuthenticated: !!token }}>
      {children}
      {authLoading && (
        <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin mb-4" style={{ width: 48, height: 48, border: '4px solid #f3f3f3', borderTop: '4px solid #e11d67', borderRadius: '50%' }} />
            <div className="text-lg font-medium">{t('loading')}</div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;