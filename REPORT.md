# SUMMS Project Completion Report

## 1. Summary of Work Done

### What Was Added
- **City-based analytics**: Active rentals by city, usage/completed trips by city, parking reservations by city (e.g., Montreal vs Laval)
- **Type-specific metrics**: "Bikes currently rented" and "Scooters currently available" stat cards in admin dashboard
- **Vehicle edit/update for providers**: Full CRUD with inline edit forms for type, location, and rate
- **Add vehicle form**: Replaced `window.prompt` with proper form UI for adding vehicles
- **API Gateway integration**: The `apiClient.js` gateway now wraps Supabase with request logging, latency tracking, and per-table statistics
- **Gateway Analytics panel**: Live request log, success/failure counts, avg latency, and per-table breakdown visible in admin gateway view
- **City breakdown visualization**: Bar chart components for city-level data in admin dashboard

### What Was Modified
- **AuthContext.jsx**: `createUser()` now saves the `name` field to the database; `login()` loads name from the DB row
- **adminDashboardService.js**: Added 5 new analytics methods (`getBikesCurrentlyRented`, `getScootersCurrentlyAvailable`, `getActiveRentalsByCity`, `getUsageByCity`, `getParkingReservationsByCity`); wired `getTotalUsers` and `getActiveParking` through the API gateway
- **AdminDashboard.jsx**: Added `CityBreakdown` component; added 2 new stat cards; added 3 city breakdown panels
- **App.jsx**: Rewrote `ProviderVehicles` with full edit/add forms; enhanced `GatewayAnalytics` with live gateway stats
- **apiClient.js**: Added `gateway` object with `select`, `count`, `insert`, `update`, `remove`, request logging, and stats

### What Was Fixed
- User name was not persisted to the database during registration
- Provider vehicle management used `window.prompt` (poor UX) instead of proper form inputs
- API Gateway was a dead placeholder with no connection to the application

---

## 2. Feature Completion Checklist

### Phase I Requirements

| Feature | Status | Implementation |
|---------|--------|----------------|
| **Shared Mobility Management** | Done | Vehicle search, filter by type/radius, reserve, payment sim, return |
| **Parking Management** | Done | Real-time spots, reserve, start, update duration, complete, cancel |
| **Public Transportation Coordination** | Done | Transit routes, Google Maps routing, trip planning, multi-mode |
| **Real-Time Analytics** | Done | Full admin dashboard with real-time Supabase subscriptions |
| - Bicycles currently rented | Done | `getBikesCurrentlyRented()` + stat card |
| - Scooters currently available | Done | `getScootersCurrentlyAvailable()` + stat card |
| - Parking spots reserved per city | Done | `getParkingReservationsByCity()` + city breakdown panel |
| - Total trips completed today | Done | `getCompletedTripsToday()` + stat card |
| - Most used mobility option | Done | `getUsageByVehicleType()` + stacked bar chart |
| - Usage per city | Done | `getUsageByCity()` + city breakdown panel |
| **User Information Services** | Done | `recommendationService.js` with preference-based suggestions |
| - Preferred city | Done | Profile preferences, stored in Supabase + localStorage |
| - Preferred mobility type | Done | Bike/scooter selection in profile |
| **Administrative Dashboards** | Done | Full dashboard with 8+ panels |
| - Total registered users | Done | `getTotalUsers()` via gateway + stat card |
| - Active rentals by city | Done | `getActiveRentalsByCity()` + city breakdown panel |
| - Parking utilization per city | Done | `getParkingReservationsByCity()` + breakdown panel |
| - Number of completed trips | Done | `getCompletedTripsToday()` + stat card |
| - Bike vs scooter comparison | Done | `getUsageByVehicleType()` + stacked bar chart |

### Phase III Requirements

| Feature | Status | Implementation |
|---------|--------|----------------|
| User registration | Done | `AuthContext.register()` with name, email, password, role |
| Authentication / login | Done | `AuthContext.login()` with email/password/role validation |
| Vehicle search | Done | Filter by type (all/scooter/bike) and radius; map + card views |
| Reservation | Done | `mobilityService.reserveVehicle()` with conflict checks |
| Payment processing (sim) | Done | Transaction ID generated, status tracked through lifecycle |
| Vehicle return | Done | `mobilityService.completeRental()` with cost calculation |
| Vehicle management (CRUD) | Done | Add (form), Edit (inline), Toggle status, Remove with confirmation |
| Navigation to Parking | Done | Dedicated Parking tab with map + reservation lifecycle |
| Navigation to Transit | Done | Dedicated Transit tab with Google Maps + route planning |
| Rental-related analytic | Done | Hourly rental trend, vehicle usage mix, active rentals table |
| Gateway/service-level analytic | Done | System health monitoring, live event feed, gateway request stats |

### Phase IV Requirements

| Feature | Status | Implementation |
|---------|--------|----------------|
| Back-end core logic | Done | Service layer + Supabase; API Gateway wraps operations |
| Front-end GUI | Done | React SPA with role-based views, dark theme, responsive layout |
| Back-end integration | Done | Service layer -> API Gateway -> Supabase; fallback to mock data |

---

## 3. Architecture Overview

```
src/
 layers/
  presentation/          # UI Layer
   ui/
    App.jsx              # Root component, all views, role routing
    AdminDashboard.jsx   # Admin analytics panels
    VehicleMap.jsx       # Google Maps vehicle search
    ParkingMap.jsx       # Google Maps parking view
    TransitMap.jsx       # Google Maps transit routing
    roleDashboardFactory.js  # Factory for role-based tab configs
    maps/                # Shared map components
    transit/             # Transit-specific UI + hooks
   context/
    AuthContext.jsx      # Authentication state + user session
    RentalContext.jsx    # Rental lifecycle state

  service-layer/         # Business Logic
   mobilityService.js    # Vehicle, parking, transit CRUD + lifecycle
   adminDashboardService.js  # Analytics aggregation + real-time subs
   recommendationService.js  # Preference-based suggestions
   maps/                 # Map routing service
   transit/              # Transit comparison service (OTP)

  api-gateway/           # Gateway Layer
   apiClient.js          # Unified data access with logging + stats

  data-layer/            # Data Access
   supabaseClient.js     # Supabase client initialization
   mockData.js           # Fallback mock datasets
```

### Component Interaction Flow
1. **User Action** -> Presentation Layer (React components + context)
2. **Business Logic** -> Service Layer (mobilityService, adminDashboardService)
3. **Data Access** -> API Gateway (apiClient.js) -> Supabase / Mock Data
4. **State Updates** -> Context Providers -> Re-render affected components

---

## 4. Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **Factory Pattern** | `roleDashboardFactory.js` | Creates role-specific tab configurations and view routing without conditional logic in the main component |
| **Facade Pattern** | `mobilityService.js`, `adminDashboardService.js` | Provides a simplified interface over complex Supabase queries, data mapping, and fallback logic |
| **Context / Provider Pattern** | `AuthContext.jsx`, `RentalContext.jsx` | Centralized state management for auth and rental lifecycle, avoiding prop drilling |
| **Gateway Pattern** | `apiClient.js` | Single entry point for all data operations with request logging, timing, and stats; decouples service layer from database client |
| **Observer Pattern** | `AdminDashboard.jsx` real-time subscriptions | Supabase channels push database changes to the dashboard without polling |
| **Fallback / Graceful Degradation** | `mobilityService.js` `fallbackWarn()` | Every Supabase operation falls back to mock data on failure, keeping the app functional |
| **Strategy Pattern** | `roleDashboardFactory.js` role creators | Each role (Citizen, Provider, Admin) has its own strategy for tabs and content rendering |

---

## 5. Key Technical Decisions

- **No separate backend server**: Supabase serves as the backend-as-a-service. The API Gateway layer wraps Supabase calls to demonstrate the architectural pattern while keeping deployment simple.
- **Plaintext passwords**: Acceptable for a student project / development mode. The auth flow is lenient by design.
- **Tab-based routing instead of React Router**: Keeps the project dependency-light. Tab state in the Dashboard component controls all view switching.
- **Mock data fallback**: Every data-fetching function gracefully falls back to mock data if Supabase is unavailable, making the app demo-able without a database connection.
- **CSS custom properties (no component library)**: Dark theme using CSS variables. Avoids heavy dependencies while maintaining a consistent look.
- **City extraction heuristic**: `extractCity()` parses city names from location strings using comma-splitting. Works for the expected data format (e.g., "123 Rue X, Montreal").

---

## 6. How to Run the Project

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
# Clone the repository
git clone <repo-url>
cd Soen343-Project

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set:
#   VITE_SUPABASE_URL=your_supabase_project_url
#   VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
#   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key (optional, for map features)
```

### Run
```bash
# Development server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Supabase Tables Required
Create these tables in your Supabase project:
- `users` (id, name, email, password, role, preferred_city, preferred_mobility_type)
- `vehicles` (id, type, name, location, distance, available, maintenance, rate_per_min, provider_id)
- `rentals` (id, user_id, vehicle_id, status, start_time, end_time, price, payment_status)
- `parking_spots` (id, address, available, total, distance, price_per_hour)
- `parking_reservations` (id, user_id, parking_spot_id, status, reserved_at, started_at, ended_at, duration_hours, estimated_cost, final_cost)
- `transit_routes` (id, line, from, to, delay, next_departure)
- `transit_plans` (id, user_id, route_id, from_location, to_location, planned_at, notes)

The app works without Supabase too -- all features fall back to mock data automatically.
