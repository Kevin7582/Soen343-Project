import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthProvider, ROLES, useAuth } from '../context/AuthContext';
import { RentalProvider, useRental } from '../context/RentalContext';
import {
  cancelParkingReservation,
  fetchParkingSpots,
  fetchProviderRentals,
  fetchTransitRoutes,
  fetchUserParkingReservation,
  fetchUserTransitPlans,
  fetchVehicles,
  planTransitTrip,
  reserveParkingSpot,
} from '../../service-layer/mobilityService';

const TABS = {
  citizen: ['home', 'search', 'transit', 'parking', 'activeRental', 'profile'],
  provider: ['home', 'vehicles', 'rentalData', 'profile'],
  admin: ['home', 'rentalAnalytics', 'gatewayAnalytics', 'profile'],
};

const TAB_LABELS = {
  home: 'Home',
  search: 'Find Vehicle',
  transit: 'Transit',
  parking: 'Parking',
  activeRental: 'Active Rental',
  vehicles: 'Vehicles',
  rentalData: 'Rentals',
  rentalAnalytics: 'Rental Analytics',
  gatewayAnalytics: 'Gateway Analytics',
  profile: 'Profile',
};

const KPIS = [
  ['1,247', 'Rentals (30d)'],
  ['342', 'Active users'],
  ['Scooter', 'Top vehicle type'],
  ['18 min', 'Avg. duration'],
];

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
  const { user, isCitizen, isProvider, isAdmin, logout } = useAuth();
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
  const [mobilityError, setMobilityError] = useState('');

  const { loadingData, vehiclesData, transitRoutes, parkingSpots, providerRentals, refreshDashboardData } = useDashboardData();

  const tabs = getTabsForUser({ isCitizen, isProvider, isAdmin });

  useEffect(() => {
    if (!tabs.includes(tab)) {
      setTab('home');
    }
  }, [tab, tabs]);

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
    setMobilityError('');
    const duration = Math.max(1, Number(parkingDuration) || 1);
    try {
      const reservationData = await reserveParkingSpot(user.id, spot, duration);
      setParkingReservation(reservationData);
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

  const handlePlanTransit = async (route) => {
    if (!user?.id) return;
    if (!transitFrom.trim() || !transitTo.trim()) {
      setMobilityError('Enter both origin and destination to plan a transit trip.');
      return;
    }
    setMobilityError('');
    try {
      const plan = await planTransitTrip(user.id, route, transitFrom.trim(), transitTo.trim());
      setTransitPlans((prev) => [plan, ...prev].slice(0, 10));
    } catch (error) {
      setMobilityError(error?.message || 'Unable to plan transit trip.');
    }
  };

  return (
    <div className="dashboard">
      <Sidebar user={user} tabs={tabs} activeTab={tab} onSelectTab={setTab} onLogout={logout} />

      <main className="content">
        {loadingData && <div className="panel">Loading data from Supabase...</div>}
        {rentalLoading && <div className="panel">Syncing rental state...</div>}
        {!!rentalError && <div className="panel auth-error">{rentalError}</div>}
        {!!mobilityError && <div className="panel auth-error">{mobilityError}</div>}

        {isCitizen && (
          <CitizenViews
            tab={tab}
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
            onPlanTransit={handlePlanTransit}
            parkingReservation={parkingReservation}
            parkingDuration={parkingDuration}
            setParkingDuration={setParkingDuration}
            onReserveParking={handleReserveParking}
            onCancelParking={handleCancelParking}
          />
        )}

        {isProvider && (
          <ProviderViews
            tab={tab}
            vehiclesData={vehiclesData}
            providerRentals={providerRentals}
          />
        )}

        {isAdmin && <AdminViews tab={tab} />}

        {tab === 'profile' && <Profile user={user} role={user?.role} />}
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
  onPlanTransit,
  parkingReservation,
  parkingDuration,
  setParkingDuration,
  onReserveParking,
  onCancelParking,
}) {
  return (
    <>
      {tab === 'home' && (
        <Section title="Quick actions" subtitle="Citizen dashboard">
          <div className="grid-2">
            <Card title="Find a vehicle" text="Scooters, bikes, and more in Montreal" action={<button className="btn btn-primary" onClick={() => onSelectTab('search')}>Open</button>} />
            <Card title="Public transit" text="Routes, schedules, delays" action={<button className="btn btn-primary" onClick={() => onSelectTab('transit')}>Open</button>} />
            <Card title="Parking" text="Available spaces nearby" action={<button className="btn btn-primary" onClick={() => onSelectTab('parking')}>Open</button>} />
            <Card title="Active rental" text="View or return your vehicle" action={<button className="btn btn-primary" onClick={() => onSelectTab('activeRental')}>Open</button>} />
          </div>
        </Section>
      )}

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
        <Section title="Public transit" subtitle="Routes and schedules">
          <div className="panel stack-12">
            <h3>Plan a trip</h3>
            <div className="row gap-8 wrap">
              <label>
                From
                <input value={transitFrom} onChange={(e) => setTransitFrom(e.target.value)} />
              </label>
              <label>
                To
                <input value={transitTo} onChange={(e) => setTransitTo(e.target.value)} />
              </label>
            </div>
          </div>

          <div className="grid-2">
            {transitRoutes.map((route) => (
              <Card
                key={route.id}
                title={route.line}
                text={`${route.from} -> ${route.to} | Next: ${route.nextDeparture}${route.delay ? ` | Delay: ${route.delay} min` : ''}`}
                action={<button className="btn btn-primary" onClick={() => onPlanTransit(route)}>Plan this route</button>}
              />
            ))}
          </div>

          <div className="panel stack-8">
            <h3>Recent transit plans</h3>
            {transitPlans.length === 0 && <p>No planned trips yet.</p>}
            {transitPlans.map((plan) => (
              <p key={plan.id}>
                {plan.from} {'->'} {plan.to} ({new Date(plan.plannedAt).toLocaleString()})
              </p>
            ))}
          </div>
        </Section>
      )}

      {tab === 'parking' && (
        <Section title="Parking" subtitle="Available spaces nearby">
          <div className="panel stack-12">
            <h3>Parking reservation</h3>
            <label>
              Duration (hours)
              <input value={parkingDuration} onChange={(e) => setParkingDuration(e.target.value)} />
            </label>
            {parkingReservation && (
              <div className="stack-8">
                <p>Reserved spot: {parkingReservation.spot?.address || parkingReservation.spotId}</p>
                <p>Duration: {parkingReservation.durationHours}h</p>
                <p>Estimated cost: ${parkingReservation.estimatedCost}</p>
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
                action={<button className="btn btn-primary" disabled={spot.available <= 0} onClick={() => onReserveParking(spot)}>Reserve spot</button>}
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
  const [vehicles, setVehicles] = useState(initialVehicles.length ? initialVehicles : FALLBACK_PROVIDER_VEHICLES);

  useEffect(() => {
    if (initialVehicles.length) {
      setVehicles(initialVehicles);
    }
  }, [initialVehicles]);

  const addVehicle = () => {
    setVehicles((previousVehicles) => [
      ...previousVehicles,
      {
        id: `v${Date.now()}`,
        type: 'scooter',
        name: `Vehicle #${previousVehicles.length + 1}`,
        status: 'available',
        maintenance: 'ok',
      },
    ]);
  };

  const toggleVehicleStatus = (vehicleId) => {
    setVehicles((previousVehicles) => previousVehicles.map((vehicle) => {
      if (vehicle.id !== vehicleId) return vehicle;

      const nextStatus = vehicle.status === 'available' ? 'unavailable' : 'available';
      return { ...vehicle, status: nextStatus };
    }));
  };

  return (
    <Section title="Vehicles" subtitle="Fleet management">
      <button className="btn btn-primary" onClick={addVehicle}>Add vehicle</button>

      <div className="grid-2">
        {vehicles.map((vehicle) => (
          <div className="card" key={vehicle.id}>
            <h3>{vehicle.name}</h3>
            <p>{vehicle.type}</p>
            <p>Status: {vehicle.status}</p>
            <button className="btn btn-soft" onClick={() => toggleVehicleStatus(vehicle.id)}>
              Toggle status
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
  return (
    <Section title="Rental analytics" subtitle="Usage trends and KPIs">
      <div className="grid-2">
        {KPIS.map(([value, label]) => (
          <div className="card" key={label}>
            <h2>{value}</h2>
            <p>{label}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function GatewayAnalytics() {
  return (
    <Section title="Gateway analytics" subtitle="API performance and health">
      <div className="card stack-8">
        <p>Total requests: 12,450</p>
        <p>Avg response time: 42 ms</p>
        <p>Error rate: 0.1%</p>
      </div>
      <div className="card stack-8">
        <p>Rental Service: 5,200 req</p>
        <p>Parking Service: 3,100 req</p>
        <p>Public Transport: 2,800 req</p>
        <p>Analytics: 1,350 req</p>
      </div>
    </Section>
  );
}

function Profile({ user, role }) {
  return (
    <Section title="Profile" subtitle="Account details">
      <div className="card stack-8">
        <p>Name: {user?.name || '-'}</p>
        <p>Email: {user?.email || '-'}</p>
        <p>Role: {role || '-'}</p>
      </div>
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

function getTabsForUser({ isCitizen, isProvider, isAdmin }) {
  if (isAdmin) return TABS.admin;
  if (isProvider) return TABS.provider;
  if (isCitizen) return TABS.citizen;
  return TABS.citizen;
}
