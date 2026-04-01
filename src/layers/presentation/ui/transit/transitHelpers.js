export function routeColor(isSelected) {
  return isSelected ? '#38bdf8' : '#64748b';
}

export function toTravelMode(mode) {
  if (!window.google?.maps?.TravelMode) return null;
  return window.google.maps.TravelMode[mode] || window.google.maps.TravelMode.TRANSIT;
}

export function parseDurationAndDistance(directionsResult) {
  const leg = directionsResult?.routes?.[0]?.legs?.[0];
  return {
    distanceText: leg?.distance?.text || '',
    durationText: leg?.duration?.text || '',
  };
}
