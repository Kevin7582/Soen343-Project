import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthProvider, ROLES, useAuth } from '../context/AuthContext';
import { RentalProvider, useRental } from '../context/RentalContext';
import AdminDashboard from "./AdminDashboard";
import AdminDashboardService from '../../service-layer/adminDashboardService';
import TransitMap from './TransitMap';
import RecommendationService from '../../service-layer/recommendationService';
import { createRoleDashboardCreator } from './roleDashboardFactory';
import { supabase } from '../../data-layer/supabaseClient';
import { fetchBixiStations, getBixiStats } from '../../service-layer/bixiService';
import { fetchStmSchedules, fetchStmStatus } from '../../service-layer/stmService';
import {
  completeParkingReservation,
  cancelParkingReservation,
  fetchParkingSpots,
  fetchProviderVehicles,
  fetchProviderRentals,
  fetchTransitRoutes,
  fetchUserParkingReservation,
  fetchVehicles,
  reserveParkingSpot,
  startParkingReservation,
  updateParkingReservationDuration,
} from '../../service-layer/mobilityService';
import VehicleMap from './VehicleMap';
import ParkingMap from './ParkingMap';
import SummsAssistantChat from './SummsAssistantChat';

export default function App() {
  return (
    <AuthProvider>
      <RentalProvider>
        <Root />
      </RentalProvider>
    </AuthProvider>
  );
}

function Root() {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {isAuthenticated ? <Dashboard /> : <AuthScreen />}
      <SummsAssistantChat />
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLES.CITIZEN);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const { login, register, resetPassword } = useAuth();
  const loginRoles = [
    { label: 'Citizen', value: ROLES.CITIZEN },
    { label: 'Provider', value: ROLES.MOBILITY_PROVIDER },
    { label: 'City Admin', value: ROLES.CITY_ADMIN },
    { label: 'System Admin', value: ROLES.SYSTEM_ADMIN },
  ];
  const registerRoles = loginRoles.slice(0, 2);

  const clearFormError = () => setFormError('');

  const submit = async (event) => {
    event.preventDefault();
    clearFormError();

    try {
      setSubmitting(true);

      if (mode === 'login') {
        await login(email.trim(), password, role);
      } else {
        const proceed = window.confirm('Create a new account with these values?');
        if (!proceed) return;
        await register(name.trim(), email.trim(), password, role);
        window.alert('Registered. If email confirmation is enabled, verify your email first.');
      }
    } catch (error) {
      setFormError(error?.message || 'Authentication error.');
    } finally {
      setSubmitting(false);
    }
  };

  const onForgotPassword = async () => {
    clearFormError();

    try {
      setSubmitting(true);
      await resetPassword(email.trim());
      window.alert('Password reset email sent. Check your inbox.');
    } catch (error) {
      setFormError(error?.message || 'Could not send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    clearFormError();
    setRole(ROLES.CITIZEN);
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
  };

  const isRegisterMode = mode === 'register';

  return (
    <div className="auth-wrap">
      <div className="auth-card fade-up">
        <h1>SUMMS</h1>
        <p>Smart Urban Mobility Management</p>

        <form onSubmit={submit} className="stack-12">
          <label style={{ fontSize: '0.78rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            {isRegisterMode ? 'Create your account' : 'Sign in to continue'}
          </label>

          {isRegisterMode && (
            <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" /></label>
          )}

          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="text" /></label>
          <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" type="password" /></label>

          <div>
            <label>{isRegisterMode ? 'I am a...' : 'Sign in as...'}</label>
            <div className="role-row" style={{ marginTop: 8, gridTemplateColumns: isRegisterMode ? '1fr 1fr' : '1fr 1fr' }}>
              {(isRegisterMode ? registerRoles : loginRoles).map((item) => (
                <RoleButton key={item.value} label={item.label} active={role === item.value} onClick={() => setRole(item.value)} />
              ))}
            </div>
          </div>

          {!!formError && <div className="auth-error">{formError}</div>}

          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}>
            {submitting ? 'Please wait...' : isRegisterMode ? 'Create Account' : 'Sign In'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-link" type="button" onClick={toggleMode} style={{ padding: '4px 0' }}>
              {isRegisterMode ? 'Already have an account?' : 'Create an account'}
            </button>
            {!isRegisterMode && (
              <button className="btn btn-link" type="button" onClick={onForgotPassword} disabled={submitting} style={{ padding: '4px 0' }}>
                Forgot password?
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleButton({ label, active, onClick }) {
  return (
    <button type="button" className={`btn ${active ? 'btn-primary-soft' : 'btn-soft'}`} onClick={onClick}>
      {label}
    </button>
  );
}

function roleDisplayName(role) {
  if (role === ROLES.MOBILITY_PROVIDER) return 'Mobility Provider';
  if (role === ROLES.CITY_ADMIN) return 'City Admin';
  if (role === ROLES.SYSTEM_ADMIN) return 'System Admin';
  if (role === ROLES.ADMIN) return 'Admin';
  return 'Citizen';
}

function toDatetimeLocalValue(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

function Dashboard() {
  const { user, logout, updatePreferences } = useAuth();
  const {
    reservation,
    activeRental,
    reserveVehicle,
    clearReservation,
    startRental,
    endRental,
    rentalLoading,
    rentalError,
    clearError,
  } = useRental();
  const [tab, setTab] = useState(() => createRoleDashboardCreator(user?.role).createDefaultTab());
  const [vehicleType, setVehicleType] = useState('all');
  const [radius, setRadius] = useState('2');
  const [paymentDone, setPaymentDone] = useState(false);
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  const [reservationDraft, setReservationDraft] = useState(null);
  const [showReservationPlanner, setShowReservationPlanner] = useState(false);
  const [parkingReservation, setParkingReservation] = useState(null);
  const [parkingDuration, setParkingDuration] = useState('1');
  const [returnPlace, setReturnPlace] = useState('');
  const [returnTime, setReturnTime] = useState(() => toDatetimeLocalValue());
  const [mobilityError, setMobilityError] = useState('');

  const { loadingData, vehiclesData, transitRoutes, parkingSpots, providerRentals, refreshDashboardData } = useDashboardData(user);

  const roleDashboardCreator = useMemo(
    () => createRoleDashboardCreator(user?.role),
    [user?.role]
  );
  const navigationConfig = useMemo(
    () => roleDashboardCreator.createNavigationConfig(),
    [roleDashboardCreator]
  );
  const tabs = navigationConfig.tabs;
  const tabLabels = navigationConfig.tabLabels;
  const defaultTab = navigationConfig.defaultTab;

  useEffect(() => {
    if (!tabs.includes(tab)) {
      setTab(defaultTab);
    }
  }, [defaultTab, tab, tabs]);

  useEffect(() => {
    let mounted = true;
    async function loadUserMobilityData() {
      if (!user?.id) {
        setParkingReservation(null);
        return;
      }
      try {
        const reservationData = await fetchUserParkingReservation(user.id);
        if (!mounted) return;
        setParkingReservation(reservationData);
        if (reservationData?.durationHours) {
          setParkingDuration(String(reservationData.durationHours));
        }
      } catch (error) {
        if (!mounted) return;
        setMobilityError(error?.message || 'Unable to load parking state.');
      }
    }
    loadUserMobilityData();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const filteredVehicles = useMemo(() => {
    let list = [...vehiclesData];
    if (vehicleType !== 'all') {
      list = list.filter((vehicle) => vehicle.type === vehicleType);
    }

    const maxRadius = parseFloat(radius) || 2;
    return list.filter((vehicle) => vehicle.distance <= maxRadius);
  }, [vehiclesData, vehicleType, radius]);

  const handleReserveVehicle = async (vehicle) => {
    if (reservation || activeRental) {
      setMobilityError('You can only have one vehicle reservation/rental at a time.');
      return;
    }
    clearError();
    setMobilityError('');
    setReservationDraft(vehicle);
    setShowReservationPlanner(true);
  };

  const confirmReserveVehicle = async ({ plannedDurationMinutes, plannedReturnPlace }) => {
    if (!reservationDraft) return;
    try {
      await reserveVehicle(reservationDraft, { plannedDurationMinutes, plannedReturnPlace });
      await refreshDashboardData();
      setTab('activeRental');
      setShowReservationPlanner(false);
      setReservationDraft(null);
    } catch {
      // Error is shown from context state.
    }
  };

  const beginPayment = () => {
    if (!reservation) return;
    setShowPaymentGate(true);
  };

  const onPaymentComplete = async () => {
    setShowPaymentGate(false);
    if (!reservation) return;

    const transactionId = `tx_${Date.now()}`;
    clearError();
    setMobilityError('');
    try {
      await startRental(transactionId);
      await refreshDashboardData();
      setPaymentDone(false);
      setTab('activeRental');
    } catch {
      // Error is shown from context state.
    }
  };

  const returnVehicle = async () => {
    if (!activeRental) return;
    const cleanReturnPlace = returnPlace.trim();
    if (!cleanReturnPlace) {
      setMobilityError('Confirm the return place before completing the rental.');
      return;
    }

    const confirmedReturnTime = new Date(returnTime);
    if (Number.isNaN(confirmedReturnTime.getTime())) {
      setMobilityError('Confirm a valid return time before completing the rental.');
      return;
    }

    const start = new Date(activeRental.startTime);
    const elapsedMin = Math.max(1, Math.floor((confirmedReturnTime.getTime() - start.getTime()) / 60000));
    const totalCost = elapsedMin * (activeRental.vehicle?.ratePerMin || 0.25);

    clearError();
    setMobilityError('');
    try {
      await endRental(totalCost, {
        transactionId: activeRental.paymentTxId,
        returnPlace: cleanReturnPlace,
        returnTime: confirmedReturnTime.toISOString(),
        durationMinutes: elapsedMin,
      });
      await refreshDashboardData();
      setPaymentDone(true);
      setReturnPlace('');
      setReturnTime(toDatetimeLocalValue());
    } catch {
      // Error is shown from context state.
    }
  };

  const handleReserveParking = async (spot) => {
    if (!user?.id) return;
    if (parkingReservation) {
      setMobilityError('You can only manage one parking reservation at a time.');
      return;
    }
    setMobilityError('');
    const duration = Math.max(1, Number(parkingDuration) || 1);
    try {
      const reservationData = await reserveParkingSpot(user.id, spot, duration);
      setParkingReservation(reservationData);
      setParkingDuration(String(reservationData.durationHours ?? duration));
      await refreshDashboardData();
    } catch (error) {
      setMobilityError(error?.message || 'Unable to reserve parking.');
    }
  };

  const handleCancelParking = async () => {
    if (!parkingReservation) return;
    setMobilityError('');
    try {
      await cancelParkingReservation(parkingReservation);
      setParkingReservation(null);
      await refreshDashboardData();
    } catch (error) {
      setMobilityError(error?.message || 'Unable to cancel parking reservation.');
    }
  };

  const handleStartParking = async () => {
    if (!parkingReservation) return;
    setMobilityError('');
    try {
      const active = await startParkingReservation(parkingReservation);
      setParkingReservation(active);
      setParkingDuration(String(active.durationHours ?? parkingDuration));
      await refreshDashboardData();
    } catch (error) {
      setMobilityError(error?.message || 'Unable to start parking session.');
    }
  };

  const handleCompleteParking = async () => {
    if (!parkingReservation) return;
    setMobilityError('');
    try {
      await completeParkingReservation(parkingReservation);
      setParkingReservation(null);
      await refreshDashboardData();
    } catch (error) {
      setMobilityError(error?.message || 'Unable to complete parking reservation.');
    }
  };

  const handleUpdateParkingDuration = async () => {
    if (!parkingReservation) return;
    setMobilityError('');
    const duration = Math.max(1, Number(parkingDuration) || 1);
    try {
      const updated = await updateParkingReservationDuration(parkingReservation, duration);
      setParkingReservation(updated);
      setParkingDuration(String(updated.durationHours ?? duration));
      await refreshDashboardData();
    } catch (error) {
      setMobilityError(error?.message || 'Unable to update parking duration.');
    }
  };

  const roleMainContent = roleDashboardCreator.createMainContent({
    renderCitizen: () => (
      <CitizenViews
        tab={tab}
        user={user}
        onSelectTab={setTab}
        vehicleType={vehicleType}
        setVehicleType={setVehicleType}
        radius={radius}
        setRadius={setRadius}
        vehicles={filteredVehicles}
        vehiclesData={vehiclesData}
        reservation={reservation}
        activeRental={activeRental}
        hasOpenVehicleFlow={Boolean(reservation || activeRental)}
        paymentDone={paymentDone}
        onReserveVehicle={handleReserveVehicle}
        onCancelReservation={clearReservation}
        onProceedPayment={beginPayment}
        onReturnVehicle={returnVehicle}
        returnPlace={returnPlace}
        setReturnPlace={setReturnPlace}
        returnTime={returnTime}
        setReturnTime={setReturnTime}
        parkingSpots={parkingSpots}
        parkingReservation={parkingReservation}
        parkingDuration={parkingDuration}
        setParkingDuration={setParkingDuration}
        onReserveParking={handleReserveParking}
        onCancelParking={handleCancelParking}
        onStartParking={handleStartParking}
        onCompleteParking={handleCompleteParking}
        onUpdateParkingDuration={handleUpdateParkingDuration}
      />
    ),
    renderProvider: () => (
      <ProviderViews
        tab={tab}
        user={user}
        loadingData={loadingData}
        vehiclesData={vehiclesData}
        providerRentals={providerRentals}
        onFleetUpdated={refreshDashboardData}
      />
    ),
    renderAdmin: () => <AdminViews tab={tab} user={user} />,
  });

  return (
    <div className="dashboard">
      <Sidebar
        user={user}
        tabs={tabs}
        tabLabels={tabLabels}
        activeTab={tab}
        onSelectTab={setTab}
        onLogout={logout}
      />

      <main className="content">
        {loadingData && <div className="panel">Loading data from Supabase...</div>}
        {rentalLoading && <div className="panel">Syncing rental state...</div>}
        {!!rentalError && <div className="panel auth-error">{rentalError}</div>}
        {!!mobilityError && <div className="panel auth-error">{mobilityError}</div>}

        {roleMainContent}

        {tab === 'profile' && <Profile user={user} role={user?.role} onUpdatePreferences={updatePreferences} />}
      </main>

      {showPaymentGate && (
        <PaymentGate
          vehicle={reservation?.vehicle}
          onConfirm={onPaymentComplete}
          onCancel={() => setShowPaymentGate(false)}
        />
      )}

      {showReservationPlanner && (
        <ReservationPlanner
          vehicle={reservationDraft}
          onConfirm={confirmReserveVehicle}
          onCancel={() => {
            setShowReservationPlanner(false);
            setReservationDraft(null);
          }}
        />
      )}
    </div>
  );
}

function ReservationPlanner({ vehicle, onConfirm, onCancel }) {
  const [plannedDurationMinutes, setPlannedDurationMinutes] = useState('30');
  const [plannedReturnPlace, setPlannedReturnPlace] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const duration = Math.max(5, Number(plannedDurationMinutes) || 0);
    const returnPlace = plannedReturnPlace.trim();
    if (!returnPlace) return;
    onConfirm({
      plannedDurationMinutes: duration,
      plannedReturnPlace: returnPlace,
    });
  };

  const estimatedCost = Math.max(5, Number(plannedDurationMinutes) || 0) * Number(vehicle?.ratePerMin ?? 0.25);

  return (
    <div style={paymentStyles.overlay}>
      <div style={paymentStyles.modal} className="fade-up">
        <div style={paymentStyles.header}>
          <div>
            <div style={paymentStyles.brand}>Plan Your Ride</div>
            <p style={paymentStyles.headerSub}>Confirm your planned duration and return location before reserving.</p>
          </div>
          <button style={paymentStyles.closeBtn} onClick={onCancel}>&times;</button>
        </div>

        <div style={paymentStyles.orderSummary}>
          <p style={{ color: 'var(--text)', fontWeight: 600, margin: 0 }}>{vehicle?.name || 'Vehicle reservation'}</p>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', margin: '2px 0 0' }}>{vehicle?.type || 'vehicle'} &mdash; ${vehicle?.ratePerMin ?? 0.25}/min</p>
        </div>

        <form onSubmit={handleSubmit} style={paymentStyles.form}>
          <div style={paymentStyles.field}>
            <label style={paymentStyles.label}>Planned usage duration (minutes)</label>
            <input
              style={paymentStyles.input}
              value={plannedDurationMinutes}
              onChange={(event) => setPlannedDurationMinutes(event.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="30"
            />
          </div>

          <div style={paymentStyles.field}>
            <label style={paymentStyles.label}>Intended return location</label>
            <input
              style={paymentStyles.input}
              value={plannedReturnPlace}
              onChange={(event) => setPlannedReturnPlace(event.target.value)}
              placeholder="Station, parking zone, or address"
              autoFocus
            />
          </div>

          <div style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
            Estimated cost: <strong>${estimatedCost.toFixed(2)}</strong>
          </div>

          <button
            type="submit"
            disabled={!plannedReturnPlace.trim()}
            style={{
              ...paymentStyles.payBtn,
              opacity: plannedReturnPlace.trim() ? 1 : 0.5,
              cursor: plannedReturnPlace.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Confirm Reservation
          </button>
        </form>
      </div>
    </div>
  );
}

function PaymentGate({ vehicle, onConfirm, onCancel }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'processing' | 'success'

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStep('processing');
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        onConfirm();
      }, 1500);
    }, 2000);
  };

  const isFormValid = cardNumber.replace(/\s/g, '').length >= 13 && expiry.length >= 4 && cvc.length >= 3 && cardName.trim().length > 0;

  return (
    <div style={paymentStyles.overlay}>
      <div style={paymentStyles.modal} className="fade-up">
        {step === 'form' && (
          <>
            <div style={paymentStyles.header}>
              <div>
                <div style={paymentStyles.brand}>SUMMS Pay</div>
                <p style={paymentStyles.headerSub}>Secure payment simulation</p>
              </div>
              <button style={paymentStyles.closeBtn} onClick={onCancel}>&times;</button>
            </div>

            <div style={paymentStyles.orderSummary}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text)', fontWeight: 600, margin: 0 }}>{vehicle?.name || 'Vehicle rental'}</p>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', margin: '2px 0 0' }}>{vehicle?.type || 'vehicle'} &mdash; ${vehicle?.ratePerMin ?? 0.25}/min</p>
                </div>
                <span style={paymentStyles.badge}>Pay-per-minute</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={paymentStyles.form}>
              <div style={paymentStyles.field}>
                <label style={paymentStyles.label}>Cardholder name</label>
                <input
                  style={paymentStyles.input}
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Jane Doe"
                  autoFocus
                />
              </div>

              <div style={paymentStyles.field}>
                <label style={paymentStyles.label}>Card number</label>
                <input
                  style={paymentStyles.input}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={paymentStyles.field}>
                  <label style={paymentStyles.label}>Expiry</label>
                  <input
                    style={paymentStyles.input}
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                <div style={paymentStyles.field}>
                  <label style={paymentStyles.label}>CVC</label>
                  <input
                    style={paymentStyles.input}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!isFormValid}
                style={{
                  ...paymentStyles.payBtn,
                  opacity: isFormValid ? 1 : 0.5,
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                }}
              >
                Confirm Payment
              </button>

              <p style={paymentStyles.disclaimer}>
                This is a simulated payment for demonstration purposes. No real charges will be made.
              </p>
            </form>
          </>
        )}

        {step === 'processing' && (
          <div style={paymentStyles.statusScreen}>
            <div style={paymentStyles.spinner} />
            <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>Processing payment...</p>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Verifying card details</p>
          </div>
        )}

        {step === 'success' && (
          <div style={paymentStyles.statusScreen}>
            <div style={paymentStyles.checkCircle}>&#10003;</div>
            <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>Payment confirmed</p>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Starting your rental...</p>
          </div>
        )}
      </div>
    </div>
  );
}

const paymentStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    width: 'min(440px, 100%)',
    background: 'var(--surface)',
    border: '1px solid var(--border-vis)',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(228,169,77,0.06)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px 24px 0',
  },
  brand: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: '1.3rem',
    color: 'var(--accent)',
    letterSpacing: '-0.03em',
  },
  headerSub: {
    color: 'var(--text-3)',
    fontSize: '0.8rem',
    margin: '2px 0 0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-3)',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  orderSummary: {
    margin: '16px 24px',
    padding: '14px 16px',
    background: 'var(--bg)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
  },
  badge: {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--accent-text)',
    background: 'var(--accent-dim)',
    padding: '4px 10px',
    borderRadius: '999px',
  },
  form: {
    display: 'grid',
    gap: '14px',
    padding: '0 24px 24px',
  },
  field: {
    display: 'grid',
    gap: '4px',
  },
  label: {
    fontSize: '0.78rem',
    fontWeight: 500,
    color: 'var(--text-2)',
    letterSpacing: '0.01em',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    background: 'var(--bg)',
    border: '1px solid var(--border-vis)',
    borderRadius: '10px',
    color: 'var(--text)',
    fontSize: '0.95rem',
    fontFamily: "'DM Sans', system-ui, monospace",
    letterSpacing: '0.04em',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    margin: 0,
  },
  payBtn: {
    width: '100%',
    padding: '13px',
    background: 'var(--accent)',
    color: '#111',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: 700,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxShadow: '0 4px 20px rgba(228,169,77,0.25)',
    transition: 'all 0.2s',
    marginTop: '4px',
  },
  disclaimer: {
    fontSize: '0.72rem',
    color: 'var(--text-3)',
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.5,
  },
  statusScreen: {
    display: 'grid',
    justifyItems: 'center',
    gap: '12px',
    padding: '60px 24px',
    textAlign: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--border-vis)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  checkCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'var(--success-dim)',
    color: 'var(--success)',
    display: 'grid',
    placeItems: 'center',
    fontSize: '1.4rem',
    fontWeight: 700,
    border: '2px solid var(--success)',
  },
};

function Sidebar({ user, tabs, tabLabels, activeTab, onSelectTab, onLogout }) {
  const roleLabel = roleDisplayName(user?.role);
  return (
    <aside className="sidebar">
      <div>
        <h2>SUMMS</h2>
        <p>{user?.name || user?.email}</p>
        <span className="status-pill" style={{ marginTop: 4, background: 'var(--accent-dim)', color: 'var(--accent-text)', fontSize: '0.7rem' }}>{roleLabel}</span>
      </div>

      <div className="stack-4">
        {tabs.map((tabName) => (
          <button
            key={tabName}
            className={`btn nav-btn ${activeTab === tabName ? 'nav-btn-active' : ''}`}
            onClick={() => onSelectTab(tabName)}
          >
            {tabLabels[tabName] || tabName}
          </button>
        ))}
      </div>

      <button className="btn btn-danger" onClick={onLogout}>Sign Out</button>
    </aside>
  );
}

function CitizenViews({
  tab,
  user,
  onSelectTab,
  vehicleType,
  setVehicleType,
  radius,
  setRadius,
  vehicles,
  vehiclesData,
  reservation,
  activeRental,
  hasOpenVehicleFlow,
  paymentDone,
  onReserveVehicle,
  onCancelReservation,
  onProceedPayment,
  onReturnVehicle,
  returnPlace,
  setReturnPlace,
  returnTime,
  setReturnTime,
  parkingSpots,
  parkingReservation,
  parkingDuration,
  setParkingDuration,
  onReserveParking,
  onCancelParking,
  onStartParking,
  onCompleteParking,
  onUpdateParkingDuration,
}) {
  return (
    <>
      {tab === 'dashboard' && (
        <DashboardPage user={user} onSelectTab={onSelectTab} reservation={reservation} activeRental={activeRental} vehiclesData={vehiclesData} parkingSpots={parkingSpots} />
      )}

      {tab === 'recommendations' && (
        <RecommendationsView user={user} onSelectTab={onSelectTab} />
      )}

      {tab === 'mobility' && (
        <MobilityPage
          user={user}
          vehicleType={vehicleType}
          setVehicleType={setVehicleType}
          radius={radius}
          setRadius={setRadius}
          vehicles={vehicles}
          reservation={reservation}
          activeRental={activeRental}
          hasOpenVehicleFlow={hasOpenVehicleFlow}
          paymentDone={paymentDone}
          onReserveVehicle={onReserveVehicle}
          onCancelReservation={onCancelReservation}
          onProceedPayment={onProceedPayment}
          onSelectTab={onSelectTab}
        />
      )}

      {tab === 'parking' && (
        <Section title="Parking" subtitle="Find and reserve parking spots">
          {parkingReservation && (
            <div className="status-panel fade-up" style={{ borderColor: parkingReservation.status === 'active' ? 'rgba(90,228,167,0.3)' : 'rgba(228,169,77,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>{parkingReservation.spot?.address || 'Parking Spot'}</h3>
                <span className={`status-pill ${parkingReservation.status === 'active' ? 'is-active' : 'is-reserved'}`}>
                  {parkingReservation.status}
                </span>
              </div>
              <div className="vehicle-card-meta">
                <span>{parkingReservation.durationHours}h reserved</span>
                <span>Est. ${parkingReservation.estimatedCost}</span>
              </div>
              {parkingReservation.status === 'reserved' && (
                <div className="row wrap gap-8">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--text-3)', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>Duration</span>
                    <input value={parkingDuration} onChange={(e) => setParkingDuration(e.target.value)} style={{ width: 60, textAlign: 'center' }} />
                    <span style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>hrs</span>
                  </label>
                  <button className="btn btn-soft" onClick={onUpdateParkingDuration}>Update</button>
                </div>
              )}
              <div className="row wrap gap-8">
                {parkingReservation.status === 'reserved' && (
                  <button className="btn btn-primary" onClick={onStartParking}>Start Parking</button>
                )}
                {parkingReservation.status === 'active' && (
                  <button className="btn btn-primary" onClick={onCompleteParking}>Complete &amp; Pay</button>
                )}
                <button className="btn btn-soft" onClick={onCancelParking}>Cancel</button>
              </div>
            </div>
          )}

          {!parkingReservation && (
            <div className="panel stack-12">
              <div className="row wrap gap-8" style={{ alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>Reserve for</span>
                  <input value={parkingDuration} onChange={(e) => setParkingDuration(e.target.value)} style={{ width: 60, textAlign: 'center' }} />
                  <span style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>hours</span>
                </label>
              </div>
            </div>
          )}

          <ParkingMap spots={parkingSpots} onReserve={onReserveParking} parkingReservation={parkingReservation} />

          <div className="grid-2">
            {parkingSpots.map((spot) => {
              const pct = spot.total > 0 ? Math.round(((spot.total - spot.available) / spot.total) * 100) : 0;
              return (
                <div className="vehicle-card" key={spot.id}>
                  <h3>{spot.address}</h3>
                  <div className="vehicle-card-meta">
                    <span>{spot.available}/{spot.total} available</span>
                    <span>{spot.distance} km</span>
                    <span>${(spot.pricePerHour ?? 2.5)}/h</span>
                  </div>
                  <div style={{ width: '100%', height: 6, borderRadius: 99, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: pct > 85 ? 'var(--error)' : pct > 60 ? 'var(--warning)' : 'var(--success)', transition: 'width 0.3s' }} />
                  </div>
                  <button className="btn btn-primary" disabled={spot.available <= 0 || Boolean(parkingReservation)} onClick={() => onReserveParking(spot)} style={{ marginTop: 4 }}>
                    Reserve
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {tab === 'transit' && <TransitStatusPage />}

      {tab === 'analytics' && <AnalyticsPage user={user} />}

      {tab === 'activeRental' && (
        <Section title="Active Rental" subtitle="Track or return your vehicle">
          <RentalStepIndicator reservation={reservation} activeRental={activeRental} paymentDone={paymentDone} />

          {!activeRental && reservation && (
            <div className="status-panel fade-up" style={{ borderColor: 'rgba(228,169,77,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Ready to ride</h3>
                <span className="status-pill is-reserved">Reserved</span>
              </div>
              <p style={{ color: 'var(--text-2)' }}>{reservation.vehicle?.name || `Vehicle #${reservation.vehicleId}`} &mdash; {reservation.vehicle?.type || 'vehicle'}</p>
              <div className="vehicle-card-meta">
                {reservation.plannedDurationMinutes > 0 && <span>Planned {reservation.plannedDurationMinutes} min</span>}
                {reservation.plannedReturnPlace && <span>Return to {reservation.plannedReturnPlace}</span>}
              </div>
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Tap below to confirm payment and start your rental.</p>
              <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={onProceedPayment}>Confirm &amp; Start Rental</button>
            </div>
          )}

          {!activeRental && !reservation && !paymentDone && (
            <div className="panel fade-up" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--text-3)', marginBottom: 12 }}>No active rental right now.</p>
              <button className="btn btn-primary" onClick={() => onSelectTab('mobility')}>Find a Vehicle</button>
            </div>
          )}

          {activeRental && (
            <div className="status-panel fade-up" style={{ borderColor: 'rgba(90,228,167,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>{activeRental.vehicle?.name}</h3>
                <span className="status-pill is-active">In Progress</span>
              </div>
              <div className="vehicle-card-meta">
                <span>{activeRental.vehicle?.type}</span>
                <span>Started {new Date(activeRental.startTime).toLocaleTimeString()}</span>
                <span>${activeRental.vehicle?.ratePerMin ?? 0.25}/min</span>
              </div>
              <div className="grid-2" style={{ marginTop: 12 }}>
                <label>Return place
                  <input value={returnPlace} onChange={(e) => setReturnPlace(e.target.value)} placeholder="Station, parking zone, or address" />
                </label>
                <label>Return time
                  <input value={returnTime} onChange={(e) => setReturnTime(e.target.value)} type="datetime-local" />
                </label>
              </div>
              <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={onReturnVehicle}>Return Vehicle &amp; Complete</button>
            </div>
          )}

          {paymentDone && (
            <div className="status-panel fade-up" style={{ borderColor: 'rgba(90,228,167,0.35)', background: 'var(--success-dim)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="status-pill is-completed">Completed</span>
                <h3 style={{ color: 'var(--success)' }}>Rental complete</h3>
              </div>
              <p style={{ color: 'var(--text-2)' }}>Your receipt has been recorded. Thank you for riding with SUMMS.</p>
              <button className="btn btn-soft" style={{ width: 'fit-content' }} onClick={() => onSelectTab('mobility')}>Start another rental</button>
            </div>
          )}
        </Section>
      )}
    </>
  );
}

/* ─── Dashboard Page (map-centric home) ─── */
function DashboardPage({ user, onSelectTab, reservation, activeRental, vehiclesData, parkingSpots }) {
  const [bixiStations, setBixiStations] = useState([]);
  const [bixiStats, setBixiStats] = useState(null);
  const [stmStatus, setStmStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [stations, stm] = await Promise.all([
          fetchBixiStations(),
          fetchStmStatus(),
        ]);
        if (!mounted) return;
        setBixiStations(stations);
        setBixiStats(getBixiStats(stations));
        setStmStatus(stm);
      } catch (err) {
        console.warn('Dashboard data load error:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const scootersAvailable = vehiclesData.filter(v => v.type === 'scooter' && (v.available || v.status === 'available')).length;
  const bikesAvailable = vehiclesData.filter(v => v.type === 'bike' && (v.available || v.status === 'available')).length;
  const totalParkingAvailable = parkingSpots.reduce((s, p) => s + (p.available || 0), 0);

  // STM alerts banner
  const disruptedLines = stmStatus?.lines?.filter(l => l.status === 'disrupted') || [];

  return (
    <Section title={`Welcome back${user?.name ? ', ' + user.name.split(' ')[0] : ''}`} subtitle="Your mobility dashboard">
      <RecommendationBanner user={user} onSelectTab={onSelectTab} />

      {/* STM Alert Banner */}
      {disruptedLines.length > 0 && (
        <div className="panel fade-up" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }}>
          <h3 style={{ color: 'var(--error)', margin: '0 0 6px' }}>STM Service Disruptions</h3>
          {disruptedLines.map(line => (
            <p key={line.id} style={{ color: 'var(--text-2)', margin: '2px 0' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: line.color, marginRight: 8, verticalAlign: 'middle' }} />
              {line.name} &mdash; disrupted
            </p>
          ))}
          <button className="btn btn-soft" style={{ marginTop: 8, width: 'fit-content' }} onClick={() => onSelectTab('transit')}>View details</button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="stat-row fade-up">
        <div className="stat-badge">
          <div className="stat-badge-value">{bixiStats?.totalBikes ?? '...'}</div>
          <div className="stat-badge-label">BIXI Bikes</div>
        </div>
        <div className="stat-badge">
          <div className="stat-badge-value">{scootersAvailable}</div>
          <div className="stat-badge-label">Scooters</div>
        </div>
        <div className="stat-badge">
          <div className="stat-badge-value">{totalParkingAvailable}</div>
          <div className="stat-badge-label">Parking Spots</div>
        </div>
        <div className="stat-badge">
          <div className="stat-badge-value">{bixiStats?.totalStations ?? '...'}</div>
          <div className="stat-badge-label">BIXI Stations</div>
        </div>
      </div>

      {/* Active reservation/rental banner */}
      {(reservation || activeRental) && (
        <div className="status-panel fade-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{activeRental ? 'Rental in progress' : 'Reservation pending'}</h3>
            <span className={`status-pill ${activeRental ? 'is-active' : 'is-reserved'}`}>
              {activeRental ? 'Active' : 'Reserved'}
            </span>
          </div>
          <p style={{ color: 'var(--text-2)' }}>{(activeRental?.vehicle?.name || reservation?.vehicle?.name) || 'Vehicle'} &mdash; {activeRental?.vehicle?.type || reservation?.vehicle?.type}</p>
          <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={() => onSelectTab('activeRental')}>
            {activeRental ? 'Return vehicle' : 'Continue to payment'}
          </button>
        </div>
      )}

      {/* Map with BIXI stations */}
      {!loading && bixiStations.length > 0 && (
        <div className="panel fade-up" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
          <VehicleMap vehicles={vehiclesData} bixiStations={bixiStations} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid-2">
        <div className="quick-action fade-up fade-up-1" onClick={() => onSelectTab('mobility')}>
          <h3>Find a Vehicle</h3>
          <p>BIXI bikes, scooters — locate and reserve instantly</p>
        </div>
        <div className="quick-action fade-up fade-up-2" onClick={() => onSelectTab('transit')}>
          <h3>Metro Status</h3>
          <p>Real-time STM metro line service status</p>
        </div>
        <div className="quick-action fade-up fade-up-3" onClick={() => onSelectTab('parking')}>
          <h3>Parking</h3>
          <p>Find and reserve available parking spots</p>
        </div>
        <div className="quick-action fade-up fade-up-4" onClick={() => onSelectTab('analytics')}>
          <h3>Analytics</h3>
          <p>Usage stats, BIXI data, and mobility trends</p>
        </div>
      </div>
    </Section>
  );
}

/* ─── Mobility Page (BIXI + scooters) ─── */
function MobilityPage({ user, vehicleType, setVehicleType, radius, setRadius, vehicles, reservation, activeRental, hasOpenVehicleFlow, paymentDone, onReserveVehicle, onCancelReservation, onProceedPayment, onSelectTab }) {
  const [bixiStations, setBixiStations] = useState([]);
  const [bixiStats, setBixiStats] = useState(null);
  const [bixiLoading, setBixiLoading] = useState(true);
  const [showBixi, setShowBixi] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchBixiStations().then(stations => {
      if (!mounted) return;
      setBixiStations(stations);
      setBixiStats(getBixiStats(stations));
      setBixiLoading(false);
    }).catch(() => { if (mounted) setBixiLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <Section title="Mobility" subtitle="BIXI bikes and scooter rentals">
      <RentalStepIndicator reservation={reservation} activeRental={activeRental} paymentDone={paymentDone} />

      {/* BIXI Stats Banner */}
      {bixiStats && (
        <div className="stat-row fade-up">
          <div className="stat-badge">
            <div className="stat-badge-value">{bixiStats.totalStations}</div>
            <div className="stat-badge-label">BIXI Stations</div>
          </div>
          <div className="stat-badge">
            <div className="stat-badge-value">{bixiStats.totalBikes}</div>
            <div className="stat-badge-label">Bikes Available</div>
          </div>
          <div className="stat-badge">
            <div className="stat-badge-value">{bixiStats.totalEbikes}</div>
            <div className="stat-badge-label">E-Bikes</div>
          </div>
          <div className="stat-badge">
            <div className="stat-badge-value">{bixiStats.utilizationPct}%</div>
            <div className="stat-badge-label">Utilization</div>
          </div>
        </div>
      )}

      {/* Toggle + Filters */}
      <div className="panel stack-12">
        <div className="row wrap gap-8">
          <button className={`btn ${showBixi ? 'btn-primary-soft' : 'btn-soft'}`} onClick={() => setShowBixi(true)}>BIXI Stations</button>
          <button className={`btn ${!showBixi ? 'btn-primary-soft' : 'btn-soft'}`} onClick={() => setShowBixi(false)}>Scooters &amp; Bikes</button>
        </div>

        {!showBixi && (
          <div className="row wrap gap-8">
            {['all', 'scooter', 'bike'].map((type) => (
              <button key={type} className={`btn ${vehicleType === type ? 'btn-primary-soft' : 'btn-soft'}`} onClick={() => setVehicleType(type)}>
                {type === 'all' ? 'All types' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <span style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>Radius</span>
              <input value={radius} onChange={(e) => setRadius(e.target.value)} style={{ width: 70, textAlign: 'center' }} />
              <span style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>km</span>
            </label>
          </div>
        )}
      </div>

      {/* Map */}
      <VehicleMap vehicles={showBixi ? [] : vehicles} bixiStations={showBixi ? bixiStations : []} onReserve={showBixi ? undefined : onReserveVehicle} reservation={reservation} activeRental={activeRental} />

      {/* Reservation status */}
      {reservation && (
        <div className="status-panel fade-up" style={{ borderColor: 'rgba(228,169,77,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Reserved: {reservation.vehicle?.name || `Vehicle #${reservation.vehicleId}`}</h3>
            <span className="status-pill is-reserved">Reserved</span>
          </div>
          <p style={{ color: 'var(--text-2)' }}>{reservation.vehicle?.type} &mdash; ${reservation.vehicle?.ratePerMin ?? 0.25}/min</p>
          <div className="vehicle-card-meta">
            {reservation.plannedDurationMinutes > 0 && <span>Planned {reservation.plannedDurationMinutes} min</span>}
            {reservation.plannedReturnPlace && <span>Return to {reservation.plannedReturnPlace}</span>}
          </div>
          <div className="row gap-8">
            <button className="btn btn-primary" onClick={onProceedPayment}>Confirm &amp; Start Rental</button>
            <button className="btn btn-soft" onClick={onCancelReservation}>Cancel</button>
          </div>
        </div>
      )}

      {/* BIXI Station List */}
      {showBixi && !bixiLoading && (
        <div className="grid-2">
          {bixiStations.slice(0, 20).map((station) => (
            <div className="vehicle-card" key={station.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <h3 style={{ fontSize: '0.92rem' }}>{station.name}</h3>
                <span className="vehicle-card-type">BIXI</span>
              </div>
              <div className="vehicle-card-meta">
                <span>{station.bikesAvailable} bikes</span>
                <span>{station.ebikesAvailable} e-bikes</span>
                <span>{station.docksAvailable} docks free</span>
              </div>
              <div style={{ width: '100%', height: 5, borderRadius: 99, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${station.capacity > 0 ? Math.round(((station.capacity - station.docksAvailable) / station.capacity) * 100) : 0}%`, borderRadius: 99, background: 'var(--accent)', transition: 'width 0.3s' }} />
              </div>
            </div>
          ))}
          {bixiStations.length > 20 && (
            <div className="panel" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-3)' }}>Showing 20 of {bixiStations.length} stations</p>
            </div>
          )}
        </div>
      )}

      {/* Scooter/Bike List */}
      {!showBixi && !reservation && (
        <div className="grid-2">
          {vehicles.map((vehicle) => (
            <div className="vehicle-card" key={vehicle.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <h3>{vehicle.name}</h3>
                <span className="vehicle-card-type">{vehicle.type}</span>
              </div>
              <div className="vehicle-card-meta">
                <span>{vehicle.distance} km away</span>
                <span>${vehicle.ratePerMin}/min</span>
              </div>
              <button className="btn btn-primary" disabled={hasOpenVehicleFlow || vehicle.status !== 'available'} onClick={() => onReserveVehicle(vehicle)} style={{ marginTop: 4 }}>
                Reserve
              </button>
            </div>
          ))}
          {vehicles.length === 0 && <div className="panel"><p style={{ color: 'var(--text-3)' }}>No vehicles match your filters.</p></div>}
        </div>
      )}
    </Section>
  );
}

/* ─── Transit Status Page (STM metro status) ─── */
function TransitStatusPage() {
  const [stmData, setStmData] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [busSearch, setBusSearch] = useState('');
  const [scheduleMode, setScheduleMode] = useState('metro');
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [data, schedules] = await Promise.all([
          fetchStmStatus(),
          fetchStmSchedules({ mode: 'metro', limit: 4 }),
        ]);
        if (mounted) {
          setStmData(data);
          setScheduleData(schedules);
        }
      } catch (err) {
        console.warn('STM status error:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const searchBusSchedules = async (event) => {
    event.preventDefault();
    const cleanQuery = busSearch.trim();
    setScheduleLoading(true);
    try {
      const schedules = await fetchStmSchedules({
        mode: cleanQuery ? 'bus' : 'metro',
        query: cleanQuery,
        limit: cleanQuery ? 6 : 4,
      });
      setScheduleMode(cleanQuery ? 'bus' : 'metro');
      setScheduleData(schedules);
    } catch (err) {
      console.warn('STM schedule search error:', err.message);
    } finally {
      setScheduleLoading(false);
    }
  };

  const lines = stmData?.lines || [];
  const normalCount = lines.filter(l => l.status === 'normal').length;
  const disruptedCount = lines.filter(l => l.status === 'disrupted').length;

  return (
    <Section title="Transit" subtitle="STM Metro Service Status">
      {loading && <div className="panel">Loading STM service status...</div>}

      {!loading && (
        <>
          {/* Summary stats */}
          <div className="stat-row fade-up">
            <div className="stat-badge">
              <div className="stat-badge-value">{lines.length}</div>
              <div className="stat-badge-label">Metro Lines</div>
            </div>
            <div className="stat-badge">
              <div className="stat-badge-value" style={{ color: 'var(--success)' }}>{normalCount}</div>
              <div className="stat-badge-label">Normal Service</div>
            </div>
            <div className="stat-badge">
              <div className="stat-badge-value" style={{ color: disruptedCount > 0 ? 'var(--error)' : 'var(--text-3)' }}>{disruptedCount}</div>
              <div className="stat-badge-label">Disrupted</div>
            </div>
            <div className="stat-badge">
              <div className="stat-badge-value" style={{ fontSize: '0.7rem' }}>{stmData?.source || '...'}</div>
              <div className="stat-badge-label">Source</div>
            </div>
          </div>

          <div className="panel stack-8 fade-up">
            <h3>{scheduleMode === 'bus' ? 'Bus Departures' : 'Next Metro Departures'}</h3>
            <form className="row wrap gap-8" onSubmit={searchBusSchedules}>
              <input
                value={busSearch}
                onChange={(event) => setBusSearch(event.target.value)}
                placeholder="Search bus route or stop"
                style={{ minWidth: 220, flex: 1 }}
              />
              <button className="btn btn-soft" type="submit" disabled={scheduleLoading}>
                {scheduleLoading ? 'Searching...' : 'Search Bus'}
              </button>
              <button
                className="btn btn-soft"
                type="button"
                onClick={() => {
                  setBusSearch('');
                  setScheduleLoading(true);
                  fetchStmSchedules({ mode: 'metro', limit: 4 })
                    .then((schedules) => {
                      setScheduleMode('metro');
                      setScheduleData(schedules);
                    })
                    .finally(() => setScheduleLoading(false));
                }}
              >
                Metro
              </button>
            </form>
            <p style={{ color: 'var(--text-2)', margin: 0, fontSize: '0.86rem' }}>
              {scheduleData?.schedules?.length
                ? `${scheduleData.schedules.length} departures from ${scheduleData.source}.`
                : scheduleData?.message || 'STM schedule feed is not connected yet. Showing live service status only.'}
            </p>
            {scheduleData?.schedules?.length > 0 && (
              <div className="transit-schedule-list">
                {scheduleData.schedules.slice(0, 6).map((item) => (
                  <div key={item.id} className="transit-schedule-row">
                    <span className={`transit-schedule-route ${scheduleMode === 'metro' ? 'is-metro' : ''}`}>
                      {scheduleMode === 'metro' ? (item.routeLabel || `Line ${item.route}`) : item.route}
                    </span>
                    <div className="transit-schedule-main">
                      <strong>{item.headsign || 'STM'}</strong>
                      <span>{item.stopName}</span>
                    </div>
                    <span className="transit-schedule-time">{item.departureTime}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Line cards */}
          <div className="grid-2">
            {lines.map((line) => (
              <div key={line.id} className="vehicle-card fade-up" style={{ borderLeft: `4px solid ${line.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 4, background: line.color }} />
                    {line.name}
                  </h3>
                  <span className={`status-pill ${line.status === 'normal' ? 'is-active' : line.status === 'disrupted' ? 'is-reserved' : ''}`}>
                    {line.status === 'normal' ? 'Normal' : line.status === 'disrupted' ? 'Disrupted' : 'Unknown'}
                  </span>
                </div>
                {line.alerts.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {line.alerts.map((alert, i) => (
                      <p key={i} style={{ color: 'var(--text-3)', fontSize: '0.84rem', margin: '4px 0' }}>{typeof alert === 'string' ? alert.slice(0, 200) : 'Service alert'}</p>
                    ))}
                  </div>
                )}
                {line.status === 'normal' && line.alerts.length === 0 && (
                  <p style={{ color: 'var(--success)', fontSize: '0.84rem', marginTop: 6 }}>Service running normally</p>
                )}
              </div>
            ))}
          </div>

          {/* Raw alerts section */}
          {stmData?.rawAlerts?.length > 0 && (
            <div className="panel stack-8">
              <h3>All Service Messages ({stmData.rawAlerts.length})</h3>
              {stmData.rawAlerts.slice(0, 10).map((alert, i) => (
                <div key={i} className="card" style={{ fontSize: '0.85rem' }}>
                  <p style={{ color: 'var(--text-2)', margin: 0 }}>{typeof alert === 'string' ? alert : JSON.stringify(alert).slice(0, 300)}</p>
                </div>
              ))}
            </div>
          )}

          <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', textAlign: 'center' }}>
            Last updated: {stmData?.updatedAt ? new Date(stmData.updatedAt).toLocaleTimeString() : 'N/A'} &mdash; Auto-refreshes every 60s
          </p>
        </>
      )}
    </Section>
  );
}

/* ─── Analytics Page ─── */
function AnalyticsPage({ user }) {
  const [rentalStats, setRentalStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    totalMinutes: 0,
    averageMinutes: 0,
    longestMinutes: 0,
    lastReturnPlace: '',
    rentals: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data: rentals } = await supabase
          .from('rentals')
          .select('*')
          .eq('user_id', Number(user?.id));
        if (!mounted) return;
        if (rentals) {
          const rentalsWithDuration = rentals.map((rental) => {
            const start = new Date(rental.start_time || rental.created_at || Date.now()).getTime();
            const end = rental.end_time ? new Date(rental.end_time).getTime() : Date.now();
            const computedMinutes = Number.isFinite(start) && Number.isFinite(end)
              ? Math.max(1, Math.round((end - start) / 60000))
              : 0;
            return {
              ...rental,
              durationMinutes: Number(rental.rental_duration_minutes || computedMinutes || 0),
            };
          });
          const completed = rentalsWithDuration.filter(r => r.status === 'completed');
          const totalMinutes = completed.reduce((sum, rental) => sum + rental.durationMinutes, 0);
          const sortedCompleted = [...completed].sort((a, b) => new Date(b.end_time || 0) - new Date(a.end_time || 0));
          const recentRentals = [...rentalsWithDuration]
            .sort((a, b) => new Date(b.end_time || b.start_time || b.created_at || 0) - new Date(a.end_time || a.start_time || a.created_at || 0))
            .slice(0, 5);
          setRentalStats({
            total: rentals.length,
            active: rentals.filter(r => r.status === 'active').length,
            completed: completed.length,
            totalMinutes,
            averageMinutes: completed.length ? Math.round(totalMinutes / completed.length) : 0,
            longestMinutes: completed.reduce((max, rental) => Math.max(max, rental.durationMinutes), 0),
            lastReturnPlace: sortedCompleted[0]?.return_place || sortedCompleted[0]?.return_location || '',
            rentals: recentRentals,
          });
        }
      } catch (err) {
        console.warn('Analytics load error:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user?.id]);

  return (
    <Section title="Rental Time Analytics" subtitle="Your rental duration, active time, and completed trip history">
      {loading && <div className="panel">Loading analytics...</div>}

      {!loading && (
        <>
          {/* Key Metrics */}
          <div className="stat-row fade-up">
            <div className="stat-badge">
              <div className="stat-badge-value">{rentalStats.totalMinutes}</div>
              <div className="stat-badge-label">Rental Minutes</div>
            </div>
            <div className="stat-badge">
              <div className="stat-badge-value">{rentalStats.active}</div>
              <div className="stat-badge-label">Active Now</div>
            </div>
            <div className="stat-badge">
              <div className="stat-badge-value">{rentalStats.completed}</div>
              <div className="stat-badge-label">Completed Trips</div>
            </div>
            <div className="stat-badge">
              <div className="stat-badge-value">{rentalStats.averageMinutes}</div>
              <div className="stat-badge-label">Avg Minutes</div>
            </div>
          </div>

          <div className="panel stack-12 fade-up">
            <h3>Rental Time Summary</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <ChartBar label="Completed rentals" value={rentalStats.completed} max={Math.max(1, rentalStats.total)} color="var(--accent)" />
              <ChartBar label="Longest rental" value={rentalStats.longestMinutes} max={Math.max(1, rentalStats.longestMinutes, rentalStats.averageMinutes)} color="var(--success)" suffix=" min" />
              <ChartBar label="Average rental" value={rentalStats.averageMinutes} max={Math.max(1, rentalStats.longestMinutes, rentalStats.averageMinutes)} color="#4ECDC4" suffix=" min" />
            </div>
            {rentalStats.lastReturnPlace && <p style={{ color: 'var(--text-3)', margin: 0 }}>Last return: {rentalStats.lastReturnPlace}</p>}
          </div>

          <div className="panel stack-12 fade-up">
            <h3>Recent Rentals</h3>
            {rentalStats.rentals.length === 0 && (
              <p style={{ color: 'var(--text-3)', margin: 0 }}>No rental history yet.</p>
            )}
            {rentalStats.rentals.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                {rentalStats.rentals.map((rental) => (
                  <div key={rental.id} className="card">
                    <h3>{rental.status === 'active' ? 'Active rental' : 'Completed rental'}</h3>
                    <div className="vehicle-card-meta">
                      <span>{rental.durationMinutes} min</span>
                      <span>{rental.start_time ? new Date(rental.start_time).toLocaleDateString() : 'Date unavailable'}</span>
                      {rental.return_place && <span>{rental.return_place}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Section>
  );
}

function ChartBar({ label, value, max, color, suffix = '' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-2)', fontSize: '0.84rem' }}>{label}</span>
        <span style={{ color: 'var(--text)', fontSize: '0.84rem', fontWeight: 600 }}>{value}{suffix}</span>
      </div>
      <div style={{ width: '100%', height: 8, borderRadius: 99, background: 'var(--surface-alt)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function ProviderViews({ tab, user, loadingData, vehiclesData, providerRentals, onFleetUpdated }) {
  return (
    <>
      {tab === 'home' && (
        <Section title="Fleet Overview" subtitle="Manage your vehicles and track rental performance">
          <div className="stat-row fade-up">
            <div className="stat-badge">
              <div className="stat-badge-value">{vehiclesData.length}</div>
              <div className="stat-badge-label">Total Vehicles</div>
            </div>
            <div className="stat-badge">
              <div className="stat-badge-value">{vehiclesData.filter(v => v.available || v.status === 'available').length}</div>
              <div className="stat-badge-label">Available</div>
            </div>
            <div className="stat-badge">
              <div className="stat-badge-value">{providerRentals.length}</div>
              <div className="stat-badge-label">Total Rentals</div>
            </div>
            <div className="stat-badge">
              <div className="stat-badge-value">${providerRentals.reduce((s, r) => s + (r.cost || 0), 0).toFixed(2)}</div>
              <div className="stat-badge-label">Revenue</div>
            </div>
          </div>
        </Section>
      )}

      {tab === 'vehicles' && (
        <ProviderVehicles
          providerId={user?.id}
          loadingData={loadingData}
          initialVehicles={vehiclesData}
          onFleetUpdated={onFleetUpdated}
        />
      )}
      {tab === 'rentalData' && <ProviderRentalData rentals={providerRentals} />}
    </>
  );
}

function AdminViews({ tab, user }) {
  const isCityAdmin = user?.role === ROLES.CITY_ADMIN;
  const isSystemAdmin = user?.role === ROLES.SYSTEM_ADMIN;
  const dashboardMode = isCityAdmin ? 'cityOperations' : isSystemAdmin ? 'systemOperations' : 'overview';
  const title = isCityAdmin ? 'City Operations Center' : isSystemAdmin ? 'System Operations Center' : 'Operations Center';
  const subtitle = isCityAdmin ? 'City mobility monitoring and rental analytics' : isSystemAdmin ? 'Platform health and gateway monitoring' : 'System monitoring and analytics';
  return (
    <>
      {tab === 'home' && (
        <Section title={title} subtitle={subtitle}>
          <div className="grid-2 fade-up">
            {!isSystemAdmin && (
              <div className="quick-action" onClick={() => {}}>
                <h3>Rental Analytics</h3>
                <p>Rental duration, fleet demand, and active rental tracking</p>
              </div>
            )}
            {!isCityAdmin && (
              <div className="quick-action" onClick={() => {}}>
                <h3>Gateway Monitor</h3>
                <p>API health, request logs, and service status</p>
              </div>
            )}
          </div>
          <AdminDashboard mode={dashboardMode} />
        </Section>
      )}

      {tab === 'rentalAnalytics' && <RentalAnalytics />}
      {tab === 'gatewayAnalytics' && <GatewayAnalytics />}
      {tab === 'adminDashboard' && <AdminDashboard mode={dashboardMode} />}
    </>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="stack-16">
      <header>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function Card({ title, text, action }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function RentalStepIndicator({ reservation, activeRental, paymentDone }) {
  const step = paymentDone ? 4 : activeRental ? 3 : reservation ? 2 : 1;
  const steps = [
    { num: 1, label: 'Search' },
    { num: 2, label: 'Reserve' },
    { num: 3, label: 'Ride' },
    { num: 4, label: 'Done' },
  ];
  return (
    <div className="rental-steps">
      {steps.map((s) => (
        <div key={s.num} className={`rental-step ${step === s.num ? 'is-active' : ''} ${step > s.num ? 'is-done' : ''}`}>
          <div className="rental-step-dot">{step > s.num ? '\u2713' : s.num}</div>
          <div className="rental-step-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function ProviderVehicles({ providerId, initialVehicles = [], loadingData = false, onFleetUpdated }) {
  const [vehicles, setVehicles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ type: '', location: '', rate_per_min: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ type: 'scooter', location: '', rate_per_min: '0.25' });

  useEffect(() => {
    setVehicles(initialVehicles);
  }, [initialVehicles]);

  const resolvedProviderId = Number(providerId);

  const addVehicle = async () => {
    if (!addForm.location.trim() || !Number.isFinite(resolvedProviderId)) return;
    const newVehicle = {
      type: addForm.type.toLowerCase(),
      location: addForm.location.trim(),
      available: true,
      rate_per_min: parseFloat(addForm.rate_per_min) || 0.25,
      provider_id: resolvedProviderId,
    };
    const { data, error } = await supabase.from('vehicles').insert(newVehicle).select().single();
    if (!error && data) {
      setVehicles((prev) => [...prev, data]);
      setShowAddForm(false);
      setAddForm({ type: 'scooter', location: '', rate_per_min: '0.25' });
      await onFleetUpdated?.();
    }
  };

  const startEdit = (vehicle) => {
    const currentRate = vehicle.rate_per_min ?? vehicle.ratePerMin ?? 0.25;
    setEditingId(vehicle.id);
    setEditForm({
      type: vehicle.type || 'scooter',
      location: vehicle.location || '',
      rate_per_min: String(currentRate),
    });
  };

  const saveEdit = async (vehicleId) => {
    if (!Number.isFinite(resolvedProviderId)) return;
    const updates = {
      type: editForm.type.toLowerCase(),
      location: editForm.location.trim(),
      rate_per_min: parseFloat(editForm.rate_per_min) || 0.25,
    };
    const { error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', vehicleId)
      .eq('provider_id', resolvedProviderId);
    if (!error) {
      setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? { ...v, ...updates } : v)));
      setEditingId(null);
      await onFleetUpdated?.();
    }
  };

  const toggleVehicleStatus = async (vehicleId) => {
    if (!Number.isFinite(resolvedProviderId)) return;
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    const isAvailable = typeof vehicle.available === 'boolean' ? vehicle.available : vehicle.status === 'available';
    const newAvailable = !isAvailable;
    const { error } = await supabase
      .from('vehicles')
      .update({ available: newAvailable })
      .eq('id', vehicleId)
      .eq('provider_id', resolvedProviderId);
    if (!error) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicleId
            ? { ...v, available: newAvailable, status: newAvailable ? 'available' : 'unavailable' }
            : v
        )
      );
      await onFleetUpdated?.();
    }
  };

  const removeVehicle = async (vehicleId) => {
    if (!Number.isFinite(resolvedProviderId)) return;
    if (!window.confirm('Remove this vehicle?')) return;
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('provider_id', resolvedProviderId);
    if (!error) {
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      await onFleetUpdated?.();
    }
  };

  if (loadingData) return (
    <Section title="Vehicles" subtitle="Fleet management">
      <div className="panel">Loading...</div>
    </Section>
  );

  return (
    <Section title="Vehicles" subtitle="Fleet management">
      {!showAddForm ? (
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>Add vehicle</button>
      ) : (
        <div className="panel stack-12">
          <h3>Add new vehicle</h3>
          <label>
            Type
            <select value={addForm.type} onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="scooter">Scooter</option>
              <option value="bike">Bike</option>
            </select>
          </label>
          <label>
            Location
            <input value={addForm.location} onChange={(e) => setAddForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Montreal Downtown" />
          </label>
          <label>
            Rate ($/min)
            <input value={addForm.rate_per_min} onChange={(e) => setAddForm((f) => ({ ...f, rate_per_min: e.target.value }))} placeholder="0.25" />
          </label>
          <div className="row gap-8">
            <button className="btn btn-primary" onClick={addVehicle}>Save</button>
            <button className="btn btn-soft" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {!loadingData && vehicles.length === 0 && (
        <div className="panel">No vehicles found for your provider account yet.</div>
      )}

      <div className="grid-2">
        {vehicles.map((vehicle) => (
          <div className="card stack-8" key={vehicle.id}>
            {editingId === vehicle.id ? (
              <>
                <h3>Edit vehicle #{vehicle.id}</h3>
                <label>
                  Type
                  <select value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}>
                    <option value="scooter">Scooter</option>
                    <option value="bike">Bike</option>
                  </select>
                </label>
                <label>
                  Location
                  <input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
                </label>
                <label>
                  Rate ($/min)
                  <input value={editForm.rate_per_min} onChange={(e) => setEditForm((f) => ({ ...f, rate_per_min: e.target.value }))} />
                </label>
                <div className="row gap-8">
                  <button className="btn btn-primary" onClick={() => saveEdit(vehicle.id)}>Save</button>
                  <button className="btn btn-soft" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <h3>{vehicle.type} #{vehicle.id}</h3>
                <p>Location: {vehicle.location || 'N/A'}</p>
                <p>Rate: ${vehicle.rate_per_min ?? vehicle.ratePerMin ?? 0.25}/min</p>
                <p>Status: {(typeof vehicle.available === 'boolean' ? vehicle.available : vehicle.status === 'available') ? 'available' : 'unavailable'}</p>
                <div className="row gap-8 wrap">
                  <button className="btn btn-soft" onClick={() => startEdit(vehicle)}>Edit</button>
                  <button className="btn btn-soft" onClick={() => toggleVehicleStatus(vehicle.id)}>Toggle status</button>
                  <button className="btn btn-soft" style={{ color: '#ef4444' }} onClick={() => removeVehicle(vehicle.id)}>Remove</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
function formatRentalDate(raw) {
  if (!raw || raw === 'N/A') return 'N/A';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function ProviderRentalData({ rentals = [] }) {
  return (
    <Section title="Rental records" subtitle="Manage and view rental data">
      {rentals.length === 0 && <div className="panel">No rental records found.</div>}

      <div className="grid-2">
        {rentals.map((record) => (
          <Card
            key={record.id}
            title={record.vehicle}
            text={`${record.user} — ${formatRentalDate(record.start)} → ${formatRentalDate(record.end)} — $${record.cost.toFixed(2)}`}
          />
        ))}
      </div>
    </Section>
  );
}

function RentalAnalytics() {
  return <AdminDashboard mode="rentalAnalytics" />;
}

function GatewayAnalytics() {
  const [stats, setStats] = useState(null);
  const [log, setLog] = useState([]);

  useEffect(() => {
    const load = () => {
      const snapshot = AdminDashboardService.getGatewayMonitoringSnapshot(20);
      setStats(snapshot.stats);
      setLog(snapshot.log);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <AdminDashboard mode="gatewayMonitoring" />
      {stats && (
        <section className="panel stack-12" style={{ marginTop: '1rem' }}>
          <h2>API Gateway Statistics</h2>
          <div className="grid-2">
            <div className="card"><h3>Total Requests</h3><p>{stats.total}</p></div>
            <div className="card"><h3>Successful</h3><p style={{ color: 'var(--success)' }}>{stats.successful}</p></div>
            <div className="card"><h3>Failed</h3><p style={{ color: 'var(--error)' }}>{stats.failed}</p></div>
            <div className="card"><h3>Avg Latency</h3><p>{stats.avgDuration}ms</p></div>
          </div>
          {Object.keys(stats.byTable).length > 0 && (
            <div className="card stack-8">
              <h3>Requests by Table</h3>
              {Object.entries(stats.byTable).map(([table, count]) => (
                <p key={table}>{table}: {count} requests</p>
              ))}
            </div>
          )}
          {log.length > 0 && (
            <div className="card stack-8">
              <h3>Recent API Requests</h3>
              {log.map((entry) => (
                <div key={entry.id} style={{ borderBottom: '1px solid var(--surface)', padding: '4px 0', fontSize: '0.85rem' }}>
                  <span style={{ color: entry.success ? 'var(--success)' : 'var(--error)' }}>{entry.method}</span>
                  {' '}<strong>{entry.table}</strong>
                  {' '}<span style={{ color: '#94a3b8' }}>{entry.durationMs}ms</span>
                  {' '}<span style={{ color: '#64748b' }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function RecommendationBanner({ user, onSelectTab }) {
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (!user?.preferredCity && !user?.preferredMobilityType) {
      setSummary('Set your preferred city and mobility type in your Profile to get personalized tips.');
      return;
    }
    let mounted = true;
    RecommendationService.getRecommendations({
      preferredCity: user.preferredCity,
      preferredMobilityType: user.preferredMobilityType,
    }).then((result) => {
      if (mounted && result.recommendations.length > 0) {
        setSummary(result.recommendations[0].message);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [user?.preferredCity, user?.preferredMobilityType]);

  if (!summary) return null;

  return (
    <div className="reco-banner fade-up">
      <p>{summary}</p>
      <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={() => onSelectTab('recommendations')}>
        View all
      </button>
    </div>
  );
}

function RecommendationsView({ user, onSelectTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    RecommendationService.getRecommendations({
      preferredCity: user?.preferredCity,
      preferredMobilityType: user?.preferredMobilityType,
    }).then((result) => {
      if (mounted) { setData(result); setLoading(false); }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [user?.preferredCity, user?.preferredMobilityType]);

  return (
    <Section title="For You" subtitle="Personalized travel recommendations">
      <div className="panel stack-8">
        <h3>Your preferences</h3>
        <p>Preferred city: {user?.preferredCity || 'Not set'}</p>
        <p>Preferred mobility: {user?.preferredMobilityType || 'Not set'}</p>
        <button className="btn btn-soft" style={{ width: 'fit-content' }} onClick={() => onSelectTab('profile')}>
          Edit preferences
        </button>
      </div>

      {loading && <div className="panel">Loading recommendations...</div>}

      {!loading && data && (
        <>
          {data.recommendations.map((rec, i) => (
            <div
              key={i}
              className="panel fade-up"
              style={{
                borderColor: rec.type === 'success' ? 'rgba(90,228,167,0.3)' : rec.type === 'warning' ? 'rgba(240,194,74,0.3)' : 'rgba(228,169,77,0.3)',
                background: rec.type === 'success' ? 'var(--success-dim)' : rec.type === 'warning' ? 'var(--warning-dim)' : 'var(--accent-dim)',
                animationDelay: `${i * 0.06}s`,
              }}
            >
              <p style={{
                color: rec.type === 'success' ? 'var(--success)' : rec.type === 'warning' ? 'var(--warning)' : 'var(--accent-text)',
                fontWeight: 500,
                margin: 0,
              }}>
                {rec.message}
              </p>
            </div>
          ))}

          {data.vehicleSuggestions.length > 0 && (
            <>
              <h3>Suggested vehicles</h3>
              <div className="grid-2">
                {data.vehicleSuggestions.map((v) => (
                  <Card
                    key={v.id}
                    title={v.name || `${v.type} #${v.id}`}
                    text={`${v.type} | ${v.location || 'Nearby'} | $${v.rate_per_min ?? 0.25}/min`}
                    action={
                      <button className="btn btn-primary" onClick={() => onSelectTab('mobility')}>
                        Find & reserve
                      </button>
                    }
                  />
                ))}
              </div>
            </>
          )}

          {data.parkingSuggestions.length > 0 && (
            <>
              <h3>Parking near you</h3>
              <div className="grid-2">
                {data.parkingSuggestions.map((p) => (
                  <Card
                    key={p.id}
                    title={p.address || p.location || 'Parking'}
                    text={`${p.available ?? p.available_spots ?? 0}/${p.total ?? p.total_spots ?? 0} spots | $${p.price_per_hour ?? 2.5}/h`}
                    action={
                      <button className="btn btn-primary" onClick={() => onSelectTab('parking')}>
                        Reserve spot
                      </button>
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Section>
  );
}

function Profile({ user, role, onUpdatePreferences }) {
  const [prefCity, setPrefCity] = useState(user?.preferredCity || '');
  const [prefType, setPrefType] = useState(user?.preferredMobilityType || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefCity(user?.preferredCity || '');
    setPrefType(user?.preferredMobilityType || '');
  }, [user?.preferredCity, user?.preferredMobilityType]);

  const savePreferences = async () => {
    if (onUpdatePreferences) {
      await onUpdatePreferences({ preferredCity: prefCity.trim(), preferredMobilityType: prefType });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const roleLabel = roleDisplayName(role);

  return (
    <Section title="Profile" subtitle="Your account and preferences">
      <div className="card stack-8 fade-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{user?.name || user?.email}</h3>
          <span className="status-pill" style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)' }}>{roleLabel}</span>
        </div>
        <p style={{ color: 'var(--text-2)' }}>{user?.email}</p>
      </div>

      {user?.role === 'user' && (
        <div className="card stack-12 fade-up fade-up-1">
          <h3>Travel Preferences</h3>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Set your preferences to get personalized vehicle and parking recommendations.</p>
          <label>
            Preferred city
            <input
              value={prefCity}
              onChange={(e) => setPrefCity(e.target.value)}
              placeholder="e.g. Montreal, Laval"
            />
          </label>
          <label>
            Preferred mobility type
            <div className="row gap-8" style={{ marginTop: 8 }}>
              {['bike', 'scooter'].map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`btn ${prefType === type ? 'btn-primary-soft' : 'btn-soft'}`}
                  onClick={() => setPrefType(type)}
                >
                  {type === 'bike' ? 'Bike' : 'Scooter'}
                </button>
              ))}
              {prefType && (
                <button type="button" className="btn btn-link" onClick={() => setPrefType('')}>
                  Clear
                </button>
              )}
            </div>
          </label>
          <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={savePreferences}>
            Save Preferences
          </button>
          {saved && <p style={{ color: 'var(--success)', margin: 0, fontSize: '0.88rem' }}>Preferences saved!</p>}
        </div>
      )}
    </Section>
  );
}

function useDashboardData(user) {
  const [vehiclesData, setVehiclesData] = useState([]);
  const [transitRoutes, setTransitRoutes] = useState([]);
  const [parkingSpots, setParkingSpots] = useState([]);
  const [providerRentals, setProviderRentals] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const refreshDashboardData = useCallback(async () => {
    try {
      setLoadingData(true);
      const isProvider = user?.role === ROLES.MOBILITY_PROVIDER;
      const providerId = user?.id;
      const [vehicles, routes, spots, rentals] = await Promise.all([
        isProvider ? fetchProviderVehicles(providerId) : fetchVehicles(),
        fetchTransitRoutes(),
        fetchParkingSpots(),
        isProvider ? fetchProviderRentals(providerId) : Promise.resolve([]),
      ]);
      setVehiclesData(vehicles);
      setTransitRoutes(routes);
      setParkingSpots(spots);
      setProviderRentals(rentals);
    } finally {
      setLoadingData(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    refreshDashboardData();
  }, [refreshDashboardData]);

  return {
    loadingData,
    vehiclesData,
    transitRoutes,
    parkingSpots,
    providerRentals,
    refreshDashboardData,
  };
}
