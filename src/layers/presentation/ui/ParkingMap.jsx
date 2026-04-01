// presentation/ui/ParkingMap.jsx
// Displays parking spots as markers on Google Maps.
// Uses MapShell (shared map foundation) as the base.

import React, { useState } from 'react';
import { MarkerF, InfoWindowF } from '@react-google-maps/api';
import MapShell from './maps/MapShell';

const MONTREAL_CENTER = { lat: 45.5017, lng: -73.5673 };

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '420px',
};

// Hardcoded coordinates for known parking locations
const PARKING_COORDS = {
  'old port lot d':   { lat: 45.5075, lng: -73.5538 },
  'campus garage b':  { lat: 45.4972, lng: -73.5788 },
  'metro lot c':      { lat: 45.5131, lng: -73.5670 },
  'downtown lot a':   { lat: 45.5048, lng: -73.5732 },
};

function getCoords(address) {
  if (!address) return null;
  const key = address.toLowerCase().trim();
  return PARKING_COORDS[key] || null;
}

export default function ParkingMap({ spots = [], onReserve, parkingReservation }) {
  const [selectedSpot, setSelectedSpot] = useState(null);

  const spotsWithCoords = spots
    .map((s) => ({ ...s, coords: getCoords(s.address) }))
    .filter((s) => s.coords !== null);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <MapShell
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={MONTREAL_CENTER}
        zoom={13}
      >
        {spotsWithCoords.map((spot) => (
          <MarkerF
            key={spot.id}
            position={spot.coords}
            onClick={() => setSelectedSpot(spot)}
            title={spot.address}
            label={{
              text: spot.available > 0 ? '🅿️' : '🚫',
              fontSize: '20px',
            }}
          />
        ))}

        {selectedSpot && selectedSpot.coords && (
          <InfoWindowF
            position={selectedSpot.coords}
            onCloseClick={() => setSelectedSpot(null)}
          >
            <div style={{ padding: '0.5rem', minWidth: '180px', color: '#111' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>
                🅿️ {selectedSpot.address}
              </h3>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}>
                Available: {selectedSpot.available}/{selectedSpot.total} spots
              </p>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>
                Price: ${selectedSpot.pricePerHour ?? 2.5}/h
              </p>

              {selectedSpot.available > 0 && !parkingReservation ? (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    onReserve?.(selectedSpot);
                    setSelectedSpot(null);
                  }}
                >
                  Reserve spot
                </button>
              ) : (
                <p style={{ color: selectedSpot.available > 0 ? '#f59e0b' : '#ef4444', margin: 0, fontSize: '0.875rem' }}>
                  {selectedSpot.available <= 0 ? '❌ No spots available' : '⚠️ You already have a reservation'}
                </p>
              )}
            </div>
          </InfoWindowF>
        )}
      </MapShell>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
        🅿️ Green = available spots. Click a marker to reserve.
      </p>
    </div>
  );
}
