import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('auth_token');
    const u = localStorage.getItem('auth_user');
    if (t) setToken(t);
    if (u) setUser(JSON.parse(u));
  }, []);

  const save = (u: any, t: string) => {
    const normalized = {
      id: u.Id ?? u.id,
      name: u.Name ?? u.name,
      email: u.Email ?? u.email,
      role: u.Role ?? u.role,
    };
    setUser(normalized);
    setToken(t);
    localStorage.setItem('auth_token', t);
    localStorage.setItem('auth_user', JSON.stringify(normalized));
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await axios.post('/api/login', { email, password });
      if (res.data?.ok) {
        save(res.data.user, res.data.token);
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
      // Prefer server-provided error message when present
      const serverMsg = err?.response?.data?.error;
      throw new Error(serverMsg || err.message || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await axios.post('/api/register', { name, email, password });
    if (res.data?.ok) {
      save(res.data.user, res.data.token);
      const u = res.data.user;
      return {
        id: u.Id ?? u.id,
        name: u.Name ?? u.name,
        email: u.Email ?? u.email,
        role: u.Role ?? u.role,
      } as User;
    } else {
      throw new Error(res.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;