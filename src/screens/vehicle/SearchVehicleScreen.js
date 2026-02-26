import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useRental } from '../../context/RentalContext';
import { mockVehicles } from '../../services/api';
import { colors } from '../../theme/colors';

const TYPES = ['all', 'scooter', 'bike'];

export default function SearchVehicleScreen() {
  const navigation = useNavigation();
  const { setReserve } = useRental();
  const [vehicleType, setVehicleType] = useState('all');
  const [radius, setRadius] = useState('2');
  const [location] = useState('Montreal');

  const vehicles = useMemo(() => {
    let list = [...mockVehicles];
    if (vehicleType !== 'all') list = list.filter((v) => v.type === vehicleType);
    const r = parseFloat(radius) || 5;
    list = list.filter((v) => v.distance <= r);
    return list;
  }, [vehicleType, radius]);

  const onReserve = (vehicle) => {
    setReserve(vehicle);
    navigation.getParent()?.navigate('Reserve');
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.badge}>{item.type}</Text>
      </View>
      <Text style={styles.distance}>{item.distance} km away · ${item.ratePerMin}/min</Text>
      <TouchableOpacity style={styles.reserveBtn} onPress={() => onReserve(item)}>
        <Text style={styles.reserveBtnText}>Reserve</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Vehicle type</Text>
        <View style={styles.chipRow}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, vehicleType === t && styles.chipActive]}
              onPress={() => setVehicleType(t)}
            >
              <Text style={[styles.chipText, vehicleType === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.filterLabel}>Radius (km)</Text>
        <TextInput
          style={styles.input}
          value={radius}
          onChangeText={setRadius}
          keyboardType="decimal-pad"
          placeholder="2"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.location}>Location: {location}</Text>
      </View>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No vehicles in this area</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filters: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    color: colors.text,
    fontSize: 16,
    maxWidth: 80,
  },
  location: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 12,
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    fontSize: 12,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  distance: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  reserveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  reserveBtnText: {
    color: colors.background,
    fontWeight: '600',
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});
