// service-layer/recommendationService.js
// Generates personalized travel recommendations based on user preferences,
// preferred city, preferred mobility type, and real-time vehicle/parking data.

import { supabase } from "../data-layer/supabaseClient";
import { mockVehicles, mockParkingSpots } from "../data-layer/mockData";

function fallbackWarn(scope, error) {
  console.warn(`Recommendation query failed for "${scope}".`, error?.message || error);
}

const RecommendationService = {
  /**
   * Fetch available vehicles, optionally filtered by type and/or location.
   */
  async getAvailableVehicles({ type, location } = {}) {
    let query = supabase.from("vehicles").select("*").eq("available", true);
    if (type) query = query.eq("type", type);
    if (location) query = query.ilike("location", `%${location}%`);
    const { data, error } = await query.limit(50);
    if (error) {
      fallbackWarn("available vehicles", error);
      // Fallback to mock data filtered client-side
      return mockVehicles.filter(
        (v) =>
          v.status === "available" &&
          (!type || v.type === type) &&
          (!location || (v.location ?? "").toLowerCase().includes(location.toLowerCase()))
      );
    }
    return data || [];
  },

  /**
   * Fetch available parking spots, optionally filtered by address/city.
   */
  async getAvailableParking({ location } = {}) {
    let query = supabase.from("parking_spots").select("*").gt("available", 0);
    if (location) query = query.ilike("address", `%${location}%`);
    const { data, error } = await query.limit(50);
    if (error) {
      fallbackWarn("available parking", error);
      return mockParkingSpots.filter(
        (p) =>
          p.available > 0 &&
          (!location || (p.address ?? "").toLowerCase().includes(location.toLowerCase()))
      );
    }
    return data || [];
  },

  /**
   * Build personalized recommendations for a citizen user.
   *
   * @param {{ preferredCity: string, preferredMobilityType: string }} preferences
   * @returns {Promise<{ recommendations: Array<{message:string,type:string}>, vehicleSuggestions: any[], parkingSuggestions: any[] }>}
   */
  async getRecommendations(preferences = {}) {
    const { preferredCity, preferredMobilityType } = preferences;
    const recommendations = [];
    let vehicleSuggestions = [];
    let parkingSuggestions = [];

    // Fetch real-time data in parallel based on what preferences are set
    const [preferredVehicles, allOfType, cityVehicles, cityParking] =
      await Promise.all([
        preferredCity && preferredMobilityType
          ? this.getAvailableVehicles({ type: preferredMobilityType, location: preferredCity })
          : Promise.resolve([]),
        preferredMobilityType
          ? this.getAvailableVehicles({ type: preferredMobilityType })
          : Promise.resolve([]),
        preferredCity
          ? this.getAvailableVehicles({ location: preferredCity })
          : Promise.resolve([]),
        preferredCity
          ? this.getAvailableParking({ location: preferredCity })
          : Promise.resolve([]),
      ]);

    const typeName =
      preferredMobilityType === "bike" ? "Bikes" : "Scooters";
    const typeSingular =
      preferredMobilityType === "bike" ? "bike" : "scooter";

    // --- Build recommendations ---

    // 1. Both city + type set (primary use case from spec)
    if (preferredCity && preferredMobilityType) {
      if (preferredVehicles.length > 0) {
        recommendations.push({
          message: `${typeName} are currently available in ${preferredCity}. You may reserve one now.`,
          type: "success",
        });
        vehicleSuggestions = preferredVehicles.slice(0, 4);
      } else if (allOfType.length > 0) {
        recommendations.push({
          message: `No ${typeSingular}s available in ${preferredCity} right now, but ${allOfType.length} ${typeSingular}(s) are available in other locations.`,
          type: "info",
        });
        vehicleSuggestions = allOfType.slice(0, 4);
      } else if (cityVehicles.length > 0) {
        const altType = preferredMobilityType === "bike" ? "scooter" : "bike";
        const altName = altType === "bike" ? "bikes" : "scooters";
        const altCount = cityVehicles.filter(
          (v) => (v.type ?? "").toLowerCase() === altType
        ).length;
        if (altCount > 0) {
          recommendations.push({
            message: `No ${typeSingular}s in ${preferredCity}, but ${altCount} ${altName} are available there instead.`,
            type: "info",
          });
        }
        vehicleSuggestions = cityVehicles.slice(0, 4);
      } else {
        recommendations.push({
          message: `No vehicles currently available in ${preferredCity}. Check back soon or try another city.`,
          type: "warning",
        });
      }
    }

    // 2. Only type set
    if (preferredMobilityType && !preferredCity) {
      if (allOfType.length > 0) {
        recommendations.push({
          message: `${allOfType.length} ${typeSingular}(s) available across all locations. Set a preferred city for better suggestions.`,
          type: "info",
        });
        vehicleSuggestions = allOfType.slice(0, 4);
      } else {
        recommendations.push({
          message: `No ${typeSingular}s available right now. Try a different vehicle type.`,
          type: "warning",
        });
      }
    }

    // 3. Only city set
    if (preferredCity && !preferredMobilityType) {
      if (cityVehicles.length > 0) {
        const bikes = cityVehicles.filter((v) => (v.type ?? "").toLowerCase() === "bike").length;
        const scooters = cityVehicles.filter((v) => (v.type ?? "").toLowerCase() === "scooter").length;
        recommendations.push({
          message: `${cityVehicles.length} vehicle(s) available in ${preferredCity}: ${bikes} bike(s), ${scooters} scooter(s).`,
          type: "info",
        });
        vehicleSuggestions = cityVehicles.slice(0, 4);
      } else {
        recommendations.push({
          message: `No vehicles available in ${preferredCity} right now.`,
          type: "warning",
        });
      }
    }

    // 4. Parking recommendation
    if (preferredCity) {
      const totalSpots = cityParking.reduce(
        (sum, p) => sum + Number(p.available ?? p.available_spots ?? 0),
        0
      );
      if (totalSpots > 0) {
        recommendations.push({
          message: `${totalSpots} parking spot(s) available in ${preferredCity} across ${cityParking.length} location(s).`,
          type: "info",
        });
        parkingSuggestions = cityParking.slice(0, 3);
      }
    }

    // 5. No preferences set
    if (!preferredCity && !preferredMobilityType) {
      recommendations.push({
        message:
          "Set your preferred city and mobility type in your Profile to get personalized recommendations.",
        type: "default",
      });
    }

    return { recommendations, vehicleSuggestions, parkingSuggestions };
  },
};

export default RecommendationService;
