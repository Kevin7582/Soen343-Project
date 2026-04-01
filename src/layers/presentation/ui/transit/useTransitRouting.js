import { useEffect, useState } from 'react';
import { fetchDirectionsPath } from '../../../service-layer/maps/mapRoutingService';
import { toLatLngLiteral } from '../maps/mapUtils';
import { parseDurationAndDistance, toTravelMode } from './transitHelpers';

function requestDirections(service, request) {
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

export default function useTransitRouting({
  startPoint,
  endPoint,
  travelMode,
  departureTime,
  onRouteInfoChange,
}) {
  const [pathPreview, setPathPreview] = useState(null);
  const [directions, setDirections] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routingError, setRoutingError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function computePreview() {
      if (!startPoint || !endPoint) {
        setPathPreview(null);
        setDirections(null);
        setRoutingError('');
        onRouteInfoChange?.(null);
        return;
      }

      if (!window.google?.maps) {
        setRoutingError('Google Maps is not ready yet.');
        return;
      }

      setIsRouting(true);
      setRoutingError('');

      try {
        const fallbackModes = [travelMode, 'TRANSIT', 'DRIVING', 'WALKING', 'BICYCLING'];
        const routePath = await fetchDirectionsPath(startPoint, endPoint, fallbackModes);
        if (!mounted) return;
        setPathPreview(routePath);

        const origin = toLatLngLiteral(startPoint);
        const destination = toLatLngLiteral(endPoint);
        const mode = toTravelMode(travelMode);
        if (!origin || !destination || !mode) {
          throw new Error('Invalid route request.');
        }

        const service = new window.google.maps.DirectionsService();
        const request = {
          origin,
          destination,
          travelMode: mode,
          provideRouteAlternatives: true,
        };

        if (mode === window.google.maps.TravelMode.TRANSIT) {
          request.transitOptions = { departureTime: departureTime || new Date() };
        } else if (mode === window.google.maps.TravelMode.DRIVING) {
          request.drivingOptions = { departureTime: departureTime || new Date() };
        }

        const result = await requestDirections(service, request);
        if (!mounted) return;
        setDirections(result);
        onRouteInfoChange?.(parseDurationAndDistance(result));
      } catch (error) {
        if (!mounted) return;
        setDirections(null);
        onRouteInfoChange?.(null);
        setRoutingError(error?.message || 'No route found for this mode.');
      } finally {
        if (mounted) {
          setIsRouting(false);
        }
      }
    }

    computePreview();
    return () => {
      mounted = false;
    };
  }, [startPoint, endPoint, travelMode, departureTime, onRouteInfoChange]);

  return {
    pathPreview,
    directions,
    isRouting,
    routingError,
  };
}
