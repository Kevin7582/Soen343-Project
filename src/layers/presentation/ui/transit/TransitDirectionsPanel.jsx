import React, { useMemo } from 'react';

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '');
}

function summarizeRoute(route) {
  const leg = route?.legs?.[0];
  if (!leg) return null;
  return {
    distance: leg.distance?.text || 'N/A',
    duration: leg.duration?.text || 'N/A',
    startAddress: leg.start_address || '',
    endAddress: leg.end_address || '',
    steps: Array.isArray(leg.steps) ? leg.steps : [],
  };
}

export default function TransitDirectionsPanel({
  directions,
  routeIndex = 0,
  onSetRouteIndex,
}) {
  const routes = useMemo(() => directions?.routes || [], [directions]);
  const activeRoute = routes[routeIndex] || null;
  const summary = summarizeRoute(activeRoute);

  if (!directions || routes.length === 0 || !summary) return null;

  return (
    <div className="transit-overlay transit-overlay-left">
      <div className="transit-directions-card">
        <h3>Directions</h3>
        <p>{summary.distance} in {summary.duration}</p>
        <p>{summary.startAddress}</p>
        <p>{summary.endAddress}</p>
      </div>

      <div className="transit-directions-card">
        <h4>Route options</h4>
        <div className="transit-alt-routes">
          {routes.map((route, idx) => {
            const leg = route?.legs?.[0];
            const label = leg ? `${leg.duration?.text || 'N/A'} - ${leg.distance?.text || 'N/A'}` : `Route ${idx + 1}`;
            const selected = idx === routeIndex;
            return (
              <button
                key={`route-${idx}`}
                type="button"
                className={`transit-alt-route-btn ${selected ? 'is-selected' : ''}`}
                onClick={() => onSetRouteIndex?.(idx)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="transit-directions-card">
        <h4>Steps</h4>
        <div className="transit-steps-list">
          {summary.steps.map((step, idx) => (
            <div key={`step-${idx}`} className="transit-step-row">
              <p>{idx + 1}. {stripHtml(step.instructions)}</p>
              <p>{step.distance?.text || ''} {step.duration?.text ? `- ${step.duration.text}` : ''}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
