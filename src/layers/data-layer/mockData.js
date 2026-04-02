export const mockVehicles = [
  { id: 'v1', type: 'scooter', name: 'Scooter #101', distance: 0.2, status: 'available', ratePerMin: 0.25 },
  { id: 'v2', type: 'scooter', name: 'Scooter #102', distance: 0.5, status: 'available', ratePerMin: 0.25 },
  { id: 'v3', type: 'bike', name: 'Bike #201', distance: 0.8, status: 'available', ratePerMin: 0.15 },
  { id: 'v4', type: 'scooter', name: 'Scooter #103', distance: 1.1, status: 'available', ratePerMin: 0.25 },
];

export const mockTransitRoutes = [
  { id: 'r1', line: 'Green Line', from: 'Berri-UQAM', to: 'Lionel-Groulx', delay: 0, nextDeparture: '5 min' },
  { id: 'r2', line: 'Orange Line', from: 'Mont-Royal', to: 'Cote-Vertu', delay: 2, nextDeparture: '3 min' },
];

export const mockParkingSpots = [
  { id: 'p1', address: '123 Rue Sainte-Catherine, Montreal', available: 12, total: 20, distance: 0.3, price_per_hour: 3.00 },
  { id: 'p2', address: '456 Boulevard Saint-Laurent, Montreal', available: 5, total: 10, distance: 0.6, price_per_hour: 2.50 },
  { id: 'p3', address: '789 Boulevard de la Concorde, Laval', available: 8, total: 15, distance: 1.2, price_per_hour: 2.00 },
  { id: 'p4', address: '1000 Rue de la Gauchetiere, Montreal', available: 18, total: 30, distance: 0.4, price_per_hour: 4.00 },
  { id: 'p5', address: '350 Rue McGill, Montreal', available: 7, total: 12, distance: 0.5, price_per_hour: 3.50 },
  { id: 'p6', address: '275 Rue Notre-Dame Est, Montreal', available: 15, total: 25, distance: 0.7, price_per_hour: 2.75 },
  { id: 'p7', address: '1500 Avenue Atwater, Montreal', available: 9, total: 20, distance: 1.0, price_per_hour: 2.50 },
  { id: 'p8', address: '4700 Rue Jean-Talon Est, Montreal', available: 20, total: 35, distance: 1.8, price_per_hour: 2.00 },
  { id: 'p9', address: '6100 Avenue du Parc, Montreal', available: 6, total: 14, distance: 1.3, price_per_hour: 2.25 },
  { id: 'p10', address: '2305 Chemin Remembrance, Montreal', available: 10, total: 18, distance: 1.5, price_per_hour: 1.75 },
  { id: 'p11', address: '1616 Rue Berri, Montreal', available: 4, total: 10, distance: 0.2, price_per_hour: 3.75 },
  { id: 'p12', address: '3175 Chemin Cote-Sainte-Catherine, Montreal', available: 14, total: 22, distance: 2.0, price_per_hour: 2.00 },
  { id: 'p13', address: '900 Boulevard Rene-Levesque, Montreal', available: 8, total: 16, distance: 0.3, price_per_hour: 4.50 },
  { id: 'p14', address: '3100 Boulevard Le Carrefour, Laval', available: 25, total: 40, distance: 2.5, price_per_hour: 1.50 },
  { id: 'p15', address: '1600 Boulevard Saint-Martin, Laval', available: 12, total: 20, distance: 3.0, price_per_hour: 1.75 },
  { id: 'p16', address: '2500 Boulevard Daniel-Johnson, Laval', available: 18, total: 30, distance: 2.8, price_per_hour: 1.50 },
  { id: 'p17', address: '75 Boulevard de la Concorde Est, Laval', available: 10, total: 18, distance: 2.2, price_per_hour: 2.00 },
  { id: 'p18', address: '1530 Boulevard Le Corbusier, Laval', available: 22, total: 35, distance: 3.5, price_per_hour: 1.25 },
];

export const mockProviderRentals = [
  { id: 'r1', vehicle: 'Scooter #101', user: 'user@example.com', start: '2026-02-26 10:00', end: '2026-02-26 10:25', cost: 6.25 },
  { id: 'r2', vehicle: 'Bike #201', user: 'other@example.com', start: '2026-02-26 09:15', end: '2026-02-26 09:45', cost: 4.5 },
];
