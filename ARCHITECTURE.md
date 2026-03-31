# Layered Architecture Mapping (Current Scope)

This repository is organized to mirror layered architecture while keeping the current implementation scope.

## Layers

1. Presentation Layer
- `src/layers/presentation/ui/App.jsx`
- `src/layers/presentation/ui/styles.css`
- `src/layers/presentation/context/AuthContext.jsx`
- `src/layers/presentation/context/RentalContext.jsx`
- `src/layers/presentation/ui/maps/MapShell.jsx`
- `src/layers/presentation/ui/maps/mapUtils.js`

Responsibilities:
- UI rendering (Citizen / Provider / Admin views)
- Session state and role handling
- User interactions and workflow orchestration
- Shared map foundation (Google Maps script/loading/errors, map primitive helpers)

2. API Gateway Layer (client-side gateway access contract)
- `src/layers/api-gateway/apiClient.js`

Responsibilities:
- Generic HTTP client abstraction for gateway endpoints
- Placeholder for future backend gateway routing

3. Service Layer (frontend application service)
- `src/layers/service-layer/mobilityService.js`
- `src/layers/service-layer/maps/mapRoutingService.js`

Responsibilities:
- Use-case oriented operations (vehicles, transit, parking, rentals)
- Data shaping/mapping for UI
- Fallback behavior handling
- Shared map routing integration (Directions API path resolution)

4. Data Layer
- `src/layers/data-layer/supabaseClient.js`
- `src/layers/data-layer/mockData.js`

Responsibilities:
- External data source client setup
- Static/mock dataset source

## Notes

- This is still a single web app codebase.
- Backend gateway/service/database processes are not implemented in this repo.
- Directory boundaries are prepared to align with a fuller layered architecture later.

## Shared Map Architecture (Transit, Vehicle Rental, Parking)

Use one base Google Map shell with feature-specific overlays:

1. Map Foundation
- `MapShell.jsx`: owns Google Maps script loading, API key checks, loading/error states, base map options.
- `mapUtils.js`: shared coordinate conversion helpers (`[lat,lng] <-> {lat,lng}` and path normalization).

2. Feature Overlays
- Transit overlay (`TransitMap.jsx`): route lines, endpoint markers, map click point selection, draggable start/end markers.
- Vehicle overlay (next): vehicle markers + availability/status UI + reserve action.
- Parking overlay (next): parking markers + availability/pricing + reserve/start/cancel actions.

3. Shared Routing Service
- `mapRoutingService.js`: central place to call Google Directions and return polyline path for previews/planning.

4. Rule
- Reuse `MapShell` for all tabs. Do not create separate map loaders per feature.
- Keep domain logic in each overlay; keep map bootstrapping and low-level conversions centralized.
