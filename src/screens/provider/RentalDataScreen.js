import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors } from '../../theme/colors';

const MOCK_RENTALS = [
  { id: 'r1', vehicle: 'Scooter #101', user: 'user@example.com', start: '2026-02-26 10:00', end: '2026-02-26 10:25', cost: 6.25 },
  { id: 'r2', vehicle: 'Bike #201', user: 'other@example.com', start: '2026-02-26 09:15', end: '2026-02-26 09:45', cost: 4.5 },
];

export default function RentalDataScreen() {
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.vehicle}>{item.vehicle}</Text>
      <Text style={styles.user}>{item.user}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Start</Text>
        <Text style={styles.value}>{item.start}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>End</Text>
        <Text style={styles.value}>{item.end}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Cost</Text>
        <Text style={styles.cost}>${item.cost}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rental records</Text>
        <Text style={styles.subtitle}>Manage and view rental data</Text>
      </View>
      <FlatList
        data={MOCK_RENTALS}
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
  vehicle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  user: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
  },
  value: {
    color: colors.text,
    fontSize: 14,
  },
  cost: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
