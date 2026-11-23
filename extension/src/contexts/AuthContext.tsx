// ============================================================
// Auth Context & Provider
// Manages authentication state, login, register, and logout
// ============================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types';
import {
  getCurrentUser,
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  isAuthenticated as checkIsAuthenticated,
} from '../services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, password_confirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  const initAuth = async () => {
    try {
      setLoading(true);
      const isAuth = await checkIsAuthenticated();
      if (isAuth) {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          setUser(null);
        }
      } else {
        setAuthenticated(false);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to initialize auth:', err);
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const loggedInUser = await authLogin(email, password);
    setUser(loggedInUser);
    setAuthenticated(true);
  };

  const register = async (name: string, email: string, password: string, password_confirmation: string) => {
    const registeredUser = await authRegister(name, email, password, password_confirmation);
    setUser(registeredUser);
    setAuthenticated(true);
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
    setAuthenticated(false);
  };

  const refreshUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setAuthenticated(!!currentUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: authenticated,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
