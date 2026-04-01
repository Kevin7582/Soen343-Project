import React from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

const DEFAULT_MAP_OPTIONS = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};
const DEFAULT_LIBRARIES = ['places'];

export default function MapShell({
  center,
  zoom = 12,
  onLoad,
  onUnmount,
  onClick,
  children,
  mapContainerStyle,
  options,
  libraries = DEFAULT_LIBRARIES,
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'summs-google-map-script',
    googleMapsApiKey: apiKey,
    libraries: libraries?.length ? libraries : DEFAULT_LIBRARIES,
  });

  if (!apiKey) {
    return (
      <div className="panel auth-error">
        Missing Google Maps key. Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in your <code>.env</code> file.
      </div>
    );
  }

  if (loadError) {
    return <div className="panel auth-error">Failed to load Google Maps script.</div>;
  }

  if (!isLoaded) {
    return <div className="panel">Loading Google Maps...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={onClick}
      options={{ ...DEFAULT_MAP_OPTIONS, ...(options || {}) }}
    >
      {children}
    </GoogleMap>
  );
}
