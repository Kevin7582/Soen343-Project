import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRental } from '../../context/RentalContext';
import { colors } from '../../theme/colors';

export default function ReserveScreen() {
  const navigation = useNavigation();
  const { reservation, clearReservation } = useRental();

  if (!reservation) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No vehicle selected. Go to Search to pick one.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const confirmReservation = () => {
    navigation.navigate('Payment');
  };

  const cancel = () => {
    Alert.alert('Cancel reservation', 'Release this vehicle?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel reservation', style: 'destructive', onPress: () => { clearReservation(); navigation.goBack(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{reservation.name}</Text>
        <Text style={styles.subtitle}>{reservation.type} · {reservation.distance} km away</Text>
        <Text style={styles.rate}>${reservation.ratePerMin} / minute</Text>
        <Text style={styles.note}>Vehicle will be locked for you. Proceed to payment to start the rental.</Text>
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={confirmReservation}>
        <Text style={styles.primaryBtnText}>Proceed to payment</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={cancel}>
        <Text style={styles.secondaryBtnText}>Cancel reservation</Text>
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
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  rate: {
    fontSize: 18,
    color: colors.primary,
    marginTop: 12,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 16,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryBtn: {
    padding: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.textMuted,
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
