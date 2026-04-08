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
  city_admin: {
    defaultTab: 'home',
    tabs: ['home', 'rentalAnalytics', 'adminDashboard', 'profile'],
    tabLabels: {
      home: 'Home',
      rentalAnalytics: 'Rental Analytics',
      adminDashboard: 'City Dashboard',
      profile: 'Profile',
    },
  },
  system_admin: {
    defaultTab: 'home',
    tabs: ['home', 'gatewayAnalytics', 'adminDashboard', 'profile'],
    tabLabels: {
      home: 'Home',
      gatewayAnalytics: 'Gateway Analytics',
      adminDashboard: 'System Dashboard',
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

class CityAdminDashboardCreator extends RoleDashboardCreator {
  createNavigationConfig() {
    return cloneNavigationConfig(ROLE_NAVIGATION.city_admin);
  }

  createMainContent(renderers) {
    return renderers.renderAdmin();
  }
}

class SystemAdminDashboardCreator extends RoleDashboardCreator {
  createNavigationConfig() {
    return cloneNavigationConfig(ROLE_NAVIGATION.system_admin);
  }

  createMainContent(renderers) {
    return renderers.renderAdmin();
  }
}

export function createRoleDashboardCreator(role) {
  if (role === 'city_admin') return new CityAdminDashboardCreator();
  if (role === 'system_admin') return new SystemAdminDashboardCreator();
  if (role === 'admin') return new AdminDashboardCreator();
  if (role === 'provider') return new ProviderDashboardCreator();
  return new CitizenDashboardCreator();
}
