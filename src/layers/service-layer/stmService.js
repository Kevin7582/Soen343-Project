// STM Service Status
// Fetches metro service status directly from STM API

const STM_API_KEY = import.meta.env.VITE_STM_API_KEY || '';
const STM_API_URL = 'https://api.stm.info/pub/od/i3/v2/messages/etatservice';

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
