import {
  mockParkingSpots,
  mockProviderRentals,
  mockTransitRoutes,
  mockVehicles,
} from '../data/mockData';
import { supabase } from './supabase';

function fallbackWarn(tableName, error) {
  console.warn(`Supabase read failed for table "${tableName}". Using mock data.`, error?.message || error);
}

export async function fetchVehicles() {
  const { data, error } = await supabase.from('vehicles').select('*').limit(100);
  if (error) {
    fallbackWarn('vehicles', error);
    return mockVehicles;
  }
  if (!data?.length) return mockVehicles;
  return data.map((item) => ({
    id: String(item.id ?? item.vehicle_id ?? crypto.randomUUID()),
    type: item.type ?? item.vehicle_type ?? 'scooter',
    name: item.name ?? item.vehicle_name ?? `Vehicle ${item.id ?? ''}`.trim(),
    distance: Number(item.distance ?? 0),
    status: item.status ?? 'available',
    ratePerMin: Number(item.rate_per_min ?? item.ratePerMin ?? 0.25),
    maintenance: item.maintenance ?? 'ok',
  }));
}

export async function fetchTransitRoutes() {
  const { data, error } = await supabase.from('transit_routes').select('*').limit(100);
  if (error) {
    fallbackWarn('transit_routes', error);
    return mockTransitRoutes;
  }
  if (!data?.length) return mockTransitRoutes;
  return data.map((item) => ({
    id: String(item.id ?? crypto.randomUUID()),
    line: item.line ?? item.name ?? 'Transit line',
    from: item.from ?? item.origin ?? 'Unknown',
    to: item.to ?? item.destination ?? 'Unknown',
    delay: Number(item.delay ?? 0),
    nextDeparture: item.next_departure ?? item.nextDeparture ?? 'N/A',
  }));
}

export async function fetchParkingSpots() {
  const { data, error } = await supabase.from('parking_spots').select('*').limit(100);
  if (error) {
    fallbackWarn('parking_spots', error);
    return mockParkingSpots;
  }
  if (!data?.length) return mockParkingSpots;
  return data.map((item) => ({
    id: String(item.id ?? crypto.randomUUID()),
    address: item.address ?? item.location ?? 'Unknown address',
    available: Number(item.available ?? item.available_spots ?? 0),
    total: Number(item.total ?? item.total_spots ?? 0),
    distance: Number(item.distance ?? 0),
  }));
}

export async function fetchProviderRentals() {
  const { data, error } = await supabase.from('rentals').select('*').limit(100);
  if (error) {
    fallbackWarn('rentals', error);
    return mockProviderRentals;
  }
  if (!data?.length) return mockProviderRentals;
  return data.map((item) => ({
    id: String(item.id ?? crypto.randomUUID()),
    vehicle: item.vehicle_name ?? item.vehicle ?? `Vehicle ${item.vehicle_id ?? ''}`.trim(),
    user: item.user_email ?? item.user ?? 'Unknown user',
    start: item.start_time ?? item.start ?? 'N/A',
    end: item.end_time ?? item.end ?? 'N/A',
    cost: Number(item.cost ?? 0),
  }));
}
