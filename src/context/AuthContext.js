import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const ROLES = {
  CITIZEN: 'citizen',
  MOBILITY_PROVIDER: 'mobility_provider',
  ADMIN: 'admin',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = useCallback((email, password, role = ROLES.CITIZEN) => {
    // Mock: in production, call API Gateway auth
    setUser({
      id: '1',
      email,
      name: email.split('@')[0],
      role,
      token: 'mock-jwt-token',
    });
  }, []);

  const register = useCallback((name, email, password, role = ROLES.CITIZEN) => {
    setUser({
      id: '1',
      email,
      name,
      role,
      token: 'mock-jwt-token',
    });
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    ROLES,
    isCitizen: user?.role === ROLES.CITIZEN,
    isProvider: user?.role === ROLES.MOBILITY_PROVIDER,
    isAdmin: user?.role === ROLES.ADMIN,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
