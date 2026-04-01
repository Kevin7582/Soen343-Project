import React from 'react';

export default function TransitControlsOverlay({
  pickMode,
  onSetPickMode,
  selectedRoute,
  onUseSelectedRouteEndpoints,
  onPlanSelectedRoute,
  hasMapRoute,
  onPlanTransitFromMap,
  onClear,
  routeInfo,
  travelMode,
  routes = [],
  selectedRouteId,
  onSelectRoute,
  placesReady,
  isRouting,
  routingError,
}) {
  return (
    <>
      <div className="transit-overlay transit-overlay-right">
        <button type="button" className={`transit-action-btn ${pickMode === 'start' ? 'is-active' : ''}`} onClick={() => onSetPickMode('start')}>
          Start pin
        </button>
        <button type="button" className={`transit-action-btn ${pickMode === 'end' ? 'is-active' : ''}`} onClick={() => onSetPickMode('end')}>
          End pin
        </button>
        <button type="button" className="transit-action-btn" disabled={!selectedRoute} onClick={onUseSelectedRouteEndpoints}>
          Route endpoints
        </button>
        <button type="button" className="transit-action-btn is-primary" disabled={!selectedRoute} onClick={onPlanSelectedRoute}>
          Save selected route
        </button>
        <button type="button" className="transit-action-btn is-primary" disabled={!hasMapRoute} onClick={onPlanTransitFromMap}>
          Save map route
        </button>
        <button type="button" className="transit-action-btn" onClick={onClear}>
          Clear
        </button>
      </div>

      {routeInfo && !isRouting && (
        <div className="transit-overlay transit-overlay-info">
          <p>{routeInfo.distanceText || 'N/A'} in {routeInfo.durationText || 'N/A'} ({travelMode.toLowerCase()})</p>
        </div>
      )}

      {isRouting && (
        <div className="transit-overlay transit-overlay-status">
          Calculating route...
        </div>
      )}

      {!!routingError && (
        <div className="transit-overlay transit-overlay-status is-error">
          {routingError}
        </div>
      )}

      <div className="transit-overlay transit-overlay-bottom">
        {routes.map((route) => {
          const selected = String(route.id) === String(selectedRouteId);
          return (
            <button
              key={route.id}
              type="button"
              className={`transit-route-chip ${selected ? 'is-selected' : ''}`}
              onClick={() => onSelectRoute?.(route.id)}
            >
              {route.line} {route.delay > 0 ? `| +${route.delay}m` : ''}
            </button>
          );
        })}
      </div>

      {!placesReady && (
        <div className="transit-overlay transit-overlay-warning">
          Places autocomplete unavailable. Enable Places API for this project key.
        </div>
      )}
    </>
  );
}
