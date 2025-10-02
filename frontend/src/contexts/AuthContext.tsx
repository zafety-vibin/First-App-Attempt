/**
 * AuthContext - Manages authentication state
 * Simplified version - full Keycloak integration to be added later
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../../../shared/types/User';
import { authService } from '../services/authService';
import { setAuthToken } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        setAuthToken(token);
        const result = await authService.validate();
        if (result.valid && result.user) {
          setUser(result.user);
        } else {
          localStorage.removeItem('authToken');
          setAuthToken(null);
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const login = async (username: string, password: string) => {
    // Simplified login - just use a dummy token for now
    const dummyToken = `test-token-${Date.now()}`;
    const response = await authService.login(dummyToken);

    setUser(response.user);
    localStorage.setItem('authToken', dummyToken);
    setAuthToken(dummyToken);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    localStorage.removeItem('authToken');
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
