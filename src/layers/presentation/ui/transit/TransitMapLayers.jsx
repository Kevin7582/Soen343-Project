import React from 'react';
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
}) {
  const startMarker = toLatLngLiteral(startPoint);
  const endMarker = toLatLngLiteral(endPoint);

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

      {directions ? (
        <DirectionsRenderer
          directions={directions}
          options={{
            preserveViewport: true,
            suppressMarkers: true,
            routeIndex: directionsRouteIndex,
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
