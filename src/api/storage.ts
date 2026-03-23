import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
  icon: string;
}

export interface MealLog {
  Breakfast: FoodEntry[];
  Lunch: FoodEntry[];
  Dinner: FoodEntry[];
  Snacks: FoodEntry[];
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface UserProfile {
  weight: string;
  height: string;
  age: string;
  gender: string;
  goal: string;
  dailyGoal: number;
}

// ── Date key ──────────────────────────────────────────────
export function dateKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

// ── Meal Logs ─────────────────────────────────────────────
export async function loadMealLog(dateStr: string): Promise<MealLog> {
  const raw = await AsyncStorage.getItem(`mealLog_${dateStr}`);
  if (!raw) return { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
  return JSON.parse(raw);
}

export async function addFoodToMeal(
  dateStr: string,
  mealType: keyof MealLog,
  food: FoodEntry
): Promise<void> {
  const log = await loadMealLog(dateStr);
  log[mealType] = [...log[mealType], food];
  await AsyncStorage.setItem(`mealLog_${dateStr}`, JSON.stringify(log));
}

export async function removeFoodFromMeal(
  dateStr: string,
  mealType: keyof MealLog,
  foodId: string
): Promise<void> {
  const log = await loadMealLog(dateStr);
  log[mealType] = log[mealType].filter((f) => f.id !== foodId);
  await AsyncStorage.setItem(`mealLog_${dateStr}`, JSON.stringify(log));
}

// ── Weight Logs ───────────────────────────────────────────
const SEED_WEIGHTS: WeightEntry[] = [
  { date: '2026-03-14', weight: 78.0 },
  { date: '2026-03-15', weight: 77.5 },
  { date: '2026-03-16', weight: 77.2 },
  { date: '2026-03-17', weight: 77.0 },
  { date: '2026-03-18', weight: 76.5 },
  { date: '2026-03-19', weight: 76.8 },
  { date: '2026-03-20', weight: 76.2 },
];

export async function loadWeightLogs(): Promise<WeightEntry[]> {
  const raw = await AsyncStorage.getItem('weightLogs');
  if (!raw) return SEED_WEIGHTS;
  return JSON.parse(raw);
}

export async function logWeight(weight: number): Promise<void> {
  const logs = await loadWeightLogs();
  const today = dateKey();
  const idx = logs.findIndex((l) => l.date === today);
  if (idx >= 0) {
    logs[idx].weight = weight;
  } else {
    logs.push({ date: today, weight });
  }
  await AsyncStorage.setItem('weightLogs', JSON.stringify(logs));
}

// ── Water ─────────────────────────────────────────────────
export async function loadWater(dateStr: string): Promise<number> {
  const raw = await AsyncStorage.getItem(`water_${dateStr}`);
  return raw ? parseInt(raw, 10) : 0;
}

export async function saveWater(dateStr: string, count: number): Promise<void> {
  await AsyncStorage.setItem(`water_${dateStr}`, count.toString());
}

// ── User Profile ──────────────────────────────────────────
export async function loadUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem('userProfile');
  return raw ? JSON.parse(raw) : null;
}
