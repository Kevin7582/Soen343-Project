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

function mapParkingSpot(item) {
  return {
    id: String(item.id ?? crypto.randomUUID()),
    address: item.address ?? item.location ?? 'Unknown address',
    available: Number(item.available ?? item.available_spots ?? 0),
    total: Number(item.total ?? item.total_spots ?? 0),
    distance: Number(item.distance ?? 0),
    pricePerHour: Number(item.price_per_hour ?? item.pricePerHour ?? 2.5),
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
  return data.map(mapParkingSpot);
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

async function setParkingSpotAvailability(spotId, availableCount) {
  const byAvailable = await supabase
    .from('parking_spots')
    .update({ available: availableCount })
    .eq('id', spotId);

  if (byAvailable.error && !String(byAvailable.error.message).includes('column')) {
    fallbackWarn('parking_spots.available update', byAvailable.error);
  }

  const byAvailableSpots = await supabase
    .from('parking_spots')
    .update({ available_spots: availableCount })
    .eq('id', spotId);

  if (byAvailableSpots.error && !String(byAvailableSpots.error.message).includes('column')) {
    fallbackWarn('parking_spots.available_spots update', byAvailableSpots.error);
  }
}

async function fetchParkingSpotById(spotId) {
  const { data, error } = await supabase
    .from('parking_spots')
    .select('*')
    .eq('id', spotId)
    .single();

  if (error || !data) return null;
  return mapParkingSpot(data);
}

export async function fetchUserParkingReservation(userId) {
  const { data, error } = await supabase
    .from('parking_reservations')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['reserved', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const spot = await fetchParkingSpotById(data.parking_spot_id);
  return {
    id: String(data.id ?? crypto.randomUUID()),
    userId: String(data.user_id ?? ''),
    spotId: String(data.parking_spot_id ?? spot?.id ?? ''),
    status: data.status ?? 'reserved',
    reservedAt: data.reserved_at ?? data.created_at ?? new Date().toISOString(),
    durationHours: Number(data.duration_hours ?? 1),
    estimatedCost: Number(data.estimated_cost ?? spot?.pricePerHour ?? 2.5),
    spot,
    localOnly: false,
  };
}

export async function reserveParkingSpot(userId, spot, durationHours = 1) {
  const now = new Date().toISOString();
  const safeDuration = Math.max(1, Number(durationHours) || 1);
  const estimatedCost = Number((safeDuration * (spot.pricePerHour ?? 2.5)).toFixed(2));

  const payload = {
    user_id: userId,
    parking_spot_id: Number(spot.id) || spot.id,
    status: 'reserved',
    reserved_at: now,
    duration_hours: safeDuration,
    estimated_cost: estimatedCost,
  };

  const { data, error } = await supabase
    .from('parking_reservations')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    fallbackWarn('reserve parking', error);
    return {
      id: `local-park-${Date.now()}`,
      userId,
      spotId: spot.id,
      status: 'reserved',
      reservedAt: now,
      durationHours: safeDuration,
      estimatedCost,
      spot,
      localOnly: true,
    };
  }

  await setParkingSpotAvailability(spot.id, Math.max(0, (spot.available ?? 0) - 1));
  return {
    id: String(data.id ?? crypto.randomUUID()),
    userId: String(data.user_id ?? userId),
    spotId: String(data.parking_spot_id ?? spot.id),
    status: data.status ?? 'reserved',
    reservedAt: data.reserved_at ?? now,
    durationHours: Number(data.duration_hours ?? safeDuration),
    estimatedCost: Number(data.estimated_cost ?? estimatedCost),
    spot,
    localOnly: false,
  };
}

export async function cancelParkingReservation(reservation) {
  if (!reservation || reservation.localOnly) return true;

  const { error } = await supabase
    .from('parking_reservations')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', reservation.id);

  if (error) {
    fallbackWarn('cancel parking reservation', error);
    return false;
  }

  if (reservation.spot) {
    await setParkingSpotAvailability(reservation.spot.id, (reservation.spot.available ?? 0) + 1);
  }
  return true;
}

export async function fetchUserTransitPlans(userId) {
  const { data, error } = await supabase
    .from('transit_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data) return [];
  return data.map((item) => ({
    id: String(item.id ?? crypto.randomUUID()),
    userId: String(item.user_id ?? ''),
    routeId: String(item.route_id ?? ''),
    from: item.from_location ?? item.from ?? '',
    to: item.to_location ?? item.to ?? '',
    plannedAt: item.planned_at ?? item.created_at ?? new Date().toISOString(),
    notes: item.notes ?? '',
    localOnly: false,
  }));
}

export async function planTransitTrip(userId, route, from, to) {
  const plannedAt = new Date().toISOString();
  const payload = {
    user_id: userId,
    route_id: Number(route.id) || route.id,
    from_location: from,
    to_location: to,
    planned_at: plannedAt,
    notes: `${route.line} | Next ${route.nextDeparture}`,
  };

  const { data, error } = await supabase
    .from('transit_plans')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    fallbackWarn('plan transit trip', error);
    return {
      id: `local-trip-${Date.now()}`,
      userId,
      routeId: route.id,
      from,
      to,
      plannedAt,
      notes: `${route.line} | Next ${route.nextDeparture}`,
      localOnly: true,
    };
  }

  return {
    id: String(data.id ?? crypto.randomUUID()),
    userId: String(data.user_id ?? userId),
    routeId: String(data.route_id ?? route.id),
    from: data.from_location ?? from,
    to: data.to_location ?? to,
    plannedAt: data.planned_at ?? plannedAt,
    notes: data.notes ?? '',
    localOnly: false,
  };
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
