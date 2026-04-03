// service-layer/adminDashboardService.js
// Facade Pattern: Aggregates analytics and monitoring data for admin views.

import { supabase } from "../data-layer/supabaseClient";
import { gateway } from "../api-gateway/apiClient";
import SupabaseRealtimeSubject from "./realtime/SupabaseRealtimeSubject";

const MONITORING_TABLES = [
  "rentals",
  "vehicles",
  "parking_spots",
  "parking_reservations",
  "users",
];

const monitoringSubject = new SupabaseRealtimeSubject({
  supabaseClient: supabase,
  channelName: "admin-monitoring-channel",
  tables: MONITORING_TABLES,
});

function extractCity(locationOrAddress) {
  if (!locationOrAddress) return "Unknown";
  const str = String(locationOrAddress).trim();
  // Try to extract city from common patterns like "123 Rue X, Montreal" or "Montreal Downtown"
  const parts = str.split(",").map((s) => s.trim());
  if (parts.length >= 2) return parts[parts.length - 1] || "Unknown";
  // If no comma, use the last word (e.g. "Montreal Downtown" -> "Montreal Downtown")
  return str || "Unknown";
}

function createHourlyBuckets() {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    rentals: 0,
  }));
}

function buildMonitoringSnapshot({
  activeRentalsCount,
  parkingUtilization,
  fleetStatus,
  liveDataAvailable,
}) {
  const avgParkingUtilization =
    parkingUtilization.length > 0
      ? parkingUtilization.reduce((sum, spot) => sum + spot.utilizationRate, 0) /
        parkingUtilization.length
      : 0;

  const fleetUtilization = Number(fleetStatus.utilizationRate || 0);

  return [
    {
      id: "rental-service",
      name: "Rental Service",
      status: liveDataAvailable ? "healthy" : "degraded",
      metric: `${activeRentalsCount} active rentals`,
      detail:
        activeRentalsCount > 0
          ? "Live rental updates are flowing through the dashboard."
          : "No active rentals at the moment.",
    },
    {
      id: "parking-service",
      name: "Parking Service",
      status: avgParkingUtilization > 95 ? "warning" : "healthy",
      metric: `${avgParkingUtilization.toFixed(1)}% avg occupancy`,
      detail:
        parkingUtilization.length > 0
          ? "Parking utilization is being aggregated from current spot availability."
          : "Parking spot data is unavailable right now.",
    },
    {
      id: "fleet-availability",
      name: "Fleet Availability",
      status:
        fleetStatus.total === 0
          ? "degraded"
          : fleetUtilization > 85
          ? "warning"
          : "healthy",
      metric:
        fleetStatus.total > 0
          ? `${fleetStatus.available} available / ${fleetStatus.total} total`
          : "No fleet snapshot",
      detail:
        fleetStatus.total > 0
          ? "Vehicle inventory and current status are included in the live fleet snapshot."
          : "Vehicle status data could not be loaded from the backend.",
    },
  ];
}

function buildAlerts({ parkingUtilization, fleetStatus, activeRentalsCount }) {
  const alerts = [];
  const crowdedSpots = parkingUtilization.filter((spot) => spot.utilizationRate >= 85);

  crowdedSpots.forEach((spot) => {
    alerts.push({
      id: `parking-${spot.id}`,
      level: spot.utilizationRate >= 95 ? "critical" : "warning",
      title: "Parking demand spike",
      message: `${spot.address} is at ${spot.utilizationRate.toFixed(1)}% utilization.`,
    });
  });

  if (fleetStatus.total > 0 && fleetStatus.available <= Math.max(1, fleetStatus.total * 0.15)) {
    alerts.push({
      id: "fleet-availability",
      level: "warning",
      title: "Low vehicle availability",
      message: `Only ${fleetStatus.available} of ${fleetStatus.total} vehicles are currently available.`,
    });
  }

  if (activeRentalsCount >= 10) {
    alerts.push({
      id: "rental-throughput",
      level: "healthy",
      title: "High live activity",
      message: `${activeRentalsCount} rentals are active right now.`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "system-stable",
      level: "healthy",
      title: "System stable",
      message: "No operational issues are currently detected by the dashboard.",
    });
  }

  return alerts;
}

const AdminDashboardService = {
  async getTotalUsers() {
    return gateway.count("users");
  },

  async getActiveRentals() {
    const { data, error } = await supabase
      .from("rentals")
      .select("id, vehicle_id, user_id, start_time, vehicles(type, location)")
      .eq("status", "active");
    if (error) throw error;
    return data ?? [];
  },

  async getCompletedTripsToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("rentals")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("end_time", startOfDay.toISOString());
    if (error) throw error;
    return count ?? 0;
  },

  async getUsageByVehicleType() {
    const { data, error } = await supabase
      .from("rentals")
      .select("vehicles(type)")
      .eq("status", "completed");
    if (error) throw error;

    const counts = { bike: 0, scooter: 0, other: 0 };
    (data ?? []).forEach(({ vehicles }) => {
      const type = vehicles?.type?.toLowerCase();
      if (type === "bike") counts.bike += 1;
      else if (type === "scooter") counts.scooter += 1;
      else counts.other += 1;
    });
    return counts;
  },

  async getParkingUtilization() {
    const { data, error } = await supabase
      .from("parking_spots")
      .select("id, address, available, total");
    if (error) throw error;

    return (data ?? []).map((spot) => ({
      ...spot,
      utilized: spot.total - spot.available,
      utilizationRate:
        spot.total > 0 ? ((spot.total - spot.available) / spot.total) * 100 : 0,
    }));
  },

  async getActiveParking() {
    return gateway.count("parking_reservations", { status: "active" });
  },

  async getHourlyRentalTrend() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("rentals")
      .select("id, start_time")
      .gte("start_time", startOfDay.toISOString());
    if (error) throw error;

    const buckets = createHourlyBuckets();
    (data ?? []).forEach((rental) => {
      if (!rental.start_time) return;
      const hour = new Date(rental.start_time).getHours();
      if (buckets[hour]) {
        buckets[hour].rentals += 1;
      }
    });

    return buckets;
  },

  async getFleetStatus() {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*");
    if (error) throw error;

    const fleet = data ?? [];
    const total = fleet.length;
    const available = fleet.filter((vehicle) => vehicle.available !== false).length;
    const maintenance = fleet.filter((vehicle) => vehicle.maintenance === "pending").length;
    const inUse = Math.max(0, total - available - maintenance);
    const utilizationRate = total > 0 ? ((inUse / total) * 100).toFixed(1) : "0.0";

    const byType = fleet.reduce((acc, vehicle) => {
      const type = vehicle.type?.toLowerCase?.() || "other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      available,
      inUse,
      maintenance,
      utilizationRate,
      byType,
    };
  },

  async getBikesCurrentlyRented() {
    const { data, error } = await supabase
      .from("rentals")
      .select("vehicles(type)")
      .eq("status", "active");
    if (error) throw error;
    return (data ?? []).filter(
      (r) => r.vehicles?.type?.toLowerCase() === "bike"
    ).length;
  },

  async getScootersCurrentlyAvailable() {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, type, available")
      .eq("available", true);
    if (error) throw error;
    return (data ?? []).filter(
      (v) => v.type?.toLowerCase() === "scooter"
    ).length;
  },

  async getActiveRentalsByCity() {
    const { data, error } = await supabase
      .from("rentals")
      .select("id, vehicles(location)")
      .eq("status", "active");
    if (error) throw error;

    const byCity = {};
    (data ?? []).forEach((r) => {
      const city = extractCity(r.vehicles?.location);
      byCity[city] = (byCity[city] || 0) + 1;
    });
    return byCity;
  },

  async getUsageByCity() {
    const { data, error } = await supabase
      .from("rentals")
      .select("id, vehicles(location)")
      .eq("status", "completed");
    if (error) throw error;

    const byCity = {};
    (data ?? []).forEach((r) => {
      const city = extractCity(r.vehicles?.location);
      byCity[city] = (byCity[city] || 0) + 1;
    });
    return byCity;
  },

  async getParkingReservationsByCity() {
    const { data, error } = await supabase
      .from("parking_spots")
      .select("id, address, available, total");
    if (error) throw error;

    const byCity = {};
    (data ?? []).forEach((spot) => {
      const city = extractCity(spot.address);
      if (!byCity[city]) {
        byCity[city] = { reserved: 0, total: 0 };
      }
      const reserved = Math.max(0, (spot.total || 0) - (spot.available || 0));
      byCity[city].reserved += reserved;
      byCity[city].total += spot.total || 0;
    });
    return byCity;
  },

  async getDashboardSummary() {
    const [
      totalUsers,
      activeRentals,
      completedToday,
      vehicleUsage,
      parkingUtilization,
      activeParking,
      hourlyRentals,
      fleetStatus,
      bikesRented,
      scootersAvailable,
      rentalsByCity,
      usageByCity,
      parkingByCity,
    ] = await Promise.all([
      this.getTotalUsers(),
      this.getActiveRentals(),
      this.getCompletedTripsToday(),
      this.getUsageByVehicleType(),
      this.getParkingUtilization(),
      this.getActiveParking(),
      this.getHourlyRentalTrend(),
      this.getFleetStatus(),
      this.getBikesCurrentlyRented(),
      this.getScootersCurrentlyAvailable(),
      this.getActiveRentalsByCity(),
      this.getUsageByCity(),
      this.getParkingReservationsByCity(),
    ]);

    const activeRentalsCount = activeRentals.length;
    const monitoring = buildMonitoringSnapshot({
      activeRentalsCount,
      parkingUtilization,
      fleetStatus,
      liveDataAvailable: true,
    });
    const alerts = buildAlerts({
      parkingUtilization,
      fleetStatus,
      activeRentalsCount,
    });

    return {
      totalUsers,
      activeRentalsCount,
      activeRentals,
      completedToday,
      vehicleUsage,
      parkingUtilization,
      activeParking,
      hourlyRentals,
      fleetStatus,
      monitoring,
      alerts,
      bikesRented,
      scootersAvailable,
      rentalsByCity,
      usageByCity,
      parkingByCity,
    };
  },

  subscribeToMonitoringChanges(observer) {
    monitoringSubject.subscribe(observer);
    monitoringSubject.connect();
    return observer;
  },

  getMonitoringTables() {
    return [...MONITORING_TABLES];
  },

  getGatewayMonitoringSnapshot(limit = 20) {
    return {
      stats: gateway.getStats(),
      log: gateway.getRequestLog().slice(0, limit),
    };
  },

  unsubscribe(observer) {
    if (!observer) return;

    monitoringSubject.unsubscribe(observer);

    if (monitoringSubject.observerCount === 0) {
      monitoringSubject.disconnect();
    }
  },
};

export default AdminDashboardService;
