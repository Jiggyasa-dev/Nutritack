import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { getWeightLogs, logWeight, getWeightStats, WeightEntry, WeightStats } from '../api/client';

const PRIMARY = '#00BCD4';
const BG      = '#F5F7FA';
const PERIODS = ['Week', 'Month', '3 Months'];

const WeightHistory = () => {
  const [activePeriod, setActivePeriod] = useState('Week');
  const [newWeight,    setNewWeight]     = useState('');
  const [logs,         setLogs]          = useState<WeightEntry[]>([]);
  const [stats,        setStats]         = useState<WeightStats>({ current: null, change: null, avg: null, bmi: null });
  const [loading,      setLoading]       = useState(true);
  const [saving,       setSaving]        = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        try {
          const [l, s] = await Promise.all([getWeightLogs(30), getWeightStats()]);
          setLogs(l);
          setStats(s);
        } catch (err: any) { console.warn(err.message); }
        finally { setLoading(false); }
      };
      load();
    }, [])
  );

  const handleLogWeight = async () => {
    const w = parseFloat(newWeight);
    if (isNaN(w) || w < 20 || w > 300) {
      Alert.alert('Invalid Weight', 'Enter a weight between 20–300 kg');
      return;
    }
    setSaving(true);
    try {
      await logWeight(w);
      const [l, s] = await Promise.all([getWeightLogs(30), getWeightStats()]);
      setLogs(l);
      setStats(s);
      setNewWeight('');
      Alert.alert('Logged!', `${w} kg recorded for today.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Chart data (last 7) ────────────────────────────────
  const chartData = logs.slice(-7);
  const weights   = chartData.map((d) => d.weight);
  const maxW      = weights.length ? Math.max(...weights) : 80;
  const minW      = weights.length ? Math.min(...weights) : 70;
  const range     = maxW - minW || 1;

  const dayLabel = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });

  const bmiLabel =
    !stats.bmi ? '—'
    : stats.bmi < 18.5 ? 'Underweight'
    : stats.bmi < 25   ? 'Healthy'
    : stats.bmi < 30   ? 'Overweight'
    : 'Obese';

  const bmiColor =
    !stats.bmi ? '#9E9E9E'
    : stats.bmi < 18.5 ? '#2196F3'
    : stats.bmi < 25   ? '#4CAF50'
    : stats.bmi < 30   ? '#FF9800'
    : '#F44336';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
        <Text style={styles.headerSub}>Track your health journey</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading progress…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, activePeriod === p && styles.periodBtnActive]}
                onPress={() => setActivePeriod(p)}
              >
                <Text style={[styles.periodBtnText, activePeriod === p && styles.periodBtnTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Current', val: stats.current ? `${stats.current} kg` : '—', color: PRIMARY, icon: '⚖️' },
              {
                label: 'Change',
                val: stats.change !== null ? `${stats.change > 0 ? '+' : ''}${stats.change} kg` : '—',
                color: (stats.change ?? 0) <= 0 ? '#4CAF50' : '#F44336',
                icon: (stats.change ?? 0) <= 0 ? '📉' : '📈',
              },
              { label: 'Average', val: stats.avg ? `${stats.avg} kg` : '—', color: '#FF9800', icon: '📊' },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statCardIcon}>{s.icon}</Text>
                <Text style={[styles.statCardVal, { color: s.color }]}>{s.val}</Text>
                <Text style={styles.statCardLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>Weight Trend · Last 7 Entries</Text>
            {chartData.length === 0 ? (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>No weight data yet. Log your first entry below.</Text>
              </View>
            ) : (
              <>
                <View style={styles.chartArea}>
                  <View style={styles.yAxis}>
                    {[maxW, (maxW + minW) / 2, minW].map((v, i) => (
                      <Text key={i} style={styles.yLabel}>{v.toFixed(0)}</Text>
                    ))}
                  </View>
                  <View style={styles.barsContainer}>
                    {chartData.map((d, idx) => {
                      const barH    = ((d.weight - minW) / range) * 120 + 20;
                      const isLatest = idx === chartData.length - 1;
                      return (
                        <View key={d.date} style={styles.barWrapper}>
                          <Text style={styles.barWeightLabel}>{d.weight}</Text>
                          <View style={[styles.bar, { height: barH, backgroundColor: isLatest ? PRIMARY : '#B2EBF2' }]} />
                          <Text style={[styles.barDayLabel, isLatest && { color: PRIMARY, fontWeight: '800' }]}>
                            {dayLabel(d.date)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: PRIMARY }]} />
                    <Text style={styles.legendText}>Latest: {stats.current} kg</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#B2EBF2' }]} />
                    <Text style={styles.legendText}>Previous entries</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Log Weight */}
          <View style={styles.logCard}>
            <Text style={styles.cardTitle}>Log Today's Weight</Text>
            <View style={styles.logRow}>
              <View style={styles.logInputBox}>
                <TextInput
                  style={styles.logInput}
                  value={newWeight}
                  onChangeText={setNewWeight}
                  placeholder="e.g. 76.0"
                  placeholderTextColor="#BDBDBD"
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleLogWeight}
                />
                <Text style={styles.logUnit}>kg</Text>
              </View>
              <TouchableOpacity style={styles.logBtn} onPress={handleLogWeight} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.logBtnText}>Log</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* BMI Card */}
          <View style={styles.bmiCard}>
            <View style={styles.bmiLeft}>
              <Text style={styles.bmiTitle}>Body Mass Index</Text>
              <Text style={[styles.bmiVal, { color: bmiColor }]}>{stats.bmi ?? '—'}</Text>
              <View style={[styles.bmiBadge, { backgroundColor: bmiColor + '22' }]}>
                <Text style={[styles.bmiBadgeText, { color: bmiColor }]}>{bmiLabel}</Text>
              </View>
            </View>
            <View style={styles.bmiRight}>
              <Text style={styles.bmiScaleLabel}>BMI Scale</Text>
              {[
                { range: '< 18.5',    label: 'Underweight', color: '#2196F3', active: (stats.bmi ?? 0) < 18.5 && !!stats.bmi },
                { range: '18.5–24.9', label: 'Healthy',     color: '#4CAF50', active: (stats.bmi ?? 0) >= 18.5 && (stats.bmi ?? 0) < 25 },
                { range: '25–29.9',   label: 'Overweight',  color: '#FF9800', active: (stats.bmi ?? 0) >= 25 && (stats.bmi ?? 0) < 30 },
                { range: '≥ 30',      label: 'Obese',       color: '#F44336', active: (stats.bmi ?? 0) >= 30 },
              ].map((b) => (
                <View key={b.label} style={styles.bmiRow}>
                  <View style={[styles.bmiDot, { backgroundColor: b.color }]} />
                  <Text style={[styles.bmiRangeText, b.active && { fontWeight: '800', color: b.color }]}>
                    {b.range} — {b.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Weight History Table */}
          {logs.length > 0 && (
            <View style={styles.historyCard}>
              <Text style={styles.cardTitle}>Weight History</Text>
              {logs.slice().reverse().slice(0, 10).map((entry, idx) => (
                <View key={entry.date} style={[styles.historyRow, idx > 0 && { borderTopWidth: 1, borderTopColor: '#F5F5F5' }]}>
                  <Text style={styles.historyDate}>
                    {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={[styles.historyWeight, { color: idx === 0 ? PRIMARY : '#424242' }]}>
                    {entry.weight} kg
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BG },
  header:       { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSub:    { fontSize: 12, color: '#B2EBF2', marginTop: 2 },
  loadingBox:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:  { fontSize: 14, color: '#9E9E9E', fontWeight: '600' },
  scroll:       { padding: 16 },
  periodSelector: { flexDirection: 'row', backgroundColor: '#E8ECF0', borderRadius: 12, padding: 4, marginBottom: 16 },
  periodBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  periodBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 3 },
  periodBtnText:       { fontSize: 13, fontWeight: '600', color: '#9E9E9E' },
  periodBtnTextActive: { color: PRIMARY, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
  },
  statCardIcon:  { fontSize: 22, marginBottom: 6 },
  statCardVal:   { fontSize: 15, fontWeight: '800' },
  statCardLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '600', marginTop: 3 },
  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  cardTitle:      { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 16 },
  chartEmpty:     { paddingVertical: 24, alignItems: 'center' },
  chartEmptyText: { fontSize: 13, color: '#9E9E9E', textAlign: 'center' },
  chartArea:      { flexDirection: 'row', height: 180, marginBottom: 12 },
  yAxis:          { width: 36, justifyContent: 'space-between', paddingBottom: 24, paddingTop: 4 },
  yLabel:         { fontSize: 10, color: '#BDBDBD', fontWeight: '600' },
  barsContainer:  { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 24 },
  barWrapper:     { alignItems: 'center', flex: 1 },
  barWeightLabel: { fontSize: 9, color: '#9E9E9E', fontWeight: '700', marginBottom: 4 },
  bar:            { width: 24, borderRadius: 8, marginBottom: 8 },
  barDayLabel:    { fontSize: 11, color: '#9E9E9E', fontWeight: '600' },
  chartLegend:    { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 12 },
  legendItem:     { flexDirection: 'row', alignItems: 'center' },
  legendDot:      { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText:     { fontSize: 12, color: '#757575', fontWeight: '600' },
  logCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  logRow:     { flexDirection: 'row', gap: 12 },
  logInputBox:{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1.5, borderColor: '#E8ECF0', paddingHorizontal: 14 },
  logInput:   { flex: 1, paddingVertical: 13, fontSize: 16, color: '#1A1A2E', fontWeight: '600' },
  logUnit:    { fontSize: 13, color: '#9E9E9E', fontWeight: '600' },
  logBtn:     { backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  logBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  bmiCard:    { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, flexDirection: 'row', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3 },
  bmiLeft:    { flex: 1, alignItems: 'flex-start', justifyContent: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: '#F0F0F0', marginRight: 16 },
  bmiTitle:   { fontSize: 13, color: '#9E9E9E', fontWeight: '600', marginBottom: 6 },
  bmiVal:     { fontSize: 38, fontWeight: '900', marginBottom: 8 },
  bmiBadge:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  bmiBadgeText:{ fontSize: 12, fontWeight: '700' },
  bmiRight:   { flex: 1.2, justifyContent: 'center' },
  bmiScaleLabel: { fontSize: 12, fontWeight: '800', color: '#1A1A2E', marginBottom: 10 },
  bmiRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  bmiDot:     { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  bmiRangeText:{ fontSize: 11, color: '#757575', fontWeight: '500' },
  historyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  historyRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  historyDate:   { fontSize: 13, color: '#757575', fontWeight: '500' },
  historyWeight: { fontSize: 15, fontWeight: '800' },
});

export default WeightHistory;
