// presentation/ui/VehicleMap.jsx
// Displays available vehicles as markers on Google Maps.
// Uses Google Geocoding API to convert location text to coordinates.

import React, { useState, useEffect } from 'react';
import { MarkerF, InfoWindowF } from '@react-google-maps/api';
import MapShell from './maps/MapShell';

const MONTREAL_CENTER = { lat: 45.5017, lng: -73.5673 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '420px' };
const geocodeCache = {};

async function geocodeAddress(address) {
  if (!address) return null;
  const key = address.toLowerCase().trim();
  if (geocodeCache[key]) return geocodeCache[key];

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const query = `${address}, Montreal, Quebec, Canada`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      const coords = { lat, lng };
      geocodeCache[key] = coords;
      return coords;
    }
  } catch (err) {
    console.warn('Geocoding failed for:', address, err);
  }
  return null;
}

export default function VehicleMap({ vehicles = [], onReserve, reservation, activeRental }) {
  const [vehiclesWithCoords, setVehiclesWithCoords] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [returnPoint, setReturnPoint] = useState(null);
  const [pickingReturn, setPickingReturn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadCoords() {
      setLoading(true);
      const results = await Promise.all(
        vehicles.map(async (v) => {
          const coords = await geocodeAddress(v.location);
          return coords ? { ...v, coords } : null;
        })
      );
      if (mounted) {
        setVehiclesWithCoords(results.filter(Boolean));
        setLoading(false);
      }
    }
    if (vehicles.length > 0) {
      loadCoords();
    } else {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [vehicles]);

  const handleMapClick = (event) => {
    if (!pickingReturn) return;
    setReturnPoint({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    setPickingReturn(false);
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {loading && <div className="panel" style={{ color: 'var(--text-muted)' }}>Loading vehicle locations...</div>}

      {pickingReturn && (
        <div className="panel" style={{ borderColor: 'var(--primary)', background: 'rgba(56,189,248,0.08)' }}>
          <p style={{ color: 'var(--primary)', fontWeight: 600, margin: 0 }}>📍 Click on the map to set your return location</p>
        </div>
      )}

      {returnPoint && (
        <div className="panel" style={{ borderColor: 'var(--success)', background: 'rgba(52,211,153,0.08)' }}>
          <p style={{ color: 'var(--success)', fontWeight: 600, margin: 0 }}>
            ✅ Return point set: ({returnPoint.lat.toFixed(4)}, {returnPoint.lng.toFixed(4)})
          </p>
          <button className="btn btn-soft" style={{ marginTop: 8, width: 'fit-content' }} onClick={() => setReturnPoint(null)}>
            Clear return point
          </button>
        </div>
      )}

      <MapShell mapContainerStyle={MAP_CONTAINER_STYLE} center={MONTREAL_CENTER} zoom={13} onClick={handleMapClick}>
        {vehiclesWithCoords.map((vehicle) => (
          <MarkerF
            key={vehicle.id}
            position={vehicle.coords}
            onClick={() => setSelectedVehicle(vehicle)}
            title={`${vehicle.type} - ${vehicle.location}`}
            label={{ text: vehicle.type === 'bike' ? '🚲' : '🛴', fontSize: '20px' }}
          />
        ))}

        {returnPoint && (
          <MarkerF position={returnPoint} label={{ text: '🏁', fontSize: '20px' }} title="Return location" />
        )}

        {selectedVehicle?.coords && (
          <InfoWindowF position={selectedVehicle.coords} onCloseClick={() => setSelectedVehicle(null)}>
            <div style={{ padding: '0.5rem', minWidth: '180px', color: '#111' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>
                {selectedVehicle.type === 'bike' ? '🚲' : '🛴'} {selectedVehicle.type} #{selectedVehicle.id}
              </h3>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}>📍 {selectedVehicle.location}</p>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>
                Status: {selectedVehicle.available ? '✅ Available' : '❌ Unavailable'}
              </p>
              {selectedVehicle.available && !reservation && !activeRental && (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                  onClick={() => { onReserve?.(selectedVehicle); setSelectedVehicle(null); }}
                >
                  Reserve
                </button>
              )}
              <button
                className="btn btn-soft"
                style={{ width: '100%' }}
                onClick={() => { setPickingReturn(true); setSelectedVehicle(null); }}
              >
                Set return point
              </button>
            </div>
          </InfoWindowF>
        )}
      </MapShell>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
        🚲🛴 Click a vehicle marker to reserve. Click "Set return point" then click the map to set where you'll return it.
      </p>
    </div>
  );
}
