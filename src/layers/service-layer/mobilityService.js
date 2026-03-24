import {
  mockParkingSpots,
  mockProviderRentals,
  mockTransitRoutes,
  mockVehicles,
} from '../data-layer/mockData';
import { supabase } from '../data-layer/supabaseClient';

function fallbackWarn(scope, error) {
  console.warn(`Supabase operation failed for "${scope}".`, error?.message || error);
}

function defaultRateByType(type) {
  if (type === 'bike') return 0.15;
  return 0.25;
}

function mapVehicle(item) {
  const id = String(item.id ?? item.vehicle_id ?? crypto.randomUUID());
  const type = item.type ?? item.vehicle_type ?? 'scooter';
  const name = item.name ?? item.vehicle_name ?? `${type === 'bike' ? 'Bike' : 'Scooter'} #${id}`;
  const available = typeof item.available === 'boolean' ? item.available : undefined;
  const status = item.status ?? (available === false ? 'unavailable' : 'available');

  return {
    id,
    type,
    name,
    distance: Number(item.distance ?? 0),
    status,
    ratePerMin: Number(item.rate_per_min ?? item.ratePerMin ?? defaultRateByType(type)),
    maintenance: item.maintenance ?? 'ok',
  };
}

async function fetchVehicleById(vehicleId) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .single();

  if (error || !data) return null;
  return mapVehicle(data);
}

async function setVehicleOccupied(vehicleId, occupied) {
  // Keep this best-effort because schemas vary.
  const available = !occupied;

  const byAvailable = await supabase
    .from('vehicles')
    .update({ available })
    .eq('id', vehicleId);

  if (byAvailable.error && !String(byAvailable.error.message).includes('column')) {
    fallbackWarn('vehicles.available update', byAvailable.error);
  }

  const status = occupied ? 'in_use' : 'available';
  const byStatus = await supabase
    .from('vehicles')
    .update({ status })
    .eq('id', vehicleId);

  if (byStatus.error && !String(byStatus.error.message).includes('column')) {
    fallbackWarn('vehicles.status update', byStatus.error);
  }
}

export async function fetchVehicles() {
  const { data, error } = await supabase.from('vehicles').select('*').limit(100);
  if (error) {
    fallbackWarn('vehicles read', error);
    return mockVehicles;
  }

  if (!data?.length) return mockVehicles;
  return data.map(mapVehicle);
}

export async function fetchTransitRoutes() {
  const { data, error } = await supabase.from('transit_routes').select('*').limit(100);
  if (error) {
    fallbackWarn('transit_routes read', error);
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
    fallbackWarn('parking_spots read', error);
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
    fallbackWarn('rentals read', error);
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

function mapReservationRow(row, vehicle) {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    userId: String(row.user_id ?? ''),
    vehicleId: String(row.vehicle_id ?? vehicle?.id ?? ''),
    status: row.status ?? 'reserved',
    reservedAt: row.reserved_at ?? row.created_at ?? new Date().toISOString(),
    vehicle,
    localOnly: false,
  };
}

function mapRentalRow(row, vehicle) {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    userId: String(row.user_id ?? ''),
    vehicleId: String(row.vehicle_id ?? vehicle?.id ?? ''),
    status: row.status ?? 'active',
    startTime: row.start_time ?? row.created_at ?? new Date().toISOString(),
    endTime: row.end_time ?? null,
    paymentTxId: row.payment_tx_id ?? '',
    cost: Number(row.cost ?? 0),
    vehicle,
    localOnly: false,
  };
}

export async function fetchUserReservation(userId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['reserved', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const vehicle = await fetchVehicleById(data.vehicle_id);
  return mapReservationRow(data, vehicle);
}

export async function fetchUserActiveRental(userId) {
  const { data, error } = await supabase
    .from('rentals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const vehicle = await fetchVehicleById(data.vehicle_id);
  return mapRentalRow(data, vehicle);
}

export async function reserveVehicle(userId, vehicle) {
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    vehicle_id: Number(vehicle.id) || vehicle.id,
    status: 'reserved',
    reserved_at: now,
  };

  const { data, error } = await supabase.from('reservations').insert(payload).select('*').single();

  if (error) {
    fallbackWarn('reserve vehicle', error);
    return {
      id: `local-res-${Date.now()}`,
      userId,
      vehicleId: vehicle.id,
      status: 'reserved',
      reservedAt: now,
      vehicle,
      localOnly: true,
    };
  }

  await setVehicleOccupied(vehicle.id, true);
  return mapReservationRow(data, vehicle);
}

export async function cancelReservation(reservation) {
  if (!reservation || reservation.localOnly) {
    return true;
  }

  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', reservation.id);

  if (error) {
    fallbackWarn('cancel reservation', error);
    return false;
  }

  await setVehicleOccupied(reservation.vehicleId, false);
  return true;
}

export async function startRental(userId, reservation, paymentTxId) {
  const startTime = new Date().toISOString();

  const payload = {
    user_id: userId,
    vehicle_id: Number(reservation.vehicleId) || reservation.vehicleId,
    reservation_id: Number(reservation.id) || reservation.id,
    status: 'active',
    start_time: startTime,
    payment_tx_id: paymentTxId,
  };

  const { data, error } = await supabase.from('rentals').insert(payload).select('*').single();

  if (error) {
    fallbackWarn('start rental', error);
    return {
      id: `local-rent-${Date.now()}`,
      userId,
      vehicleId: reservation.vehicleId,
      status: 'active',
      startTime,
      paymentTxId,
      cost: 0,
      vehicle: reservation.vehicle,
      localOnly: true,
    };
  }

  const { error: reservationError } = await supabase
    .from('reservations')
    .update({ status: 'active' })
    .eq('id', reservation.id);

  if (reservationError) {
    fallbackWarn('reservation status update during start', reservationError);
  }

  await setVehicleOccupied(reservation.vehicleId, true);
  return mapRentalRow(data, reservation.vehicle);
}

export async function completeRental(activeRental, cost) {
  if (!activeRental) return null;

  const endTime = new Date().toISOString();

  if (!activeRental.localOnly) {
    const { error } = await supabase
      .from('rentals')
      .update({
        status: 'completed',
        end_time: endTime,
        cost,
      })
      .eq('id', activeRental.id);

    if (error) {
      fallbackWarn('complete rental', error);
    }

    await setVehicleOccupied(activeRental.vehicleId, false);
  }

  return {
    ...activeRental,
    status: 'completed',
    endTime,
    cost,
  };
}
