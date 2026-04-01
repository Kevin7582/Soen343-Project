import React, { useEffect, useMemo, useState } from 'react';
import MapShell from './maps/MapShell';
import { toLatLngLiteral, toPointArray } from './maps/mapUtils';
import TransitSearchOverlay from './transit/TransitSearchOverlay';
import TransitControlsOverlay from './transit/TransitControlsOverlay';
import TransitMapLayers from './transit/TransitMapLayers';
import TransitDirectionsPanel from './transit/TransitDirectionsPanel';
import useTransitRouting from './transit/useTransitRouting';
import { MAP_CONTAINER_STYLE, MONTREAL_CENTER } from './transit/transitConstants';
import { fetchTransitCompare } from '../../service-layer/transit/transitCompareService';

function parseDurationToMin(text) {
  const value = String(text || '');
  const hoursMatch = value.match(/(\d+)\s*hour/);
  const minMatch = value.match(/(\d+)\s*min/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const mins = minMatch ? Number(minMatch[1]) : 0;
  return hours * 60 + mins;
}

export default function TransitMap({
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
  onRouteInfoChange,
}) {
  const [mapRef, setMapRef] = useState(null);
  const [pickMode, setPickMode] = useState('start');
  const [plannerMode, setPlannerMode] = useState('depart_now');
  const [plannedDateTime, setPlannedDateTime] = useState('');
  const [directionsRouteIndex, setDirectionsRouteIndex] = useState(0);
  const [selectedStepIndex, setSelectedStepIndex] = useState(-1);
  const [directionsCollapsed, setDirectionsCollapsed] = useState(false);
  const [compareOptions, setCompareOptions] = useState([]);
  const [compareUpdatedAt, setCompareUpdatedAt] = useState('');
  const [compareSource, setCompareSource] = useState('');
  const [adaptMessage, setAdaptMessage] = useState('');

  const placesReady = Boolean(window.google?.maps?.places);
  const emptyWaypoints = useMemo(() => [], []);
  const emptyRoutePreferences = useMemo(() => ({}), []);

  const {
    directions,
    isRouting,
    routingError,
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

    mapRef.panTo(MONTREAL_CENTER);
    mapRef.setZoom(12);
  }, [mapRef, startPoint, endPoint]);

  useEffect(() => {
    setDirectionsRouteIndex(0);
    setSelectedStepIndex(-1);
  }, [directions]);

  useEffect(() => {
    let active = true;

    async function refreshCompare() {
      if (!startPoint || !endPoint) {
        if (active) {
          setCompareOptions([]);
          setCompareUpdatedAt('');
          setCompareSource('');
          setAdaptMessage('');
        }
        return;
      }

      try {
        const result = await fetchTransitCompare({
          startPoint,
          endPoint,
          plannedDateTime,
          plannerMode,
          numItineraries: 4,
        });
        if (!active || !result) return;

        setCompareOptions(result.options || []);
        setCompareUpdatedAt(result.updatedAt || new Date().toISOString());
        setCompareSource(result.source || '');

        const googleMin = parseDurationToMin(routeInfo?.durationText || '');
        const best = (result.options || []).reduce(
          (prev, item) => (!prev || item.durationMin < prev.durationMin ? item : prev),
          null
        );
        if (best && googleMin > 0 && best.durationMin + 5 < googleMin) {
          setAdaptMessage(`Faster transit option detected (${best.durationMin} min). Consider rerouting.`);
        } else {
          setAdaptMessage('');
        }
      } catch {
        if (active) {
          setAdaptMessage('');
        }
      }
    }

    refreshCompare();
    const timer = setInterval(refreshCompare, 45000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [startPoint, endPoint, plannedDateTime, plannerMode, routeInfo?.durationText]);

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

      <TransitControlsOverlay
        external
        pickMode={pickMode}
        onSetPickMode={setPickMode}
        onClear={clearRouteSelection}
        routeInfo={routeInfo}
        travelMode={travelMode}
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
              routes={[]}
              startPoint={startPoint}
              endPoint={endPoint}
              onSetStartPoint={onSetStartPoint}
              onSetEndPoint={onSetEndPoint}
              directions={directions}
              directionsRouteIndex={directionsRouteIndex}
              waypoints={emptyWaypoints}
              poiResults={emptyWaypoints}
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
          compareOptions={compareOptions}
          compareUpdatedAt={compareUpdatedAt}
          compareSource={compareSource}
          adaptMessage={adaptMessage}
        />
      </div>
    </div>
  );
}
