import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRental } from '../../context/RentalContext';
import { colors } from '../../theme/colors';

export default function ActiveRentalScreen() {
  const navigation = useNavigation();
  const { activeRental } = useRental();

  if (!activeRental) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>No active rental</Text>
          <Text style={styles.emptySubtitle}>Search for a vehicle and complete a reservation to start a rental.</Text>
        </View>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const start = new Date(activeRental.startTime);
  const elapsedMin = Math.floor((Date.now() - start.getTime()) / 60000);
  const estimatedCost = (elapsedMin * (activeRental.vehicle?.ratePerMin ?? 0.25)).toFixed(2);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.vehicleName}>{activeRental.vehicle?.name}</Text>
        <Text style={styles.badge}>{activeRental.vehicle?.type}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Started</Text>
          <Text style={styles.value}>{start.toLocaleTimeString()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Elapsed</Text>
          <Text style={styles.value}>{elapsedMin} min</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Est. cost so far</Text>
          <Text style={styles.value}>${estimatedCost}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.returnBtn}
        onPress={() => navigation.navigate('Return')}
      >
        <Text style={styles.returnBtnText}>Return vehicle</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  vehicleName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
  },
  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  returnBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  returnBtnText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
  btn: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  btnText: {
    color: colors.text,
  },
});
