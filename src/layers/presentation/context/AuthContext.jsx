import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../data-layer/supabaseClient';

const AuthContext = createContext(null);

export const ROLES = {
  CITIZEN: 'citizen',
  MOBILITY_PROVIDER: 'mobility_provider',
  ADMIN: 'admin',
};

const VALID_ROLES = new Set(Object.values(ROLES));
const LOCAL_USER_KEY = 'summs_local_user';

function normalizeRole(role) {
  return VALID_ROLES.has(role) ? role : ROLES.CITIZEN;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function makeAppUser({ id, email, name, role, token = '', source = 'users_table' }) {
  return {
    id: String(id),
    email,
    name: name || email?.split('@')[0] || 'User',
    role: normalizeRole(role),
    token,
    source,
  };
}

function persistLocalUser(user) {
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
}

function clearLocalUser() {
  localStorage.removeItem(LOCAL_USER_KEY);
}

function loadLocalUser() {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.email || !parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', normalizeEmail(email))
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Users table read failed: ${error.message}`);
  }

  return data || null;
}

async function createUser({ email, password, role }) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: normalizeEmail(email),
      password: String(password || '123456'),
      role: normalizeRole(role),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Users table insert failed: ${error.message}`);
  }

  return data;
}

async function updateUserRole(id, role) {
  const { error } = await supabase
    .from('users')
    .update({ role: normalizeRole(role) })
    .eq('id', id);

  if (error) {
    // Non-blocking for lenient auth flow.
    console.warn('Role update skipped:', error.message);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const setLocalUser = useCallback((nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      persistLocalUser(nextUser);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const localUser = loadLocalUser();
        if (!mounted) return;
        setUser(localUser);
      } finally {
        if (!mounted) return;
        setAuthLoading(false);
      }
    }

    hydrateSession();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      // Keep lenient users-table local session as source of truth for now.
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, password, selectedRole) => {
    const normalizedEmail = normalizeEmail(email);

    let row = await getUserByEmail(normalizedEmail);

    // Lenient mode: auto-create user if not found.
    if (!row) {
      row = await createUser({
        email: normalizedEmail,
        password,
        role: selectedRole,
      });
    }

    // Lenient mode: if a role is selected, silently sync to that role.
    if (selectedRole && row.role !== normalizeRole(selectedRole)) {
      await updateUserRole(row.id, selectedRole);
      row.role = normalizeRole(selectedRole);
    }

    const appUser = makeAppUser({
      id: row.id,
      email: normalizedEmail,
      role: row.role,
      token: 'users-table-session',
      source: 'users_table',
    });

    setLocalUser(appUser);
    return { source: 'users_table' };
  }, [setLocalUser]);

  const register = useCallback(async (name, email, password, role = ROLES.CITIZEN) => {
    const normalizedEmail = normalizeEmail(email);

    let row = await getUserByEmail(normalizedEmail);
    if (!row) {
      row = await createUser({
        email: normalizedEmail,
        password,
        role,
      });
    } else {
      await updateUserRole(row.id, role);
      row.role = normalizeRole(role);
    }

    const appUser = makeAppUser({
      id: row.id,
      email: normalizedEmail,
      name: String(name || '').trim(),
      role: row.role,
      token: 'users-table-session',
      source: 'users_table',
    });

    setLocalUser(appUser);
    return { source: 'users_table' };
  }, [setLocalUser]);

  const logout = useCallback(async () => {
    clearLocalUser();
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore for lenient mode.
    }
  }, []);

  const resetPassword = useCallback(async () => {
    // Lenient mode for student project: do not block on reset flow.
    return;
  }, []);

  const value = useMemo(() => ({
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
  }), [user, authLoading, login, register, logout, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
