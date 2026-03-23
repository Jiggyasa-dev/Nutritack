import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import {
  dateKey, getProfile, getMealLog, getWater,
  FoodEntry, MealLog,
} from '../api/client';

const { width } = Dimensions.get('window');
const PRIMARY = '#00BCD4';
const BG      = '#F5F7FA';

const MEAL_META: { name: keyof MealLog; icon: string; color: string }[] = [
  { name: 'Breakfast', icon: '🌅', color: '#FF8F00' },
  { name: 'Lunch',     icon: '☀️', color: '#388E3C' },
  { name: 'Dinner',    icon: '🌙', color: '#5E35B1' },
  { name: 'Snacks',    icon: '🍎', color: '#C62828' },
];

const Summary = () => {
  const [dailyGoal,  setDailyGoal]  = useState(2000);
  const [mealLog,    setMealLog]    = useState<MealLog>({ Breakfast: [], Lunch: [], Dinner: [], Snacks: [] });
  const [waterCount, setWaterCount] = useState(0);
  const [loading,    setLoading]    = useState(true);

  const today = dateKey();

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        try {
          const [profile, log, water] = await Promise.all([
            getProfile(), getMealLog(today), getWater(today),
          ]);
          setDailyGoal(profile.dailyGoal);
          setMealLog(log);
          setWaterCount(water.glasses);
        } catch (err: any) { console.warn(err.message); }
        finally { setLoading(false); }
      };
      load();
    }, [today])
  );

  // ── Computed ───────────────────────────────────────────
  const allFoods: FoodEntry[] = Object.values(mealLog).flat();
  const eaten   = allFoods.reduce((s, f) => s + f.calories, 0);
  const protein = allFoods.reduce((s, f) => s + f.protein,  0);
  const carbs   = allFoods.reduce((s, f) => s + f.carbs,    0);
  const fat     = allFoods.reduce((s, f) => s + f.fat,      0);
  const burned  = 0;
  const net       = eaten - burned;
  const remaining = dailyGoal - net;
  const pct       = dailyGoal > 0 ? Math.min(net / dailyGoal, 1) : 0;
  const isOver    = remaining < 0;

  const proteinGoal = Math.round(dailyGoal * 0.30 / 4);
  const carbGoal    = Math.round(dailyGoal * 0.50 / 4);
  const fatGoal     = Math.round(dailyGoal * 0.20 / 9);

  const MACROS = [
    { label: 'Carbohydrates', val: Math.round(carbs),   target: carbGoal,    color: '#FF9800', icon: '🍞' },
    { label: 'Protein',       val: Math.round(protein), target: proteinGoal, color: '#2196F3', icon: '🥩' },
    { label: 'Fat',           val: Math.round(fat),     target: fatGoal,     color: '#9C27B0', icon: '🥑' },
  ];

  const ringSize   = Math.min(width * 0.55, 220);
  const ringBorder = 18;
  const innerSize  = ringSize - ringBorder * 2;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nutrition Summary</Text>
        <Text style={styles.headerDate}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading summary…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Calorie Ring Card */}
          <View style={styles.ringCard}>
            <Text style={styles.ringCardTitle}>Calorie Budget</Text>

            <View style={styles.ringWrapper}>
              <View style={[styles.outerRing, {
                width: ringSize, height: ringSize, borderRadius: ringSize / 2,
                borderWidth: ringBorder, borderColor: isOver ? '#FFCDD2' : '#B2EBF2',
              }]}>
                <View style={[styles.innerCircle, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
                  <Text style={[styles.ringCal, { color: isOver ? '#F44336' : PRIMARY }]}>
                    {Math.abs(Math.round(remaining)).toLocaleString()}
                  </Text>
                  <Text style={styles.ringCalLabel}>{isOver ? 'over goal' : 'kcal remaining'}</Text>
                  <View style={styles.ringDivider} />
                  <Text style={styles.ringPct}>{Math.round(pct * 100)}%</Text>
                  <Text style={styles.ringPctLabel}>consumed</Text>
                </View>
              </View>
              {/* Progress arc overlay */}
              <View style={[styles.progressArc, {
                width: ringSize, height: ringSize, borderRadius: ringSize / 2,
                borderWidth: ringBorder,
                borderTopColor:    isOver ? '#F44336' : PRIMARY,
                borderRightColor:  pct > 0.25 ? (isOver ? '#F44336' : PRIMARY) : 'transparent',
                borderBottomColor: pct > 0.50 ? (isOver ? '#F44336' : PRIMARY) : 'transparent',
                borderLeftColor:   pct > 0.75 ? (isOver ? '#F44336' : PRIMARY) : 'transparent',
              }]} />
            </View>

            <View style={styles.statsRow}>
              {[
                { label: 'Eaten',  val: Math.round(eaten),     color: PRIMARY,   icon: '🍽️' },
                { label: 'Burned', val: burned,                color: '#FF7043', icon: '🔥' },
                { label: 'Net',    val: Math.round(net),       color: '#4CAF50', icon: '⚡' },
                { label: 'Goal',   val: dailyGoal,             color: '#9E9E9E', icon: '🎯' },
              ].map((s) => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={styles.statIcon}>{s.icon}</Text>
                  <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Empty state */}
          {allFoods.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No food logged yet today</Text>
              <Text style={styles.emptySubtitle}>Head to the Diary tab to log your meals</Text>
            </View>
          )}

          {/* Macros */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Macronutrients</Text>
            {MACROS.map((m) => {
              const mpct = m.target > 0 ? Math.min(m.val / m.target, 1) : 0;
              return (
                <View key={m.label} style={styles.macroRow}>
                  <Text style={styles.macroIcon}>{m.icon}</Text>
                  <View style={styles.macroBody}>
                    <View style={styles.macroTopRow}>
                      <Text style={styles.macroName}>{m.label}</Text>
                      <Text>
                        <Text style={{ color: m.color, fontWeight: '800', fontSize: 14 }}>{m.val}g</Text>
                        <Text style={styles.macroTarget}> / {m.target}g</Text>
                      </Text>
                    </View>
                    <View style={styles.macroTrack}>
                      <View style={[styles.macroFill, { width: `${mpct * 100}%` as any, backgroundColor: m.color }]} />
                    </View>
                    <Text style={styles.macroPct}>{Math.round(mpct * 100)}% of daily target</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Meal Breakdown */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Meal Breakdown</Text>
            {MEAL_META.map((m, idx) => {
              const foods   = mealLog[m.name];
              const mealCal = foods.reduce((s, f) => s + f.calories, 0);
              const mPct    = eaten > 0 ? mealCal / eaten : 0;
              return (
                <View key={m.name}>
                  <View style={styles.mealBreakRow}>
                    <Text style={styles.mealBreakIcon}>{m.icon}</Text>
                    <View style={styles.mealBreakBody}>
                      <View style={styles.mealBreakTopRow}>
                        <Text style={styles.mealBreakName}>{m.name}</Text>
                        <Text style={styles.mealBreakCal}>{mealCal > 0 ? `${Math.round(mealCal)} kcal` : '—'}</Text>
                      </View>
                      {mealCal > 0 && (
                        <View style={styles.macroTrack}>
                          <View style={[styles.macroFill, { width: `${mPct * 100}%` as any, backgroundColor: m.color }]} />
                        </View>
                      )}
                      {foods.length > 0 && (
                        <Text style={styles.mealFoodCount}>{foods.length} item{foods.length !== 1 ? 's' : ''}</Text>
                      )}
                    </View>
                  </View>
                  {idx < MEAL_META.length - 1 && <View style={styles.rowDivider} />}
                </View>
              );
            })}
            <View style={styles.mealBreakTotal}>
              <Text style={styles.mealBreakTotalLabel}>Total Consumed</Text>
              <Text style={[styles.mealBreakTotalVal, { color: PRIMARY }]}>{Math.round(eaten)} kcal</Text>
            </View>
          </View>

          {/* Water */}
          <View style={[styles.sectionCard, { flexDirection: 'row', alignItems: 'center' }]}>
            <View style={styles.waterSummaryIcon}>
              <Text style={{ fontSize: 30 }}>💧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Hydration</Text>
              <Text style={styles.waterSummaryText}>
                {waterCount} of 8 glasses · {waterCount * 250} ml / 2,000 ml
              </Text>
              <View style={styles.macroTrack}>
                <View style={[styles.macroFill, { width: `${(waterCount / 8) * 100}%` as any, backgroundColor: '#03A9F4' }]} />
              </View>
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BG },
  header:      { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerDate:  { fontSize: 12, color: '#B2EBF2', marginTop: 2 },
  loadingBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#9E9E9E', fontWeight: '600' },
  scroll:      { padding: 16 },
  ringCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 10, elevation: 4,
  },
  ringCardTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E', alignSelf: 'flex-start', marginBottom: 20 },
  ringWrapper:  { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  outerRing:    { alignItems: 'center', justifyContent: 'center' },
  progressArc:  { position: 'absolute', top: 0, left: 0 },
  innerCircle:  { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  ringCal:      { fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  ringCalLabel: { fontSize: 12, color: '#9E9E9E', fontWeight: '600', marginTop: 2 },
  ringDivider:  { width: 30, height: 1, backgroundColor: '#EEEEEE', marginVertical: 8 },
  ringPct:      { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  ringPctLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '600' },
  statsRow:     { flexDirection: 'row', justifyContent: 'space-around', width: '100%', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 16 },
  statItem:     { alignItems: 'center' },
  statIcon:     { fontSize: 18, marginBottom: 4 },
  statVal:      { fontSize: 18, fontWeight: '800' },
  statLabel:    { fontSize: 11, color: '#9E9E9E', fontWeight: '600', marginTop: 2 },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32, marginBottom: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2,
  },
  emptyIcon:     { fontSize: 40, marginBottom: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#9E9E9E', textAlign: 'center' },
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  cardTitle:       { fontSize: 16, fontWeight: '800', color: '#1A1A2E', marginBottom: 16 },
  macroRow:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  macroIcon:       { fontSize: 22, marginRight: 12, marginTop: 2 },
  macroBody:       { flex: 1 },
  macroTopRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  macroName:       { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  macroTarget:     { color: '#BDBDBD', fontWeight: '500', fontSize: 13 },
  macroTrack:      { height: 7, backgroundColor: '#F5F5F5', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  macroFill:       { height: '100%', borderRadius: 4 },
  macroPct:        { fontSize: 11, color: '#BDBDBD', fontWeight: '600' },
  mealBreakRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  mealBreakIcon:   { fontSize: 22, marginRight: 12 },
  mealBreakBody:   { flex: 1 },
  mealBreakTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mealBreakName:   { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  mealBreakCal:    { fontSize: 14, fontWeight: '700', color: '#616161' },
  mealFoodCount:   { fontSize: 11, color: '#BDBDBD', fontWeight: '600', marginTop: 2 },
  rowDivider:      { height: 1, backgroundColor: '#F5F5F5' },
  mealBreakTotal:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: '#F0F0F0' },
  mealBreakTotalLabel: { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
  mealBreakTotalVal:   { fontSize: 18, fontWeight: '900' },
  waterSummaryIcon:    { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E1F5FE', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  waterSummaryText:    { fontSize: 13, color: '#9E9E9E', marginBottom: 8, fontWeight: '500' },
});

export default Summary;
