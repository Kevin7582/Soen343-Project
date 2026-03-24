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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const resolveRole = useCallback(async (authUser) => {
    if (!authUser) return ROLES.CITIZEN;

    const metadataRole = normalizeRole(authUser.user_metadata?.role);

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (error || !data?.role) {
      return metadataRole;
    }

    return normalizeRole(data.role);
  }, []);

  const upsertProfile = useCallback(async ({ id, email, name, role }) => {
    const payload = {
      id,
      email,
      name,
      role: normalizeRole(role),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      // Non-blocking: auth should still work even if profiles table is not ready.
      console.warn('Profile upsert failed:', error.message);
    }
  }, []);

  const toAppUser = useCallback(async (authUser, session) => {
    if (!authUser) return null;
    const metadata = authUser.user_metadata || {};
    const resolvedRole = await resolveRole(authUser);
    return {
      id: authUser.id,
      email: authUser.email,
      name: metadata.name || authUser.email?.split('@')[0] || 'User',
      role: resolvedRole,
      token: session?.access_token || '',
    };
  }, [resolveRole]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        const session = data?.session || null;
        const appUser = await toAppUser(session?.user, session);
        if (!mounted) return;
        setUser(appUser);
        setAuthLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setAuthLoading(false);
      });

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
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) throw new Error(mapAuthError(error));

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
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: name.trim(),
          role: normalizedRole,
        },
      },
    });

    if (error) throw new Error(mapAuthError(error));

    if (data?.user) {
      await upsertProfile({
        id: data.user.id,
        email: normalizedEmail,
        name: name.trim(),
        role: normalizedRole,
      });
      const appUser = await toAppUser(data.user, data.session || null);
      setUser(appUser);
    }
    return data;
  }, [toAppUser, upsertProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    if (error) throw new Error(mapAuthError(error));
  }, []);

  const value = {
    user,
    login,
    register,
    logout,
    resetPassword,
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
