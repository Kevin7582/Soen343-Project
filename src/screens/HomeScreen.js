import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function HomeScreen({ navigation }) {
  const { user, isCitizen, isProvider, isAdmin } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name ?? 'User'}</Text>
        <Text style={styles.role}>
          {isCitizen && 'Citizen'}
          {isProvider && 'Mobility Provider'}
          {isAdmin && 'Admin'}
        </Text>
      </View>

      {isCitizen && (
        <>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.getParent()?.navigate('Search')}
          >
            <Text style={styles.cardTitle}>Find a vehicle</Text>
            <Text style={styles.cardSubtitle}>Scooters, bikes, and more in Montreal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.getParent()?.navigate('Transit')}
          >
            <Text style={styles.cardTitle}>Public transit</Text>
            <Text style={styles.cardSubtitle}>Routes, schedules, delays</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.getParent()?.navigate('Parking')}
          >
            <Text style={styles.cardTitle}>Parking</Text>
            <Text style={styles.cardSubtitle}>Available spaces nearby</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.card, styles.cardHighlight]}
            onPress={() => navigation.getParent()?.navigate('ActiveRental')}
          >
            <Text style={styles.cardTitle}>Active rental</Text>
            <Text style={styles.cardSubtitle}>View or return your vehicle</Text>
          </TouchableOpacity>
        </>
      )}

      {(isProvider || isAdmin) && (
        <>
          <Text style={styles.sectionTitle}>Dashboard</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SUMMS Management</Text>
            <Text style={styles.cardSubtitle}>
              {isProvider && 'Manage your vehicles and rental data.'}
              {isAdmin && 'View rental and gateway analytics.'}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  role: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHighlight: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
});
