// STM Service Status
// Fetches metro service status directly from STM API

const STM_API_KEY = import.meta.env.VITE_STM_API_KEY || '';
const STM_API_URL = 'https://api.stm.info/pub/od/i3/v2/messages/etatservice';
const STM_PROXY_URL = import.meta.env.VITE_STM_PROXY_URL || '';
const STM_SCHEDULE_API_URL = import.meta.env.VITE_STM_SCHEDULE_API_URL || '';

let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 60_000; // 60 seconds

// Known STM metro lines for display
const METRO_LINES = {
  1: { name: 'Green Line', color: '#00A651' },
  2: { name: 'Orange Line', color: '#ED8B00' },
  4: { name: 'Blue Line', color: '#0072CE' },
  5: { name: 'Yellow Line', color: '#FFD700' },
};

export async function fetchStmStatus() {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    const res = await fetch(STM_API_URL, {
      headers: { apiKey: STM_API_KEY },
    });
    if (!res.ok) throw new Error(`STM API returned ${res.status}`);
    const raw = await res.json();

    const parsed = parseStmResponse(raw);
    cache = { data: parsed, timestamp: now };
    return parsed;
  } catch (err) {
    console.warn('STM fetch error, using cache or fallback:', err.message);
    return cache.data || getFallbackStatus();
  }
}

function parseStmResponse(raw) {
  // STM etatservice returns service messages/alerts
  const messages = Array.isArray(raw) ? raw : raw?.result || raw?.messages || raw?.data || [];

  const lineStatuses = Object.entries(METRO_LINES).map(([id, info]) => {
    // Find alerts for this line
    const lineAlerts = Array.isArray(messages)
      ? messages.filter((m) => {
          const text = JSON.stringify(m).toLowerCase();
          return text.includes(info.name.toLowerCase()) || text.includes(`ligne ${id}`) || text.includes(`line ${id}`);
        })
      : [];

    const hasIssue = lineAlerts.length > 0;
    return {
      id: String(id),
      name: info.name,
      color: info.color,
      status: hasIssue ? 'disrupted' : 'normal',
      alerts: lineAlerts.map((a) => a?.message || a?.body || a?.text || JSON.stringify(a)).slice(0, 3),
    };
  });

  return {
    lines: lineStatuses,
    rawAlerts: Array.isArray(messages) ? messages : [],
    updatedAt: new Date().toISOString(),
    source: 'stm-api',
  };
}

function getFallbackStatus() {
  return {
    lines: Object.entries(METRO_LINES).map(([id, info]) => ({
      id: String(id),
      name: info.name,
      color: info.color,
      status: 'unknown',
      alerts: [],
    })),
    rawAlerts: [],
    updatedAt: new Date().toISOString(),
    source: 'fallback',
  };
}

function buildUrl(baseUrl, params = {}) {
  if (!baseUrl) return '';
  const url = new URL(baseUrl, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

export async function fetchStmSchedules({ mode = 'metro', query = '', routeId = '', stopId = '', limit = 12 } = {}) {
  const proxyBase = STM_PROXY_URL
    ? `${STM_PROXY_URL.replace(/\/$/, '')}/stm/schedules`
    : '';
  const endpoint = buildUrl(proxyBase || STM_SCHEDULE_API_URL, { mode, query, routeId, stopId, limit });

  if (!endpoint) {
    return {
      schedules: [],
      source: 'not-configured',
      message: 'STM schedule feed is not connected yet. Showing live service status only.',
      setupHint: 'Configure VITE_STM_PROXY_URL or VITE_STM_SCHEDULE_API_URL to load STM schedules.',
    };
  }

  const res = await fetch(endpoint);
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      schedules: [],
      source: payload?.source || 'stm-schedule-unavailable',
      message: 'STM schedule feed is temporarily unavailable. Showing live service status only.',
      setupHint: payload?.message || payload?.error || `STM schedule request failed with ${res.status}.`,
    };
  }

  return {
    schedules: Array.isArray(payload?.schedules) ? payload.schedules : [],
    source: payload?.source || 'stm-schedule-api',
    message: payload?.message || '',
    updatedAt: payload?.updatedAt || new Date().toISOString(),
    gtfsUrl: payload?.gtfsUrl || '',
    mode: payload?.mode || mode,
    query: payload?.query || query,
  };
}
