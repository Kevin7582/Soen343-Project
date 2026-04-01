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
    steps: Array.isArray(leg.steps) ? leg.steps : [],
  };
}

export default function TransitDirectionsPanel({
  external = false,
  directions,
  routeIndex = 0,
  onSetRouteIndex,
  selectedStepIndex = -1,
  onSelectStep,
  isCollapsed = false,
  onToggleCollapsed,
}) {
  const routes = useMemo(() => directions?.routes || [], [directions]);
  const activeRoute = routes[routeIndex] || null;
  const summary = summarizeRoute(activeRoute);

  const toggle = (
    <button type="button" className="transit-drawer-toggle" onClick={onToggleCollapsed}>
      {isCollapsed ? 'Show directions' : 'Hide directions'}
    </button>
  );

  return (
    <div className={external ? `transit-directions-panel ${isCollapsed ? 'is-collapsed' : ''}` : `transit-overlay transit-overlay-left ${isCollapsed ? 'is-collapsed' : ''}`}>
      {toggle}
      {!isCollapsed && summary && (
        <>
          <div className="transit-directions-card">
            <h3>Directions</h3>
            <p>{summary.distance} in {summary.duration}</p>
          </div>

          {routes.length > 1 && (
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
          )}

          <div className="transit-directions-card">
            <h4>Steps</h4>
            <div className="transit-steps-list">
              {summary.steps.map((step, idx) => (
                <button
                  type="button"
                  key={`step-${idx}`}
                  className={`transit-step-row ${selectedStepIndex === idx ? 'is-selected' : ''}`}
                  onClick={() => onSelectStep?.(idx, step)}
                >
                  <p>{idx + 1}. {stripHtml(step.instructions)}</p>
                  <p>{step.distance?.text || ''} {step.duration?.text ? `- ${step.duration.text}` : ''}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
