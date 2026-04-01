import React, { useRef } from 'react';
import { DirectionsRenderer, MarkerF, PolylineF } from '@react-google-maps/api';
import { toLatLngLiteral, toPath, toPointArray } from '../maps/mapUtils';
import { routeColor } from './transitHelpers';

export default function TransitMapLayers({
  routes = [],
  selectedRouteId,
  onSelectRoute,
  startPoint,
  endPoint,
  onSetStartPoint,
  onSetEndPoint,
  directions,
  directionsRouteIndex = 0,
  pathPreview,
  onDirectionsChanged,
  waypoints = [],
  poiResults = [],
  highlightedStepPath = [],
}) {
  const directionsRendererRef = useRef(null);
  const startMarker = toLatLngLiteral(startPoint);
  const endMarker = toLatLngLiteral(endPoint);
  const stepPath = Array.isArray(highlightedStepPath)
    ? highlightedStepPath
      .map((point) => {
        if (typeof point?.lat === 'function') {
          return { lat: point.lat(), lng: point.lng() };
        }
        if (Number.isFinite(point?.lat) && Number.isFinite(point?.lng)) {
          return { lat: Number(point.lat), lng: Number(point.lng) };
        }
        return toLatLngLiteral(point);
      })
      .filter(Boolean)
    : [];

  return (
    <>
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

      {waypoints
        .map((waypoint) => ({ ...waypoint, position: toLatLngLiteral(waypoint?.point) }))
        .filter((waypoint) => waypoint.position)
        .map((waypoint, index) => (
          <MarkerF
            key={`waypoint-${index}`}
            position={waypoint.position}
            label={`${index + 1}`}
            title={waypoint.label || `Waypoint ${index + 1}`}
          />
        ))}

      {poiResults
        .filter((poi) => poi?.position)
        .map((poi) => (
          <MarkerF
            key={`poi-${poi.id}`}
            position={poi.position}
            title={poi.name || 'Point of interest'}
          />
        ))}

      {stepPath.length > 1 && (
        <PolylineF
          path={stepPath}
          options={{
            strokeColor: '#f59e0b',
            strokeOpacity: 0.95,
            strokeWeight: 7,
            zIndex: 90,
          }}
        />
      )}

      {directions ? (
        <DirectionsRenderer
          onLoad={(renderer) => {
            directionsRendererRef.current = renderer;
          }}
          onUnmount={() => {
            directionsRendererRef.current = null;
          }}
          onDirectionsChanged={() => {
            const result = directionsRendererRef.current?.getDirections?.();
            if (result) onDirectionsChanged?.(result);
          }}
          directions={directions}
          options={{
            preserveViewport: true,
            suppressMarkers: true,
            routeIndex: directionsRouteIndex,
            draggable: true,
            polylineOptions: {
              strokeColor: '#22c55e',
              strokeOpacity: 0.95,
              strokeWeight: 5,
            },
          }}
        />
      ) : (
        startMarker &&
        endMarker && (
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
        )
      )}
    </>
  );
}
