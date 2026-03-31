**Team: The IRS**

# SUMMS Web App

Web frontend for the Smart Urban Mobility Management System (SUMMS).

## Stack

- React 19
- Vite

## Run

```bash
npm install
npm run dev
```

## Environment

Create a `.env` file with:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Google Maps Setup (Transit)

Follow these exact steps for the Transit map to work:

1. Go to Google Cloud Console and create/select a project.
2. Enable billing for that project.
3. Enable these APIs:
   - Maps JavaScript API
   - Directions API
   - Places API
4. Create an API key.
5. Restrict the key:
   - Application restrictions:
     - For local dev: `http://localhost:5173/*`
   - API restrictions:
     - Maps JavaScript API
     - Directions API
     - Places API
6. Put the key in `.env`:

```bash
VITE_GOOGLE_MAPS_API_KEY=PASTE_YOUR_KEY_HERE
```

7. Keep Supabase env vars in the same `.env` file:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
```

8. Restart the app after env changes:

```bash
npm run dev
```

If Transit page shows `Missing Google Maps key`, your `.env` is missing `VITE_GOOGLE_MAPS_API_KEY` or the dev server was not restarted.

## Map Architecture (Team Rule)

Use one shared Google map foundation across all tabs:

- Base shell: `src/layers/presentation/ui/maps/MapShell.jsx`
- Shared map utils: `src/layers/presentation/ui/maps/mapUtils.js`
- Shared routing service: `src/layers/service-layer/maps/mapRoutingService.js`

Feature tabs (transit, vehicle rental, parking) should only add overlays (markers/polylines/actions) on top of `MapShell`, not create separate map loaders.

## Features implemented in web UI

- Login/register with role switch (Citizen, Mobility Provider, Admin)
- Citizen flows: vehicle search/reserve/payment/active rental/return
- Transit and parking views (mock data)
- Provider views: vehicles and rental records
- Admin views: rental and gateway analytics
- Shared dark theme adapted from the previous mobile app

## Notes

- Expo and React Native files were removed as requested.
- API client remains in `src/layers/api-gateway/apiClient.js` for backend integration.
