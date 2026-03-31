import React, { Fragment, useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const MONTREAL_CENTER = [45.5017, -73.5673];

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function FitToRoute({ selectedRoute }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedRoute) {
      map.setView(MONTREAL_CENTER, 12);
      return;
    }

    const path = selectedRoute.path?.filter((point) => Array.isArray(point) && point.length === 2);
    if (path?.length >= 2) {
      map.fitBounds(path, { padding: [40, 40] });
      return;
    }

    const from = selectedRoute.fromCoords;
    const to = selectedRoute.toCoords;

    if (from && to) {
      map.fitBounds([from, to], { padding: [40, 40] });
      return;
    }

    if (from) {
      map.setView(from, 13);
      return;
    }

    map.setView(MONTREAL_CENTER, 12);
  }, [map, selectedRoute]);

  return null;
}

function routeColor(isSelected) {
  return isSelected ? '#38bdf8' : '#64748b';
}

function MapClickCapture({ onPickPoint }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng || {};
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      onPickPoint?.([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
    },
  });

  return null;
}

async function fetchRoutePath(startPoint, endPoint) {
  const [startLat, startLng] = startPoint;
  const [endLat, endLng] = endPoint;
  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const payload = await response.json();
  const coordinates = payload?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coordinates)) return null;
  const points = coordinates
    .map((pair) => (Array.isArray(pair) && pair.length >= 2 ? [pair[1], pair[0]] : null))
    .filter(Boolean);
  return points.length >= 2 ? points : null;
}

export default function TransitMap({
  routes = [],
  selectedRouteId,
  onSelectRoute,
  startPoint,
  endPoint,
  onSetStartPoint,
  onSetEndPoint,
}) {
  const selectedRoute = useMemo(
    () => routes.find((route) => String(route.id) === String(selectedRouteId)) || null,
    [routes, selectedRouteId]
  );
  const [pathPreview, setPathPreview] = React.useState(null);
  const [pickMode, setPickMode] = React.useState('start');

  useEffect(() => {
    let mounted = true;
    async function computePreview() {
      if (!startPoint || !endPoint) {
        setPathPreview(null);
        return;
      }
      const path = await fetchRoutePath(startPoint, endPoint).catch(() => null);
      if (!mounted) return;
      setPathPreview(path);
    }
    computePreview();
    return () => {
      mounted = false;
    };
  }, [startPoint, endPoint]);

  const handlePickPoint = (point) => {
    if (pickMode === 'start') {
      onSetStartPoint?.(point);
      setPickMode('end');
      return;
    }
    onSetEndPoint?.(point);
    setPickMode('start');
  };

  return (
    <div className="transit-map-wrap stack-8">
      <div className="transit-map-toolbar">
        <p>
          Click map to set: <strong>{pickMode === 'start' ? 'Start point' : 'End point'}</strong>
        </p>
        <div className="row wrap gap-8">
          <button type="button" className={`btn ${pickMode === 'start' ? 'btn-primary-soft' : 'btn-soft'}`} onClick={() => setPickMode('start')}>
            Pick start
          </button>
          <button type="button" className={`btn ${pickMode === 'end' ? 'btn-primary-soft' : 'btn-soft'}`} onClick={() => setPickMode('end')}>
            Pick end
          </button>
        </div>
      </div>
      <MapContainer center={MONTREAL_CENTER} zoom={12} className="transit-map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickCapture onPickPoint={handlePickPoint} />

        {routes.map((route) => {
          const isSelected = String(route.id) === String(selectedRouteId);
          const hasPath = Array.isArray(route.path) && route.path.length >= 2;
          const hasEndpoints = Array.isArray(route.fromCoords) && Array.isArray(route.toCoords);

          if (!hasPath && !hasEndpoints) return null;

          return (
            <Fragment key={route.id}>
              {hasPath ? (
                <Polyline
                  positions={route.path}
                  pathOptions={{ color: routeColor(isSelected), weight: isSelected ? 5 : 3, opacity: isSelected ? 0.95 : 0.6 }}
                  eventHandlers={{ click: () => onSelectRoute?.(route.id) }}
                />
              ) : (
                <Polyline
                  positions={[route.fromCoords, route.toCoords]}
                  pathOptions={{ color: routeColor(isSelected), weight: isSelected ? 5 : 3, opacity: isSelected ? 0.95 : 0.6 }}
                  eventHandlers={{ click: () => onSelectRoute?.(route.id) }}
                />
              )}

              {hasEndpoints && (
                <>
                  <Marker position={route.fromCoords} eventHandlers={{ click: () => onSelectRoute?.(route.id) }}>
                    <Popup>{route.line}: {route.from}</Popup>
                  </Marker>
                  <Marker position={route.toCoords} eventHandlers={{ click: () => onSelectRoute?.(route.id) }}>
                    <Popup>{route.line}: {route.to}</Popup>
                  </Marker>
                </>
              )}
            </Fragment>
          );
        })}

        {startPoint && (
          <Marker
            position={startPoint}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const marker = event?.target;
                const latLng = marker?.getLatLng?.();
                if (!latLng) return;
                onSetStartPoint?.([Number(latLng.lat.toFixed(6)), Number(latLng.lng.toFixed(6))]);
              },
            }}
          >
            <Popup>Trip start</Popup>
          </Marker>
        )}
        {endPoint && (
          <Marker
            position={endPoint}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const marker = event?.target;
                const latLng = marker?.getLatLng?.();
                if (!latLng) return;
                onSetEndPoint?.([Number(latLng.lat.toFixed(6)), Number(latLng.lng.toFixed(6))]);
              },
            }}
          >
            <Popup>Trip end</Popup>
          </Marker>
        )}
        {startPoint && endPoint && (
          <Polyline
            positions={pathPreview || [startPoint, endPoint]}
            pathOptions={{
              color: '#22c55e',
              weight: 5,
              opacity: 0.9,
              dashArray: pathPreview ? null : '8 8',
            }}
          />
        )}

        <FitToRoute selectedRoute={selectedRoute} />
      </MapContainer>
    </div>
  );
}
