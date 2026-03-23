import React, { useMemo, useState } from 'react';
import { AuthProvider, ROLES, useAuth } from './context/AuthContext';
import { RentalProvider, useRental } from './context/RentalContext';
import { mockParkingSpots, mockProviderRentals, mockTransitRoutes, mockVehicles } from './data/mockData';

const CITIZEN_TABS = ['home', 'search', 'transit', 'parking', 'activeRental', 'profile'];
const PROVIDER_TABS = ['home', 'vehicles', 'rentalData', 'profile'];
const ADMIN_TABS = ['home', 'rentalAnalytics', 'gatewayAnalytics', 'profile'];

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
  const { isAuthenticated } = useAuth();
  return <div className="app-shell">{isAuthenticated ? <Dashboard /> : <AuthScreen />}</div>;
}

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const { login, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLES.CITIZEN);

  const submit = (event) => {
    event.preventDefault();
    if (!email.trim() || !password.trim() || (mode === 'register' && !name.trim())) {
      window.alert('Please fill all required fields.');
      return;
    }

    if (mode === 'login') {
      login(email.trim(), password, role);
      return;
    }

    if (password.length < 6) {
      window.alert('Password must be at least 6 characters.');
      return;
    }

    register(name.trim(), email.trim(), password, role);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>SUMMS</h1>
        <p>Smart Urban Mobility Management</p>
        <form onSubmit={submit} className="stack-12">
          {mode === 'register' && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />}
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />

          <div className="role-row">
            <RoleButton label="Citizen" active={role === ROLES.CITIZEN} onClick={() => setRole(ROLES.CITIZEN)} />
            <RoleButton label="Provider" active={role === ROLES.MOBILITY_PROVIDER} onClick={() => setRole(ROLES.MOBILITY_PROVIDER)} />
            <RoleButton label="Admin" active={role === ROLES.ADMIN} onClick={() => setRole(ROLES.ADMIN)} />
          </div>

          <button className="btn btn-primary" type="submit">{mode === 'login' ? 'Log In' : 'Register'}</button>
          <button className="btn btn-link" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Log In'}
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
  const { reservation, activeRental, setReserve, clearReservation, startRental, endRental } = useRental();
  const tabs = isCitizen ? CITIZEN_TABS : isProvider ? PROVIDER_TABS : ADMIN_TABS;
  const [tab, setTab] = useState('home');
  const [vehicleType, setVehicleType] = useState('all');
  const [radius, setRadius] = useState('2');
  const [paymentDone, setPaymentDone] = useState(false);

  const vehicles = useMemo(() => {
    let list = [...mockVehicles];
    if (vehicleType !== 'all') list = list.filter((v) => v.type === vehicleType);
    const maxRadius = parseFloat(radius) || 2;
    return list.filter((v) => v.distance <= maxRadius);
  }, [vehicleType, radius]);

  const goReserve = (vehicle) => {
    setReserve(vehicle);
    setTab('search');
  };

  const goPayment = () => {
    if (!reservation) return;
    const txId = `tx_${Date.now()}`;
    startRental(reservation, txId);
    setPaymentDone(false);
    setTab('activeRental');
  };

  const completeReturn = () => {
    if (!activeRental) return;
    const start = new Date(activeRental.startTime);
    const elapsedMin = Math.max(1, Math.floor((Date.now() - start.getTime()) / 60000));
    const totalCost = elapsedMin * (activeRental.vehicle?.ratePerMin || 0.25);
    endRental(totalCost, { transactionId: activeRental.paymentTxId });
    setPaymentDone(true);
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div>
          <h2>SUMMS</h2>
          <p>{user?.name}</p>
        </div>
        <div className="stack-8">
          {tabs.map((name) => (
            <button key={name} className={`btn nav-btn ${tab === name ? 'nav-btn-active' : ''}`} onClick={() => setTab(name)}>
              {labelForTab(name)}
            </button>
          ))}
        </div>
        <button className="btn btn-danger" onClick={logout}>Log Out</button>
      </aside>

      <main className="content">
        {isCitizen && tab === 'home' && (
          <Section title="Quick actions" subtitle="Citizen dashboard">
            <div className="grid-2">
              <Card title="Find a vehicle" text="Scooters, bikes, and more in Montreal" action={<button className="btn btn-primary" onClick={() => setTab('search')}>Open</button>} />
              <Card title="Public transit" text="Routes, schedules, delays" action={<button className="btn btn-primary" onClick={() => setTab('transit')}>Open</button>} />
              <Card title="Parking" text="Available spaces nearby" action={<button className="btn btn-primary" onClick={() => setTab('parking')}>Open</button>} />
              <Card title="Active rental" text="View or return your vehicle" action={<button className="btn btn-primary" onClick={() => setTab('activeRental')}>Open</button>} />
            </div>
          </Section>
        )}

        {isCitizen && tab === 'search' && (
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
                  action={<button className="btn btn-primary" onClick={() => goReserve(vehicle)}>Reserve</button>}
                />
              ))}
            </div>

            {reservation && (
              <div className="panel stack-12">
                <h3>Reservation</h3>
                <p>{reservation.name} | ${reservation.ratePerMin}/min</p>
                <div className="row gap-8">
                  <button className="btn btn-primary" onClick={goPayment}>Proceed to payment</button>
                  <button className="btn btn-soft" onClick={clearReservation}>Cancel</button>
                </div>
              </div>
            )}
          </Section>
        )}

        {isCitizen && tab === 'transit' && (
          <Section title="Public transit" subtitle="Routes and schedules">
            <div className="grid-2">
              {mockTransitRoutes.map((route) => (
                <Card
                  key={route.id}
                  title={route.line}
                  text={`${route.from} -> ${route.to} | Next: ${route.nextDeparture}${route.delay ? ` | Delay: ${route.delay} min` : ''}`}
                />
              ))}
            </div>
          </Section>
        )}

        {isCitizen && tab === 'parking' && (
          <Section title="Parking" subtitle="Available spaces nearby">
            <div className="grid-2">
              {mockParkingSpots.map((spot) => (
                <Card key={spot.id} title={spot.address} text={`${spot.available}/${spot.total} spots | ${spot.distance} km`} />
              ))}
            </div>
          </Section>
        )}

        {isCitizen && tab === 'activeRental' && (
          <Section title="Active rental" subtitle="Track or return your vehicle">
            {!activeRental && !paymentDone && <div className="panel">No active rental.</div>}
            {activeRental && (
              <div className="panel stack-12">
                <h3>{activeRental.vehicle?.name}</h3>
                <p>{activeRental.vehicle?.type}</p>
                <p>Started: {new Date(activeRental.startTime).toLocaleTimeString()}</p>
                <button className="btn btn-primary" onClick={completeReturn}>Return vehicle</button>
              </div>
            )}
            {paymentDone && <div className="panel success">Rental complete. Receipt recorded.</div>}
          </Section>
        )}

        {isProvider && tab === 'home' && (
          <Section title="Provider dashboard" subtitle="Manage vehicles and rentals">
            <Card title="SUMMS Management" text="Manage your fleet and review rental data." />
          </Section>
        )}

        {isProvider && tab === 'vehicles' && <ProviderVehicles />}
        {isProvider && tab === 'rentalData' && <ProviderRentalData />}

        {isAdmin && tab === 'home' && (
          <Section title="Admin dashboard" subtitle="System monitoring">
            <Card title="SUMMS Management" text="View rental and gateway analytics." />
          </Section>
        )}

        {isAdmin && tab === 'rentalAnalytics' && <RentalAnalytics />}
        {isAdmin && tab === 'gatewayAnalytics' && <GatewayAnalytics />}

        {tab === 'profile' && <Profile user={user} role={user?.role} />}
      </main>
    </div>
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

function ProviderVehicles() {
  const [vehicles, setVehicles] = useState([
    { id: 'v1', type: 'scooter', name: 'Scooter #101', status: 'available', maintenance: 'ok' },
    { id: 'v2', type: 'scooter', name: 'Scooter #102', status: 'available', maintenance: 'ok' },
    { id: 'v3', type: 'bike', name: 'Bike #201', status: 'maintenance', maintenance: 'pending' },
  ]);

  const addVehicle = () => {
    setVehicles((prev) => [
      ...prev,
      { id: `v${Date.now()}`, type: 'scooter', name: `Vehicle #${prev.length + 1}`, status: 'available', maintenance: 'ok' },
    ]);
  };

  return (
    <Section title="Vehicles" subtitle="Fleet management">
      <button className="btn btn-primary" onClick={addVehicle}>Add vehicle</button>
      <div className="grid-2">
        {vehicles.map((v) => (
          <div className="card" key={v.id}>
            <h3>{v.name}</h3>
            <p>{v.type}</p>
            <p>Status: {v.status}</p>
            <button
              className="btn btn-soft"
              onClick={() => setVehicles((prev) => prev.map((item) => item.id === v.id ? { ...item, status: item.status === 'available' ? 'unavailable' : 'available' } : item))}
            >
              Toggle status
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ProviderRentalData() {
  return (
    <Section title="Rental records" subtitle="Manage and view rental data">
      <div className="grid-2">
        {mockProviderRentals.map((record) => (
          <Card key={record.id} title={record.vehicle} text={`${record.user} | ${record.start} -> ${record.end} | $${record.cost}`} />
        ))}
      </div>
    </Section>
  );
}

function RentalAnalytics() {
  const kpis = [
    ['1,247', 'Rentals (30d)'],
    ['342', 'Active users'],
    ['Scooter', 'Top vehicle type'],
    ['18 min', 'Avg. duration'],
  ];

  return (
    <Section title="Rental analytics" subtitle="Usage trends and KPIs">
      <div className="grid-2">
        {kpis.map(([value, label]) => (
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

function labelForTab(name) {
  const labels = {
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

  return labels[name] || name;
}
