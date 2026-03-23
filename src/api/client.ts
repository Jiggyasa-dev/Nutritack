/**
 * API client — all calls go to the Express server on port 3001.
 * Mirrors the same interface as the old storage.ts so screens
 * only need to change the import.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// In development: uses local server. In production build: set EXPO_PUBLIC_API_URL env var.
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api';

async function req<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// ── Auth ───────────────────────────────────────────────────────
export interface GoogleAuthResponse {
  token: string;
  user: {
    id:        number;
    name:      string;
    email:     string;
    avatar:    string;
    weight:    string;
    height:    string;
    age:       string;
    gender:    string;
    goal:      string;
    dailyGoal: number;
  };
}

export const signInWithGoogle = (accessToken: string): Promise<GoogleAuthResponse> =>
  req('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
  });

// ── Types ──────────────────────────────────────────────────────
export interface FoodEntry {
  id:       string;
  name:     string;
  calories: number;
  protein:  number;
  carbs:    number;
  fat:      number;
  unit:     string;
  icon:     string;
  category?: string;
  fiber?:   number;
}

export interface MealLog {
  Breakfast: FoodEntry[];
  Lunch:     FoodEntry[];
  Dinner:    FoodEntry[];
  Snacks:    FoodEntry[];
}

export interface WeightEntry {
  date:   string;
  weight: number;
}

export interface WeightStats {
  current: number | null;
  change:  number | null;
  avg:     number | null;
  bmi:     number | null;
}

export interface UserProfile {
  name:      string;
  weight:    string;
  height:    string;
  age:       string;
  gender:    string;
  goal:      string;
  dailyGoal: number;
}

// ── Helpers ────────────────────────────────────────────────────
export function dateKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// ── Profile ────────────────────────────────────────────────────
export const getProfile = (): Promise<UserProfile> =>
  req('/profile');

export const saveProfile = (data: Partial<UserProfile>): Promise<UserProfile> =>
  req('/profile', { method: 'PUT', body: JSON.stringify(data) });

// ── Foods search ───────────────────────────────────────────────
export const searchFoods = (q: string): Promise<FoodEntry[]> =>
  req(`/foods?q=${encodeURIComponent(q)}&limit=30`);

export const getFoodsByCategory = (category: string): Promise<FoodEntry[]> =>
  req(`/foods?category=${encodeURIComponent(category)}&limit=40`);

export const getAllFoods = (limit = 50): Promise<FoodEntry[]> =>
  req(`/foods?limit=${limit}`);

// ── Meal logs ──────────────────────────────────────────────────
export const getMealLog = (date: string): Promise<MealLog> =>
  req(`/meals/${date}`);

export const addFoodToMeal = (
  date: string,
  mealType: keyof MealLog,
  food: Omit<FoodEntry, 'id'>
): Promise<FoodEntry> =>
  req('/meals', { method: 'POST', body: JSON.stringify({ date, mealType, food }) });

export const removeFoodFromMeal = (id: string): Promise<void> =>
  req(`/meals/${id}`, { method: 'DELETE' });

export const getMealSummary = (date: string) =>
  req<Record<string, { items: number; calories: number; protein: number; carbs: number; fat: number } | null>>(
    `/meals/summary/${date}`
  );

// ── Weight ─────────────────────────────────────────────────────
export const getWeightLogs = (limit = 30): Promise<WeightEntry[]> =>
  req(`/weight?limit=${limit}`);

export const logWeight = (weight: number, date?: string): Promise<WeightEntry> =>
  req('/weight', { method: 'POST', body: JSON.stringify({ weight, date }) });

export const getWeightStats = (): Promise<WeightStats> =>
  req('/weight/stats');

// ── Food photo analysis ────────────────────────────────────────
export interface FoodAnalysisResult {
  name:             string;
  emoji:            string;
  servingSize:      string;
  calories:         number;
  protein:          number;
  carbs:            number;
  fat:              number;
  fiber:            number;
  sugar:            number;
  sodium:           number;
  confidence:       'high' | 'medium' | 'low';
  notes:            string;
  alternativeNames: string[];
}

export const analyzeFood = (
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<FoodAnalysisResult> =>
  req('/analyze-food', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, mimeType }),
  });

// ── Water ──────────────────────────────────────────────────────
export const getWater = (date: string): Promise<{ glasses: number }> =>
  req(`/water/${date}`);

export const saveWater = (date: string, glasses: number): Promise<{ glasses: number }> =>
  req('/water', { method: 'POST', body: JSON.stringify({ date, glasses }) });
