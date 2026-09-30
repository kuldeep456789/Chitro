'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './api';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const storedToken = localStorage.getItem('chitro_access_token');
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }
      setToken(storedToken);
      const res = await apiClient('/auth/me');
      if (res && res.user) {
        setUser(res.user);
      }
    } catch {
      localStorage.removeItem('chitro_access_token');
      localStorage.removeItem('chitro_refresh_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('chitro_access_token', accessToken);
    localStorage.setItem('chitro_refresh_token', refreshToken);
    setToken(accessToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('chitro_refresh_token');
      if (refreshToken) {
        await apiClient('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('chitro_access_token');
      localStorage.removeItem('chitro_refresh_token');
      setUser(null);
      setToken(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
