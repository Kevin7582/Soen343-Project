import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRental } from '../../context/RentalContext';
import { colors } from '../../theme/colors';

export default function ReturnScreen() {
  const navigation = useNavigation();
  const { activeRental, endRental } = useRental();
  const [completed, setCompleted] = useState(false);

  if (!activeRental && !completed) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No active rental.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (completed) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.receiptCard]}>
          <Text style={styles.receiptTitle}>Rental complete</Text>
          <Text style={styles.receiptSubtitle}>Receipt and payment confirmation have been recorded.</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Main')}>
          <Text style={styles.primaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const start = new Date(activeRental.startTime);
  const elapsedMin = Math.floor((Date.now() - start.getTime()) / 60000);
  const baseCost = elapsedMin * (activeRental.vehicle?.ratePerMin ?? 0.25);
  const lateFee = 0;
  const totalCost = (baseCost + lateFee).toFixed(2);

  const confirmReturn = () => {
    endRental(parseFloat(totalCost), { transactionId: activeRental.paymentTxId });
    setCompleted(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.vehicleName}>{activeRental.vehicle?.name}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Duration</Text>
          <Text style={styles.value}>{elapsedMin} min</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Base cost</Text>
          <Text style={styles.value}>${baseCost.toFixed(2)}</Text>
        </View>
        {lateFee > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Late fee</Text>
            <Text style={styles.value}>${lateFee.toFixed(2)}</Text>
          </View>
        )}
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${totalCost}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={confirmReturn}>
        <Text style={styles.primaryBtnText}>Confirm return & pay</Text>
      </TouchableOpacity>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
  },
  value: {
    color: colors.text,
    fontSize: 14,
  },
  totalRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  receiptCard: {
    borderColor: colors.success,
  },
  receiptTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.success,
  },
  receiptSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
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
