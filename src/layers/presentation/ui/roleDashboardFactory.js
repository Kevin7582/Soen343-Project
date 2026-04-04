const ROLE_NAVIGATION = {
  citizen: {
    defaultTab: 'dashboard',
    tabs: ['dashboard', 'recommendations', 'mobility', 'parking', 'transit', 'analytics', 'activeRental', 'profile'],
    tabLabels: {
      dashboard: 'Dashboard',
      recommendations: 'For You',
      mobility: 'Mobility',
      parking: 'Parking',
      transit: 'Transit',
      analytics: 'Analytics',
      activeRental: 'Active Rental',
      profile: 'Profile',
    },
  },
  provider: {
    defaultTab: 'home',
    tabs: ['home', 'vehicles', 'rentalData', 'profile'],
    tabLabels: {
      home: 'Home',
      vehicles: 'Vehicles',
      rentalData: 'Rentals',
      profile: 'Profile',
    },
  },
  admin: {
    defaultTab: 'home',
    tabs: ['home', 'rentalAnalytics', 'gatewayAnalytics', 'adminDashboard', 'profile'],
    tabLabels: {
      home: 'Home',
      rentalAnalytics: 'Rental Analytics',
      gatewayAnalytics: 'Gateway Analytics',
      adminDashboard: 'Admin Dashboard',
      profile: 'Profile',
    },
  },
};

function cloneNavigationConfig(config) {
  return {
    defaultTab: config.defaultTab,
    tabs: [...config.tabs],
    tabLabels: { ...config.tabLabels },
  };
}

class RoleDashboardCreator {
  createNavigationConfig() {
    throw new Error('createNavigationConfig() must be implemented by subclasses.');
  }

  createTabs() {
    return this.createNavigationConfig().tabs;
  }

  createDefaultTab() {
    return this.createNavigationConfig().defaultTab;
  }

  createTabLabels() {
    return this.createNavigationConfig().tabLabels;
  }

  createMainContent(_renderers) {
    throw new Error('createMainContent() must be implemented by subclasses.');
  }
}

class CitizenDashboardCreator extends RoleDashboardCreator {
  createNavigationConfig() {
    return cloneNavigationConfig(ROLE_NAVIGATION.citizen);
  }

  createMainContent(renderers) {
    return renderers.renderCitizen();
  }
}

class ProviderDashboardCreator extends RoleDashboardCreator {
  createNavigationConfig() {
    return cloneNavigationConfig(ROLE_NAVIGATION.provider);
  }

  createMainContent(renderers) {
    return renderers.renderProvider();
  }
}

class AdminDashboardCreator extends RoleDashboardCreator {
  createNavigationConfig() {
    return cloneNavigationConfig(ROLE_NAVIGATION.admin);
  }

  createMainContent(renderers) {
    return renderers.renderAdmin();
  }
}

export function createRoleDashboardCreator(role) {
  if (role === 'admin') return new AdminDashboardCreator();
  if (role === 'provider') return new ProviderDashboardCreator();
  return new CitizenDashboardCreator();
}
