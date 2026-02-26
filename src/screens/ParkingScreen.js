import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { mockParkingSpots } from '../services/api';
import { colors } from '../theme/colors';

export default function ParkingScreen() {
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.address}>{item.address}</Text>
      <View style={styles.row}>
        <Text style={styles.spots}>{item.available} / {item.total} spots available</Text>
        <Text style={styles.distance}>{item.distance} km</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parking</Text>
        <Text style={styles.subtitle}>Available spaces nearby</Text>
      </View>
      <FlatList
        data={mockParkingSpots}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  address: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  spots: {
    fontSize: 14,
    color: colors.success,
  },
  distance: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
