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

## Features implemented in web UI

- Login/register with role switch (Citizen, Mobility Provider, Admin)
- Citizen flows: vehicle search/reserve/payment/active rental/return
- Transit and parking views (mock data)
- Provider views: vehicles and rental records
- Admin views: rental and gateway analytics
- Shared dark theme adapted from the previous mobile app

## Notes

- Expo and React Native files were removed as requested.
- API client remains in `src/services/api.js` for backend integration.
