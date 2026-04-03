import React, { useEffect, useMemo, useState } from "react";
import AdminDashboardService from "../../service-layer/adminDashboardService";

function toPanelStatus(status) {
  if (status === "SUBSCRIBED") return "live";
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
    return "disconnected";
  }

  return "syncing";
}

function statusTone(status) {
  if (status === "live") return panelStyles.statusLive;
  if (status === "syncing") return panelStyles.statusSyncing;
  return panelStyles.statusError;
}

function formatLastEvent(event) {
  if (!event) return "Waiting for realtime updates";
  const recordLabel = event.recordId ? `#${event.recordId}` : "record";
  return `${event.table} ${String(event.eventType || "UPDATE").toLowerCase()} ${recordLabel}`;
}

export default function RealtimeObserverPanel() {
  const trackedTables = useMemo(() => AdminDashboardService.getMonitoringTables(), []);
  const [connectionStatus, setConnectionStatus] = useState("syncing");
  const [totalEvents, setTotalEvents] = useState(0);
  const [lastEvent, setLastEvent] = useState(null);
  const [tableCounts, setTableCounts] = useState({});

  useEffect(() => {
    const observer = {
      update(event) {
        setConnectionStatus("live");
        setTotalEvents((previous) => previous + 1);
        setLastEvent(event);
        setTableCounts((previous) => ({
          ...previous,
          [event.table]: (previous[event.table] || 0) + 1,
        }));
      },
      onSubjectStatusChange(status) {
        setConnectionStatus(toPanelStatus(status));
      },
    };

    AdminDashboardService.subscribeToMonitoringChanges(observer);

    return () => {
      AdminDashboardService.unsubscribe(observer);
    };
  }, []);

  const busiestTables = Object.entries(tableCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);

  return (
    <section style={panelStyles.card}>
      <div style={panelStyles.header}>
        <div>
          <p style={panelStyles.eyebrow}>Realtime Watch</p>
          <h2 style={panelStyles.title}>Secondary Observer</h2>
          <p style={panelStyles.subtitle}>
            Independent observer subscribed to the same monitoring subject.
          </p>
        </div>
        <span style={{ ...panelStyles.statusPill, ...statusTone(connectionStatus) }}>
          {connectionStatus}
        </span>
      </div>

      <div style={panelStyles.metricGrid}>
        <div style={panelStyles.metricTile}>
          <span style={panelStyles.metricLabel}>Tracked tables</span>
          <strong style={panelStyles.metricValue}>{trackedTables.length}</strong>
        </div>
        <div style={panelStyles.metricTile}>
          <span style={panelStyles.metricLabel}>Events seen</span>
          <strong style={panelStyles.metricValue}>{totalEvents}</strong>
        </div>
        <div style={panelStyles.metricTile}>
          <span style={panelStyles.metricLabel}>Active tables</span>
          <strong style={panelStyles.metricValue}>{Object.keys(tableCounts).length}</strong>
        </div>
      </div>

      <div style={panelStyles.metaGrid}>
        <div style={panelStyles.metaBlock}>
          <span style={panelStyles.metaLabel}>Last event</span>
          <strong style={panelStyles.metaValue}>{formatLastEvent(lastEvent)}</strong>
        </div>
        <div style={panelStyles.metaBlock}>
          <span style={panelStyles.metaLabel}>Listening to</span>
          <div style={panelStyles.tagRow}>
            {trackedTables.map((table) => (
              <span key={table} style={panelStyles.tag}>
                {table}
              </span>
            ))}
          </div>
        </div>
        <div style={panelStyles.metaBlock}>
          <span style={panelStyles.metaLabel}>Most active tables</span>
          {busiestTables.length === 0 ? (
            <p style={panelStyles.placeholder}>No table activity captured yet.</p>
          ) : (
            <div style={panelStyles.tagRow}>
              {busiestTables.map(([table, count]) => (
                <span key={table} style={panelStyles.tag}>
                  {table}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const panelStyles = {
  card: {
    display: "grid",
    gap: "1rem",
    padding: "1.25rem",
    borderRadius: "18px",
    border: "1px solid rgba(71, 85, 105, 0.62)",
    background: "rgba(15, 23, 42, 0.82)",
    boxShadow: "0 12px 26px rgba(2, 6, 23, 0.16)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: 0,
    color: "#93c5fd",
    fontSize: "0.75rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: {
    margin: "0.35rem 0 0",
    color: "#f8fafc",
    fontSize: "1.15rem",
  },
  subtitle: {
    margin: "0.35rem 0 0",
    color: "#94a3b8",
    lineHeight: 1.45,
    maxWidth: "34rem",
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    padding: "0.4rem 0.8rem",
    fontSize: "0.8rem",
    textTransform: "capitalize",
    border: "1px solid transparent",
  },
  statusLive: {
    background: "rgba(16, 185, 129, 0.15)",
    color: "#6ee7b7",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  statusSyncing: {
    background: "rgba(245, 158, 11, 0.14)",
    color: "#fcd34d",
    borderColor: "rgba(245, 158, 11, 0.38)",
  },
  statusError: {
    background: "rgba(239, 68, 68, 0.14)",
    color: "#fca5a5",
    borderColor: "rgba(239, 68, 68, 0.36)",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "0.85rem",
  },
  metricTile: {
    display: "grid",
    gap: "0.35rem",
    padding: "0.95rem",
    borderRadius: "14px",
    background: "rgba(30, 41, 59, 0.72)",
    border: "1px solid rgba(71, 85, 105, 0.55)",
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  metricValue: {
    color: "#f8fafc",
    fontSize: "1.5rem",
  },
  metaGrid: {
    display: "grid",
    gap: "0.9rem",
  },
  metaBlock: {
    display: "grid",
    gap: "0.45rem",
  },
  metaLabel: {
    color: "#94a3b8",
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  metaValue: {
    color: "#e2e8f0",
    fontSize: "0.95rem",
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.55rem",
  },
  tag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.35rem 0.65rem",
    borderRadius: "999px",
    background: "rgba(37, 99, 235, 0.16)",
    border: "1px solid rgba(96, 165, 250, 0.28)",
    color: "#bfdbfe",
    fontSize: "0.85rem",
  },
  placeholder: {
    margin: 0,
    color: "#94a3b8",
  },
};
