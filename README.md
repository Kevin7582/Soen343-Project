# SUMMS – Smart Urban Mobility Management System

**Team: The IRS** · SOEN 343 Phase 2

React Native (Expo) mobile app for the Smart Urban Mobility Management System. It implements the Presentation Layer of the layered architecture and supports Citizens, Mobility Providers, and Admins.

## Features

- **Auth**: Register / Login with role selection (Citizen, Mobility Provider, Admin).
- **Citizen**: Search vehicles (type, radius), reserve → payment → active rental → return with receipt.
- **Public transit**: View routes, schedules, delays (mock data).
- **Parking**: View available parking spots (mock data).
- **Mobility provider**: Manage vehicles (add, status, maintenance), view rental data.
- **Admin**: Rental analytics (KPIs, usage), gateway analytics (API performance).

## Tech stack

- **React Native** with **Expo** (~50)
- **React Navigation** (native stack + bottom tabs)
- Mock API layer in `src/services/api.js` (replace with real API Gateway when backend is ready)

## Setup

```bash
npm install
npx expo start
```

Then press `i` for iOS simulator or `a` for Android emulator, or scan the QR code with Expo Go.

## Project structure

```
├── App.js                 # Root: Auth + Rental providers, Navigation
├── app.json               # Expo config
├── src/
│   ├── context/           # AuthContext, RentalContext
│   ├── navigation/       # RootNavigator, MainTabs (role-based tabs)
│   ├── screens/          # Auth, Home, Vehicle flow, Transit, Parking, Provider, Admin
│   ├── services/         # api.js (gateway client + mock data)
│   └── theme/            # colors.js
└── package.json
```

## User roles

| Role              | Tabs / Screens |
|-------------------|----------------|
| Citizen           | Home, Search vehicle, Transit, Parking, Profile + Reserve → Payment → Active rental → Return |
| Mobility Provider | Dashboard, Vehicles, Rental data, Profile |
| Admin             | Dashboard, Rental analytics, Gateway analytics, Profile |

On **Login** and **Register**, use the role selector to switch between Citizen / Provider / Admin (mock only; real roles would come from backend).

## API integration

- Set `EXPO_PUBLIC_API_URL` to your NestJS API Gateway base URL when deploying.
- `src/services/api.js` exports `api` (get/post) and mock data (`mockVehicles`, `mockTransitRoutes`, `mockParkingSpots`). Replace mock usage with `api.get()` / `api.post()` and pass the user token from `useAuth().user.token`.

## Optional assets

To add an app icon and splash screen, add to `app.json`:

- `"icon": "./assets/icon.png"`
- Under `splash`: `"image": "./assets/splash.png"`
- Under `android.adaptiveIcon`: `"foregroundImage": "./assets/adaptive-icon.png"`

Then add the corresponding files under `assets/`.
