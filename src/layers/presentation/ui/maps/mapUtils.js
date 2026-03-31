export function toLatLngLiteral(point) {
  if (!Array.isArray(point) || point.length < 2) return null;
  const lat = Number(point[0]);
  const lng = Number(point[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function toPath(points) {
  if (!Array.isArray(points)) return null;
  const mapped = points.map(toLatLngLiteral).filter(Boolean);
  return mapped.length >= 2 ? mapped : null;
}

export function toPointArray(latLng) {
  const lat = latLng?.lat?.();
  const lng = latLng?.lng?.();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
}
