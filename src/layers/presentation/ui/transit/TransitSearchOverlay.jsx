import React, { useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';

export default function TransitSearchOverlay({
  placesReady,
  transitFrom,
  transitTo,
  onSetTransitFrom,
  onSetTransitTo,
  onSwapLocations,
  travelMode,
  onSetTravelMode,
  departurePreset,
  onSetDeparturePreset,
  onPlacePicked,
}) {
  const fromAutocompleteRef = useRef(null);
  const toAutocompleteRef = useRef(null);

  const applyPlaceSelection = (autocomplete, type) => {
    const place = autocomplete?.getPlace?.();
    const location = place?.geometry?.location;
    if (!location) return;

    const point = [Number(location.lat().toFixed(6)), Number(location.lng().toFixed(6))];
    const label = place.formatted_address || place.name || '';
    onPlacePicked?.(type, point, label);
  };

  return (
    <div className="transit-overlay transit-overlay-top">
      {placesReady ? (
        <>
          <Autocomplete
            onLoad={(ref) => { fromAutocompleteRef.current = ref; }}
            onPlaceChanged={() => applyPlaceSelection(fromAutocompleteRef.current, 'from')}
          >
            <input className="transit-search-input" value={transitFrom} onChange={(e) => onSetTransitFrom?.(e.target.value)} placeholder="From" />
          </Autocomplete>
          <Autocomplete
            onLoad={(ref) => { toAutocompleteRef.current = ref; }}
            onPlaceChanged={() => applyPlaceSelection(toAutocompleteRef.current, 'to')}
          >
            <input className="transit-search-input" value={transitTo} onChange={(e) => onSetTransitTo?.(e.target.value)} placeholder="To" />
          </Autocomplete>
        </>
      ) : (
        <>
          <input className="transit-search-input" value={transitFrom} onChange={(e) => onSetTransitFrom?.(e.target.value)} placeholder="From" />
          <input className="transit-search-input" value={transitTo} onChange={(e) => onSetTransitTo?.(e.target.value)} placeholder="To" />
        </>
      )}

      <select className="transit-mode-select" value={travelMode} onChange={(e) => onSetTravelMode?.(e.target.value)}>
        <option value="TRANSIT">Transit</option>
        <option value="DRIVING">Driving</option>
        <option value="WALKING">Walking</option>
        <option value="BICYCLING">Bicycling</option>
      </select>
      <button type="button" className="transit-swap-btn" onClick={onSwapLocations}>
        Swap
      </button>
      <select className="transit-mode-select" value={departurePreset} onChange={(e) => onSetDeparturePreset?.(e.target.value)}>
        <option value="now">Depart now</option>
        <option value="15">In 15 min</option>
        <option value="30">In 30 min</option>
        <option value="60">In 60 min</option>
      </select>
    </div>
  );
}
