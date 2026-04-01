import React from 'react';

export default function TransitControlsOverlay({
  external = false,
  pickMode,
  onSetPickMode,
  onClear,
  routeInfo,
  travelMode,
  placesReady,
  isRouting,
  routingError,
}) {
  if (external) {
    return (
      <div className="transit-controls-panel">
        <div className="transit-controls-actions">
          <button type="button" className={`transit-action-btn ${pickMode === 'start' ? 'is-active' : ''}`} onClick={() => onSetPickMode('start')}>
            Start pin
          </button>
          <button type="button" className={`transit-action-btn ${pickMode === 'end' ? 'is-active' : ''}`} onClick={() => onSetPickMode('end')}>
            End pin
          </button>
          <button type="button" className="transit-action-btn" onClick={onClear}>
            Clear
          </button>
        </div>

        {routeInfo && !isRouting && (
          <div className="transit-info-inline">
            {routeInfo.distanceText || 'N/A'} in {routeInfo.durationText || 'N/A'} ({travelMode.toLowerCase()})
          </div>
        )}
        {isRouting && <div className="transit-info-inline">Calculating route...</div>}
        {!!routingError && <div className="transit-info-inline is-error">{routingError}</div>}

        {!placesReady && (
          <div className="transit-info-inline is-warning">
            Places autocomplete unavailable. Enable Places API for this project key.
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="transit-overlay transit-overlay-right">
        <button type="button" className={`transit-action-btn ${pickMode === 'start' ? 'is-active' : ''}`} onClick={() => onSetPickMode('start')}>
          Start pin
        </button>
        <button type="button" className={`transit-action-btn ${pickMode === 'end' ? 'is-active' : ''}`} onClick={() => onSetPickMode('end')}>
          End pin
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

      {!placesReady && (
        <div className="transit-overlay transit-overlay-warning">
          Places autocomplete unavailable. Enable Places API for this project key.
        </div>
      )}
    </>
  );
}
