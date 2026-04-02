// BIXI Real-Time Data Service
// Fetches live BIXI station data from GBFS (General Bikeshare Feed Specification)

const STATION_INFO_URL = 'https://gbfs.velobixi.com/gbfs/2-2/en/station_information.json';
const STATION_STATUS_URL = 'https://gbfs.velobixi.com/gbfs/2-2/en/station_status.json';

let cache = { stations: null, timestamp: 0 };
const CACHE_TTL = 30_000; // 30 seconds

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BIXI fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchBixiStations() {
  const now = Date.now();
  if (cache.stations && now - cache.timestamp < CACHE_TTL) {
    return cache.stations;
  }

  try {
    const [infoRes, statusRes] = await Promise.all([
      fetchJSON(STATION_INFO_URL),
      fetchJSON(STATION_STATUS_URL),
    ]);

    const infoList = infoRes?.data?.stations ?? [];
    const statusList = statusRes?.data?.stations ?? [];

    // Build lookup by station_id
    const statusMap = {};
    statusList.forEach((s) => {
      statusMap[s.station_id] = s;
    });

    // Merge info + status
    const merged = infoList.map((info) => {
      const status = statusMap[info.station_id] || {};
      return {
        id: String(info.station_id),
        name: info.name || `Station #${info.station_id}`,
        lat: info.lat,
        lon: info.lon,
        capacity: info.capacity || 0,
        bikesAvailable: status.num_bikes_available ?? 0,
        ebikesAvailable: status.num_ebikes_available ?? 0,
        docksAvailable: status.num_docks_available ?? 0,
        isRenting: status.is_renting === 1 || status.is_renting === true,
        isReturning: status.is_returning === 1 || status.is_returning === true,
        isInstalled: status.is_installed === 1 || status.is_installed === true,
        lastReported: status.last_reported ? new Date(status.last_reported * 1000) : null,
      };
    }).filter((s) => s.isInstalled && s.lat && s.lon);

    cache = { stations: merged, timestamp: now };
    return merged;
  } catch (err) {
    console.warn('BIXI fetch error, using cache or empty:', err.message);
    return cache.stations || [];
  }
}

export function getBixiStats(stations) {
  const totalStations = stations.length;
  const totalBikes = stations.reduce((s, st) => s + st.bikesAvailable, 0);
  const totalEbikes = stations.reduce((s, st) => s + st.ebikesAvailable, 0);
  const totalDocks = stations.reduce((s, st) => s + st.docksAvailable, 0);
  const totalCapacity = stations.reduce((s, st) => s + st.capacity, 0);
  const stationsWithBikes = stations.filter((s) => s.bikesAvailable > 0).length;

  return {
    totalStations,
    totalBikes,
    totalEbikes,
    totalDocks,
    totalCapacity,
    stationsWithBikes,
    utilizationPct: totalCapacity > 0
      ? Math.round(((totalCapacity - totalDocks) / totalCapacity) * 100)
      : 0,
  };
}
