import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../../data-layer/supabaseClient';

const AuthContext = createContext(null);

export const ROLES = {
  CITIZEN: 'citizen',
  MOBILITY_PROVIDER: 'mobility_provider',
  ADMIN: 'admin',
};

const VALID_ROLES = new Set(Object.values(ROLES));

function normalizeRole(role) {
  return VALID_ROLES.has(role) ? role : ROLES.CITIZEN;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function mapAuthError(error) {
  const message = (error?.message || '').toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (message.includes('email not confirmed')) {
    return 'Email not confirmed. Please verify your email first.';
  }
  if (message.includes('already registered')) {
    return 'This email is already registered.';
  }
  if (message.includes('password should be at least')) {
    return 'Password does not meet minimum requirements.';
  }

  return error?.message || 'Authentication failed.';
}

async function fetchProfileRole(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data?.role) {
    return null;
  }

  return normalizeRole(data.role);
}

async function saveProfile({ id, email, name, role }) {
  const profile = {
    id,
    email,
    name,
    role: normalizeRole(role),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
  if (error) {
    // Non-blocking so auth still works if profiles table is absent or restricted.
    console.warn('Profile upsert failed:', error.message);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const toAppUser = useCallback(async (authUser, session) => {
    if (!authUser) return null;

    const metadata = authUser.user_metadata || {};
    const metadataRole = normalizeRole(metadata.role);
    const profileRole = await fetchProfileRole(authUser.id);

    return {
      id: authUser.id,
      email: authUser.email,
      name: metadata.name || authUser.email?.split('@')[0] || 'User',
      role: profileRole || metadataRole,
      token: session?.access_token || '',
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrateFromSession() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session || null;
        const appUser = await toAppUser(session?.user, session);

        if (!mounted) return;
        setUser(appUser);
      } finally {
        if (!mounted) return;
        setAuthLoading(false);
      }
    }

    hydrateFromSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const appUser = await toAppUser(session?.user, session || null);
      if (!mounted) return;
      setUser(appUser);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [toAppUser]);

  const login = useCallback(async (email, password, expectedRole) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (error) {
      throw new Error(mapAuthError(error));
    }

    const appUser = await toAppUser(data?.user, data?.session || null);
    const normalizedExpectedRole = normalizeRole(expectedRole);

    if (normalizedExpectedRole && appUser?.role !== normalizedExpectedRole) {
      await supabase.auth.signOut();
      throw new Error(`This account is not registered as ${normalizedExpectedRole.replace('_', ' ')}.`);
    }

    setUser(appUser);
    return data;
  }, [toAppUser]);

  const register = useCallback(async (name, email, password, role = ROLES.CITIZEN) => {
    const normalizedRole = normalizeRole(role);
    const normalizedName = String(name || '').trim();
    const normalizedEmail = normalizeEmail(email);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: normalizedName,
          role: normalizedRole,
        },
      },
    });

    if (error) {
      throw new Error(mapAuthError(error));
    }

    if (data?.user) {
      await saveProfile({
        id: data.user.id,
        email: normalizedEmail,
        name: normalizedName,
        role: normalizedRole,
      });

      const appUser = await toAppUser(data.user, data.session || null);
      setUser(appUser);
    }

    return data;
  }, [toAppUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: window.location.origin,
    });

    if (error) {
      throw new Error(mapAuthError(error));
    }
  }, []);

  const value = {
    user,
    authLoading,
    login,
    register,
    logout,
    resetPassword,
    isAuthenticated: Boolean(user),
    isCitizen: user?.role === ROLES.CITIZEN,
    isProvider: user?.role === ROLES.MOBILITY_PROVIDER,
    isAdmin: user?.role === ROLES.ADMIN,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
