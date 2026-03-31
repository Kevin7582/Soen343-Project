export const mockVehicles = [
  { id: 'v1', type: 'scooter', name: 'Scooter #101', distance: 0.2, status: 'available', ratePerMin: 0.25 },
  { id: 'v2', type: 'scooter', name: 'Scooter #102', distance: 0.5, status: 'available', ratePerMin: 0.25 },
  { id: 'v3', type: 'bike', name: 'Bike #201', distance: 0.8, status: 'available', ratePerMin: 0.15 },
  { id: 'v4', type: 'scooter', name: 'Scooter #103', distance: 1.1, status: 'available', ratePerMin: 0.25 },
];

export const mockTransitRoutes = [
  {
    id: 'r1',
    line: 'Green Line',
    from: 'Berri-UQAM',
    to: 'Lionel-Groulx',
    delay: 0,
    nextDeparture: '5 min',
    fromCoords: [45.5152, -73.5610],
    toCoords: [45.4895, -73.5820],
    path: [
      [45.5152, -73.5610],
      [45.5075, -73.5720],
      [45.4998, -73.5768],
      [45.4895, -73.5820],
    ],
  },
  {
    id: 'r2',
    line: 'Orange Line',
    from: 'Mont-Royal',
    to: 'Cote-Vertu',
    delay: 2,
    nextDeparture: '3 min',
    fromCoords: [45.5246, -73.5958],
    toCoords: [45.5140, -73.6818],
    path: [
      [45.5246, -73.5958],
      [45.5229, -73.6125],
      [45.5210, -73.6395],
      [45.5140, -73.6818],
    ],
  },
];

export const mockParkingSpots = [
  { id: 'p1', address: '123 Rue Sainte-Catherine', available: 12, total: 20, distance: 0.3 },
  { id: 'p2', address: '456 Boulevard Saint-Laurent', available: 5, total: 10, distance: 0.6 },
];

export const mockProviderRentals = [
  { id: 'r1', vehicle: 'Scooter #101', user: 'user@example.com', start: '2026-02-26 10:00', end: '2026-02-26 10:25', cost: 6.25 },
  { id: 'r2', vehicle: 'Bike #201', user: 'other@example.com', start: '2026-02-26 09:15', end: '2026-02-26 09:45', cost: 4.5 },
];
