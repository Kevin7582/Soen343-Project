# Transit Setup (Google Transit)

## Required `.env`

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
VITE_GOOGLE_MAPS_API_KEY=your_browser_google_maps_key
VITE_STM_PROXY_URL=http://localhost:8090
GOOGLE_MAPS_SERVER_API_KEY=your_server_google_maps_key
```

Notes:
- `VITE_GOOGLE_MAPS_API_KEY` is used by the frontend map UI.
- `GOOGLE_MAPS_SERVER_API_KEY` is used by the local proxy to call Google Directions (Transit mode).
- Keep server key out of frontend code.

## Run
Open two terminals:

```bash
npm run transit:proxy
npm run dev
```

Health check:

```bash
http://localhost:8090/health
```

Expected health response fields:
- `mode: "google-transit"`
- `hasGoogleServerKey: true`
