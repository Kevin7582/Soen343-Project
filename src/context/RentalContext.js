import React, { createContext, useContext, useState, useCallback } from 'react';

const RentalContext = createContext(null);

export function RentalProvider({ children }) {
  const [reservation, setReservation] = useState(null);
  const [activeRental, setActiveRental] = useState(null);

  const setReserve = useCallback((vehicle) => setReservation(vehicle), []);
  const clearReservation = useCallback(() => setReservation(null), []);

  const startRental = useCallback((vehicle, paymentTxId) => {
    setActiveRental({
      vehicle,
      paymentTxId,
      startTime: new Date().toISOString(),
      startOdometer: 0,
    });
    setReservation(null);
  }, []);

  const endRental = useCallback((cost, receipt) => {
    setActiveRental((prev) => (prev ? { ...prev, endTime: new Date().toISOString(), cost, receipt } : null));
    setTimeout(() => setActiveRental(null), 100);
  }, []);

  const clearActiveRental = useCallback(() => setActiveRental(null), []);

  const value = {
    reservation,
    activeRental,
    setReserve,
    clearReservation,
    startRental,
    endRental,
    clearActiveRental,
  };

  return <RentalContext.Provider value={value}>{children}</RentalContext.Provider>;
}

export function useRental() {
  const ctx = useContext(RentalContext);
  if (!ctx) return { reservation: null, activeRental: null, setReserve: () => {}, clearReservation: () => {}, startRental: () => {}, endRental: () => {}, clearActiveRental: () => {} };
  return ctx;
}
