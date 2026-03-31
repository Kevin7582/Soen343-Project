import React, { Fragment, useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
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

export default function TransitMap({ routes = [], selectedRouteId, onSelectRoute }) {
  const selectedRoute = useMemo(
    () => routes.find((route) => String(route.id) === String(selectedRouteId)) || null,
    [routes, selectedRouteId]
  );

  return (
    <div className="transit-map-wrap">
      <MapContainer center={MONTREAL_CENTER} zoom={12} className="transit-map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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

        <FitToRoute selectedRoute={selectedRoute} />
      </MapContainer>
    </div>
  );
}
