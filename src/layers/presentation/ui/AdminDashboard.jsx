// presentation/ui/AdminDashboard.jsx
// Uses AdminDashboardService (Facade) for data aggregation
// and Supabase real-time subscriptions (Observer) for live updates.

import React, { useEffect, useState } from "react";
import AdminDashboardService from "../../service-layer/adminDashboardService";

// ── Small reusable stat card ──────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
      <p style={styles.cardLabel}>{label}</p>
      <p style={{ ...styles.cardValue, color }}>{value ?? "—"}</p>
      {sub && <p style={styles.cardSub}>{sub}</p>}
    </div>
  );
}

// ── Vehicle usage bar ─────────────────────────────────────────────────────────
function UsageBar({ bikes, scooters }) {
  const total = bikes + scooters || 1;
  const bikeWidth = ((bikes / total) * 100).toFixed(1);
  const scooterWidth = ((scooters / total) * 100).toFixed(1);

  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>🚲 Bike vs 🛴 Scooter Usage</h3>
      <div style={styles.barContainer}>
        <div
          style={{ ...styles.barSegment, width: `${bikeWidth}%`, background: "#3b82f6" }}
          title={`Bikes: ${bikes}`}
        />
        <div
          style={{ ...styles.barSegment, width: `${scooterWidth}%`, background: "#f59e0b" }}
          title={`Scooters: ${scooters}`}
        />
      </div>
      <div style={styles.barLegend}>
        <span style={{ color: "#3b82f6" }}>● Bikes: {bikes} ({bikeWidth}%)</span>
        <span style={{ color: "#f59e0b" }}>● Scooters: {scooters} ({scooterWidth}%)</span>
      </div>
    </div>
  );
}

// ── Parking table ─────────────────────────────────────────────────────────────
function ParkingTable({ spots }) {
  if (!spots || spots.length === 0)
    return <p style={styles.empty}>No parking data available.</p>;

  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>🅿️ Parking Utilization</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            {["Address", "Total Spots", "Available", "Utilized", "Rate"].map((h) => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spots.map((spot) => (
            <tr key={spot.id} style={styles.tr}>
              <td style={styles.td}>{spot.address}</td>
              <td style={styles.td}>{spot.total}</td>
              <td style={styles.td}>{spot.available}</td>
              <td style={styles.td}>{spot.utilized}</td>
              <td style={styles.td}>
                <span
                  style={{
                    ...styles.badge,
                    background:
                      spot.utilizationRate > 80
                        ? "#fee2e2"
                        : spot.utilizationRate > 50
                        ? "#fef9c3"
                        : "#dcfce7",
                    color:
                      spot.utilizationRate > 80
                        ? "#dc2626"
                        : spot.utilizationRate > 50
                        ? "#ca8a04"
                        : "#16a34a",
                  }}
                >
                  {spot.utilizationRate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Active rentals list ───────────────────────────────────────────────────────
function ActiveRentalsList({ rentals }) {
  if (!rentals || rentals.length === 0)
    return (
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🔄 Active Rentals</h3>
        <p style={styles.empty}>No active rentals right now.</p>
      </div>
    );

  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>🔄 Active Rentals (live)</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            {["Rental ID", "User ID", "Vehicle Type", "Location", "Started"].map((h) => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => (
            <tr key={r.id} style={styles.tr}>
              <td style={styles.td}>#{r.id}</td>
              <td style={styles.td}>{r.user_id}</td>
              <td style={styles.td}>{r.vehicles?.type ?? "—"}</td>
              <td style={styles.td}>{r.vehicles?.location ?? "—"}</td>
              <td style={styles.td}>
                {r.start_time ? new Date(r.start_time).toLocaleTimeString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = async () => {
    try {
      const summary = await AdminDashboardService.getDashboardSummary();
      setData(summary);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError("Failed to load dashboard data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Observer Pattern: subscribe to real-time rental changes
    const channel = AdminDashboardService.subscribeToRentalChanges(() => {
      loadData();
    });

    return () => AdminDashboardService.unsubscribe(channel);
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ color: "#6b7280", textAlign: "center", marginTop: "4rem" }}>
          Loading dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, color: "#dc2626" }}>
          <strong>Error:</strong> {error}
          <button style={styles.refreshBtn} onClick={loadData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.subtitle}>SUMMS — Smart Urban Mobility Management System</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <button style={styles.refreshBtn} onClick={loadData}>↻ Refresh</button>
          {lastUpdated && (
            <p style={styles.timestamp}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={styles.grid}>
        <StatCard label="Total Registered Users" value={data.totalUsers} color="#3b82f6" />
        <StatCard label="Active Rentals" value={data.activeRentalsCount} sub="Live — updates automatically" color="#10b981" />
        <StatCard label="Trips Completed Today" value={data.completedToday} color="#8b5cf6" />
        <StatCard label="Active Parking Reservations" value={data.activeParking} color="#f59e0b" />
      </div>

      <UsageBar bikes={data.vehicleUsage.bike} scooters={data.vehicleUsage.scooter} />
      <ActiveRentalsList rentals={data.activeRentals} />
      <ParkingTable spots={data.parkingUtilization} />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
    fontFamily: "'Segoe UI', sans-serif",
    color: "#111827",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "700",
    margin: 0,
    color: "#111827",
  },
  subtitle: {
    margin: "0.25rem 0 0",
    color: "#6b7280",
    fontSize: "0.875rem",
  },
  timestamp: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    marginTop: "0.25rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.25rem",
    marginBottom: "2rem",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardLabel: {
    fontSize: "0.8rem",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "0 0 0.5rem",
  },
  cardValue: {
    fontSize: "2rem",
    fontWeight: "700",
    margin: "0 0 0.25rem",
  },
  cardSub: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    margin: 0,
  },
  section: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: "600",
    margin: "0 0 1rem",
    color: "#374151",
  },
  barContainer: {
    display: "flex",
    height: "28px",
    borderRadius: "6px",
    overflow: "hidden",
    background: "#f3f4f6",
  },
  barSegment: {
    height: "100%",
    transition: "width 0.4s ease",
  },
  barLegend: {
    display: "flex",
    gap: "1.5rem",
    marginTop: "0.75rem",
    fontSize: "0.875rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  th: {
    textAlign: "left",
    padding: "0.6rem 0.75rem",
    background: "#f9fafb",
    color: "#6b7280",
    fontWeight: "600",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    borderBottom: "1px solid #e5e7eb",
  },
  tr: {
    borderBottom: "1px solid #f3f4f6",
  },
  td: {
    padding: "0.65rem 0.75rem",
    color: "#374151",
  },
  badge: {
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: "600",
  },
  empty: {
    color: "#9ca3af",
    fontStyle: "italic",
    margin: 0,
  },
  refreshBtn: {
    padding: "0.4rem 1rem",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
};
