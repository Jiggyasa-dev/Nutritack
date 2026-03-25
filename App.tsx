import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import SignIn       from './src/screens/SignIn';
import Onboarding  from './src/screens/Onboarding';
import Dashboard   from './src/screens/Dashboard';
import Summary     from './src/screens/Summary';
import FoodSearch  from './src/screens/FoodSearch';
import Profile     from './src/screens/Profile';
import WeightHistory from './src/screens/WeightHistory';
// import './src/styles/global.css'; // Removed — Tailwind CSS not supported in React Native

const Stack  = createNativeStackNavigator();
const Tab    = createBottomTabNavigator();

const PRIMARY = '#00BCD4';
const GRAY    = '#9E9E9E';

/* ── Bottom Tabs (shown when authenticated) ─────────────────── */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8ECF0',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen name="Diary"    component={Dashboard}    options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📋</Text> }} />
      <Tab.Screen name="Summary"  component={Summary}      options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🎯</Text> }} />
      <Tab.Screen name="Progress" component={WeightHistory} options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📊</Text> }} />
      <Tab.Screen name="Profile"  component={Profile}      options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text> }} />
    </Tab.Navigator>
  );
}

/* ── Root navigator — swaps based on auth state ─────────────── */
function RootNavigator() {
  const { user, isLoading } = useAuth();

  // Splash / loading while restoring session
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>🥗</Text>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 }}>NutriTrack</Text>
        <ActivityIndicator color="#B2EBF2" style={{ marginTop: 32 }} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        /* ── Authenticated stack ── */
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main"       component={MainTabs}  />
          <Stack.Screen name="FoodSearch" component={FoodSearch} />
        </Stack.Navigator>
      ) : (
        /* ── Unauthenticated stack ── */
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="SignIn"     component={SignIn}     />
          <Stack.Screen name="Onboarding" component={Onboarding} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

/* ── App root ───────────────────────────────────────────────── */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
