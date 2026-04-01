# Diagrams

This file embeds all Mermaid diagrams so GitHub can render them directly.

## Class Diagram (Design Phase)
Source: [Class diagram/class-diagram (design phase).mmd](./Class%20diagram/class-diagram%20(design%20phase).mmd)

```mermaid
classDiagram
    class SUMMS {
      +integrateServices()
      +optimizeMobility()
      +provideAnalytics()
      +generateRecommendations()
    }

    class User {
      <<abstract>>
      +id: String
      +name: String
      +email: String
      +role: String
      +city: String
      +authenticate()
    }

    class Citizen {
      +searchVehicle()
      +reserveVehicle()
      +reserveParking()
      +planTransitTrip()
      +viewRecommendations()
    }

    class MobilityProvider {
      +manageFleet()
      +updateVehicleStatus()
      +viewRentalRecords()
    }

    class PublicTransportOperator {
      +publishSchedules()
      +publishDelays()
      +updateCapacity()
    }

    class CityAdministrator {
      +monitorSystemKPIs()
      +viewUsageByCity()
      +enforcePolicies()
    }

    class SystemAdministrator {
      +manageUsers()
      +managePlatformConfig()
      +monitorHealth()
    }

    class SharedMobilityService {
      +locateVehicles()
      +reserveVehicle()
      +startRental()
      +endRental()
    }

    class ParkingManagementService {
      +monitorAvailability()
      +showPricing()
      +reserveSpot()
      +cancelReservation()
    }

    class PublicTransitService {
      +getRoutes()
      +getSchedules()
      +getDelays()
      +planTrip()
    }

    class AnalyticsMonitoringService {
      +collectMobilityData()
      +computeKPIs()
      +generateReports()
    }

    class RecommendationService {
      +buildUserProfile()
      +suggestBestOption()
    }

    class Vehicle {
      +id: String
      +type: VehicleType
      +status: VehicleStatus
      +location: String
      +ratePerMinute: Decimal
    }

    class ParkingSpot {
      +id: String
      +address: String
      +available: int
      +total: int
      +pricePerHour: Decimal
      +city: String
    }

    class ParkingReservation {
      +id: String
      +status: ReservationStatus
      +startTime: DateTime
      +endTime: DateTime
      +estimatedCost: Decimal
      +finalCost: Decimal
    }

    class TransitRoute {
      +id: String
      +line: String
      +origin: String
      +destination: String
      +delayMinutes: int
    }

    class TransitSchedule {
      +id: String
      +departureTime: DateTime
      +capacity: int
      +occupancy: int
    }

    class Trip {
      +id: String
      +startTime: DateTime
      +endTime: DateTime
      +status: TripStatus
      +cost: Decimal
      +city: String
    }

    class UserPreference {
      +preferredCity: String
      +preferredMobilityType: VehicleType
    }

    class Dashboard {
      +totalRegisteredUsers: int
      +activeRentalsByCity: int
      +parkingUtilizationByCity: float
      +completedTrips: int
      +usageComparison: String
    }

    class City {
      +name: String
      +region: String
    }

    class VehicleType {
      <<enumeration>>
      bike
      scooter
      car
    }

    class VehicleStatus {
      <<enumeration>>
      available
      reserved
      inUse
      maintenance
    }

    class ReservationStatus {
      <<enumeration>>
      reserved
      active
      completed
      cancelled
    }

    class TripStatus {
      <<enumeration>>
      planned
      active
      completed
      cancelled
    }

    User <|-- Citizen
    User <|-- MobilityProvider
    User <|-- PublicTransportOperator
    User <|-- CityAdministrator
    User <|-- SystemAdministrator

    SUMMS *-- SharedMobilityService
    SUMMS *-- ParkingManagementService
    SUMMS *-- PublicTransitService
    SUMMS *-- AnalyticsMonitoringService
    SUMMS *-- RecommendationService

    Citizen --> SharedMobilityService
    Citizen --> ParkingManagementService
    Citizen --> PublicTransitService
    Citizen --> RecommendationService

    MobilityProvider --> SharedMobilityService
    PublicTransportOperator --> PublicTransitService
    CityAdministrator --> AnalyticsMonitoringService
    SystemAdministrator --> SUMMS

    SharedMobilityService --> Vehicle
    SharedMobilityService --> Trip

    ParkingManagementService --> ParkingSpot
    ParkingManagementService --> ParkingReservation

    PublicTransitService --> TransitRoute
    PublicTransitService --> TransitSchedule
    PublicTransitService --> Trip

    RecommendationService --> UserPreference
    RecommendationService --> Vehicle
    RecommendationService --> TransitRoute
    RecommendationService --> ParkingSpot

    AnalyticsMonitoringService --> Trip
    AnalyticsMonitoringService --> ParkingReservation
    AnalyticsMonitoringService --> Dashboard

    Citizen "1" --> "0..1" UserPreference
    Citizen "1" --> "0..*" Trip
    Citizen "1" --> "0..*" ParkingReservation

    MobilityProvider "1" --> "0..*" Vehicle
    PublicTransportOperator "1" --> "0..*" TransitRoute

    Vehicle --> City
    ParkingSpot --> City
    Trip --> City
```

## Class Diagram (Implementation - No Design Pattern)
Source: [Class diagram/class-diagram (implementation no design pattern).mmd](./Class%20diagram/class-diagram%20(implementation%20no%20design%20pattern).mmd)

```mermaid
classDiagram
direction LR

class App {
  +render(): JSX
}

class Dashboard {
  -tab: string
  -vehicleType: string
  -radius: string
  -paymentDone: boolean
  -parkingDuration: string
  +loadAllData(): Promise~void~
  +loadAnalyticsDirectly(): Promise~void~
  +loadRealtimeDirectly(): void
  +renderCitizenViews(): JSX
  +renderProviderViews(): JSX
  +renderAdminViews(): JSX
  +render(): JSX
}

class AuthContext {
  -user: AppUser
  -authLoading: boolean
  +login(email, password, selectedRole): Promise~Result~
  +register(name, email, password, role): Promise~Result~
  +logout(): Promise~void~
  +updatePreferences(preferences): Promise~void~
}

class RentalContext {
  -reservation: Reservation
  -activeRental: Rental
  -rentalLoading: boolean
  +reserveVehicle(vehicle): Promise~Reservation~
  +startRental(paymentTxId): Promise~Rental~
  +endRental(cost): Promise~Rental~
}

class MobilityService {
  +fetchVehicles(): Promise~Vehicle[]~
  +fetchTransitRoutes(): Promise~TransitRoute[]~
  +fetchParkingSpots(): Promise~ParkingSpot[]~
  +reserveVehicle(userId, vehicle): Promise~Reservation~
  +completeRental(rental, cost): Promise~Rental~
}

class RecommendationService {
  +getRecommendations(preferences): Promise~RecommendationResult~
}

class SupabaseClientA {
  +query(table, criteria): Promise~any~
}
class SupabaseClientB {
  +query(table, criteria): Promise~any~
}
class SupabaseClientC {
  +query(table, criteria): Promise~any~
}
class SupabaseClientD {
  +query(table, criteria): Promise~any~
}

class UsersTable
class RentalsTable
class VehiclesTable
class ParkingSpotsTable
class ParkingReservationsTable
class TransitPlansTable

class Vehicle {
  +id: string
  +type: string
  +name: string
  +status: string
  +ratePerMin: number
}

class ParkingSpot {
  +id: string
  +address: string
  +available: number
  +total: number
  +pricePerHour: number
}

class Reservation {
  +id: string
  +userId: string
  +vehicleId: string
  +status: string
}

class Rental {
  +id: string
  +userId: string
  +vehicleId: string
  +status: string
  +cost: number
}

App --> Dashboard
Dashboard --> AuthContext
Dashboard --> RentalContext
Dashboard --> MobilityService
Dashboard --> RecommendationService

%% No Facade: Dashboard queries many data sources directly
Dashboard --> UsersTable : direct query
Dashboard --> RentalsTable : direct query
Dashboard --> VehiclesTable : direct query
Dashboard --> ParkingSpotsTable : direct query
Dashboard --> ParkingReservationsTable : direct query
Dashboard --> TransitPlansTable : direct query

%% No Singleton: separate client instances
AuthContext --> SupabaseClientA
MobilityService --> SupabaseClientB
RecommendationService --> SupabaseClientC
Dashboard --> SupabaseClientD

SupabaseClientA --> UsersTable
SupabaseClientB --> RentalsTable
SupabaseClientB --> VehiclesTable
SupabaseClientB --> ParkingSpotsTable
SupabaseClientC --> VehiclesTable
SupabaseClientC --> ParkingSpotsTable
SupabaseClientD --> RentalsTable
SupabaseClientD --> ParkingReservationsTable

%% No Factory Method: Dashboard owns role-specific rendering directly
%% No Observer: Dashboard performs manual refresh / polling
Reservation --> Vehicle
Rental --> Vehicle
```

## Class Diagram (Implementation - With Design Pattern)
Source: [Class diagram/class-diagram (implementation with design pattern).mmd](./Class%20diagram/class-diagram%20(implementation%20with%20design%20pattern).mmd)

```mermaid
classDiagram
direction LR

class SupabaseClient {
  -supabaseUrl: string
  -supabaseKey: string
  +getClient(): Supabase
}
note for SupabaseClient "Singleton: one shared DB client instance"

class App {
  +render(): JSX
}

class Dashboard {
  -tab: string
  -vehicleType: string
  -radius: string
  -paymentDone: boolean
  -parkingDuration: string
  +handleReserveVehicle(vehicle): Promise~void~
  +beginPayment(): Promise~void~
  +returnVehicle(): Promise~void~
  +handleReserveParking(spot): Promise~void~
  +handlePlanTransit(route): Promise~void~
  +render(): JSX
}

class AuthContext {
  -user: AppUser
  -authLoading: boolean
  +login(email, password, selectedRole): Promise~Result~
  +register(name, email, password, role): Promise~Result~
  +logout(): Promise~void~
  +resetPassword(email): Promise~void~
  +updatePreferences(preferences): Promise~void~
}

class RentalContext {
  -reservation: Reservation
  -activeRental: Rental
  -rentalLoading: boolean
  -rentalError: string
  +reserveVehicle(vehicle): Promise~Reservation~
  +clearReservation(): Promise~void~
  +startRental(paymentTxId): Promise~Rental~
  +endRental(cost, receipt): Promise~Rental~
  +refreshRentalState(): Promise~void~
}

class MobilityService {
  +fetchVehicles(): Promise~Vehicle[]~
  +fetchTransitRoutes(): Promise~TransitRoute[]~
  +fetchParkingSpots(): Promise~ParkingSpot[]~
  +fetchProviderRentals(): Promise~ProviderRentalRecord[]~
  +fetchUserReservation(userId): Promise~Reservation~
  +fetchUserActiveRental(userId): Promise~Rental~
  +reserveVehicle(userId, vehicle): Promise~Reservation~
  +startRental(userId, reservation): Promise~Rental~
  +completeRental(activeRental, cost): Promise~Rental~
  +fetchUserParkingReservation(userId): Promise~ParkingReservation~
  +reserveParkingSpot(userId, spot, durationHours): Promise~ParkingReservation~
  +startParkingReservation(reservation): Promise~ParkingReservation~
  +updateParkingReservationDuration(reservation, durationHours): Promise~ParkingReservation~
  +completeParkingReservation(reservation): Promise~ParkingReservation~
  +cancelParkingReservation(reservation): Promise~boolean~
  +fetchUserTransitPlans(userId): Promise~TransitPlan[]~
  +planTransitTrip(userId, route, from, to): Promise~TransitPlan~
}

class RecommendationService {
  +getAvailableVehicles(filters): Promise~Vehicle[]~
  +getAvailableParking(filters): Promise~ParkingSpot[]~
  +getRecommendations(preferences): Promise~RecommendationResult~
}

class DashboardFacade {
  <<interface>>
  +getDashboardSummary(): Promise~DashboardSummary~
}

class AdminDashboardService {
  +getTotalUsers(): Promise~int~
  +getActiveRentals(): Promise~Rental[]~
  +getCompletedTripsToday(): Promise~int~
  +getUsageByVehicleType(): Promise~UsageBreakdown~
  +getParkingUtilization(): Promise~ParkingUtilization[]~
  +getActiveParking(): Promise~int~
  +getHourlyRentalTrend(): Promise~HourlyBucket[]~
  +getFleetStatus(): Promise~FleetStatus~
  +getDashboardSummary(): Promise~DashboardSummary~
  +subscribeToMonitoringChanges(callback, onStatusChange): Channel
  +unsubscribe(channel): void
}

class AdminDashboard {
  -data: DashboardSummary
  -loading: boolean
  -events: DashboardEvent[]
  -connectionStatus: string
  +loadData(options): Promise~void~
  +render(): JSX
  +onRealtimeEvent(payload): void
}
note for AdminDashboard "Observer: reacts to Subject events"

class Subject {
  <<interface>>
  +subscribe(observer): void
  +unsubscribe(observer): void
  +notify(event): void
}

class Observer {
  <<interface>>
  +update(event): void
}

class SupabaseRealtimeSubject {
  +subscribe(observer): void
  +unsubscribe(observer): void
  +notify(event): void
}

class RoleDashboardCreator {
  <<abstract>>
  +createTabs(): string[]
  +createMainContent(renderers): JSX
}

class CitizenDashboardCreator {
  +createTabs(): string[]
  +createMainContent(renderers): JSX
}

class ProviderDashboardCreator {
  +createTabs(): string[]
  +createMainContent(renderers): JSX
}

class AdminDashboardCreator {
  +createTabs(): string[]
  +createMainContent(renderers): JSX
}

class RoleDashboardFactory {
  +createRoleDashboardCreator(role): RoleDashboardCreator
}
note for RoleDashboardFactory "Factory Method"

class Vehicle {
  +id: string
  +type: string
  +name: string
  +status: string
  +ratePerMin: number
  +distance: number
}

class ParkingSpot {
  +id: string
  +address: string
  +available: number
  +total: number
  +pricePerHour: number
}

class Reservation {
  +id: string
  +userId: string
  +vehicleId: string
  +status: string
  +reservedAt: datetime
}

class Rental {
  +id: string
  +userId: string
  +vehicleId: string
  +status: string
  +startTime: datetime
  +endTime: datetime
  +cost: number
}

class DashboardSummary {
  +totalUsers: number
  +activeRentalsCount: number
  +completedToday: number
  +vehicleUsage: object
  +parkingUtilization: object[]
  +activeParking: number
  +hourlyRentals: object[]
  +fleetStatus: object
  +monitoring: object[]
  +alerts: object[]
}

App --> Dashboard
Dashboard --> AuthContext
Dashboard --> RentalContext
Dashboard --> MobilityService
Dashboard --> RecommendationService
Dashboard --> RoleDashboardFactory
RoleDashboardFactory --> RoleDashboardCreator
RoleDashboardCreator <|-- CitizenDashboardCreator
RoleDashboardCreator <|-- ProviderDashboardCreator
RoleDashboardCreator <|-- AdminDashboardCreator

AdminDashboard --> DashboardFacade
DashboardFacade <|.. AdminDashboardService
AdminDashboardService --> SupabaseClient
MobilityService --> SupabaseClient
RecommendationService --> SupabaseClient
AuthContext --> SupabaseClient
RentalContext --> MobilityService

Subject <|.. SupabaseRealtimeSubject
Observer <|.. AdminDashboard
SupabaseRealtimeSubject --> AdminDashboard : notify(event)

Reservation --> Vehicle
Rental --> Vehicle
```

## Facade Pattern
Source: [Design patterns diagram/Facade pattern.mmd](./Design%20patterns%20diagram/Facade%20pattern.mmd)

```mermaid
classDiagram
    direction LR

    class AdminDashboard {
      +loadData()
      +render(summary: DashboardSummary)
    }

    class DashboardFacade {
      <<interface>>
      +getDashboardSummary() DashboardSummary
    }

    class AdminDashboardService {
      +getTotalUsers()
      +getActiveRentals()
      +getCompletedTripsToday()
      +getUsageByVehicleType()
      +getParkingUtilization()
      +getActiveParking()
      +getHourlyRentalTrend()
      +getFleetStatus()
      +getDashboardSummary() DashboardSummary
    }

    class DashboardSummary {
      +totalUsers: int
      +activeRentalsCount: int
      +completedToday: int
      +vehicleUsage: object
      +parkingUtilization: list
      +activeParking: int
      +hourlyRentals: list
      +fleetStatus: object
      +monitoring: list
      +alerts: list
    }

    class UsersTable
    class RentalsTable
    class VehiclesTable
    class ParkingSpotsTable
    class ParkingReservationsTable

    DashboardFacade <|.. AdminDashboardService
    AdminDashboard --> DashboardFacade : calls getDashboardSummary()
    DashboardFacade --> DashboardSummary : returns

    AdminDashboardService --> UsersTable : query
    AdminDashboardService --> RentalsTable : query
    AdminDashboardService --> VehiclesTable : query
    AdminDashboardService --> ParkingSpotsTable : query
    AdminDashboardService --> ParkingReservationsTable : query
```

## Factory Pattern
Source: [Design patterns diagram/Factory pattern.mmd](./Design%20patterns%20diagram/Factory%20pattern.mmd)

```mermaid
classDiagram
    class RoleDashboardCreator {
      <<abstract>>
      +createTabs() string[]
      +createMainContent(renderers) JSXElement
    }

    class CitizenDashboardCreator {
      +createTabs() string[]
      +createMainContent(renderers) JSXElement
    }

    class ProviderDashboardCreator {
      +createTabs() string[]
      +createMainContent(renderers) JSXElement
    }

    class AdminDashboardCreator {
      +createTabs() string[]
      +createMainContent(renderers) JSXElement
    }

    class DashboardFactory {
      +createRoleDashboardCreator(role) RoleDashboardCreator
    }

    class DashboardUI {
      +render()
    }

    RoleDashboardCreator <|-- CitizenDashboardCreator
    RoleDashboardCreator <|-- ProviderDashboardCreator
    RoleDashboardCreator <|-- AdminDashboardCreator
    DashboardUI --> DashboardFactory : calls
    DashboardUI --> RoleDashboardCreator : uses product
```

## Observer Pattern
Source: [Design patterns diagram/Observer pattern.mmd](./Design%20patterns%20diagram/Observer%20pattern.mmd)

```mermaid
classDiagram
    direction LR

    class Subject {
      <<interface>>
      +subscribe(observer: Observer)
      +unsubscribe(observer: Observer)
      +notify(event: RentalEvent)
    }

    class Observer {
      <<interface>>
      +update(event: RentalEvent)
    }

    class SupabaseRealtimeSubject {
      +subscribe(observer: Observer)
      +unsubscribe(observer: Observer)
      +notify(event: RentalEvent)
      +onPostgresChange(payload)
    }

    class AdminDashboardService {
      +subscribeToRentalChanges(callback)
      +getDashboardSummary()
      +unsubscribe(channel)
    }

    class AdminDashboard {
      +mount()
      +update(event: RentalEvent)
      +refreshDashboard()
      +render()
    }

    class RentalEvent {
      +eventType: INSERT|UPDATE|DELETE
      +table: rentals
      +recordId: int
      +timestamp: DateTime
    }

    Subject <|.. SupabaseRealtimeSubject
    Observer <|.. AdminDashboard

    SupabaseRealtimeSubject --> Observer : notify(event)
    AdminDashboard --> AdminDashboardService : subscribeToRentalChanges()
    AdminDashboardService --> SupabaseRealtimeSubject : register callback
    AdminDashboard --> AdminDashboardService : getDashboardSummary()
    SupabaseRealtimeSubject --> RentalEvent : publishes
```

## Singleton Pattern
Source: [Design patterns diagram/Singleton pattern.mmd](./Design%20patterns%20diagram/Singleton%20pattern.mmd)

```mermaid
classDiagram
    class SupabaseClientSingleton {
      -instance: SupabaseClient
      -SupabaseClientSingleton()
      +getInstance(): SupabaseClient
    }

    class AuthContext
    class MobilityService
    class AdminDashboardService
    class RecommendationService

    AuthContext --> SupabaseClientSingleton : uses
    MobilityService --> SupabaseClientSingleton : uses
    AdminDashboardService --> SupabaseClientSingleton : uses
    RecommendationService --> SupabaseClientSingleton : uses
```

