import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../data-layer/supabaseClient';

const AuthContext = createContext(null);

export const ROLES = {
  CITIZEN: 'user',
  MOBILITY_PROVIDER: 'provider',
  ADMIN: 'admin',
  CITY_ADMIN: 'city_admin',
  SYSTEM_ADMIN: 'system_admin',
};

const VALID_ROLES = new Set(Object.values(ROLES));
const REGISTERABLE_ROLES = new Set([ROLES.CITIZEN, ROLES.MOBILITY_PROVIDER]);
const LOCAL_USER_KEY = 'summs_local_user';

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (['citizen', 'customer', 'rider'].includes(value)) return ROLES.CITIZEN;
  if (['mobility_provider', 'mobilityprovider', 'provider'].includes(value)) return ROLES.MOBILITY_PROVIDER;
  if (['cityadmin', 'city_admin', 'city administrator', 'cityadministrator'].includes(value)) return ROLES.CITY_ADMIN;
  if (['systemadmin', 'system_admin', 'system administrator', 'systemadministrator'].includes(value)) return ROLES.SYSTEM_ADMIN;
  if (value === ROLES.ADMIN) return ROLES.ADMIN;
  return VALID_ROLES.has(value) ? value : ROLES.CITIZEN;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function makeAppUser({ id, email, name, role, token = '', source = 'users_table', preferredCity = '', preferredMobilityType = '' }) {
  return {
    id: String(id),
    email,
    name: name || email?.split('@')[0] || 'User',
    role: normalizeRole(role),
    token,
    source,
    preferredCity: preferredCity || '',
    preferredMobilityType: preferredMobilityType || '',
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
    return { ...parsed, role: normalizeRole(parsed.role) };
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

async function getUserByCredentials(email, password) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', normalizeEmail(email))
    .eq('password', String(password || ''))
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Users table auth failed: ${error.message}`);
  }

  return data || null;
}

async function createUser({ name, email, password, role }) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      name: String(name || '').trim() || null,
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

function assertRoleDomain(row, selectedRole) {
  const requestedRole = normalizeRole(selectedRole);
  const accountRole = normalizeRole(row?.role);

  if (accountRole === ROLES.ADMIN && [ROLES.CITY_ADMIN, ROLES.SYSTEM_ADMIN].includes(requestedRole)) {
    return requestedRole;
  }

  if (accountRole !== requestedRole) {
    if (accountRole === ROLES.ADMIN) {
      throw new Error('This admin account signs in through City Admin or System Admin.');
    }
    throw new Error('This account belongs to a different domain. Select the matching role to sign in.');
  }

  return requestedRole;
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

  const login = useCallback(async (email, password, selectedRole = ROLES.CITIZEN) => {
    const normalizedEmail = normalizeEmail(email);
    const row = await getUserByCredentials(normalizedEmail, password);

    if (!row) {
      throw new Error('Invalid username or password.');
    }

    const sessionRole = assertRoleDomain(row, selectedRole);

    const appUser = makeAppUser({
      id: row.id,
      email: normalizedEmail,
      name: row.name || '',
      role: sessionRole,
      token: 'users-table-session',
      source: 'users_table',
      preferredCity: row.preferred_city || '',
      preferredMobilityType: row.preferred_mobility_type || '',
    });

    setLocalUser(appUser);
    return { source: 'users_table' };
  }, [setLocalUser]);

  const register = useCallback(async (name, email, password, role = ROLES.CITIZEN) => {
    const normalizedRole = normalizeRole(role);
    if (!REGISTERABLE_ROLES.has(normalizedRole)) {
      throw new Error('Admin accounts cannot be created through registration. Contact a system administrator.');
    }

    const normalizedEmail = normalizeEmail(email);
    let existing = await getUserByEmail(normalizedEmail);
    let row;

    if (!existing) {
      row = await createUser({
        name,
        email: normalizedEmail,
        password,
        role: normalizedRole,
      });
    } else {
      if (normalizeRole(existing.role) !== normalizedRole) {
        throw new Error('This email already belongs to a different account domain. Sign in with the matching role.');
      }
      row = existing;
    }

    const appUser = makeAppUser({
      id: row.id,
      email: normalizedEmail,
      name: String(name || '').trim(),
      role: normalizedRole,
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

  const updatePreferences = useCallback(async (preferences) => {
    if (!user) return;
    const updated = {
      ...user,
      preferredCity: preferences.preferredCity ?? user.preferredCity ?? '',
      preferredMobilityType: preferences.preferredMobilityType ?? user.preferredMobilityType ?? '',
    };
    setLocalUser(updated);

    // Best-effort sync to Supabase (columns may not exist yet — preferences still persist locally)
    try {
      await supabase
        .from('users')
        .update({
          preferred_city: updated.preferredCity,
          preferred_mobility_type: updated.preferredMobilityType,
        })
        .eq('id', Number(user.id));
    } catch {
      // Non-blocking
    }
  }, [user, setLocalUser]);

  const value = useMemo(() => ({
    user,
    authLoading,
    login,
    register,
    logout,
    resetPassword,
    updatePreferences,
    isAuthenticated: Boolean(user),
    isCitizen: user?.role === ROLES.CITIZEN,
    isProvider: user?.role === ROLES.MOBILITY_PROVIDER,
    isAdmin: [ROLES.ADMIN, ROLES.CITY_ADMIN, ROLES.SYSTEM_ADMIN].includes(user?.role),
  }), [user, authLoading, login, register, logout, resetPassword, updatePreferences]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
