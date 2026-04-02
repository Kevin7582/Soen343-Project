// API Gateway Layer
// Acts as a unified entry point for all backend data operations.
// Currently routes to Supabase directly (client-side BaaS).
// Can be swapped to a REST API backend without changing the service layer.

import { supabase } from '../data-layer/supabaseClient';

const requestLog = [];
const MAX_LOG_SIZE = 100;

function logRequest(method, table, params, success, durationMs) {
  const entry = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    method,
    table,
    params: JSON.stringify(params).slice(0, 200),
    success,
    durationMs,
    timestamp: new Date().toISOString(),
  };
  requestLog.unshift(entry);
  if (requestLog.length > MAX_LOG_SIZE) requestLog.length = MAX_LOG_SIZE;
  return entry;
}

async function timedQuery(method, table, params, queryFn) {
  const start = performance.now();
  try {
    const result = await queryFn();
    const duration = Math.round(performance.now() - start);
    logRequest(method, table, params, true, duration);
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logRequest(method, table, params, false, duration);
    throw error;
  }
}

export const gateway = {
  async select(table, { columns = '*', filters = {}, order, limit, single = false } = {}) {
    return timedQuery('SELECT', table, filters, async () => {
      let query = supabase.from(table).select(columns);
      for (const [key, value] of Object.entries(filters)) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
      if (order) query = query.order(order.column, { ascending: order.ascending ?? false });
      if (limit) query = query.limit(limit);
      if (single) query = query.maybeSingle();
      const { data, error } = await query;
      if (error) throw error;
      return data;
    });
  },

  async count(table, filters = {}) {
    return timedQuery('COUNT', table, filters, async () => {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    });
  },

  async insert(table, payload) {
    return timedQuery('INSERT', table, payload, async () => {
      const { data, error } = await supabase.from(table).insert(payload).select('*').single();
      if (error) throw error;
      return data;
    });
  },

  async update(table, id, updates) {
    return timedQuery('UPDATE', table, { id, ...updates }, async () => {
      const { data, error } = await supabase.from(table).update(updates).eq('id', id).select('*').single();
      if (error) throw error;
      return data;
    });
  },

  async remove(table, id) {
    return timedQuery('DELETE', table, { id }, async () => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    });
  },

  getRequestLog() {
    return [...requestLog];
  },

  getStats() {
    const total = requestLog.length;
    const successful = requestLog.filter((r) => r.success).length;
    const failed = total - successful;
    const avgDuration = total > 0
      ? Math.round(requestLog.reduce((sum, r) => sum + r.durationMs, 0) / total)
      : 0;

    const byTable = {};
    requestLog.forEach((r) => {
      if (!byTable[r.table]) byTable[r.table] = 0;
      byTable[r.table]++;
    });

    return { total, successful, failed, avgDuration, byTable };
  },
};

// Legacy HTTP client for future external API integration
const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.summs.example.com';

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (path, token) => request(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  post: (path, body, token) => request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }),
};
