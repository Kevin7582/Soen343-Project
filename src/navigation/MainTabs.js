import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import HomeScreen from '../screens/HomeScreen';
import SearchVehicleScreen from '../screens/vehicle/SearchVehicleScreen';
import TransitScreen from '../screens/TransitScreen';
import ParkingScreen from '../screens/ParkingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProviderVehiclesScreen from '../screens/provider/ProviderVehiclesScreen';
import RentalDataScreen from '../screens/provider/RentalDataScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import GatewayAnalyticsScreen from '../screens/admin/GatewayAnalyticsScreen';

const Tab = createBottomTabNavigator();

const citizenTabIcons = {
  Home: { active: 'home', inactive: 'home-outline' },
  Search: { active: 'car-sport', inactive: 'car-sport-outline' },
  Transit: { active: 'bus', inactive: 'bus-outline' },
  Parking: { active: 'square', inactive: 'square-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

const providerTabIcons = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Vehicles: { active: 'car-sport', inactive: 'car-sport-outline' },
  RentalData: { active: 'list', inactive: 'list-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

const adminTabIcons = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  RentalAnalytics: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  GatewayAnalytics: { active: 'pulse', inactive: 'pulse-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

const icon = (_, { active, inactive }) => ({ focused, color, size }) =>
  <Ionicons name={focused ? active : inactive} size={size} color={color} />;

export default function MainTabs() {
  const { isCitizen, isProvider, isAdmin } = useAuth();

  const commonScreenOptions = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.text,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      paddingTop: 8,
      height: 64,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
    tabBarItemStyle: { paddingVertical: 4 },
  };

  if (isAdmin) {
    return (
      <Tab.Navigator screenOptions={commonScreenOptions}>
        <Tab.Screen name="Dashboard" component={HomeScreen} options={{ title: 'Home', tabBarLabel: 'Home', tabBarIcon: icon('Dashboard', adminTabIcons.Dashboard) }} />
        <Tab.Screen name="RentalAnalytics" component={AnalyticsScreen} options={{ title: 'Rental Analytics', tabBarLabel: 'Analytics', tabBarIcon: icon('RentalAnalytics', adminTabIcons.RentalAnalytics) }} />
        <Tab.Screen name="GatewayAnalytics" component={GatewayAnalyticsScreen} options={{ title: 'Gateway', tabBarLabel: 'Gateway', tabBarIcon: icon('GatewayAnalytics', adminTabIcons.GatewayAnalytics) }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: icon('Profile', adminTabIcons.Profile) }} />
      </Tab.Navigator>
    );
  }

  if (isProvider) {
    return (
      <Tab.Navigator screenOptions={commonScreenOptions}>
        <Tab.Screen name="Dashboard" component={HomeScreen} options={{ title: 'Home', tabBarLabel: 'Home', tabBarIcon: icon('Dashboard', providerTabIcons.Dashboard) }} />
        <Tab.Screen name="Vehicles" component={ProviderVehiclesScreen} options={{ title: 'Vehicles', tabBarLabel: 'Vehicles', tabBarIcon: icon('Vehicles', providerTabIcons.Vehicles) }} />
        <Tab.Screen name="RentalData" component={RentalDataScreen} options={{ title: 'Rentals', tabBarLabel: 'Rentals', tabBarIcon: icon('RentalData', providerTabIcons.RentalData) }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: icon('Profile', providerTabIcons.Profile) }} />
      </Tab.Navigator>
    );
  }

  return (
    <Tab.Navigator screenOptions={commonScreenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: icon('Home', citizenTabIcons.Home),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchVehicleScreen}
        options={{
          title: 'Find Vehicle',
          tabBarLabel: 'Find Vehicle',
          tabBarIcon: icon('Search', citizenTabIcons.Search),
        }}
      />
      <Tab.Screen
        name="Transit"
        component={TransitScreen}
        options={{
          title: 'Transit',
          tabBarLabel: 'Transit',
          tabBarIcon: icon('Transit', citizenTabIcons.Transit),
        }}
      />
      <Tab.Screen
        name="Parking"
        component={ParkingScreen}
        options={{
          title: 'Parking',
          tabBarLabel: 'Parking',
          tabBarIcon: icon('Parking', citizenTabIcons.Parking),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: icon('Profile', citizenTabIcons.Profile),
        }}
      />
    </Tab.Navigator>
  );
}
