# Transit Setup

## Required `.env`

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
VITE_GOOGLE_MAPS_API_KEY=your_browser_google_maps_key
VITE_STM_PROXY_URL=http://localhost:8090
GOOGLE_MAPS_SERVER_API_KEY=your_server_google_maps_key
```

## Optional upstream backend
Only set these when you have your own backend endpoint for STM/OTP compare:

```bash
STM_COMPARE_UPSTREAM_URL=https://your-backend/transit/compare
STM_COMPARE_UPSTREAM_API_KEY=your_backend_api_key
```

## Run
Open two terminals:

```bash
npm run transit:proxy
npm run dev
```

Proxy health check:

```bash
http://localhost:8090/health
```
