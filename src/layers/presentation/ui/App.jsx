import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthProvider, ROLES, useAuth } from '../context/AuthContext';
import { RentalProvider, useRental } from '../context/RentalContext';
import AdminDashboard from "./AdminDashboard";
import TransitMap from './TransitMap';
import RecommendationService from '../../service-layer/recommendationService';
import { createRoleDashboardCreator } from './roleDashboardFactory';
import { supabase } from '../../data-layer/supabaseClient';
import {
  completeParkingReservation,
  cancelParkingReservation,
  fetchParkingSpots,
  fetchProviderRentals,
  fetchTransitRoutes,
  fetchUserParkingReservation,
  fetchUserTransitPlans,
  fetchVehicles,
  planTransitTrip,
  reserveParkingSpot,
  startParkingReservation,
  updateParkingReservationDuration,
} from '../../service-layer/mobilityService';

const TAB_LABELS = {
  home: 'Home',
  recommendations: 'For You',
  search: 'Find Vehicle',
  transit: 'Transit',
  parking: 'Parking',
  activeRental: 'Active Rental',
  vehicles: 'Vehicles',
  rentalData: 'Rentals',
  rentalAnalytics: 'Rental Analytics',
  gatewayAnalytics: 'Gateway Analytics',
  profile: 'Profile',
  adminDashboard: 'Admin Dashboard',
};

const FALLBACK_PROVIDER_VEHICLES = [
  { id: 'v1', type: 'scooter', name: 'Scooter #101', status: 'available', maintenance: 'ok' },
  { id: 'v2', type: 'scooter', name: 'Scooter #102', status: 'available', maintenance: 'ok' },
  { id: 'v3', type: 'bike', name: 'Bike #201', status: 'maintenance', maintenance: 'pending' },
];

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

  return <div className="app-shell">{isAuthenticated ? <Dashboard /> : <AuthScreen />}</div>;
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
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
  };

  const isRegisterMode = mode === 'register';

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>SUMMS</h1>
        <p><strong>Mode:</strong> {isRegisterMode ? 'REGISTER' : 'LOGIN'}</p>
        <p>Smart Urban Mobility Management</p>

        <form onSubmit={submit} className="stack-12">
          {isRegisterMode && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          )}

          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="text" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />

          <div className="role-row">
            <RoleButton label="Citizen" active={role === ROLES.CITIZEN} onClick={() => setRole(ROLES.CITIZEN)} />
            <RoleButton label="Provider" active={role === ROLES.MOBILITY_PROVIDER} onClick={() => setRole(ROLES.MOBILITY_PROVIDER)} />
            <RoleButton label="Admin" active={role === ROLES.ADMIN} onClick={() => setRole(ROLES.ADMIN)} />
          </div>

          {!!formError && <div className="auth-error">{formError}</div>}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Please wait...' : isRegisterMode ? 'Register' : 'Log In'}
          </button>

          {!isRegisterMode && (
            <button className="btn btn-link" type="button" onClick={onForgotPassword} disabled={submitting}>
              Forgot password?
            </button>
          )}

          <button className="btn btn-link" type="button" onClick={toggleMode}>
            {isRegisterMode ? 'Already have an account? Log In' : 'Need an account? Register'}
          </button>
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
  const [tab, setTab] = useState('home');
  const [vehicleType, setVehicleType] = useState('all');
  const [radius, setRadius] = useState('2');
  const [paymentDone, setPaymentDone] = useState(false);
  const [parkingReservation, setParkingReservation] = useState(null);
  const [parkingDuration, setParkingDuration] = useState('1');
  const [transitPlans, setTransitPlans] = useState([]);
  const [transitFrom, setTransitFrom] = useState('Downtown');
  const [transitTo, setTransitTo] = useState('Campus');
  const [selectedTransitRouteId, setSelectedTransitRouteId] = useState('');
  const [transitStartPoint, setTransitStartPoint] = useState(null);
  const [transitEndPoint, setTransitEndPoint] = useState(null);
  const [transitTravelMode, setTransitTravelMode] = useState('TRANSIT');
  const [transitRouteInfo, setTransitRouteInfo] = useState(null);
  const [mobilityError, setMobilityError] = useState('');

  const { loadingData, vehiclesData, transitRoutes, parkingSpots, providerRentals, refreshDashboardData } = useDashboardData();

  const roleDashboardCreator = useMemo(
    () => createRoleDashboardCreator(user?.role),
    [user?.role]
  );
  const tabs = useMemo(() => roleDashboardCreator.createTabs(), [roleDashboardCreator]);

  useEffect(() => {
    if (!tabs.includes(tab)) {
      setTab('home');
    }
  }, [tab, tabs]);

  useEffect(() => {
    if (!transitRoutes.length) {
      setSelectedTransitRouteId('');
      return;
    }
    const exists = transitRoutes.some((route) => String(route.id) === String(selectedTransitRouteId));
    if (!exists) {
      setSelectedTransitRouteId(String(transitRoutes[0].id));
    }
  }, [transitRoutes, selectedTransitRouteId]);

  useEffect(() => {
    let mounted = true;
    async function loadUserMobilityData() {
      if (!user?.id) {
        setParkingReservation(null);
        setTransitPlans([]);
        return;
      }
      try {
        const [reservationData, plans] = await Promise.all([
          fetchUserParkingReservation(user.id),
          fetchUserTransitPlans(user.id),
        ]);
        if (!mounted) return;
        setParkingReservation(reservationData);
        if (reservationData?.durationHours) {
          setParkingDuration(String(reservationData.durationHours));
        }
        setTransitPlans(plans);
      } catch (error) {
        if (!mounted) return;
        setMobilityError(error?.message || 'Unable to load parking/transit state.');
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

  const selectedTransitRoute = useMemo(
    () => transitRoutes.find((route) => String(route.id) === String(selectedTransitRouteId)) || null,
    [transitRoutes, selectedTransitRouteId]
  );

  const handleReserveVehicle = async (vehicle) => {
    if (reservation || activeRental) {
      setMobilityError('You can only have one vehicle reservation/rental at a time.');
      return;
    }
    clearError();
    setMobilityError('');
    try {
      await reserveVehicle(vehicle);
      await refreshDashboardData();
      setTab('search');
    } catch {
      // Error is shown from context state.
    }
  };

  const beginPayment = async () => {
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

    const start = new Date(activeRental.startTime);
    const elapsedMin = Math.max(1, Math.floor((Date.now() - start.getTime()) / 60000));
    const totalCost = elapsedMin * (activeRental.vehicle?.ratePerMin || 0.25);

    clearError();
    setMobilityError('');
    try {
      await endRental(totalCost, { transactionId: activeRental.paymentTxId });
      await refreshDashboardData();
      setPaymentDone(true);
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

  const handlePlanTransit = async (route, fromOverride, toOverride) => {
    if (!user?.id) return;
    const fromValue = String(fromOverride ?? transitFrom).trim();
    const toValue = String(toOverride ?? transitTo).trim();
    if (!fromValue || !toValue) {
      setMobilityError('Enter both origin and destination to plan a transit trip.');
      return;
    }
    setMobilityError('');
    try {
      const plan = await planTransitTrip(user.id, route, fromValue, toValue);
      setTransitPlans((prev) => [plan, ...prev].slice(0, 10));
    } catch (error) {
      setMobilityError(error?.message || 'Unable to plan transit trip.');
    }
  };

  const handleUseSelectedRouteEndpoints = () => {
    if (!selectedTransitRoute?.fromCoords || !selectedTransitRoute?.toCoords) return;
    setTransitStartPoint(selectedTransitRoute.fromCoords);
    setTransitEndPoint(selectedTransitRoute.toCoords);
    setTransitFrom(selectedTransitRoute.from || 'Route start');
    setTransitTo(selectedTransitRoute.to || 'Route end');
  };

  const handlePlanTransitFromMap = async () => {
    if (!transitStartPoint || !transitEndPoint) {
      setMobilityError('Set both start and end points on the map first.');
      return;
    }

    const route = selectedTransitRoute || {
      id: 'custom-map-route',
      line: `${transitTravelMode} route`,
      nextDeparture: 'N/A',
      from: transitFrom,
      to: transitTo,
    };

    const fromLabel = `${transitFrom.trim() || 'Map start'} (${transitStartPoint[0]}, ${transitStartPoint[1]})`;
    const toLabel = `${transitTo.trim() || 'Map end'} (${transitEndPoint[0]}, ${transitEndPoint[1]})`;
    await handlePlanTransit(route, fromLabel, toLabel);
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
        reservation={reservation}
        activeRental={activeRental}
        hasOpenVehicleFlow={Boolean(reservation || activeRental)}
        paymentDone={paymentDone}
        onReserveVehicle={handleReserveVehicle}
        onCancelReservation={clearReservation}
        onProceedPayment={beginPayment}
        onReturnVehicle={returnVehicle}
        transitRoutes={transitRoutes}
        parkingSpots={parkingSpots}
        transitPlans={transitPlans}
        transitFrom={transitFrom}
        transitTo={transitTo}
        setTransitFrom={setTransitFrom}
        setTransitTo={setTransitTo}
        selectedTransitRoute={selectedTransitRoute}
        onSelectTransitRoute={setSelectedTransitRouteId}
        transitStartPoint={transitStartPoint}
        transitEndPoint={transitEndPoint}
        onSetTransitStartPoint={setTransitStartPoint}
        onSetTransitEndPoint={setTransitEndPoint}
        transitTravelMode={transitTravelMode}
        onSetTransitTravelMode={setTransitTravelMode}
        transitRouteInfo={transitRouteInfo}
        onTransitRouteInfoChange={setTransitRouteInfo}
        onUseSelectedRouteEndpoints={handleUseSelectedRouteEndpoints}
        onPlanTransitFromMap={handlePlanTransitFromMap}
        onPlanTransit={handlePlanTransit}
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
        vehiclesData={vehiclesData}
        providerRentals={providerRentals}
      />
    ),
    renderAdmin: () => <AdminViews tab={tab} />,
  });

  return (
    <div className="dashboard">
      <Sidebar user={user} tabs={tabs} activeTab={tab} onSelectTab={setTab} onLogout={logout} />

      <main className="content">
        {loadingData && <div className="panel">Loading data from Supabase...</div>}
        {rentalLoading && <div className="panel">Syncing rental state...</div>}
        {!!rentalError && <div className="panel auth-error">{rentalError}</div>}
        {!!mobilityError && <div className="panel auth-error">{mobilityError}</div>}

        {roleMainContent}

        {tab === 'profile' && <Profile user={user} role={user?.role} onUpdatePreferences={updatePreferences} />}
      </main>
    </div>
  );
}

function Sidebar({ user, tabs, activeTab, onSelectTab, onLogout }) {
  return (
    <aside className="sidebar">
      <div>
        <h2>SUMMS</h2>
        <p>{user?.name}</p>
      </div>

      <div className="stack-8">
        {tabs.map((tabName) => (
          <button
            key={tabName}
            className={`btn nav-btn ${activeTab === tabName ? 'nav-btn-active' : ''}`}
            onClick={() => onSelectTab(tabName)}
          >
            {TAB_LABELS[tabName] || tabName}
          </button>
        ))}
      </div>

      <button className="btn btn-danger" onClick={onLogout}>Log Out</button>
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
  reservation,
  activeRental,
  hasOpenVehicleFlow,
  paymentDone,
  onReserveVehicle,
  onCancelReservation,
  onProceedPayment,
  onReturnVehicle,
  transitRoutes,
  parkingSpots,
  transitPlans,
  transitFrom,
  transitTo,
  setTransitFrom,
  setTransitTo,
  selectedTransitRoute,
  onSelectTransitRoute,
  transitStartPoint,
  transitEndPoint,
  onSetTransitStartPoint,
  onSetTransitEndPoint,
  transitTravelMode,
  onSetTransitTravelMode,
  transitRouteInfo,
  onTransitRouteInfoChange,
  onUseSelectedRouteEndpoints,
  onPlanTransitFromMap,
  onPlanTransit,
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
      {tab === 'home' && (
        <Section title="Quick actions" subtitle="Citizen dashboard">
          <RecommendationBanner user={user} onSelectTab={onSelectTab} />
          <div className="grid-2">
            <Card title="Find a vehicle" text="Scooters, bikes, and more in Montreal" action={<button className="btn btn-primary" onClick={() => onSelectTab('search')}>Open</button>} />
            <Card title="Public transit" text="Routes, schedules, delays" action={<button className="btn btn-primary" onClick={() => onSelectTab('transit')}>Open</button>} />
            <Card title="Parking" text="Available spaces nearby" action={<button className="btn btn-primary" onClick={() => onSelectTab('parking')}>Open</button>} />
            <Card title="Active rental" text="View or return your vehicle" action={<button className="btn btn-primary" onClick={() => onSelectTab('activeRental')}>Open</button>} />
          </div>
        </Section>
      )}

      {tab === 'recommendations' && <RecommendationsView user={user} onSelectTab={onSelectTab} />}

      {tab === 'search' && (
        <Section title="Find vehicle" subtitle="Search and reserve">
          <div className="panel stack-12">
            <div className="row wrap gap-8">
              {['all', 'scooter', 'bike'].map((type) => (
                <button key={type} className={`btn ${vehicleType === type ? 'btn-primary-soft' : 'btn-soft'}`} onClick={() => setVehicleType(type)}>
                  {type}
                </button>
              ))}
            </div>

            <label>
              Radius (km)
              <input value={radius} onChange={(e) => setRadius(e.target.value)} />
            </label>
          </div>

          <div className="grid-2">
            {vehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                title={vehicle.name}
                text={`${vehicle.type} | ${vehicle.distance} km away | $${vehicle.ratePerMin}/min`}
                action={<button className="btn btn-primary" disabled={hasOpenVehicleFlow || vehicle.status !== 'available'} onClick={() => onReserveVehicle(vehicle)}>Reserve</button>}
              />
            ))}
          </div>

          {reservation && (
            <div className="panel stack-12">
              <h3>Reservation</h3>
              <p>{reservation.vehicle?.name || `Vehicle #${reservation.vehicleId}`} | ${reservation.vehicle?.ratePerMin ?? 0.25}/min</p>
              <div className="row gap-8">
                <button className="btn btn-primary" onClick={onProceedPayment}>Proceed to payment</button>
                <button className="btn btn-soft" onClick={onCancelReservation}>Cancel</button>
              </div>
            </div>
          )}
        </Section>
      )}

      {tab === 'transit' && (
        <Section title="Transit" subtitle="Map-first trip planning workspace">
          <div className="transit-workspace">
            <div className="transit-stage">
              <TransitMap
                routes={transitRoutes}
                selectedRouteId={selectedTransitRoute?.id}
                onSelectRoute={onSelectTransitRoute}
                startPoint={transitStartPoint}
                endPoint={transitEndPoint}
                onSetStartPoint={onSetTransitStartPoint}
                onSetEndPoint={onSetTransitEndPoint}
                transitFrom={transitFrom}
                transitTo={transitTo}
                onSetTransitFrom={setTransitFrom}
                onSetTransitTo={setTransitTo}
                travelMode={transitTravelMode}
                onSetTravelMode={onSetTransitTravelMode}
                routeInfo={transitRouteInfo}
                onUseSelectedRouteEndpoints={onUseSelectedRouteEndpoints}
                onPlanSelectedRoute={() => selectedTransitRoute && onPlanTransit(selectedTransitRoute)}
                onPlanTransitFromMap={onPlanTransitFromMap}
                onRouteInfoChange={onTransitRouteInfoChange}
              />
            </div>

            <aside className="transit-sidepanel">
              <div className="transit-sidepanel-section">
                <h3>Selected route</h3>
                {selectedTransitRoute ? (
                  <>
                    <p className="transit-route-line">{selectedTransitRoute.line}</p>
                    <p>{selectedTransitRoute.from} {'->'} {selectedTransitRoute.to}</p>
                    <p>Next departure: {selectedTransitRoute.nextDeparture}</p>
                    <p>Delay: {selectedTransitRoute.delay} min</p>
                  </>
                ) : (
                  <p>Click any route on the map to preview details.</p>
                )}
              </div>

              <div className="transit-sidepanel-section">
                <h3>Live preview</h3>
                {transitRouteInfo ? (
                  <p>{transitRouteInfo.distanceText || 'N/A'} in {transitRouteInfo.durationText || 'N/A'} ({transitTravelMode.toLowerCase()})</p>
                ) : (
                  <p>Set start and end points to preview trip duration.</p>
                )}
              </div>

              <div className="transit-sidepanel-section">
                <h3>Recent plans</h3>
                {transitPlans.length === 0 && <p>No transit plans saved yet.</p>}
                {transitPlans.length > 0 && (
                  <div className="transit-plans-list">
                    {transitPlans.slice(0, 6).map((plan) => (
                      <div key={plan.id} className="transit-plan-row">
                        <p><strong>{plan.from}</strong> {'->'} <strong>{plan.to}</strong></p>
                        <p>{plan.notes || `Route #${plan.routeId}`}</p>
                        <p>{new Date(plan.plannedAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </Section>
      )}

      {tab === 'parking' && (
        <Section title="Parking" subtitle="Available spaces nearby">
          <div className="panel stack-12">
            <h3>Parking reservation</h3>
            {(!parkingReservation || parkingReservation.status === 'reserved') && (
              <label>
                Duration (hours)
                <input value={parkingDuration} onChange={(e) => setParkingDuration(e.target.value)} />
              </label>
            )}
            {parkingReservation && (
              <div className="stack-8">
                <p>Reserved spot: {parkingReservation.spot?.address || parkingReservation.spotId}</p>
                <p>Status: {parkingReservation.status}</p>
                <p>Duration: {parkingReservation.durationHours}h</p>
                <p>Estimated cost: ${parkingReservation.estimatedCost}</p>
                {parkingReservation.status === 'reserved' && (
                  <button className="btn btn-soft" onClick={onUpdateParkingDuration}>Update duration</button>
                )}
                {parkingReservation.status === 'reserved' && (
                  <button className="btn btn-primary" onClick={onStartParking}>Start parking session</button>
                )}
                {parkingReservation.status === 'active' && (
                  <button className="btn btn-primary" onClick={onCompleteParking}>Complete parking</button>
                )}
                <button className="btn btn-soft" onClick={onCancelParking}>Cancel reservation</button>
              </div>
            )}
          </div>

          <div className="grid-2">
            {parkingSpots.map((spot) => (
              <Card
                key={spot.id}
                title={spot.address}
                text={`${spot.available}/${spot.total} spots | ${spot.distance} km | $${(spot.pricePerHour ?? 2.5)}/h`}
                action={<button className="btn btn-primary" disabled={spot.available <= 0 || Boolean(parkingReservation)} onClick={() => onReserveParking(spot)}>Reserve spot</button>}
              />
            ))}
          </div>
        </Section>
      )}

      {tab === 'activeRental' && (
        <Section title="Active rental" subtitle="Track or return your vehicle">
          {!activeRental && reservation && (
            <div className="panel stack-12">
              <h3>Reservation ready</h3>
              <p>{reservation.vehicle?.name || `Vehicle #${reservation.vehicleId}`}</p>
              <p>{reservation.vehicle?.type || 'vehicle'}</p>
              <button className="btn btn-primary" onClick={onProceedPayment}>Start rental now</button>
            </div>
          )}

          {!activeRental && !reservation && !paymentDone && <div className="panel">No active rental.</div>}

          {activeRental && (
            <div className="panel stack-12">
              <h3>{activeRental.vehicle?.name}</h3>
              <p>{activeRental.vehicle?.type}</p>
              <p>Started: {new Date(activeRental.startTime).toLocaleTimeString()}</p>
              <button className="btn btn-primary" onClick={onReturnVehicle}>Return vehicle</button>
            </div>
          )}

          {paymentDone && <div className="panel success">Rental complete. Receipt recorded.</div>}
        </Section>
      )}
    </>
  );
}

function ProviderViews({ tab, vehiclesData, providerRentals }) {
  return (
    <>
      {tab === 'home' && (
        <Section title="Provider dashboard" subtitle="Manage vehicles and rentals">
          <Card title="SUMMS Management" text="Manage your fleet and review rental data." />
        </Section>
      )}

      {tab === 'vehicles' && <ProviderVehicles initialVehicles={vehiclesData} />}
      {tab === 'rentalData' && <ProviderRentalData rentals={providerRentals} />}
    </>
  );
}

function AdminViews({ tab }) {
  return (
    <>
      {tab === 'home' && (
        <Section title="Admin dashboard" subtitle="System monitoring">
          <Card title="SUMMS Management" text="View rental and gateway analytics." />
        </Section>
      )}

      {tab === 'rentalAnalytics' && <RentalAnalytics />}
      {tab === 'gatewayAnalytics' && <GatewayAnalytics />}
      {tab === 'adminDashboard' && <AdminDashboard />}
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

function ProviderVehicles({ initialVehicles = [] }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*');
      if (!error && data) {
        setVehicles(data);
      } else {
        setVehicles(FALLBACK_PROVIDER_VEHICLES);
      }
      setLoading(false);
    }
    load();
  }, []);

  const addVehicle = async () => {
  const type = window.prompt('Vehicle type (bike or scooter):', 'scooter');
  if (!type) return;
  
  const newVehicle = {
    type: type.toLowerCase(),
    location: 'Montreal',
    available: true,
    provider_id: 1,
  };
  const { data, error } = await supabase
    .from('vehicles')
    .insert(newVehicle)
    .select()
    .single();
  if (!error && data) {
    setVehicles((prev) => [...prev, data]);
  }
};

  const toggleVehicleStatus = async (vehicleId) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    const newAvailable = !vehicle.available;
    const { error } = await supabase
      .from('vehicles')
      .update({ available: newAvailable })
      .eq('id', vehicleId);
    if (!error) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicleId ? { ...v, available: newAvailable } : v
        )
      );
    }
  };

  const removeVehicle = async (vehicleId) => {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);
    if (!error) {
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    }
  };

  if (loading) return (
    <Section title="Vehicles" subtitle="Fleet management">
      <div className="panel">Loading...</div>
    </Section>
  );

  return (
    <Section title="Vehicles" subtitle="Fleet management">
      <button className="btn btn-primary" onClick={addVehicle}>Add vehicle</button>
      <div className="grid-2">
        {vehicles.map((vehicle) => (
          <div className="card" key={vehicle.id}>
            <h3>{vehicle.type} #{vehicle.id}</h3>
            <p>{vehicle.type}</p>
            <p>Status: {vehicle.available ? 'available' : 'unavailable'}</p>
            <button className="btn btn-soft" onClick={() => toggleVehicleStatus(vehicle.id)}>
              Toggle status
            </button>
            <button
              className="btn btn-soft"
              style={{ color: '#ef4444', marginTop: '8px' }}
              onClick={() => removeVehicle(vehicle.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}
function ProviderRentalData({ rentals = [] }) {
  return (
    <Section title="Rental records" subtitle="Manage and view rental data">
      {rentals.length === 0 && <div className="panel">No rental records found.</div>}

      <div className="grid-2">
        {rentals.map((record) => (
          <Card key={record.id} title={record.vehicle} text={`${record.user} | ${record.start} -> ${record.end} | $${record.cost}`} />
        ))}
      </div>
    </Section>
  );
}

function RentalAnalytics() {
  return <AdminDashboard mode="rentalAnalytics" />;
}

function GatewayAnalytics() {
  return <AdminDashboard mode="gatewayMonitoring" />;
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
    <div className="panel" style={{ borderColor: 'var(--primary)', background: 'rgba(56,189,248,0.08)' }}>
      <p style={{ color: 'var(--primary)', fontWeight: 600, margin: 0 }}>{summary}</p>
      <button className="btn btn-primary" style={{ marginTop: 8, width: 'fit-content' }} onClick={() => onSelectTab('recommendations')}>
        View all recommendations
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
              className="panel"
              style={{
                borderColor: rec.type === 'success' ? 'var(--success)' : rec.type === 'warning' ? 'var(--warning)' : 'var(--primary)',
                background: rec.type === 'success' ? 'rgba(52,211,153,0.08)' : rec.type === 'warning' ? 'rgba(251,191,36,0.08)' : 'rgba(56,189,248,0.06)',
              }}
            >
              <p style={{
                color: rec.type === 'success' ? 'var(--success)' : rec.type === 'warning' ? 'var(--warning)' : 'var(--primary)',
                fontWeight: 600,
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
                      <button className="btn btn-primary" onClick={() => onSelectTab('search')}>
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

  return (
    <Section title="Profile" subtitle="Account details and preferences">
      <div className="card stack-8">
        <p>Name: {user?.name || '-'}</p>
        <p>Email: {user?.email || '-'}</p>
        <p>Role: {role || '-'}</p>
      </div>

      {user?.role === 'user' && (
        <div className="card stack-12">
          <h3>Travel preferences</h3>
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
            <div className="row gap-8" style={{ marginTop: 6 }}>
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
            Save preferences
          </button>
          {saved && <p style={{ color: 'var(--success)', margin: 0 }}>Preferences saved!</p>}
        </div>
      )}
    </Section>
  );
}

function useDashboardData() {
  const [vehiclesData, setVehiclesData] = useState([]);
  const [transitRoutes, setTransitRoutes] = useState([]);
  const [parkingSpots, setParkingSpots] = useState([]);
  const [providerRentals, setProviderRentals] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const refreshDashboardData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [vehicles, routes, spots, rentals] = await Promise.all([
        fetchVehicles(),
        fetchTransitRoutes(),
        fetchParkingSpots(),
        fetchProviderRentals(),
      ]);
      setVehiclesData(vehicles);
      setTransitRoutes(routes);
      setParkingSpots(spots);
      setProviderRentals(rentals);
    } finally {
      setLoadingData(false);
    }
  }, []);

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

