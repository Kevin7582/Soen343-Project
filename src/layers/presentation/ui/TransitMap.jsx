import React, { useEffect, useMemo, useState } from 'react';
import { MarkerF, PolylineF } from '@react-google-maps/api';
import { fetchDirectionsPath } from '../../service-layer/maps/mapRoutingService';
import MapShell from './maps/MapShell';
import { toLatLngLiteral, toPath, toPointArray } from './maps/mapUtils';

const MONTREAL_CENTER = { lat: 45.5017, lng: -73.5673 };
const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '420px',
};

function routeColor(isSelected) {
  return isSelected ? '#38bdf8' : '#64748b';
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
  const [mapRef, setMapRef] = useState(null);
  const [pathPreview, setPathPreview] = useState(null);
  const [pickMode, setPickMode] = useState('start');

  const selectedRoute = useMemo(
    () => routes.find((route) => String(route.id) === String(selectedRouteId)) || null,
    [routes, selectedRouteId]
  );

  useEffect(() => {
    let mounted = true;
    async function computePreview() {
      if (!startPoint || !endPoint) {
        setPathPreview(null);
        return;
      }
      const path = await fetchDirectionsPath(startPoint, endPoint, ['TRANSIT', 'DRIVING']);
      if (!mounted) return;
      setPathPreview(path);
    }
    computePreview();
    return () => {
      mounted = false;
    };
  }, [startPoint, endPoint]);

  useEffect(() => {
    if (!mapRef || !window.google?.maps) return;

    const bounds = new window.google.maps.LatLngBounds();

    if (selectedRoute) {
      const routePath = toPath(selectedRoute.path);
      const from = toLatLngLiteral(selectedRoute.fromCoords);
      const to = toLatLngLiteral(selectedRoute.toCoords);

      if (routePath) {
        routePath.forEach((point) => bounds.extend(point));
        mapRef.fitBounds(bounds, 60);
        return;
      }

      if (from && to) {
        bounds.extend(from);
        bounds.extend(to);
        mapRef.fitBounds(bounds, 60);
        return;
      }

      if (from) {
        mapRef.panTo(from);
        mapRef.setZoom(13);
        return;
      }
    }

    mapRef.panTo(MONTREAL_CENTER);
    mapRef.setZoom(12);
  }, [mapRef, selectedRoute]);

  const onMapClick = (event) => {
    const point = toPointArray(event?.latLng);
    if (!point) return;

    if (pickMode === 'start') {
      onSetStartPoint?.(point);
      setPickMode('end');
      return;
    }

    onSetEndPoint?.(point);
    setPickMode('start');
  };

  const startMarker = toLatLngLiteral(startPoint);
  const endMarker = toLatLngLiteral(endPoint);

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

      <MapShell
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={MONTREAL_CENTER}
        zoom={12}
        onLoad={setMapRef}
        onUnmount={() => setMapRef(null)}
        onClick={onMapClick}
      >
        {routes.map((route) => {
          const isSelected = String(route.id) === String(selectedRouteId);
          const path = toPath(route.path);
          const from = toLatLngLiteral(route.fromCoords);
          const to = toLatLngLiteral(route.toCoords);

          if (!path && !from && !to) return null;

          return (
            <React.Fragment key={route.id}>
              {path ? (
                <PolylineF
                  path={path}
                  options={{
                    strokeColor: routeColor(isSelected),
                    strokeOpacity: isSelected ? 0.95 : 0.6,
                    strokeWeight: isSelected ? 5 : 3,
                  }}
                  onClick={() => onSelectRoute?.(route.id)}
                />
              ) : (
                from &&
                to && (
                  <PolylineF
                    path={[from, to]}
                    options={{
                      strokeColor: routeColor(isSelected),
                      strokeOpacity: isSelected ? 0.95 : 0.6,
                      strokeWeight: isSelected ? 5 : 3,
                    }}
                    onClick={() => onSelectRoute?.(route.id)}
                  />
                )
              )}

              {from && (
                <MarkerF
                  position={from}
                  onClick={() => onSelectRoute?.(route.id)}
                  title={`${route.line}: ${route.from}`}
                />
              )}
              {to && (
                <MarkerF
                  position={to}
                  onClick={() => onSelectRoute?.(route.id)}
                  title={`${route.line}: ${route.to}`}
                />
              )}
            </React.Fragment>
          );
        })}

        {startMarker && (
          <MarkerF
            position={startMarker}
            draggable
            label="S"
            onDragEnd={(event) => {
              const point = toPointArray(event?.latLng);
              if (point) onSetStartPoint?.(point);
            }}
            title="Trip start"
          />
        )}
        {endMarker && (
          <MarkerF
            position={endMarker}
            draggable
            label="E"
            onDragEnd={(event) => {
              const point = toPointArray(event?.latLng);
              if (point) onSetEndPoint?.(point);
            }}
            title="Trip end"
          />
        )}

        {startMarker && endMarker && (
          <PolylineF
            path={pathPreview || [startMarker, endMarker]}
            options={{
              strokeColor: '#22c55e',
              strokeOpacity: 0.9,
              strokeWeight: 5,
              icons: pathPreview
                ? []
                : [
                    {
                      icon: {
                        path: 'M 0,-1 0,1',
                        strokeOpacity: 1,
                        scale: 4,
                      },
                      offset: '0',
                      repeat: '16px',
                    },
                  ],
            }}
          />
        )}
      </MapShell>
    </div>
  );
}
