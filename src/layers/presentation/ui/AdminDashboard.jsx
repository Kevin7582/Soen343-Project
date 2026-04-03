import React, { useEffect, useMemo, useState } from "react";
import AdminDashboardService from "../../service-layer/adminDashboardService";
import RealtimeObserverPanel from "./RealtimeObserverPanel";

const MAX_EVENTS = 10;

function formatClock(value) {
  return value ? new Date(value).toLocaleTimeString() : "--";
}

function formatRelative(value) {
  if (!value) return "No updates yet";

  const diffMs = Date.now() - value.getTime();
  if (diffMs < 5000) return "Just now";
  if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  return `${Math.floor(diffMs / 3600000)}h ago`;
}

function formatEvent(payload) {
  const eventType = payload?.eventType || "UPDATE";
  const table = payload?.table || "unknown";
  const recordId = payload?.recordId ? `#${payload.recordId}` : "record";
  const changedAt = payload?.timestamp ? new Date(payload.timestamp) : new Date();

  return {
    id: `${table}-${eventType}-${recordId}-${changedAt.getTime()}`,
    title: `${table} ${eventType.toLowerCase()}`,
    message: `${table} ${eventType.toLowerCase()} received for ${recordId}.`,
    time: changedAt,
  };
}

function getConnectionTone(status) {
  if (status === "live") return styles.statusLive;
  if (status === "syncing") return styles.statusSyncing;
  return styles.statusError;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ ...styles.card, borderTop: `4px solid ${accent}` }}>
      <p style={styles.eyebrow}>{label}</p>
      <p style={styles.cardValue}>{value}</p>
      {sub ? <p style={styles.cardSub}>{sub}</p> : null}
    </div>
  );
}

function StatusPill({ label, tone }) {
  return <span style={{ ...styles.statusPill, ...tone }}>{label}</span>;
}

function HealthPanel({ monitoring }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>System Monitoring</h2>
          <p style={styles.sectionSubtitle}>Live health indicators across key operational services.</p>
        </div>
      </div>

      <div style={styles.healthGrid}>
        {monitoring.map((service) => {
          const tone =
            service.status === "healthy"
              ? styles.statusLive
              : service.status === "warning"
              ? styles.statusSyncing
              : styles.statusError;

          return (
            <div key={service.id} style={styles.healthCard}>
              <div style={styles.healthHeader}>
                <h3 style={styles.healthTitle}>{service.name}</h3>
                <StatusPill label={service.status} tone={tone} />
              </div>
              <p style={styles.healthMetric}>{service.metric}</p>
              <p style={styles.healthDetail}>{service.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AlertsPanel({ alerts }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Operational Alerts</h2>
          <p style={styles.sectionSubtitle}>Automatic flags generated from parking, fleet, and rental load.</p>
        </div>
      </div>

      <div style={styles.alertList}>
        {alerts.map((alert) => {
          const tone =
            alert.level === "critical"
              ? styles.alertCritical
              : alert.level === "warning"
              ? styles.alertWarning
              : styles.alertHealthy;

          return (
            <div key={alert.id} style={{ ...styles.alertItem, ...tone }}>
              <strong>{alert.title}</strong>
              <p style={styles.alertText}>{alert.message}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HourlyTrend({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.rentals));

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Today&apos;s Rental Activity</h2>
          <p style={styles.sectionSubtitle}>Hourly request volume for same-day rental starts.</p>
        </div>
      </div>

      <div style={styles.chart}>
        {rows.map((row) => (
          <div key={row.label} style={styles.chartColumn}>
            <div style={styles.chartBarTrack}>
              <div
                style={{
                  ...styles.chartBar,
                  height: `${Math.max(8, (row.rentals / max) * 100)}%`,
                }}
                title={`${row.label}: ${row.rentals} rentals`}
              />
            </div>
            <span style={styles.chartValue}>{row.rentals}</span>
            <span style={styles.chartLabel}>{row.label.slice(0, 2)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function VehicleUsage({ usage }) {
  const bike = usage?.bike || 0;
  const scooter = usage?.scooter || 0;
  const other = usage?.other || 0;
  const total = Math.max(1, bike + scooter + other);

  const slices = [
    { label: "Bike", value: bike, color: "#2563eb" },
    { label: "Scooter", value: scooter, color: "#f59e0b" },
    { label: "Other", value: other, color: "#7c3aed" },
  ];

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Vehicle Usage Mix</h2>
          <p style={styles.sectionSubtitle}>Completed trips split by vehicle type.</p>
        </div>
      </div>

      <div style={styles.stackedBar}>
        {slices.map((slice) => (
          <div
            key={slice.label}
            title={`${slice.label}: ${slice.value}`}
            style={{
              ...styles.stackedBarSegment,
              width: `${(slice.value / total) * 100}%`,
              background: slice.color,
            }}
          />
        ))}
      </div>

      <div style={styles.legendRow}>
        {slices.map((slice) => (
          <span key={slice.label} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: slice.color }} />
            {slice.label}: {slice.value}
          </span>
        ))}
      </div>
    </section>
  );
}

function FleetPanel({ fleetStatus }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Fleet Snapshot</h2>
          <p style={styles.sectionSubtitle}>Inventory distribution and live vehicle availability.</p>
        </div>
      </div>

      <div style={styles.fleetGrid}>
        <div style={styles.metricTile}>
          <span style={styles.eyebrow}>Total Fleet</span>
          <strong style={styles.metricValue}>{fleetStatus.total}</strong>
        </div>
        <div style={styles.metricTile}>
          <span style={styles.eyebrow}>Available</span>
          <strong style={styles.metricValue}>{fleetStatus.available}</strong>
        </div>
        <div style={styles.metricTile}>
          <span style={styles.eyebrow}>In Use</span>
          <strong style={styles.metricValue}>{fleetStatus.inUse}</strong>
        </div>
        <div style={styles.metricTile}>
          <span style={styles.eyebrow}>Maintenance</span>
          <strong style={styles.metricValue}>{fleetStatus.maintenance}</strong>
        </div>
      </div>

      <p style={styles.inlineNote}>Fleet utilization: {fleetStatus.utilizationRate}%</p>
      <div style={styles.legendRow}>
        {Object.entries(fleetStatus.byType || {}).map(([type, count]) => (
          <span key={type} style={styles.legendItem}>
            {type}: {count}
          </span>
        ))}
      </div>
    </section>
  );
}

function CityBreakdown({ title, subtitle, data, valueLabel }) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) {
    return (
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>{title}</h2>
            <p style={styles.sectionSubtitle}>{subtitle}</p>
          </div>
        </div>
        <p style={styles.empty}>No data available.</p>
      </section>
    );
  }

  const maxValue = Math.max(1, ...entries.map(([, v]) => (typeof v === "object" ? v.reserved : v)));

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>{title}</h2>
          <p style={styles.sectionSubtitle}>{subtitle}</p>
        </div>
      </div>
      <div style={{ display: "grid", gap: "0.7rem" }}>
        {entries.map(([city, value]) => {
          const numValue = typeof value === "object" ? value.reserved : value;
          const label = typeof value === "object"
            ? `${value.reserved} reserved / ${value.total} total`
            : `${numValue} ${valueLabel || ""}`;
          return (
            <div key={city} style={{ display: "grid", gap: "0.3rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#eaeaf0", fontSize: "0.88rem" }}>
                <span>{city}</span>
                <span style={{ color: "#6b6b80" }}>{label}</span>
              </div>
              <div style={{ width: "100%", height: "8px", borderRadius: "999px", background: "rgba(35,35,47,0.8)" }}>
                <div style={{
                  height: "100%",
                  borderRadius: "999px",
                  width: `${Math.max(5, (numValue / maxValue) * 100)}%`,
                  background: "linear-gradient(90deg, #e4a94d, #a67526)",
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActiveRentalsList({ rentals }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Active Rentals</h2>
          <p style={styles.sectionSubtitle}>Current live rentals refreshed automatically.</p>
        </div>
      </div>

      {rentals.length === 0 ? (
        <p style={styles.empty}>No active rentals right now.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Rental", "User", "Vehicle", "Location", "Started"].map((label) => (
                  <th key={label} style={styles.th}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rentals.map((rental) => (
                <tr key={rental.id}>
                  <td style={styles.td}>#{rental.id}</td>
                  <td style={styles.td}>{rental.user_id}</td>
                  <td style={styles.td}>{rental.vehicles?.type || "--"}</td>
                  <td style={styles.td}>{rental.vehicles?.location || "--"}</td>
                  <td style={styles.td}>{formatClock(rental.start_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ParkingTable({ spots }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Parking Utilization</h2>
          <p style={styles.sectionSubtitle}>Live capacity and occupancy by parking location.</p>
        </div>
      </div>

      {spots.length === 0 ? (
        <p style={styles.empty}>No parking data available.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Address", "Total", "Available", "Used", "Utilization"].map((label) => (
                  <th key={label} style={styles.th}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spots.map((spot) => (
                <tr key={spot.id}>
                  <td style={styles.td}>{spot.address}</td>
                  <td style={styles.td}>{spot.total}</td>
                  <td style={styles.td}>{spot.available}</td>
                  <td style={styles.td}>{spot.utilized}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.utilizationBadge,
                        ...(spot.utilizationRate >= 95
                          ? styles.alertCritical
                          : spot.utilizationRate >= 85
                          ? styles.alertWarning
                          : styles.alertHealthy),
                      }}
                    >
                      {spot.utilizationRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EventFeed({ events }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Live Event Feed</h2>
          <p style={styles.sectionSubtitle}>Recent database changes captured through Supabase realtime.</p>
        </div>
      </div>

      {events.length === 0 ? (
        <p style={styles.empty}>Waiting for live events...</p>
      ) : (
        <div style={styles.feedList}>
          {events.map((event) => (
            <div key={event.id} style={styles.feedItem}>
              <div>
                <strong>{event.title}</strong>
                <p style={styles.feedText}>{event.message}</p>
              </div>
              <span style={styles.feedTime}>{formatRelative(event.time)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdminDashboard({ mode = "overview" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [events, setEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("syncing");

  const loadData = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);

    try {
      const summary = await AdminDashboardService.getDashboardSummary();
      setData(summary);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError(`Failed to load dashboard data: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const observer = {
      update(payload) {
        setConnectionStatus("live");
        setEvents((previous) => [formatEvent(payload), ...previous].slice(0, MAX_EVENTS));
        loadData({ silent: true });
      },
      onSubjectStatusChange(status) {
        if (status === "SUBSCRIBED") setConnectionStatus("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionStatus("disconnected");
        } else {
          setConnectionStatus("syncing");
        }
      },
    };

    AdminDashboardService.subscribeToMonitoringChanges(observer);

    return () => {
      AdminDashboardService.unsubscribe(observer);
    };
  }, []);

  const statCards = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: "Registered Users",
        value: data.totalUsers,
        sub: "Total accounts in the platform",
        accent: "#e4a94d",
      },
      {
        label: "Active Rentals",
        value: data.activeRentalsCount,
        sub: "Live value from realtime subscriptions",
        accent: "#5ae4a7",
      },
      {
        label: "Trips Today",
        value: data.completedToday,
        sub: "Completed rentals since midnight",
        accent: "#a78bfa",
      },
      {
        label: "Active Parking",
        value: data.activeParking,
        sub: "Current parking reservations",
        accent: "#f0c24a",
      },
      {
        label: "Fleet Utilization",
        value: `${data.fleetStatus.utilizationRate}%`,
        sub: `${data.fleetStatus.inUse} in use`,
        accent: "#f07068",
      },
      {
        label: "Parking Locations",
        value: data.parkingUtilization.length,
        sub: "Tracked locations",
        accent: "#5ae4a7",
      },
      {
        label: "Bikes Rented",
        value: data.bikesRented ?? 0,
        sub: "Active bike rentals now",
        accent: "#60a5fa",
      },
      {
        label: "Scooters Available",
        value: data.scootersAvailable ?? 0,
        sub: "Ready for reservation",
        accent: "#e4a94d",
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>Loading realtime analytics...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <strong>Error</strong>
          <p style={styles.errorText}>{error}</p>
          <button style={styles.refreshButton} onClick={() => loadData()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const title =
    mode === "rentalAnalytics"
      ? "Rental Analytics"
      : mode === "gatewayMonitoring"
      ? "Gateway Monitoring"
      : "Admin Dashboard";

  const subtitle =
    mode === "rentalAnalytics"
      ? "Usage trends, fleet demand, and active rentals in one live view."
      : mode === "gatewayMonitoring"
      ? "Operational health, service visibility, and realtime event monitoring."
      : "Realtime analytics and monitoring for the SUMMS platform.";

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>SUMMS OPERATIONS CENTER</p>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.subtitle}>{subtitle}</p>
        </div>
        <div style={styles.headerActions}>
          <StatusPill label={connectionStatus} tone={getConnectionTone(connectionStatus)} />
          <button style={styles.refreshButton} onClick={() => loadData({ silent: true })}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <p style={styles.timestamp}>Last sync: {formatClock(lastUpdated)}</p>
        </div>
      </div>

      {error ? (
        <div style={{ ...styles.inlineBanner, ...styles.alertWarning }}>
          {error}
        </div>
      ) : null}

      <RealtimeObserverPanel />

      <div style={styles.statGrid}>
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {(mode === "overview" || mode === "rentalAnalytics") && (
        <>
          <HourlyTrend rows={data.hourlyRentals} />
          <VehicleUsage usage={data.vehicleUsage} />
          <CityBreakdown
            title="Active Rentals by City"
            subtitle="Current live rentals grouped by vehicle location."
            data={data.rentalsByCity}
            valueLabel="active rentals"
          />
          <CityBreakdown
            title="Usage by City"
            subtitle="Total completed trips grouped by city (e.g., Montreal vs Laval)."
            data={data.usageByCity}
            valueLabel="completed trips"
          />
          <FleetPanel fleetStatus={data.fleetStatus} />
          <ActiveRentalsList rentals={data.activeRentals} />
        </>
      )}

      {(mode === "overview" || mode === "gatewayMonitoring") && (
        <>
          <HealthPanel monitoring={data.monitoring} />
          <AlertsPanel alerts={data.alerts} />
          <CityBreakdown
            title="Parking Reservations by City"
            subtitle="Parking spots reserved per city area."
            data={data.parkingByCity}
          />
          <ParkingTable spots={data.parkingUtilization} />
          <EventFeed events={events} />
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "grid",
    gap: "1.25rem",
    color: "#eaeaf0",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "flex-start",
    flexWrap: "wrap",
    padding: "1.5rem",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #16161d, rgba(228,169,77,0.12))",
    border: "1px solid rgba(255,255,255,0.07)",
    boxShadow: "0 16px 50px rgba(0,0,0,0.35), 0 0 40px rgba(228,169,77,0.06)",
  },
  kicker: {
    margin: 0,
    color: "#e4a94d",
    fontSize: "0.72rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontWeight: 600,
  },
  title: {
    margin: "0.4rem 0 0",
    fontSize: "1.75rem",
    color: "#eaeaf0",
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: "0.5rem 0 0",
    color: "#a8a8b8",
    maxWidth: "42rem",
    lineHeight: 1.55,
  },
  headerActions: {
    display: "grid",
    gap: "0.6rem",
    justifyItems: "end",
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    padding: "0.4rem 0.8rem",
    fontSize: "0.78rem",
    textTransform: "capitalize",
    border: "1px solid transparent",
    fontWeight: 600,
  },
  statusLive: {
    background: "rgba(90,228,167,0.12)",
    color: "#5ae4a7",
    borderColor: "rgba(90,228,167,0.3)",
  },
  statusSyncing: {
    background: "rgba(228,169,77,0.12)",
    color: "#f5c97a",
    borderColor: "rgba(228,169,77,0.3)",
  },
  statusError: {
    background: "rgba(240,112,104,0.12)",
    color: "#f07068",
    borderColor: "rgba(240,112,104,0.3)",
  },
  refreshButton: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#1c1c26",
    color: "#eaeaf0",
    padding: "0.65rem 1rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: "0.85rem",
    transition: "all 0.15s",
  },
  timestamp: {
    margin: 0,
    color: "#6b6b80",
    fontSize: "0.82rem",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "0.85rem",
  },
  card: {
    background: "#1c1c26",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "14px",
    padding: "1.1rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
  },
  eyebrow: {
    margin: 0,
    color: "#6b6b80",
    fontSize: "0.72rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontWeight: 500,
  },
  cardValue: {
    margin: "0.45rem 0 0",
    fontSize: "1.8rem",
    fontWeight: 700,
    color: "#e4a94d",
    fontFamily: "'Outfit', system-ui, sans-serif",
    letterSpacing: "-0.02em",
  },
  cardSub: {
    margin: "0.4rem 0 0",
    color: "#6b6b80",
    lineHeight: 1.45,
    fontSize: "0.82rem",
  },
  section: {
    background: "#1c1c26",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "14px",
    padding: "1.25rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "flex-start",
    marginBottom: "1rem",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "1.1rem",
    color: "#eaeaf0",
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontWeight: 600,
  },
  sectionSubtitle: {
    margin: "0.3rem 0 0",
    color: "#6b6b80",
    lineHeight: 1.45,
    fontSize: "0.85rem",
  },
  loadingCard: {
    padding: "1.5rem",
    borderRadius: "14px",
    background: "#1c1c26",
    border: "1px solid rgba(255,255,255,0.07)",
    color: "#a8a8b8",
  },
  errorCard: {
    display: "grid",
    gap: "0.8rem",
    padding: "1.5rem",
    borderRadius: "14px",
    background: "rgba(240,112,104,0.08)",
    border: "1px solid rgba(240,112,104,0.3)",
  },
  errorText: {
    margin: 0,
    color: "#fecaca",
  },
  inlineBanner: {
    padding: "0.9rem 1rem",
    borderRadius: "12px",
  },
  chart: {
    display: "grid",
    gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
    gap: "0.4rem",
    alignItems: "end",
    minHeight: "220px",
  },
  chartColumn: {
    display: "grid",
    justifyItems: "center",
    gap: "0.3rem",
  },
  chartBarTrack: {
    display: "flex",
    alignItems: "end",
    width: "100%",
    minHeight: "150px",
    background: "rgba(35,35,47,0.8)",
    borderRadius: "999px",
    overflow: "hidden",
  },
  chartBar: {
    width: "100%",
    background: "linear-gradient(180deg, #e4a94d, #a67526)",
    borderRadius: "999px",
  },
  chartValue: {
    fontSize: "0.75rem",
    color: "#a8a8b8",
  },
  chartLabel: {
    fontSize: "0.68rem",
    color: "#6b6b80",
  },
  stackedBar: {
    display: "flex",
    width: "100%",
    height: "14px",
    borderRadius: "999px",
    overflow: "hidden",
    background: "rgba(35,35,47,0.9)",
    marginBottom: "1rem",
  },
  stackedBarSegment: {
    height: "100%",
  },
  legendRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.9rem",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.45rem",
    color: "#a8a8b8",
    fontSize: "0.88rem",
  },
  legendDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    display: "inline-block",
  },
  fleetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  metricTile: {
    display: "grid",
    gap: "0.35rem",
    padding: "0.9rem",
    borderRadius: "12px",
    background: "rgba(35,35,47,0.7)",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  metricValue: {
    fontSize: "1.4rem",
    color: "#eaeaf0",
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontWeight: 700,
  },
  inlineNote: {
    margin: "0 0 1rem",
    color: "#a8a8b8",
    fontSize: "0.88rem",
  },
  healthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.85rem",
  },
  healthCard: {
    display: "grid",
    gap: "0.65rem",
    padding: "1rem",
    borderRadius: "12px",
    background: "rgba(35,35,47,0.7)",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  healthHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.75rem",
    alignItems: "center",
  },
  healthTitle: {
    margin: 0,
    color: "#eaeaf0",
    fontSize: "0.95rem",
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontWeight: 600,
  },
  healthMetric: {
    margin: 0,
    color: "#eaeaf0",
    fontSize: "1rem",
    fontWeight: 600,
  },
  healthDetail: {
    margin: 0,
    color: "#6b6b80",
    lineHeight: 1.45,
    fontSize: "0.84rem",
  },
  alertList: {
    display: "grid",
    gap: "0.65rem",
  },
  alertItem: {
    padding: "1rem",
    borderRadius: "12px",
    border: "1px solid transparent",
  },
  alertText: {
    margin: "0.35rem 0 0",
    lineHeight: 1.5,
    fontSize: "0.88rem",
  },
  alertCritical: {
    background: "rgba(240,112,104,0.1)",
    color: "#fecaca",
    borderColor: "rgba(240,112,104,0.25)",
  },
  alertWarning: {
    background: "rgba(228,169,77,0.1)",
    color: "#fde68a",
    borderColor: "rgba(228,169,77,0.2)",
  },
  alertHealthy: {
    background: "rgba(90,228,167,0.08)",
    color: "#bbf7d0",
    borderColor: "rgba(90,228,167,0.2)",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "0.75rem 0.8rem",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    color: "#6b6b80",
    fontWeight: 600,
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  td: {
    padding: "0.8rem",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    color: "#a8a8b8",
    fontSize: "0.88rem",
  },
  utilizationBadge: {
    display: "inline-block",
    padding: "0.25rem 0.6rem",
    borderRadius: "999px",
    fontWeight: 600,
    fontSize: "0.82rem",
  },
  feedList: {
    display: "grid",
    gap: "0.65rem",
  },
  feedItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.75rem",
    alignItems: "flex-start",
    padding: "0.9rem",
    borderRadius: "12px",
    background: "rgba(35,35,47,0.7)",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  feedText: {
    margin: "0.3rem 0 0",
    color: "#6b6b80",
    lineHeight: 1.45,
    fontSize: "0.84rem",
  },
  feedTime: {
    color: "#6b6b80",
    fontSize: "0.78rem",
    whiteSpace: "nowrap",
  },
  empty: {
    margin: 0,
    color: "#6b6b80",
  },
};
