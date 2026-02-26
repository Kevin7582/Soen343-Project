/**
 * SUMMS API Gateway client.
 * Base URL should point to your NestJS API Gateway in production.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.summs.example.com';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  const res = await fetch(url, config);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (path, token) => request(path, { headers: { Authorization: `Bearer ${token}` } }),
  post: (path, body, token) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
};

/** Mock vehicle data for development (Montreal) */
export const mockVehicles = [
  { id: 'v1', type: 'scooter', name: 'Scooter #101', lat: 45.5017, lng: -73.5673, distance: 0.2, status: 'available', ratePerMin: 0.25 },
  { id: 'v2', type: 'scooter', name: 'Scooter #102', lat: 45.502, lng: -73.568, distance: 0.5, status: 'available', ratePerMin: 0.25 },
  { id: 'v3', type: 'bike', name: 'Bike #201', lat: 45.503, lng: -73.566, distance: 0.8, status: 'available', ratePerMin: 0.15 },
  { id: 'v4', type: 'scooter', name: 'Scooter #103', lat: 45.504, lng: -73.565, distance: 1.1, status: 'available', ratePerMin: 0.25 },
];

/** Mock transit routes */
export const mockTransitRoutes = [
  { id: 'r1', line: 'Green Line', from: 'Berri-UQAM', to: 'Lionel-Groulx', delay: 0, nextDeparture: '5 min' },
  { id: 'r2', line: 'Orange Line', from: 'Mont-Royal', to: 'Côte-Vertu', delay: 2, nextDeparture: '3 min' },
];

/** Mock parking spots */
export const mockParkingSpots = [
  { id: 'p1', address: '123 Rue Sainte-Catherine', available: 12, total: 20, distance: 0.3 },
  { id: 'p2', address: '456 Boulevard Saint-Laurent', available: 5, total: 10, distance: 0.6 },
];
