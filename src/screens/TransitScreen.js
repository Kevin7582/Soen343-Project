import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { mockTransitRoutes } from '../services/api';
import { colors } from '../theme/colors';

export default function TransitScreen() {
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.line}>{item.line}</Text>
        {item.delay > 0 && (
          <View style={styles.delayBadge}>
            <Text style={styles.delayText}>{item.delay} min delay</Text>
          </View>
        )}
      </View>
      <Text style={styles.route}>{item.from} → {item.to}</Text>
      <Text style={styles.next}>Next: {item.nextDeparture}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Public transit</Text>
        <Text style={styles.subtitle}>Routes and schedules (Montreal)</Text>
      </View>
      <FlatList
        data={mockTransitRoutes}
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  line: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  delayBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  delayText: {
    fontSize: 12,
    color: colors.background,
    fontWeight: '600',
  },
  route: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
  },
  next: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
});
