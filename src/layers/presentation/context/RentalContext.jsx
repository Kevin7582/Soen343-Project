import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  cancelReservation as cancelReservationInService,
  completeRental,
  fetchUserActiveRental,
  fetchUserReservation,
  reserveVehicle as reserveVehicleInService,
  startRental as startRentalInService,
} from '../../service-layer/mobilityService';

const RentalContext = createContext(null);

export function RentalProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [activeRental, setActiveRental] = useState(null);
  const [rentalLoading, setRentalLoading] = useState(false);
  const [rentalError, setRentalError] = useState('');

  const clearError = useCallback(() => setRentalError(''), []);

  const loadRentalState = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setReservation(null);
      setActiveRental(null);
      return;
    }

    setRentalLoading(true);
    setRentalError('');

    try {
      const [dbReservation, dbActiveRental] = await Promise.all([
        fetchUserReservation(user.id),
        fetchUserActiveRental(user.id),
      ]);
      setReservation(dbReservation);
      setActiveRental(dbActiveRental);
    } catch (error) {
      setRentalError(error?.message || 'Unable to load rental state.');
    } finally {
      setRentalLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    loadRentalState();
  }, [loadRentalState]);

  const reserveVehicle = useCallback(async (vehicle) => {
    if (!user?.id) {
      throw new Error('Please log in first.');
    }

    setRentalLoading(true);
    setRentalError('');

    try {
      const dbReservation = await reserveVehicleInService(user.id, vehicle);
      setReservation(dbReservation);
      return dbReservation;
    } catch (error) {
      setRentalError(error?.message || 'Unable to reserve vehicle.');
      throw error;
    } finally {
      setRentalLoading(false);
    }
  }, [user?.id]);

  const clearReservation = useCallback(async () => {
    if (!reservation) return;

    setRentalLoading(true);
    setRentalError('');

    try {
      await cancelReservationInService(reservation);
      setReservation(null);
    } catch (error) {
      setRentalError(error?.message || 'Unable to cancel reservation.');
      throw error;
    } finally {
      setRentalLoading(false);
    }
  }, [reservation]);

  const startRental = useCallback(async (paymentTxId) => {
    if (!reservation || !user?.id) {
      throw new Error('No reservation available to start.');
    }

    setRentalLoading(true);
    setRentalError('');

    try {
      const dbRental = await startRentalInService(user.id, reservation, paymentTxId);
      setActiveRental(dbRental);
      setReservation(null);
      return dbRental;
    } catch (error) {
      setRentalError(error?.message || 'Unable to start rental.');
      throw error;
    } finally {
      setRentalLoading(false);
    }
  }, [reservation, user?.id]);

  const endRental = useCallback(async (cost, receipt) => {
    if (!activeRental) {
      throw new Error('No active rental to complete.');
    }

    setRentalLoading(true);
    setRentalError('');

    try {
      const completed = await completeRental(activeRental, cost);
      setActiveRental((prev) => (prev ? { ...completed, receipt } : null));
      setTimeout(() => setActiveRental(null), 100);
      return completed;
    } catch (error) {
      setRentalError(error?.message || 'Unable to complete rental.');
      throw error;
    } finally {
      setRentalLoading(false);
    }
  }, [activeRental]);

  const value = useMemo(() => ({
    reservation,
    activeRental,
    rentalLoading,
    rentalError,
    clearError,
    reserveVehicle,
    clearReservation,
    startRental,
    endRental,
    refreshRentalState: loadRentalState,
  }), [
    reservation,
    activeRental,
    rentalLoading,
    rentalError,
    clearError,
    reserveVehicle,
    clearReservation,
    startRental,
    endRental,
    loadRentalState,
  ]);

  return <RentalContext.Provider value={value}>{children}</RentalContext.Provider>;
}

export function useRental() {
  const ctx = useContext(RentalContext);
  if (!ctx) throw new Error('useRental must be used within RentalProvider');
  return ctx;
}
