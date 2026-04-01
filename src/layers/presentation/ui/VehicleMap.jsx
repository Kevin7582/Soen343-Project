// presentation/ui/VehicleMap.jsx
// Displays available vehicles as markers on Google Maps.
// Uses MapShell (shared map foundation) as the base.

import React, { useState } from 'react';
import { MarkerF, InfoWindowF } from '@react-google-maps/api';
import MapShell from './maps/MapShell';

const MONTREAL_CENTER = { lat: 45.5017, lng: -73.5673 };

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '420px',
};

// Hardcoded coordinates for known locations in the database
const LOCATION_COORDS = {
  'montreal downtown': { lat: 45.5048, lng: -73.5732 },
  'downtown':          { lat: 45.5048, lng: -73.5732 },
  'concordia sgw':     { lat: 45.4972, lng: -73.5788 },
  'concordia loyola':  { lat: 45.4582, lng: -73.6384 },
  'old port':          { lat: 45.5075, lng: -73.5538 },
  'old port montreal': { lat: 45.5075, lng: -73.5538 },
  'metro a':           { lat: 45.5131, lng: -73.5670 },
  'atwater station':   { lat: 45.4736, lng: -73.5874 },
  'campus':            { lat: 45.4972, lng: -73.5788 },
  'montreal':          { lat: 45.5017, lng: -73.5673 },
};

function getCoords(location) {
  if (!location) return null;
  const key = location.toLowerCase().trim();
  return LOCATION_COORDS[key] || null;
}

function vehicleIcon(type, available) {
  const color = available ? '2ecc71' : 'e74c3c';
  const label = type === 'bike' ? '🚲' : '🛴';
  return label;
}

export default function VehicleMap({ vehicles = [], onReserve, reservation, activeRental }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [returnPoint, setReturnPoint] = useState(null);
  const [pickingReturn, setPickingReturn] = useState(false);

  const vehiclesWithCoords = vehicles
    .map((v) => ({ ...v, coords: getCoords(v.location) }))
    .filter((v) => v.coords !== null);

  const handleMapClick = (event) => {
    if (!pickingReturn) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    setReturnPoint({ lat, lng });
    setPickingReturn(false);
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {pickingReturn && (
        <div className="panel" style={{ borderColor: 'var(--primary)', background: 'rgba(56,189,248,0.08)' }}>
          <p style={{ color: 'var(--primary)', fontWeight: 600, margin: 0 }}>
            📍 Click on the map to set your return location
          </p>
        </div>
      )}

      {returnPoint && (
        <div className="panel" style={{ borderColor: 'var(--success)', background: 'rgba(52,211,153,0.08)' }}>
          <p style={{ color: 'var(--success)', fontWeight: 600, margin: 0 }}>
            ✅ Return point set: ({returnPoint.lat.toFixed(4)}, {returnPoint.lng.toFixed(4)})
          </p>
          <button
            className="btn btn-soft"
            style={{ marginTop: 8, width: 'fit-content' }}
            onClick={() => setReturnPoint(null)}
          >
            Clear return point
          </button>
        </div>
      )}

      <MapShell
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={MONTREAL_CENTER}
        zoom={13}
        onClick={handleMapClick}
      >
        {/* Vehicle markers */}
        {vehiclesWithCoords.map((vehicle) => (
          <MarkerF
            key={vehicle.id}
            position={vehicle.coords}
            onClick={() => setSelectedVehicle(vehicle)}
            title={`${vehicle.type} - ${vehicle.location}`}
            label={{
              text: vehicle.type === 'bike' ? '🚲' : '🛴',
              fontSize: '20px',
            }}
          />
        ))}

        {/* Return point marker */}
        {returnPoint && (
          <MarkerF
            position={returnPoint}
            label={{ text: '🏁', fontSize: '20px' }}
            title="Return location"
          />
        )}

        {/* Info window for selected vehicle */}
        {selectedVehicle && selectedVehicle.coords && (
          <InfoWindowF
            position={selectedVehicle.coords}
            onCloseClick={() => setSelectedVehicle(null)}
          >
            <div style={{ padding: '0.5rem', minWidth: '180px', color: '#111' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>
                {selectedVehicle.type === 'bike' ? '🚲' : '🛴'} {selectedVehicle.type} #{selectedVehicle.id}
              </h3>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}>
                📍 {selectedVehicle.location}
              </p>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>
                Status: {selectedVehicle.available ? '✅ Available' : '❌ Unavailable'}
              </p>

              {selectedVehicle.available && !reservation && !activeRental && (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                  onClick={() => {
                    onReserve?.(selectedVehicle);
                    setSelectedVehicle(null);
                  }}
                >
                  Reserve
                </button>
              )}

              <button
                className="btn btn-soft"
                style={{ width: '100%' }}
                onClick={() => {
                  setPickingReturn(true);
                  setSelectedVehicle(null);
                }}
              >
                Set return point
              </button>
            </div>
          </InfoWindowF>
        )}
      </MapShell>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
        🟢 Click a vehicle marker to reserve. Click "Set return point" then click the map to set where you'll return it.
      </p>
    </div>
  );
}
