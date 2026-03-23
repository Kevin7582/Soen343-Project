import React, { createContext, useCallback, useContext, useState } from 'react';

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
    });
    setReservation(null);
  }, []);

  const endRental = useCallback((cost, receipt) => {
    setActiveRental((prev) => (prev ? { ...prev, endTime: new Date().toISOString(), cost, receipt } : null));
    setTimeout(() => setActiveRental(null), 100);
  }, []);

  return (
    <RentalContext.Provider
      value={{
        reservation,
        activeRental,
        setReserve,
        clearReservation,
        startRental,
        endRental,
      }}
    >
      {children}
    </RentalContext.Provider>
  );
}

export function useRental() {
  const ctx = useContext(RentalContext);
  if (!ctx) throw new Error('useRental must be used within RentalProvider');
  return ctx;
}
