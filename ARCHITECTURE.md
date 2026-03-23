# Layered Architecture Mapping (Current Scope)

This repository is organized to mirror layered architecture while keeping the current implementation scope.

## Layers

1. Presentation Layer
- `src/layers/presentation/ui/App.jsx`
- `src/layers/presentation/ui/styles.css`
- `src/layers/presentation/context/AuthContext.jsx`
- `src/layers/presentation/context/RentalContext.jsx`

Responsibilities:
- UI rendering (Citizen / Provider / Admin views)
- Session state and role handling
- User interactions and workflow orchestration

2. API Gateway Layer (client-side gateway access contract)
- `src/layers/api-gateway/apiClient.js`

Responsibilities:
- Generic HTTP client abstraction for gateway endpoints
- Placeholder for future backend gateway routing

3. Service Layer (frontend application service)
- `src/layers/service-layer/mobilityService.js`

Responsibilities:
- Use-case oriented operations (vehicles, transit, parking, rentals)
- Data shaping/mapping for UI
- Fallback behavior handling

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
