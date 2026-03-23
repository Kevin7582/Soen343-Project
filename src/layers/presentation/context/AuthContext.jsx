import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../../data-layer/supabaseClient';

const AuthContext = createContext(null);

export const ROLES = {
  CITIZEN: 'citizen',
  MOBILITY_PROVIDER: 'mobility_provider',
  ADMIN: 'admin',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const toAppUser = useCallback((authUser, session) => {
    if (!authUser) return null;
    const metadata = authUser.user_metadata || {};
    return {
      id: authUser.id,
      email: authUser.email,
      name: metadata.name || authUser.email?.split('@')[0] || 'User',
      role: metadata.role || ROLES.CITIZEN,
      token: session?.access_token || '',
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data?.session || null;
      setUser(toAppUser(session?.user, session));
      setAuthLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAppUser(session?.user, session || null));
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [toAppUser]);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    setUser(toAppUser(data?.user, data?.session || null));
    return data;
  }, [toAppUser]);

  const register = useCallback(async (name, email, password, role = ROLES.CITIZEN) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });
    if (error) throw error;
    if (data?.user) {
      setUser(toAppUser(data.user, data.session || null));
    }
    return data;
  }, [toAppUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = {
    user,
    login,
    register,
    logout,
    authLoading,
    isAuthenticated: Boolean(user),
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
