import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';

export default function GatewayAnalyticsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Gateway analytics</Text>
        <Text style={styles.subtitle}>API performance and health</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Request volume (last 24h)</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Total requests</Text>
          <Text style={styles.metricValue}>12,450</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Avg response time</Text>
          <Text style={styles.metricValue}>42 ms</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Error rate</Text>
          <Text style={[styles.metricValue, { color: colors.success }]}>0.1%</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>By service</Text>
        <View style={styles.serviceRow}>
          <Text style={styles.serviceName}>Rental Service</Text>
          <Text style={styles.serviceStat}>5,200 req</Text>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.serviceName}>Parking Service</Text>
          <Text style={styles.serviceStat}>3,100 req</Text>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.serviceName}>Public Transport</Text>
          <Text style={styles.serviceStat}>2,800 req</Text>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.serviceName}>Analytics</Text>
          <Text style={styles.serviceStat}>1,350 req</Text>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceName: {
    color: colors.text,
    fontSize: 14,
  },
  serviceStat: {
    color: colors.primary,
    fontSize: 14,
  },
});
