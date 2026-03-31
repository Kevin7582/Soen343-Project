import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, DirectionsRenderer, MarkerF, PolylineF } from '@react-google-maps/api';
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

function toTravelMode(mode) {
  if (!window.google?.maps?.TravelMode) return null;
  return window.google.maps.TravelMode[mode] || window.google.maps.TravelMode.TRANSIT;
}

function parseDurationAndDistance(directionsResult) {
  const leg = directionsResult?.routes?.[0]?.legs?.[0];
  return {
    distanceText: leg?.distance?.text || '',
    durationText: leg?.duration?.text || '',
  };
}

export default function TransitMap({
  routes = [],
  selectedRouteId,
  onSelectRoute,
  startPoint,
  endPoint,
  onSetStartPoint,
  onSetEndPoint,
  transitFrom,
  transitTo,
  onSetTransitFrom,
  onSetTransitTo,
  travelMode = 'TRANSIT',
  onRouteInfoChange,
}) {
  const [mapRef, setMapRef] = useState(null);
  const [pathPreview, setPathPreview] = useState(null);
  const [pickMode, setPickMode] = useState('start');
  const [directions, setDirections] = useState(null);

  const fromAutocompleteRef = useRef(null);
  const toAutocompleteRef = useRef(null);

  const selectedRoute = useMemo(
    () => routes.find((route) => String(route.id) === String(selectedRouteId)) || null,
    [routes, selectedRouteId]
  );
  const placesReady = Boolean(window.google?.maps?.places);

  useEffect(() => {
    let mounted = true;
    async function computePreview() {
      if (!startPoint || !endPoint) {
        setPathPreview(null);
        setDirections(null);
        onRouteInfoChange?.(null);
        return;
      }

      const routePath = await fetchDirectionsPath(startPoint, endPoint, [travelMode, 'TRANSIT', 'DRIVING']);
      if (!mounted) return;
      setPathPreview(routePath);

      if (!window.google?.maps) return;
      const service = new window.google.maps.DirectionsService();
      const mode = toTravelMode(travelMode);
      const origin = toLatLngLiteral(startPoint);
      const destination = toLatLngLiteral(endPoint);
      if (!mode || !origin || !destination) return;

      service.route({ origin, destination, travelMode: mode }, (result, status) => {
        if (!mounted) return;
        if (status === 'OK' && result) {
          setDirections(result);
          onRouteInfoChange?.(parseDurationAndDistance(result));
        } else {
          setDirections(null);
          onRouteInfoChange?.(null);
        }
      });
    }

    computePreview();
    return () => {
      mounted = false;
    };
  }, [startPoint, endPoint, travelMode, onRouteInfoChange]);

  useEffect(() => {
    if (!mapRef || !window.google?.maps) return;

    const bounds = new window.google.maps.LatLngBounds();

    if (startPoint && endPoint) {
      const from = toLatLngLiteral(startPoint);
      const to = toLatLngLiteral(endPoint);
      if (from && to) {
        bounds.extend(from);
        bounds.extend(to);
        mapRef.fitBounds(bounds, 60);
        return;
      }
    }

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
  }, [mapRef, selectedRoute, startPoint, endPoint]);

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

  const applyPlaceSelection = (autocomplete, type) => {
    const place = autocomplete?.getPlace?.();
    const location = place?.geometry?.location;
    if (!location) return;

    const point = [Number(location.lat().toFixed(6)), Number(location.lng().toFixed(6))];

    if (type === 'from') {
      onSetStartPoint?.(point);
      onSetTransitFrom?.(place.formatted_address || place.name || transitFrom);
    } else {
      onSetEndPoint?.(point);
      onSetTransitTo?.(place.formatted_address || place.name || transitTo);
    }

    if (mapRef) {
      mapRef.panTo({ lat: point[0], lng: point[1] });
      mapRef.setZoom(14);
    }
  };

  const startMarker = toLatLngLiteral(startPoint);
  const endMarker = toLatLngLiteral(endPoint);

  return (
    <div className="transit-map-wrap stack-8">
      <div className="transit-map-toolbar stack-8">
        <p>
          Click map to set: <strong>{pickMode === 'start' ? 'Start point' : 'End point'}</strong>
        </p>

        {placesReady ? (
          <div className="row wrap gap-8">
            <Autocomplete onLoad={(ref) => { fromAutocompleteRef.current = ref; }} onPlaceChanged={() => applyPlaceSelection(fromAutocompleteRef.current, 'from')}>
              <input value={transitFrom} onChange={(e) => onSetTransitFrom?.(e.target.value)} placeholder="Search start location" style={{ minWidth: 250 }} />
            </Autocomplete>
            <Autocomplete onLoad={(ref) => { toAutocompleteRef.current = ref; }} onPlaceChanged={() => applyPlaceSelection(toAutocompleteRef.current, 'to')}>
              <input value={transitTo} onChange={(e) => onSetTransitTo?.(e.target.value)} placeholder="Search destination" style={{ minWidth: 250 }} />
            </Autocomplete>
          </div>
        ) : (
          <div className="stack-8">
            <div className="row wrap gap-8">
              <input value={transitFrom} onChange={(e) => onSetTransitFrom?.(e.target.value)} placeholder="Start location (autocomplete unavailable)" style={{ minWidth: 250 }} />
              <input value={transitTo} onChange={(e) => onSetTransitTo?.(e.target.value)} placeholder="Destination (autocomplete unavailable)" style={{ minWidth: 250 }} />
            </div>
            <p style={{ color: 'var(--warning)', margin: 0 }}>
              Places autocomplete unavailable. Enable Places API for this key/project or check key restrictions.
            </p>
          </div>
        )}

        <div className="row wrap gap-8">
          <button type="button" className={`btn ${pickMode === 'start' ? 'btn-primary-soft' : 'btn-soft'}`} onClick={() => setPickMode('start')}>
            Pick start
          </button>
          <button type="button" className={`btn ${pickMode === 'end' ? 'btn-primary-soft' : 'btn-soft'}`} onClick={() => setPickMode('end')}>
            Pick end
          </button>
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => {
              onSetStartPoint?.(null);
              onSetEndPoint?.(null);
              setDirections(null);
              onRouteInfoChange?.(null);
            }}
          >
            Clear map route
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

        {directions ? (
          <DirectionsRenderer
            directions={directions}
            options={{
              preserveViewport: true,
              suppressMarkers: true,
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
      </MapShell>
    </div>
  );
}
