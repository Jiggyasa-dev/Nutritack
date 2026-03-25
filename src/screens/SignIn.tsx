import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../contexts/AuthContext';

const PRIMARY = '#00BCD4';
const PR_DARK = '#0097A7';

const SignIn = ({ navigation }: any) => {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top teal wave */}
      <View style={styles.topSection}>
        <Text style={styles.appIcon}>🥗</Text>
        <Text style={styles.appName}>NutriTrack</Text>
        <Text style={styles.tagline}>Your AI-powered nutrition companion</Text>
      </View>

      {/* Feature list */}
      <View style={styles.featuresSection}>
        {[
          { icon: '📊', text: 'Track calories, macros & water daily' },
          { icon: '📷', text: 'Scan food with AI for instant nutrition' },
          { icon: '⚖️',  text: 'Monitor weight progress & BMI' },
          { icon: '☁️',  text: 'Data synced to your Google account' },
        ].map((f) => (
          <View key={f.icon} style={styles.featureRow}>
            <View style={styles.featureIconBox}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Sign-in button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={async () => {
            setLoading(true);
            try {
              await signIn('guest', {
                id: 1, name: 'Guest User', email: 'guest@nutritrack.app',
                avatar: '', dailyGoal: 2000, weight: '', height: '',
                age: '', gender: '', goal: '',
              });
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.skipBtnText}>Continue as Guest</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service.{'\n'}
          Your data is stored securely and never shared.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  topSection: {
    backgroundColor: PR_DARK,
    paddingTop: 50, paddingBottom: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  appIcon:  { fontSize: 64, marginBottom: 12 },
  appName:  { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  tagline:  { fontSize: 14, color: '#B2EBF2', marginTop: 6, fontWeight: '500' },

  featuresSection: { flex: 1, paddingHorizontal: 28, paddingTop: 36, gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIconBox: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#E0F7FA', alignItems: 'center', justifyContent: 'center',
  },
  featureIcon: { fontSize: 22 },
  featureText: { flex: 1, fontSize: 15, color: '#1A1A2E', fontWeight: '500', lineHeight: 22 },

  bottomSection: { paddingHorizontal: 24, paddingBottom: 32, gap: 14 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: '#FFFFFF',
    borderRadius: 14, paddingVertical: 16,
    shadowColor: '#000', shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 6,
    borderWidth: 1.5, borderColor: '#E8ECF0',
  },
  googleBtnDisabled: { opacity: 0.6 },
  googleIcon: {
    fontSize: 20, fontWeight: '900', color: '#4285F4',
    width: 26, textAlign: 'center',
  },
  googleBtnText: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },

  skipBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 14,
    backgroundColor: PR_DARK,
  },
  skipBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  disclaimer: {
    fontSize: 11, color: '#BDBDBD', textAlign: 'center',
    lineHeight: 17, fontStyle: 'italic',
  },
});

export default SignIn;
