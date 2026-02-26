import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MainTabs from './MainTabs';
import ReserveScreen from '../screens/vehicle/ReserveScreen';
import PaymentScreen from '../screens/vehicle/PaymentScreen';
import ActiveRentalScreen from '../screens/vehicle/ActiveRentalScreen';
import ReturnScreen from '../screens/vehicle/ReturnScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f172a' },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#f8fafc',
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Reserve" component={ReserveScreen} options={{ title: 'Reserve Vehicle' }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="ActiveRental" component={ActiveRentalScreen} options={{ title: 'Active Rental' }} />
      <Stack.Screen name="Return" component={ReturnScreen} options={{ title: 'Return Vehicle' }} />
    </Stack.Navigator>
  );
}
