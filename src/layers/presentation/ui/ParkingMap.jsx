// presentation/ui/ParkingMap.jsx
// Displays parking spots as markers on Google Maps.
// Uses Google Geocoding API to convert address text to coordinates.

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

export default function ParkingMap({ spots = [], onReserve, parkingReservation }) {
  const [spotsWithCoords, setSpotsWithCoords] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadCoords() {
      setLoading(true);
      const results = await Promise.all(
        spots.map(async (s) => {
          const coords = await geocodeAddress(s.address);
          return coords ? { ...s, coords } : null;
        })
      );
      if (mounted) {
        setSpotsWithCoords(results.filter(Boolean));
        setLoading(false);
      }
    }
    if (spots.length > 0) {
      loadCoords();
    } else {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [spots]);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {loading && <div className="panel" style={{ color: 'var(--text-muted)' }}>Loading parking locations...</div>}

      <MapShell mapContainerStyle={MAP_CONTAINER_STYLE} center={MONTREAL_CENTER} zoom={13}>
        {spotsWithCoords.map((spot) => (
          <MarkerF
            key={spot.id}
            position={spot.coords}
            onClick={() => setSelectedSpot(spot)}
            title={spot.address}
            label={{ text: spot.available > 0 ? '🅿️' : '🚫', fontSize: '20px' }}
          />
        ))}

        {selectedSpot?.coords && (
          <InfoWindowF position={selectedSpot.coords} onCloseClick={() => setSelectedSpot(null)}>
            <div style={{ padding: '0.5rem', minWidth: '180px', color: '#111' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>🅿️ {selectedSpot.address}</h3>
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
                  onClick={() => { onReserve?.(selectedSpot); setSelectedSpot(null); }}
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
        🅿️ Click a parking marker to reserve a spot.
      </p>
    </div>
  );
}
