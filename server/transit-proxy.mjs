import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const PORT = Number(process.env.STM_PROXY_PORT || 8090);
const HOST = process.env.STM_PROXY_HOST || '127.0.0.1';
const GOOGLE_SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY || '';
const STM_API_KEY = (process.env.STM_API_KEY || process.env.VITE_STM_API_KEY || '').trim();
const STM_SCHEDULE_API_URL = (process.env.STM_SCHEDULE_API_URL || '').trim();
const STM_GTFS_URL = (process.env.STM_GTFS_URL || 'https://www.stm.info/sites/default/files/gtfs/gtfs_stm.zip').trim();
const GTFS_CACHE_TTL_MS = Number(process.env.STM_GTFS_CACHE_TTL_MS || 6 * 60 * 60 * 1000);

let gtfsCache = { data: null, fetchedAt: 0 };
const gtfsScheduleResultCache = new Map();

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

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(header.map((key, index) => [key, values[index] ?? '']));
  });
}

function parseGtfsTime(value) {
  const [h, m, s] = String(value || '').split(':').map(Number);
  if (![h, m, s].every(Number.isFinite)) return null;
  return h * 3600 + m * 60 + s;
}

function secondsToTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safe / 3600) % 24;
  const m = Math.floor((safe % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function currentSecondsOfDay() {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

function metroLineName(route) {
  const shortName = String(route?.route_short_name || route?.route_id || '');
  if (shortName === '1') return 'Green Line';
  if (shortName === '2') return 'Orange Line';
  if (shortName === '4') return 'Yellow Line';
  if (shortName === '5') return 'Blue Line';
  return route?.route_long_name || `Line ${shortName}`;
}

function findEndOfCentralDirectory(buffer) {
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error('Invalid ZIP: central directory not found');
}

function unzipSelectedTexts(buffer, wantedNames) {
  const wanted = new Set(wantedNames.map((name) => name.toLowerCase()));
  const found = {};
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let cursor = buffer.readUInt32LE(eocdOffset + 16);

  for (let i = 0; i < totalEntries; i += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;

    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileName = buffer.toString('utf8', cursor + 46, cursor + 46 + fileNameLength);
    const baseName = fileName.split('/').pop().toLowerCase();

    if (wanted.has(baseName)) {
      if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
        throw new Error(`Invalid ZIP local header for ${fileName}`);
      }
      const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
      if (!data) throw new Error(`Unsupported ZIP compression method ${method} for ${fileName}`);
      found[baseName] = data.toString('utf8');
    }

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  for (const name of wanted) {
    if (!found[name]) throw new Error(`GTFS file missing from ZIP: ${name}`);
  }

  return found;
}

async function loadStmGtfs() {
  const now = Date.now();
  if (gtfsCache.data && now - gtfsCache.fetchedAt < GTFS_CACHE_TTL_MS) return gtfsCache.data;

  const response = await fetch(STM_GTFS_URL);
  if (!response.ok) {
    throw new Error(`STM GTFS download failed: ${response.status} ${response.statusText}`);
  }

  const zipBuffer = Buffer.from(await response.arrayBuffer());
  const files = unzipSelectedTexts(zipBuffer, ['routes.txt', 'trips.txt', 'stops.txt', 'stop_times.txt']);
  const routes = new Map(parseCsv(files['routes.txt']).map((row) => [row.route_id, row]));
  const trips = new Map(parseCsv(files['trips.txt']).map((row) => [row.trip_id, row]));
  const stops = new Map(parseCsv(files['stops.txt']).map((row) => [row.stop_id, row]));

  const stopTimesLines = files['stop_times.txt'].split(/\r?\n/).filter(Boolean);
  const stopTimesHeader = parseCsvLine(stopTimesLines.shift() || '');

  gtfsCache = {
    data: { routes, trips, stops, stopTimesHeader, stopTimesLines },
    fetchedAt: now,
  };
  return gtfsCache.data;
}

function buildGtfsSchedules(gtfs, { mode, query, routeId, stopId, limit }) {
  const minuteBucket = Math.floor(Date.now() / 60000);
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const cacheKey = `${mode || '*'}|${normalizedQuery || '*'}|${routeId || '*'}|${stopId || '*'}|${limit}|${minuteBucket}`;
  if (gtfsScheduleResultCache.has(cacheKey)) return gtfsScheduleResultCache.get(cacheKey);
  if (gtfsScheduleResultCache.size > 20) gtfsScheduleResultCache.clear();

  const headerIndex = Object.fromEntries(gtfs.stopTimesHeader.map((name, index) => [name, index]));
  const nowSeconds = currentSecondsOfDay();
  const maxSeconds = nowSeconds + 3 * 60 * 60;
  const earlyStopSeconds = nowSeconds + 15 * 60;
  const schedules = [];
  const metroByRoute = new Map();

  for (const line of gtfs.stopTimesLines) {
    const row = parseCsvLine(line);
    const tripId = row[headerIndex.trip_id];
    const departureTime = row[headerIndex.departure_time];
    const departureSeconds = parseGtfsTime(departureTime);
    if (departureSeconds === null || departureSeconds < nowSeconds || departureSeconds > maxSeconds) continue;

    const stopTimeStopId = row[headerIndex.stop_id];
    if (stopId && stopTimeStopId !== stopId) continue;

    const trip = gtfs.trips.get(tripId);
    if (!trip) continue;
    const route = gtfs.routes.get(trip.route_id);
    if (routeId && route?.route_id !== routeId && route?.route_short_name !== routeId) continue;

    const stop = gtfs.stops.get(stopTimeStopId);
    const routeType = String(route?.route_type ?? '');
    const isMetro = routeType === '1';
    const isBus = routeType === '3';
    if (mode === 'metro' && !isMetro) continue;
    if (mode === 'bus' && !isBus) continue;

    if (normalizedQuery) {
      const haystack = [
        route?.route_id,
        route?.route_short_name,
        route?.route_long_name,
        trip.trip_headsign,
        stop?.stop_id,
        stop?.stop_name,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(normalizedQuery)) continue;
    }

    schedules.push({
      id: `${tripId}-${stopTimeStopId}-${departureTime}`,
      routeId: route?.route_id || trip.route_id,
      route: route?.route_short_name || route?.route_long_name || trip.route_id,
      headsign: trip.trip_headsign || route?.route_long_name || '',
      stopId: stopTimeStopId,
      stopName: stop?.stop_name || stopTimeStopId,
      departureTime: secondsToTime(departureSeconds),
      rawDepartureTime: departureTime,
    });
    const latest = schedules[schedules.length - 1];

    if (mode === 'metro' && !normalizedQuery && !routeId && !stopId) {
      const metroKey = route?.route_short_name || route?.route_id || trip.route_id;
      const current = metroByRoute.get(metroKey);
      if (!current || departureSeconds < parseGtfsTime(current.rawDepartureTime)) {
        metroByRoute.set(metroKey, {
          ...latest,
          routeLabel: metroLineName(route),
        });
      }
      if (metroByRoute.size >= 4 && departureSeconds > earlyStopSeconds) break;
    }

    if (mode !== 'metro' && !normalizedQuery && !routeId && !stopId && schedules.length >= limit * 8 && departureSeconds > earlyStopSeconds) break;
  }

  if (mode === 'metro' && !normalizedQuery && !routeId && !stopId && metroByRoute.size > 0) {
    const metroResult = [...metroByRoute.values()]
      .sort((a, b) => Number(a.routeId) - Number(b.routeId))
      .slice(0, limit);
    gtfsScheduleResultCache.set(cacheKey, metroResult);
    return metroResult;
  }

  const result = schedules
    .sort((a, b) => parseGtfsTime(a.rawDepartureTime) - parseGtfsTime(b.rawDepartureTime))
    .slice(0, limit);
  gtfsScheduleResultCache.set(cacheKey, result);
  return result;
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

async function handleStmStatus(_req, res) {
  if (!STM_API_KEY) {
    sendJson(res, 500, { error: 'STM_API_KEY is not configured' });
    return;
  }
  try {
    const stmRes = await fetch('https://api.stm.info/pub/od/i3/v2/messages/etatservice', {
      headers: { apiKey: STM_API_KEY },
    });
    if (!stmRes.ok) {
      const text = await stmRes.text();
      console.error("STM ERROR:", stmRes.status, text);
      sendJson(res, 502, { error: text });
      return;
    }
    const data = await stmRes.json();
    sendJson(res, 200, data);
  } catch (err) {
    sendJson(res, 502, { error: err?.message || 'STM fetch failed' });
  }
}

async function handleStmSchedules(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const routeId = url.searchParams.get('routeId') || '';
  const stopId = url.searchParams.get('stopId') || '';
  const query = url.searchParams.get('query') || '';
  const mode = ['metro', 'bus', 'all'].includes(url.searchParams.get('mode'))
    ? url.searchParams.get('mode')
    : 'metro';
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 12)));

  if (!STM_SCHEDULE_API_URL) {
    try {
      const gtfs = await loadStmGtfs();
      sendJson(res, 200, {
        schedules: buildGtfsSchedules(gtfs, { mode, query, routeId, stopId, limit }),
        source: 'stm-gtfs',
        updatedAt: new Date().toISOString(),
        gtfsUrl: STM_GTFS_URL,
        mode,
        query,
      });
    } catch (err) {
      sendJson(res, 502, {
        schedules: [],
        source: 'stm-gtfs',
        error: err?.message || 'STM GTFS schedule fetch failed',
      });
    }
    return;
  }

  try {
    const scheduleUrl = new URL(STM_SCHEDULE_API_URL);
    if (routeId) scheduleUrl.searchParams.set('routeId', routeId);
    if (stopId) scheduleUrl.searchParams.set('stopId', stopId);
    if (query) scheduleUrl.searchParams.set('query', query);
    scheduleUrl.searchParams.set('mode', mode);
    scheduleUrl.searchParams.set('limit', String(limit));

    const stmRes = await fetch(scheduleUrl);
    if (!stmRes.ok) {
      const text = await stmRes.text();
      sendJson(res, 502, { schedules: [], source: 'stm-schedule-api', error: text });
      return;
    }

    const data = await stmRes.json();
    sendJson(res, 200, {
      schedules: Array.isArray(data?.schedules) ? data.schedules : Array.isArray(data) ? data : [],
      source: data?.source || 'stm-schedule-api',
      updatedAt: data?.updatedAt || new Date().toISOString(),
    });
  } catch (err) {
    sendJson(res, 502, { schedules: [], source: 'stm-schedule-api', error: err?.message || 'STM schedule fetch failed' });
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
      hasStmScheduleApi: Boolean(STM_SCHEDULE_API_URL),
      hasStmGtfsUrl: Boolean(STM_GTFS_URL),
    });
    return;
  }

  if (req.url === '/transit/compare' && req.method === 'POST') {
    await handleCompare(req, res);
    return;
  }

  if (req.url === '/stm/status' && req.method === 'GET') {
    await handleStmStatus(req, res);
    return;
  }

  if (req.url.startsWith('/stm/schedules') && req.method === 'GET') {
    await handleStmSchedules(req, res);
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[transit-proxy] http://${HOST}:${PORT}`);
  console.log('[transit-proxy] using google transit compare mode');
});
