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
  return type === 'bike' ? 0.15 : 0.25;
}

function mapVehicle(item) {
  const id = String(item.id ?? item.vehicle_id ?? crypto.randomUUID());
  const type = item.type ?? item.vehicle_type ?? 'scooter';
  const available = typeof item.available === 'boolean' ? item.available : true;

  return {
    id,
    type,
    name: item.name ?? `${type === 'bike' ? 'Bike' : 'Scooter'} #${id}`,
    distance: Number(item.distance ?? 0.5),
    status: available ? 'available' : 'unavailable',
    ratePerMin: Number(item.rate_per_min ?? item.ratePerMin ?? defaultRateByType(type)),
    maintenance: item.maintenance ?? 'ok',
    location: item.location ?? '',
    available,
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

function mapReservationRow(row, vehicle) {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    userId: String(row.user_id ?? ''),
    vehicleId: String(row.vehicle_id ?? vehicle?.id ?? ''),
    status: 'reserved',
    reservedAt: row.created_at ?? new Date().toISOString(),
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
    paymentTxId: '',
    cost: Number(row.price ?? 0),
    vehicle,
    localOnly: false,
  };
}

async function fetchVehicleById(vehicleId) {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single();
  if (error || !data) return null;
  return mapVehicle(data);
}

async function setVehicleOccupied(vehicleId, occupied) {
  const { error } = await supabase.from('vehicles').update({ available: !occupied }).eq('id', vehicleId);
  if (error) {
    fallbackWarn('vehicles.available update', error);
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
    vehicle: `Vehicle #${item.vehicle_id}`,
    user: `User #${item.user_id}`,
    start: item.start_time ?? 'N/A',
    end: item.end_time ?? 'N/A',
    cost: Number(item.price ?? 0),
  }));
}

export async function fetchUserReservation(userId) {
  const { data, error } = await supabase
    .from('rentals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'reserved')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const vehicle = await fetchVehicleById(data.vehicle_id);
  return mapReservationRow(data, vehicle);
}

export async function fetchUserActiveRental(userId) {
  const { data, error } = await supabase
    .from('rentals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const vehicle = await fetchVehicleById(data.vehicle_id);
  return mapRentalRow(data, vehicle);
}

export async function reserveVehicle(userId, vehicle) {
  const payload = {
    user_id: Number(userId),
    vehicle_id: Number(vehicle.id),
    status: 'reserved',
    payment_status: 'pending',
    price: 0,
  };

  const { data, error } = await supabase.from('rentals').insert(payload).select('*').single();

  if (error) {
    fallbackWarn('reserve vehicle', error);
    return {
      id: `local-res-${Date.now()}`,
      userId: String(userId),
      vehicleId: String(vehicle.id),
      status: 'reserved',
      reservedAt: new Date().toISOString(),
      vehicle,
      localOnly: true,
    };
  }

  await setVehicleOccupied(vehicle.id, true);
  return mapReservationRow(data, vehicle);
}

export async function cancelReservation(reservation) {
  if (!reservation || reservation.localOnly) return true;

  const { error } = await supabase.from('rentals').delete().eq('id', reservation.id).eq('status', 'reserved');
  if (error) {
    fallbackWarn('cancel reservation', error);
    return false;
  }

  await setVehicleOccupied(reservation.vehicleId, false);
  return true;
}

export async function startRental(userId, reservation) {
  if (!reservation || reservation.localOnly) {
    return {
      id: `local-rent-${Date.now()}`,
      userId: String(userId),
      vehicleId: String(reservation?.vehicleId ?? ''),
      status: 'active',
      startTime: new Date().toISOString(),
      endTime: null,
      paymentTxId: '',
      cost: 0,
      vehicle: reservation?.vehicle,
      localOnly: true,
    };
  }

  const startTime = new Date().toISOString();
  const { data, error } = await supabase
    .from('rentals')
    .update({
      status: 'active',
      start_time: startTime,
      payment_status: 'pending',
    })
    .eq('id', reservation.id)
    .eq('status', 'reserved')
    .select('*')
    .single();

  if (error) {
    fallbackWarn('start rental', error);
    return {
      id: `local-rent-${Date.now()}`,
      userId: String(userId),
      vehicleId: String(reservation.vehicleId),
      status: 'active',
      startTime,
      endTime: null,
      paymentTxId: '',
      cost: 0,
      vehicle: reservation.vehicle,
      localOnly: true,
    };
  }

  await setVehicleOccupied(reservation.vehicleId, true);
  return mapRentalRow(data, reservation.vehicle);
}

export async function completeRental(activeRental, cost) {
  if (!activeRental) return null;

  const endTime = new Date().toISOString();
  const safeCost = Number(cost ?? 0);

  if (!activeRental.localOnly) {
    const { error } = await supabase
      .from('rentals')
      .update({
        status: 'completed',
        payment_status: 'paid',
        end_time: endTime,
        price: safeCost,
      })
      .eq('id', activeRental.id)
      .eq('status', 'active');

    if (error) {
      fallbackWarn('complete rental', error);
    }

    await setVehicleOccupied(activeRental.vehicleId, false);
  }

  return {
    ...activeRental,
    status: 'completed',
    endTime,
    cost: safeCost,
  };
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
