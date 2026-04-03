const ROLE_TABS = {
  citizen: ['dashboard', 'recommendations', 'mobility', 'parking', 'transit', 'analytics', 'activeRental', 'profile'],
  provider: ['home', 'vehicles', 'rentalData', 'profile'],
  admin: ['home', 'rentalAnalytics', 'gatewayAnalytics', 'adminDashboard', 'profile'],
};

class RoleDashboardCreator {
  createTabs() {
    throw new Error('createTabs() must be implemented by subclasses.');
  }

  createMainContent(_renderers) {
    throw new Error('createMainContent() must be implemented by subclasses.');
  }
}

class CitizenDashboardCreator extends RoleDashboardCreator {
  createTabs() {
    return ROLE_TABS.citizen;
  }

  createMainContent(renderers) {
    return renderers.renderCitizen();
  }
}

class ProviderDashboardCreator extends RoleDashboardCreator {
  createTabs() {
    return ROLE_TABS.provider;
  }

  createMainContent(renderers) {
    return renderers.renderProvider();
  }
}

class AdminDashboardCreator extends RoleDashboardCreator {
  createTabs() {
    return ROLE_TABS.admin;
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
