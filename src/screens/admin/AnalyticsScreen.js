import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';

export default function AnalyticsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Rental analytics</Text>
        <Text style={styles.subtitle}>Usage trends and KPIs</Text>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiValue}>1,247</Text>
          <Text style={styles.kpiLabel}>Rentals (30d)</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiValue}>342</Text>
          <Text style={styles.kpiLabel}>Active users</Text>
        </View>
      </View>
      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiValue}>Scooter</Text>
          <Text style={styles.kpiLabel}>Top vehicle type</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiValue}>18 min</Text>
          <Text style={styles.kpiLabel}>Avg. duration</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Usage by day (last 7 days)</Text>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Mon</Text>
          <View style={[styles.bar, { width: '60%' }]} />
          <Text style={styles.barValue}>180</Text>
        </View>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Tue</Text>
          <View style={[styles.bar, { width: '75%' }]} />
          <Text style={styles.barValue}>220</Text>
        </View>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Wed</Text>
          <View style={[styles.bar, { width: '85%' }]} />
          <Text style={styles.barValue}>250</Text>
        </View>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Thu</Text>
          <View style={[styles.bar, { width: '90%' }]} />
          <Text style={styles.barValue}>265</Text>
        </View>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Fri</Text>
          <View style={[styles.bar, { width: '100%' }]} />
          <Text style={styles.barValue}>295</Text>
        </View>
      </View>
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
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  kpi: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  kpiLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  barLabel: {
    width: 36,
    color: colors.textMuted,
    fontSize: 12,
  },
  bar: {
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 4,
    marginHorizontal: 12,
  },
  barValue: {
    color: colors.text,
    fontSize: 12,
    width: 32,
    textAlign: 'right',
  },
});
