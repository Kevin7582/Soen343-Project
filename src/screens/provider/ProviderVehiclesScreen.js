import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { colors } from '../../theme/colors';

const INITIAL_VEHICLES = [
  { id: 'v1', type: 'scooter', name: 'Scooter #101', status: 'available', maintenance: 'ok' },
  { id: 'v2', type: 'scooter', name: 'Scooter #102', status: 'available', maintenance: 'ok' },
  { id: 'v3', type: 'bike', name: 'Bike #201', status: 'maintenance', maintenance: 'pending' },
];

export default function ProviderVehiclesScreen() {
  const [vehicles, setVehicles] = useState(INITIAL_VEHICLES);

  const updateVehicle = (id, field, value) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const addVehicle = () => {
    const newId = `v${Date.now()}`;
    setVehicles((prev) => [
      ...prev,
      { id: newId, type: 'scooter', name: `Vehicle #${prev.length + 1}`, status: 'available', maintenance: 'ok' },
    ]);
    Alert.alert('Vehicle added', 'New vehicle has been added to the fleet.');
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.type}>{item.type}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Status</Text>
        <TouchableOpacity
          style={[styles.statusBtn, item.status === 'available' && styles.statusAvailable]}
          onPress={() => updateVehicle(item.id, 'status', item.status === 'available' ? 'unavailable' : 'available')}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Maintenance</Text>
        <Text style={styles.value}>{item.maintenance}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={addVehicle}>
        <Text style={styles.addBtnText}>+ Add vehicle</Text>
      </TouchableOpacity>
      <FlatList
        data={vehicles}
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
  addBtn: {
    margin: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addBtnText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 16,
  },
  list: {
    padding: 16,
    paddingTop: 0,
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
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  type: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
  },
  value: {
    color: colors.text,
    fontSize: 14,
  },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  statusAvailable: {
    backgroundColor: colors.success + '33',
  },
  statusText: {
    fontSize: 12,
    color: colors.text,
    textTransform: 'capitalize',
  },
});
