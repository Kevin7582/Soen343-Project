import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = val;
  });
}

loadDotEnv();

const PORT = Number(process.env.STM_PROXY_PORT || 8090);
const HOST = process.env.STM_PROXY_HOST || '127.0.0.1';
const GOOGLE_SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY || '';

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) rejectBody(new Error('Request too large'));
    });
    req.on('end', () => resolveBody(data));
    req.on('error', rejectBody);
  });
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cleanText(v) {
  return String(v || '').replace(/<[^>]*>/g, '').trim();
}

function reliability(transfers, walkKm) {
  if (transfers <= 1 && walkKm <= 0.6) return 'high';
  if (transfers <= 2 && walkKm <= 1.2) return 'medium';
  return 'low';
}

async function fetchGoogleFallback(body) {
  if (!GOOGLE_SERVER_KEY) {
    throw new Error('GOOGLE_MAPS_SERVER_API_KEY is missing for fallback mode.');
  }

  const fromLat = toNum(body?.fromLat);
  const fromLon = toNum(body?.fromLon);
  const toLat = toNum(body?.toLat);
  const toLon = toNum(body?.toLon);

  if (![fromLat, fromLon, toLat, toLon].every(Number.isFinite)) {
    throw new Error('Invalid coordinates in request.');
  }

  const mode = body?.plannerMode || 'depart_now';
  const when = Math.floor(new Date(body?.plannedDateTime || Date.now()).getTime() / 1000);

  const params = new URLSearchParams({
    origin: `${fromLat},${fromLon}`,
    destination: `${toLat},${toLon}`,
    mode: 'transit',
    alternatives: 'true',
    language: 'en',
    key: GOOGLE_SERVER_KEY,
  });

  if (mode === 'arrive_by') params.set('arrival_time', String(when));
  else if (mode === 'depart_at') params.set('departure_time', String(when));
  else params.set('departure_time', 'now');

  const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Google Directions failed: ${res.status} ${res.statusText}`);
  }

  const payload = await res.json();
  if (payload?.status !== 'OK' && payload?.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Directions status: ${payload?.status || 'UNKNOWN'}`);
  }

  const routes = Array.isArray(payload?.routes) ? payload.routes : [];
  const options = routes.map((route, index) => {
    const leg = route?.legs?.[0] || {};
    const steps = Array.isArray(leg?.steps) ? leg.steps : [];
    const walkMeters = steps
      .filter((step) => step?.travel_mode === 'WALKING')
      .reduce((sum, step) => sum + Number(step?.distance?.value || 0), 0);
    const transitSteps = steps.filter((step) => step?.travel_mode === 'TRANSIT');
    const transfers = Math.max(0, transitSteps.length - 1);
    const walkKm = Number((walkMeters / 1000).toFixed(2));

    return {
      id: `google-${index + 1}`,
      label: `Transit ${index + 1}`,
      durationMin: Math.max(1, Math.round(Number(leg?.duration?.value || 0) / 60)),
      walkKm,
      transfers,
      reliability: reliability(transfers, walkKm),
      legs: steps.map((step) => ({
        mode: step?.travel_mode || '',
        route: step?.transit_details?.line?.short_name || step?.transit_details?.line?.name || '',
        from: step?.transit_details?.departure_stop?.name || '',
        to: step?.transit_details?.arrival_stop?.name || '',
        distanceKm: Number((Number(step?.distance?.value || 0) / 1000).toFixed(2)),
        durationMin: Math.max(1, Math.round(Number(step?.duration?.value || 0) / 60)),
        instruction: cleanText(step?.html_instructions),
      })),
    };
  });

  return {
    options,
    updatedAt: new Date().toISOString(),
    source: 'google-fallback',
  };
}

async function handleCompare(req, res) {
  let body = {};
  const raw = await readBody(req);
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON body' });
      return;
    }
  }

  try {
    const result = await fetchGoogleFallback(body);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 502, { error: error?.message || 'Transit compare failed' });
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.url === '/health') {
    sendJson(res, 200, {
      ok: true,
      mode: 'google-transit',
      hasGoogleServerKey: Boolean(GOOGLE_SERVER_KEY),
    });
    return;
  }

  if (req.url === '/transit/compare' && req.method === 'POST') {
    await handleCompare(req, res);
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[transit-proxy] http://${HOST}:${PORT}`);
  console.log('[transit-proxy] using google transit compare mode');
});
