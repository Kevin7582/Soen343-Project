const OTP_GRAPHQL_URL =
  import.meta.env.VITE_OTP_GRAPHQL_URL ||
  import.meta.env.VITE_OTP_ENDPOINT ||
  '';
const STM_PROXY_URL = import.meta.env.VITE_STM_PROXY_URL || '';

function toIsoDateParts(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
    };
  }
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toTimeString().slice(0, 8),
  };
}

function normalizeOtpUrl(url) {
  const clean = String(url || '').trim();
  if (!clean) return '';
  if (clean.includes('/graphql')) return clean;
  if (clean.endsWith('/')) return `${clean}graphql`;
  return `${clean}/graphql`;
}

function buildOtpQuery() {
  return `
    query Plan($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!, $date: String!, $time: String!, $arriveBy: Boolean!, $numItineraries: Int!) {
      plan(
        from: { lat: $fromLat, lon: $fromLon }
        to: { lat: $toLat, lon: $toLon }
        date: $date
        time: $time
        arriveBy: $arriveBy
        numItineraries: $numItineraries
      ) {
        itineraries {
          duration
          walkDistance
          transfers
          legs {
            mode
            routeShortName
            routeLongName
            from { name }
            to { name }
            distance
            duration
          }
        }
      }
    }
  `;
}

function toMinFromSeconds(value) {
  return Math.max(1, Math.round(Number(value || 0) / 60));
}

function toMinFromMs(value) {
  return Math.max(1, Math.round(Number(value || 0) / 60000));
}

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function reliability(transfers, walkKm) {
  if (transfers <= 1 && walkKm <= 0.6) return 'high';
  if (transfers <= 2 && walkKm <= 1.2) return 'medium';
  return 'low';
}

function normalizeProxyOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((item, index) => {
    const durationMin = Math.max(1, Number(item?.durationMin || item?.duration || 1));
    const walkKm = Number(Number(item?.walkKm || 0).toFixed(2));
    const transfers = safeNum(item?.transfers, 0);
    return {
      id: item?.id || `proxy-${index + 1}`,
      label: item?.label || `Option ${index + 1}`,
      durationMin,
      walkKm,
      transfers,
      reliability: item?.reliability || reliability(transfers, walkKm),
      legs: Array.isArray(item?.legs) ? item.legs : [],
    };
  });
}

export async function fetchTransitCompare({
  startPoint,
  endPoint,
  plannedDateTime,
  plannerMode = 'depart_now',
  numItineraries = 4,
}) {
  if (!Array.isArray(startPoint) || !Array.isArray(endPoint)) return null;

  const [fromLat, fromLon] = startPoint.map(Number);
  const [toLat, toLon] = endPoint.map(Number);
  if (![fromLat, fromLon, toLat, toLon].every(Number.isFinite)) return null;

  if (STM_PROXY_URL) {
    const endpoint = STM_PROXY_URL.endsWith('/')
      ? `${STM_PROXY_URL}transit/compare`
      : `${STM_PROXY_URL}/transit/compare`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromLat,
        fromLon,
        toLat,
        toLon,
        plannedDateTime,
        plannerMode,
        numItineraries,
      }),
    });

    if (!res.ok) {
      throw new Error(`STM proxy ${res.status}: ${res.statusText}`);
    }

    const payload = await res.json();
    return {
      options: normalizeProxyOptions(payload?.options),
      updatedAt: payload?.updatedAt || new Date().toISOString(),
      source: payload?.source || 'google-proxy',
    };
  }

  const endpoint = normalizeOtpUrl(OTP_GRAPHQL_URL);
  if (!endpoint) return null;

  const when = toIsoDateParts(plannedDateTime ? new Date(plannedDateTime) : new Date());
  const body = {
    query: buildOtpQuery(),
    variables: {
      fromLat,
      fromLon,
      toLat,
      toLon,
      date: when.date,
      time: when.time,
      arriveBy: plannerMode === 'arrive_by',
      numItineraries: Math.max(1, Number(numItineraries) || 4),
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OTP ${res.status}: ${res.statusText}`);
  }

  const payload = await res.json();
  const itineraries = payload?.data?.plan?.itineraries;
  if (!Array.isArray(itineraries)) return { options: [], updatedAt: new Date().toISOString(), source: 'otp' };

  const options = itineraries.map((itinerary, index) => {
    const durationMin = toMinFromSeconds(itinerary?.duration);
    const walkKm = Number((safeNum(itinerary?.walkDistance, 0) / 1000).toFixed(2));
    const transfers = safeNum(itinerary?.transfers, 0);

    return {
      id: `otp-${index + 1}`,
      label: `OTP ${index + 1}`,
      durationMin,
      walkKm,
      transfers,
      reliability: reliability(transfers, walkKm),
      legs: (itinerary?.legs || []).map((leg) => ({
        mode: leg?.mode || '',
        route: leg?.routeShortName || leg?.routeLongName || '',
        from: leg?.from?.name || '',
        to: leg?.to?.name || '',
        distanceKm: Number((safeNum(leg?.distance, 0) / 1000).toFixed(2)),
        durationMin: toMinFromMs(leg?.duration),
      })),
    };
  });

  return {
    options,
    updatedAt: new Date().toISOString(),
    source: 'otp',
  };
}
