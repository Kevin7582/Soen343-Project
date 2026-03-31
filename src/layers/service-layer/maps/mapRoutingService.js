import { toLatLngLiteral } from '../../presentation/ui/maps/mapUtils';

function routeRequest(service, request) {
  return new Promise((resolve, reject) => {
    service.route(request, (result, status) => {
      if (status === 'OK' && result) {
        resolve(result);
        return;
      }
      reject(new Error(`Directions failed: ${status}`));
    });
  });
}

function extractPath(directionsResult) {
  const points = directionsResult?.routes?.[0]?.overview_path;
  if (!Array.isArray(points) || points.length < 2) return null;
  return points.map((point) => ({ lat: point.lat(), lng: point.lng() }));
}

export async function fetchDirectionsPath(startPoint, endPoint, travelModes = ['TRANSIT', 'DRIVING']) {
  if (!window.google?.maps) return null;

  const origin = toLatLngLiteral(startPoint);
  const destination = toLatLngLiteral(endPoint);
  if (!origin || !destination) return null;

  const service = new window.google.maps.DirectionsService();

  for (const mode of travelModes) {
    try {
      const result = await routeRequest(service, {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode[mode],
      });
      const path = extractPath(result);
      if (path) return path;
    } catch {
      // Try next mode.
    }
  }

  return null;
}
