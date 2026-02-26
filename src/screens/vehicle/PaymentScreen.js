import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRental } from '../../context/RentalContext';
import { colors } from '../../theme/colors';

export default function PaymentScreen() {
  const navigation = useNavigation();
  const { reservation, startRental, clearReservation } = useRental();
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');

  if (!reservation) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No reservation. Start from Search.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Main')}>
          <Text style={styles.btnText}>Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const estimatedCost = 5;
  const handlePay = () => {
    const txId = `tx_${Date.now()}`;
    startRental(reservation, txId);
    navigation.replace('ActiveRental');
  };

  const handleFail = () => {
    Alert.alert('Payment failed', 'Please check your payment method and try again.', [
      { text: 'OK', onPress: () => {} },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.vehicleName}>{reservation.name}</Text>
        <Text style={styles.amount}>Pre-auth / estimated: ${estimatedCost}</Text>
        <Text style={styles.note}>You will be charged at the end of the rental based on usage.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Card number</Text>
        <TextInput
          style={styles.input}
          value={cardNumber}
          onChangeText={setCardNumber}
          placeholder="4242 4242 4242 4242"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Expiry</Text>
            <TextInput
              style={styles.input}
              value={expiry}
              onChangeText={setExpiry}
              placeholder="MM/YY"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>CVC</Text>
            <TextInput
              style={styles.input}
              value={cvc}
              onChangeText={setCvc}
              placeholder="123"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={handlePay}>
        <Text style={styles.primaryBtnText}>Confirm payment</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={handleFail}>
        <Text style={styles.secondaryBtnText}>Simulate payment decline</Text>
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
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  amount: {
    fontSize: 24,
    color: colors.primary,
    marginTop: 8,
    fontWeight: '700',
  },
  note: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
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
    fontSize: 14,
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
