import React, { useEffect, useMemo, useState } from 'react';
import MapShell from './maps/MapShell';
import { toLatLngLiteral, toPath, toPointArray } from './maps/mapUtils';
import TransitSearchOverlay from './transit/TransitSearchOverlay';
import TransitControlsOverlay from './transit/TransitControlsOverlay';
import TransitMapLayers from './transit/TransitMapLayers';
import TransitDirectionsPanel from './transit/TransitDirectionsPanel';
import useTransitRouting from './transit/useTransitRouting';
import { MAP_CONTAINER_STYLE, MONTREAL_CENTER } from './transit/transitConstants';

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
  onSetTravelMode,
  routeInfo,
  onUseSelectedRouteEndpoints,
  onPlanSelectedRoute,
  onPlanTransitFromMap,
  onRouteInfoChange,
}) {
  const [mapRef, setMapRef] = useState(null);
  const [pickMode, setPickMode] = useState('start');
  const [plannerMode, setPlannerMode] = useState('depart_now');
  const [plannedDateTime, setPlannedDateTime] = useState('');
  const [directionsRouteIndex, setDirectionsRouteIndex] = useState(0);
  const [selectedStepIndex, setSelectedStepIndex] = useState(-1);
  const [highlightedStepPath, setHighlightedStepPath] = useState([]);
  const [directionsCollapsed, setDirectionsCollapsed] = useState(false);
  const [showTrafficLayer, setShowTrafficLayer] = useState(false);
  const [showTransitLayer, setShowTransitLayer] = useState(false);

  const selectedRoute = useMemo(
    () => routes.find((route) => String(route.id) === String(selectedRouteId)) || null,
    [routes, selectedRouteId]
  );
  const placesReady = Boolean(window.google?.maps?.places);
  const emptyWaypoints = useMemo(() => [], []);
  const emptyRoutePreferences = useMemo(() => ({}), []);

  const {
    pathPreview,
    directions,
    isRouting,
    routingError,
    rerouteFromDraggedPath,
  } = useTransitRouting({
    startPoint,
    endPoint,
    waypoints: emptyWaypoints,
    travelMode,
    plannerMode,
    plannedDateTime,
    routePreferences: emptyRoutePreferences,
    onRouteInfoChange,
  });

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

  useEffect(() => {
    setDirectionsRouteIndex(0);
    setSelectedStepIndex(-1);
    setHighlightedStepPath([]);
  }, [directions]);

  useEffect(() => {
    if (!mapRef || !window.google?.maps) return undefined;

    const trafficLayer = new window.google.maps.TrafficLayer();
    const transitLayer = new window.google.maps.TransitLayer();

    trafficLayer.setMap(showTrafficLayer ? mapRef : null);
    transitLayer.setMap(showTransitLayer ? mapRef : null);

    return () => {
      trafficLayer.setMap(null);
      transitLayer.setMap(null);
    };
  }, [mapRef, showTrafficLayer, showTransitLayer]);

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

  const handlePlacePicked = (type, point, label) => {
    if (!point) return;
    if (type === 'from') {
      onSetStartPoint?.(point);
      onSetTransitFrom?.(label || transitFrom);
    } else {
      onSetEndPoint?.(point);
      onSetTransitTo?.(label || transitTo);
    }

    if (mapRef) {
      mapRef.panTo({ lat: point[0], lng: point[1] });
      mapRef.setZoom(14);
    }
  };

  const clearRouteSelection = () => {
    onSetStartPoint?.(null);
    onSetEndPoint?.(null);
    onRouteInfoChange?.(null);
    setHighlightedStepPath([]);
    setSelectedStepIndex(-1);
  };

  const swapLocations = () => {
    const prevFrom = transitFrom;
    const prevTo = transitTo;
    const prevStart = startPoint;
    const prevEnd = endPoint;
    onSetTransitFrom?.(prevTo);
    onSetTransitTo?.(prevFrom);
    onSetStartPoint?.(prevEnd);
    onSetEndPoint?.(prevStart);
  };

  const handleSelectStep = (index, step) => {
    setSelectedStepIndex(index);
    setHighlightedStepPath(step?.path || []);
  };

  return (
    <div className="transit-root">
      <TransitSearchOverlay
        external
        placesReady={placesReady}
        transitFrom={transitFrom}
        transitTo={transitTo}
        onSetTransitFrom={onSetTransitFrom}
        onSetTransitTo={onSetTransitTo}
        onSwapLocations={swapLocations}
        travelMode={travelMode}
        onSetTravelMode={onSetTravelMode}
        plannerMode={plannerMode}
        onSetPlannerMode={setPlannerMode}
        plannedDateTime={plannedDateTime}
        onSetPlannedDateTime={setPlannedDateTime}
        onPlacePicked={handlePlacePicked}
      />

      <div className="transit-maptools-panel">
        <button
          type="button"
          className={`transit-maptool-btn ${showTrafficLayer ? 'is-active' : ''}`}
          onClick={() => setShowTrafficLayer((v) => !v)}
        >
          Traffic
        </button>
        <button
          type="button"
          className={`transit-maptool-btn ${showTransitLayer ? 'is-active' : ''}`}
          onClick={() => setShowTransitLayer((v) => !v)}
        >
          Transit
        </button>
      </div>

      <TransitControlsOverlay
        external
        pickMode={pickMode}
        onSetPickMode={setPickMode}
        selectedRoute={selectedRoute}
        onUseSelectedRouteEndpoints={onUseSelectedRouteEndpoints}
        onPlanSelectedRoute={onPlanSelectedRoute}
        hasMapRoute={Boolean(startPoint && endPoint)}
        onPlanTransitFromMap={onPlanTransitFromMap}
        onClear={clearRouteSelection}
        routeInfo={routeInfo}
        travelMode={travelMode}
        routes={routes}
        selectedRouteId={selectedRouteId}
        onSelectRoute={onSelectRoute}
        placesReady={placesReady}
        isRouting={isRouting}
        routingError={routingError}
      />

      <div className="transit-main-layout">
        <div className="transit-map-shell">
          <MapShell
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={MONTREAL_CENTER}
            zoom={12}
            onLoad={setMapRef}
            onUnmount={() => setMapRef(null)}
            onClick={onMapClick}
            options={{
              mapTypeControl: true,
              fullscreenControl: true,
              streetViewControl: true,
              zoomControl: true,
            }}
          >
            <TransitMapLayers
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={onSelectRoute}
              startPoint={startPoint}
              endPoint={endPoint}
              onSetStartPoint={onSetStartPoint}
              onSetEndPoint={onSetEndPoint}
              directions={directions}
              directionsRouteIndex={directionsRouteIndex}
              onDirectionsChanged={rerouteFromDraggedPath}
              waypoints={emptyWaypoints}
              poiResults={emptyWaypoints}
              highlightedStepPath={highlightedStepPath}
              pathPreview={pathPreview}
            />
          </MapShell>
        </div>

        <TransitDirectionsPanel
          external
          directions={directions}
          routeIndex={directionsRouteIndex}
          onSetRouteIndex={setDirectionsRouteIndex}
          selectedStepIndex={selectedStepIndex}
          onSelectStep={handleSelectStep}
          isCollapsed={directionsCollapsed}
          onToggleCollapsed={() => setDirectionsCollapsed((v) => !v)}
        />
      </div>
    </div>
  );
}
