// service-layer/adminDashboardService.js
// Facade Pattern: Single interface aggregating data from multiple Supabase tables
// for the Admin Dashboard. Hides complexity of multi-table queries from the UI layer.

import { supabase } from "../data-layer/supabaseClient";

const AdminDashboardService = {
  // --- USER STATS ---
  async getTotalUsers() {
    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return count;
  },

  // --- RENTAL STATS ---
  async getActiveRentals() {
    const { data, error } = await supabase
      .from("rentals")
      .select("id, vehicle_id, user_id, start_time, vehicles(type, location)")
      .eq("status", "active");
    if (error) throw error;
    return data;
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
    return count;
  },

  async getUsageByVehicleType() {
    const { data, error } = await supabase
      .from("rentals")
      .select("vehicles(type)")
      .eq("status", "completed");
    if (error) throw error;

    const counts = { bike: 0, scooter: 0, other: 0 };
    data.forEach(({ vehicles }) => {
      const type = vehicles?.type?.toLowerCase();
      if (type === "bike") counts.bike++;
      else if (type === "scooter") counts.scooter++;
      else counts.other++;
    });
    return counts;
  },

  // --- PARKING STATS ---
  async getParkingUtilization() {
    const { data, error } = await supabase
      .from("parking_spots")
      .select("id, address, available, total");
    if (error) throw error;

    return data.map((spot) => ({
      ...spot,
      utilized: spot.total - spot.available,
      utilizationRate:
        spot.total > 0
          ? (((spot.total - spot.available) / spot.total) * 100).toFixed(1)
          : 0,
    }));
  },

  async getActiveParking() {
    const { count, error } = await supabase
      .from("parking_reservations")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    if (error) throw error;
    return count;
  },

  // --- AGGREGATED SUMMARY (main dashboard load) ---
  async getDashboardSummary() {
    const [
      totalUsers,
      activeRentals,
      completedToday,
      vehicleUsage,
      parkingUtilization,
      activeParking,
    ] = await Promise.all([
      this.getTotalUsers(),
      this.getActiveRentals(),
      this.getCompletedTripsToday(),
      this.getUsageByVehicleType(),
      this.getParkingUtilization(),
      this.getActiveParking(),
    ]);

    return {
      totalUsers,
      activeRentalsCount: activeRentals.length,
      activeRentals,
      completedToday,
      vehicleUsage,
      parkingUtilization,
      activeParking,
    };
  },

  // --- REAL-TIME SUBSCRIPTION (Observer Pattern) ---
  // Subscribes to live changes on the rentals table.
  // The dashboard component is the Observer; Supabase is the Subject.
  subscribeToRentalChanges(callback) {
    return supabase
      .channel("rentals-admin-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rentals" },
        callback
      )
      .subscribe();
  },

  unsubscribe(channel) {
    supabase.removeChannel(channel);
  },
};

export default AdminDashboardService;
