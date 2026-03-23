import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import {
  dateKey, getProfile, getMealLog, removeFoodFromMeal,
  getWater, saveWater, MealLog, FoodEntry,
} from '../api/client';

const { width } = Dimensions.get('window');
const PRIMARY   = '#00BCD4';
const PR_DARK   = '#0097A7';
const PR_DEEP   = '#00838F';
const BG        = '#F0F4F8';

/* ── Meal metadata ─────────────────────────────────────── */
const MEAL_META: {
  name: keyof MealLog;
  icon: string;
  label: string;
  time: string;
  accent: string;
  bg: string;
}[] = [
  { name: 'Breakfast', icon: '🌅', label: 'Breakfast', time: '7 – 9 AM',  accent: '#FF8F00', bg: '#FFF8E1' },
  { name: 'Lunch',     icon: '☀️', label: 'Lunch',     time: '12 – 2 PM', accent: '#2E7D32', bg: '#E8F5E9' },
  { name: 'Dinner',    icon: '🌙', label: 'Dinner',    time: '7 – 9 PM',  accent: '#5E35B1', bg: '#EDE7F6' },
  { name: 'Snacks',    icon: '🍎', label: 'Snacks',    time: 'Anytime',   accent: '#C62828', bg: '#FCE4EC' },
];

/* ── Greeting helper ────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', emoji: '☀️' };
  if (h < 17) return { text: 'Good afternoon', emoji: '🌤️' };
  return { text: 'Good evening', emoji: '🌙' };
}

/* ── Motivational message ───────────────────────────────── */
function motivation(pct: number, isOver: boolean) {
  if (isOver)        return { msg: "You've exceeded today's goal",  color: '#F44336' };
  if (pct >= 0.9)    return { msg: 'Almost at your goal for today', color: '#FF9800' };
  if (pct >= 0.5)    return { msg: "You're on track — keep it up!", color: '#4CAF50' };
  if (pct > 0)       return { msg: 'Great start! Keep logging',    color: PRIMARY    };
  return               { msg: 'Start logging to hit your goal',    color: '#9E9E9E'  };
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
const Dashboard = ({ navigation }: any) => {
  const [dateOffset, setDateOffset] = useState(0);
  const [dailyGoal,  setDailyGoal]  = useState(2000);
  const [userName,   setUserName]   = useState('Guest');
  const [mealLog,    setMealLog]    = useState<MealLog>({
    Breakfast: [], Lunch: [], Dinner: [], Snacks: [],
  });
  const [waterCount, setWaterCount] = useState(0);
  const [loading,    setLoading]    = useState(true);

  const currentDate = dateKey(dateOffset);

  /* ── Data loading ───────────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profile, log, water] = await Promise.all([
        getProfile(), getMealLog(currentDate), getWater(currentDate),
      ]);
      setDailyGoal(profile.dailyGoal);
      setUserName(profile.name || 'Guest');
      setMealLog(log);
      setWaterCount(water.glasses);
    } catch (err: any) {
      console.warn('Load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  /* ── Actions ────────────────────────────────────────── */
  const handleWater = async (i: number) => {
    const next = waterCount === i ? i - 1 : i;
    setWaterCount(next);
    saveWater(currentDate, next).catch(console.warn);
  };

  const handleRemove = (food: FoodEntry) => {
    Alert.alert('Remove Food', `Remove "${food.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await removeFoodFromMeal(food.id);
          setMealLog(await getMealLog(currentDate));
        },
      },
    ]);
  };

  /* ── Computed values ────────────────────────────────── */
  const allFoods: FoodEntry[] = Object.values(mealLog).flat();
  const totalEaten   = allFoods.reduce((s, f) => s + f.calories, 0);
  const totalProtein = allFoods.reduce((s, f) => s + f.protein,  0);
  const totalCarbs   = allFoods.reduce((s, f) => s + f.carbs,    0);
  const totalFat     = allFoods.reduce((s, f) => s + f.fat,      0);

  const proteinGoal = Math.round(dailyGoal * 0.30 / 4);
  const carbGoal    = Math.round(dailyGoal * 0.50 / 4);
  const fatGoal     = Math.round(dailyGoal * 0.20 / 9);

  const remaining = dailyGoal - totalEaten;
  const pct       = dailyGoal > 0 ? Math.min(totalEaten / dailyGoal, 1) : 0;
  const isOver    = remaining < 0;
  const mot       = motivation(pct, isOver);

  /* ── Date label ─────────────────────────────────────── */
  const displayDate = new Date();
  displayDate.setDate(displayDate.getDate() + dateOffset);
  const isToday     = dateOffset === 0;
  const isYesterday = dateOffset === -1;
  const dateLabel   = isToday
    ? 'Today'
    : isYesterday
    ? 'Yesterday'
    : displayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const fullDate    = displayDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const { text: greet, emoji } = greeting();

  /* ── Ring size ──────────────────────────────────────── */
  const ringOuter  = 140;
  const ringBorder = 12;
  const ringInner  = ringOuter - ringBorder * 2;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* ═══ HERO HEADER ══════════════════════════════════ */}
      <View style={styles.hero}>
        {/* Top row */}
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.greetEmoji}>{emoji}</Text>
            <Text style={styles.greetText}>{greet},</Text>
            <Text style={styles.greetName}>{userName}</Text>
          </View>

          {/* Date navigation pill */}
          <View style={styles.datePill}>
            <TouchableOpacity
              style={styles.dateArrowBtn}
              onPress={() => setDateOffset((o) => o - 1)}
            >
              <Text style={styles.dateArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.datePillLabel}>{dateLabel}</Text>
            <TouchableOpacity
              style={[styles.dateArrowBtn, dateOffset === 0 && styles.dateArrowDim]}
              onPress={() => setDateOffset((o) => Math.min(o + 1, 0))}
              disabled={dateOffset === 0}
            >
              <Text style={styles.dateArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calorie ring + macros */}
        <View style={styles.heroBody}>
          {/* Ring */}
          <View style={styles.ringWrapper}>
            {/* Gray background ring */}
            <View style={[styles.ringBase, {
              width: ringOuter, height: ringOuter,
              borderRadius: ringOuter / 2,
              borderWidth: ringBorder,
            }]}>
              <View style={[styles.ringInner, {
                width: ringInner, height: ringInner,
                borderRadius: ringInner / 2,
              }]}>
                <Text style={[styles.ringNumber, { color: isOver ? '#F44336' : '#FFFFFF' }]}>
                  {Math.abs(Math.round(remaining))}
                </Text>
                <Text style={styles.ringSubLabel}>
                  {isOver ? 'over' : 'remaining'}
                </Text>
                <Text style={styles.ringKcal}>kcal</Text>
              </View>
            </View>
            {/* Progress arc overlay */}
            <View style={[styles.ringProgress, {
              width: ringOuter, height: ringOuter,
              borderRadius: ringOuter / 2,
              borderWidth: ringBorder,
              borderTopColor:    pct > 0    ? (isOver ? '#FF5252' : '#80DEEA') : 'transparent',
              borderRightColor:  pct > 0.25 ? (isOver ? '#FF5252' : '#80DEEA') : 'transparent',
              borderBottomColor: pct > 0.5  ? (isOver ? '#FF5252' : '#80DEEA') : 'transparent',
              borderLeftColor:   pct > 0.75 ? (isOver ? '#FF5252' : '#80DEEA') : 'transparent',
            }]} />
            {/* Percent badge */}
            <View style={[styles.pctBadge, { backgroundColor: isOver ? '#F44336' : '#00838F' }]}>
              <Text style={styles.pctBadgeText}>{Math.round(pct * 100)}%</Text>
            </View>
          </View>

          {/* Right-side calorie stats */}
          <View style={styles.calStats}>
            <Text style={styles.calStatsTitle}>Calorie Budget</Text>

            <View style={styles.calStatRow}>
              <View style={[styles.calDot, { backgroundColor: '#80DEEA' }]} />
              <Text style={styles.calStatLabel}>Eaten</Text>
              <Text style={styles.calStatVal}>{Math.round(totalEaten)}</Text>
            </View>
            <View style={styles.calStatRow}>
              <View style={[styles.calDot, { backgroundColor: '#FFFFFF' }]} />
              <Text style={styles.calStatLabel}>Goal</Text>
              <Text style={styles.calStatVal}>{dailyGoal}</Text>
            </View>
            <View style={[styles.calStatRow, { marginTop: 6 }]}>
              <View style={[styles.calDot, { backgroundColor: isOver ? '#FF5252' : '#B2EBF2', width: 8, height: 8, borderRadius: 4 }]} />
              <Text style={[styles.calStatLabel, { fontWeight: '700' }]}>
                {isOver ? 'Over' : 'Left'}
              </Text>
              <Text style={[styles.calStatVal, {
                color: isOver ? '#FF5252' : '#B2EBF2',
                fontSize: 18, fontWeight: '900',
              }]}>
                {Math.abs(Math.round(remaining))}
              </Text>
            </View>

            {/* Thin progress bar */}
            <View style={styles.heroProgressTrack}>
              <View style={[styles.heroProgressFill, {
                width: `${Math.min(pct * 100, 100)}%` as any,
                backgroundColor: isOver ? '#FF5252' : '#80DEEA',
              }]} />
            </View>

            {/* Motivation */}
            <Text style={[styles.motText, { color: isOver ? '#FF5252' : '#B2EBF2' }]}>
              {mot.msg}
            </Text>
          </View>
        </View>

        {/* Macro pills row */}
        <View style={styles.macroPillsRow}>
          {[
            { label: 'Carbs',   val: Math.round(totalCarbs),   goal: carbGoal,    color: '#FFB74D', bg: 'rgba(255,183,77,0.18)' },
            { label: 'Protein', val: Math.round(totalProtein), goal: proteinGoal, color: '#64B5F6', bg: 'rgba(100,181,246,0.18)' },
            { label: 'Fat',     val: Math.round(totalFat),     goal: fatGoal,     color: '#CE93D8', bg: 'rgba(206,147,216,0.18)' },
          ].map((m) => {
            const mPct = m.goal > 0 ? Math.min(m.val / m.goal, 1) : 0;
            return (
              <View key={m.label} style={[styles.macroPill, { backgroundColor: m.bg }]}>
                <Text style={[styles.macroPillVal, { color: m.color }]}>{m.val}g</Text>
                <View style={styles.macroPillBar}>
                  <View style={[styles.macroPillFill, {
                    width: `${mPct * 100}%` as any,
                    backgroundColor: m.color,
                  }]} />
                </View>
                <Text style={[styles.macroPillLabel, { color: m.color }]}>{m.label}</Text>
                <Text style={styles.macroPillGoal}>/ {m.goal}g</Text>
              </View>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading your diary…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── DATE HEADER ─────────────────────────────── */}
          <View style={styles.diaryHeader}>
            <Text style={styles.diarySectionTitle}>🍽️  Today's Meals</Text>
            <Text style={styles.diaryDate}>{fullDate}</Text>
          </View>

          {/* ─── MEAL CARDS ──────────────────────────────── */}
          {MEAL_META.map((meal) => {
            const foods   = mealLog[meal.name];
            const mealCal = foods.reduce((s, f) => s + f.calories, 0);
            const mealPct = dailyGoal > 0 ? Math.min(mealCal / dailyGoal, 1) : 0;
            const isEmpty = foods.length === 0;

            return (
              <View key={meal.name} style={styles.mealCard}>
                {/* Left accent bar */}
                <View style={[styles.mealAccentBar, { backgroundColor: meal.accent }]} />

                <View style={styles.mealContent}>
                  {/* Meal header row */}
                  <View style={styles.mealHeaderRow}>
                    <View style={[styles.mealIconCircle, { backgroundColor: meal.bg }]}>
                      <Text style={styles.mealIconEmoji}>{meal.icon}</Text>
                    </View>
                    <View style={styles.mealTitleGroup}>
                      <Text style={styles.mealTitle}>{meal.label}</Text>
                      <Text style={styles.mealTime}>{meal.time}</Text>
                    </View>
                    <View style={styles.mealCalGroup}>
                      {mealCal > 0 && (
                        <Text style={[styles.mealCalNum, { color: meal.accent }]}>
                          {Math.round(mealCal)}
                        </Text>
                      )}
                      {mealCal > 0 && (
                        <Text style={styles.mealCalUnit}>kcal</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.addBtn, { backgroundColor: meal.accent + '22', borderColor: meal.accent }]}
                      onPress={() => navigation.navigate('FoodSearch', { mealType: meal.name, date: currentDate })}
                    >
                      <Text style={[styles.addBtnIcon, { color: meal.accent }]}>+</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Calorie portion bar */}
                  {mealCal > 0 && (
                    <View style={styles.mealPortionTrack}>
                      <View style={[styles.mealPortionFill, {
                        width: `${mealPct * 100}%` as any,
                        backgroundColor: meal.accent,
                      }]} />
                    </View>
                  )}

                  {/* Food items */}
                  {foods.length > 0 ? (
                    <View style={styles.foodList}>
                      {foods.map((food, idx) => (
                        <TouchableOpacity
                          key={food.id}
                          style={[styles.foodItem, idx > 0 && styles.foodItemBorder]}
                          onLongPress={() => handleRemove(food)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.foodItemLeft}>
                            <View style={styles.foodEmojiBubble}>
                              <Text style={styles.foodEmojiText}>{food.icon}</Text>
                            </View>
                            <View>
                              <Text style={styles.foodItemName}>{food.name}</Text>
                              <Text style={styles.foodItemUnit}>{food.unit}</Text>
                            </View>
                          </View>
                          <View style={styles.foodItemRight}>
                            <Text style={styles.foodItemCal}>{Math.round(food.calories)}</Text>
                            <Text style={styles.foodItemKcal}>kcal</Text>
                          </View>
                        </TouchableOpacity>
                      ))}

                      {/* Add more */}
                      <TouchableOpacity
                        style={styles.addMoreBtn}
                        onPress={() => navigation.navigate('FoodSearch', { mealType: meal.name, date: currentDate })}
                      >
                        <Text style={[styles.addMoreText, { color: meal.accent }]}>
                          + Add more to {meal.label}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.emptyMealTap}
                      onPress={() => navigation.navigate('FoodSearch', { mealType: meal.name, date: currentDate })}
                    >
                      <Text style={styles.emptyMealIcon}>🍽️</Text>
                      <Text style={styles.emptyMealText}>Tap to log {meal.label.toLowerCase()}</Text>
                      <View style={[styles.emptyMealBadge, { borderColor: meal.accent }]}>
                        <Text style={[styles.emptyMealBadgeText, { color: meal.accent }]}>+ Add Food</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          {/* ─── EXERCISE CARD ───────────────────────────── */}
          <View style={styles.exerciseCard}>
            <View style={[styles.mealAccentBar, { backgroundColor: '#26A69A' }]} />
            <View style={styles.mealContent}>
              <View style={styles.mealHeaderRow}>
                <View style={[styles.mealIconCircle, { backgroundColor: '#E0F2F1' }]}>
                  <Text style={styles.mealIconEmoji}>🏃</Text>
                </View>
                <View style={styles.mealTitleGroup}>
                  <Text style={styles.mealTitle}>Exercise</Text>
                  <Text style={styles.mealTime}>Calories burned</Text>
                </View>
                <Text style={[styles.mealCalNum, { color: '#26A69A' }]}>0</Text>
                <Text style={[styles.mealCalUnit, { marginLeft: 2 }]}>kcal</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: '#E0F2F1', borderColor: '#26A69A' }]}
                  onPress={() => Alert.alert('Coming Soon', 'Exercise logging coming in the next update.')}
                >
                  <Text style={[styles.addBtnIcon, { color: '#26A69A' }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ─── WATER SECTION ───────────────────────────── */}
          <View style={styles.waterSection}>
            <View style={styles.waterCard}>
              {/* Header */}
              <View style={styles.waterHeaderRow}>
                <View style={styles.waterTitleGroup}>
                  <Text style={styles.waterCardTitle}>💧 Hydration</Text>
                  <Text style={styles.waterCardSub}>Daily goal: 8 glasses (2L)</Text>
                </View>
                <View style={styles.waterCountBadge}>
                  <Text style={styles.waterCountNum}>{waterCount}</Text>
                  <Text style={styles.waterCountDen}>/8</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.waterProgressOuter}>
                <View style={[styles.waterProgressInner, {
                  width: `${(waterCount / 8) * 100}%` as any,
                }]} />
              </View>

              {/* Drop buttons */}
              <View style={styles.dropsRow}>
                {[1,2,3,4,5,6,7,8].map((i) => {
                  const filled = waterCount >= i;
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleWater(i)}
                      style={[styles.dropBtn, filled && styles.dropBtnFilled]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropEmoji}>{filled ? '💧' : '○'}</Text>
                      <Text style={[styles.dropNum, { color: filled ? '#0288D1' : '#BDBDBD' }]}>{i}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Motivational water text */}
              {waterCount === 0 && (
                <Text style={styles.waterMotText}>Stay hydrated — tap a drop to log glasses</Text>
              )}
              {waterCount > 0 && waterCount < 8 && (
                <Text style={styles.waterMotText}>
                  {8 - waterCount} more glass{8 - waterCount !== 1 ? 'es' : ''} to reach your goal 🎯
                </Text>
              )}
              {waterCount >= 8 && (
                <Text style={[styles.waterMotText, { color: '#0288D1', fontWeight: '700' }]}>
                  ✅ Daily water goal achieved! Great work!
                </Text>
              )}
            </View>
          </View>

          {/* ─── QUICK TIP ───────────────────────────────── */}
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              Long-press any food item to remove it from your diary.
            </Text>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

/* ═══════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  /* ── Hero Header ─────────────────────────────────── */
  hero: {
    backgroundColor: PR_DARK,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius:  28,
    borderBottomRightRadius: 28,
    shadowColor: PR_DEEP,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greetEmoji: { fontSize: 24, marginBottom: 2 },
  greetText:  { fontSize: 14, color: '#B2EBF2', fontWeight: '600' },
  greetName:  { fontSize: 22, color: '#FFFFFF', fontWeight: '900', letterSpacing: 0.3 },

  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 2,
  },
  dateArrowBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  dateArrowDim: { opacity: 0.3 },
  dateArrow:    { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 24 },
  datePillLabel:{ color: '#FFFFFF', fontSize: 12, fontWeight: '800', minWidth: 68, textAlign: 'center' },

  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },

  /* Calorie ring */
  ringWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  ringBase: {
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringProgress: {
    position: 'absolute', top: 0, left: 0,
  },
  ringNumber: {
    fontSize: 28, fontWeight: '900', letterSpacing: -1,
    color: '#FFFFFF',
  },
  ringSubLabel: { fontSize: 10, color: '#B2EBF2', fontWeight: '700', marginTop: 1 },
  ringKcal:     { fontSize: 10, color: '#B2EBF2', fontWeight: '600' },
  pctBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pctBadgeText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },

  /* Right stats */
  calStats: { flex: 1 },
  calStatsTitle: {
    fontSize: 12, fontWeight: '800', color: '#B2EBF2',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  calStatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  calDot:     { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  calStatLabel:{ flex: 1, fontSize: 13, color: '#B2EBF2', fontWeight: '600' },
  calStatVal:  { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },

  heroProgressTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2, overflow: 'hidden', marginTop: 10, marginBottom: 8,
  },
  heroProgressFill: { height: '100%', borderRadius: 2 },
  motText: { fontSize: 11, fontWeight: '600', lineHeight: 16 },

  /* Macro pills */
  macroPillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroPill: {
    flex: 1, borderRadius: 14, padding: 12, alignItems: 'center',
  },
  macroPillVal:   { fontSize: 17, fontWeight: '900' },
  macroPillBar:   { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden', marginVertical: 6 },
  macroPillFill:  { height: '100%', borderRadius: 2 },
  macroPillLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  macroPillGoal:  { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 1 },

  /* ── Body ────────────────────────────────────────── */
  loadingBox:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText:  { fontSize: 14, color: '#9E9E9E', fontWeight: '600' },
  scroll:       { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },

  diaryHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  diarySectionTitle:{ fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  diaryDate:        { fontSize: 12, color: '#9E9E9E', fontWeight: '600' },

  /* Meal card */
  mealCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 4,
  },
  mealAccentBar: { width: 5, minHeight: '100%' },
  mealContent:   { flex: 1, padding: 14 },

  mealHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 0,
  },
  mealIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  mealIconEmoji:  { fontSize: 22 },
  mealTitleGroup: { flex: 1 },
  mealTitle:      { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  mealTime:       { fontSize: 11, color: '#BDBDBD', marginTop: 1, fontWeight: '500' },
  mealCalGroup:   { alignItems: 'flex-end' },
  mealCalNum:     { fontSize: 18, fontWeight: '900', lineHeight: 20 },
  mealCalUnit:    { fontSize: 10, color: '#BDBDBD', fontWeight: '600' },

  addBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  addBtnIcon: { fontSize: 22, fontWeight: '700', lineHeight: 28 },

  mealPortionTrack: {
    height: 3, backgroundColor: '#F0F0F0',
    borderRadius: 2, overflow: 'hidden',
    marginTop: 12, marginBottom: 12,
  },
  mealPortionFill: { height: '100%', borderRadius: 2 },

  /* Food items */
  foodList:       { marginTop: 4 },
  foodItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  foodItemBorder: { borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  foodItemLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center' },
  foodEmojiBubble:{
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F8F8F8', alignItems: 'center',
    justifyContent: 'center', marginRight: 10,
  },
  foodEmojiText:  { fontSize: 18 },
  foodItemName:   { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  foodItemUnit:   { fontSize: 11, color: '#BDBDBD', marginTop: 1 },
  foodItemRight:  { alignItems: 'flex-end' },
  foodItemCal:    { fontSize: 15, fontWeight: '800', color: '#424242' },
  foodItemKcal:   { fontSize: 10, color: '#BDBDBD', fontWeight: '600' },

  addMoreBtn:     { paddingTop: 10, paddingBottom: 2 },
  addMoreText:    { fontSize: 13, fontWeight: '700' },

  /* Empty meal */
  emptyMealTap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  emptyMealIcon: { fontSize: 22 },
  emptyMealText: { flex: 1, fontSize: 13, color: '#9E9E9E', fontWeight: '500' },
  emptyMealBadge:{ borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  emptyMealBadgeText: { fontSize: 12, fontWeight: '700' },

  /* Exercise card */
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },

  /* ── Water ───────────────────────────────────────── */
  waterSection: { marginBottom: 14 },
  waterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0288D1',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  waterHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  waterTitleGroup:{ },
  waterCardTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  waterCardSub:   { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  waterCountBadge:{ flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#E1F5FE', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  waterCountNum:  { fontSize: 26, fontWeight: '900', color: '#0288D1', lineHeight: 30 },
  waterCountDen:  { fontSize: 16, fontWeight: '700', color: '#4FC3F7', lineHeight: 28 },
  waterProgressOuter: {
    height: 8, backgroundColor: '#E1F5FE',
    borderRadius: 4, overflow: 'hidden', marginBottom: 14,
  },
  waterProgressInner: {
    height: '100%', borderRadius: 4,
    backgroundColor: '#0288D1',
  },
  dropsRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dropBtn:      {
    alignItems: 'center', justifyContent: 'center',
    width: 38, height: 48, borderRadius: 12,
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#EEEEEE',
  },
  dropBtnFilled:{ backgroundColor: '#E1F5FE', borderColor: '#4FC3F7' },
  dropEmoji:    { fontSize: 18, lineHeight: 22 },
  dropNum:      { fontSize: 9, fontWeight: '800', marginTop: 1 },
  waterMotText: { fontSize: 12, color: '#9E9E9E', textAlign: 'center', fontStyle: 'italic', fontWeight: '500' },

  /* ── Tip card ────────────────────────────────────── */
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  tipIcon: { fontSize: 20 },
  tipText: { flex: 1, fontSize: 12, color: '#795548', fontWeight: '500', lineHeight: 18 },
});

export default Dashboard;
