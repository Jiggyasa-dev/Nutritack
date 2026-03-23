import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { saveProfile } from '../api/client';

const PRIMARY      = '#00BCD4';
const PRIMARY_DARK = '#0097A7';

const GOALS = [
  { key: 'Lose',     label: 'Lose Weight',  icon: '📉', desc: '−500 kcal/day deficit' },
  { key: 'Maintain', label: 'Maintain',     icon: '⚖️', desc: 'Keep current weight'   },
  { key: 'Gain',     label: 'Gain Weight',  icon: '📈', desc: '+500 kcal/day surplus'  },
];

const Onboarding = ({ navigation }: any) => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age,    setAge]    = useState('');
  const [gender, setGender] = useState('Male');
  const [goal,   setGoal]   = useState('Maintain');
  const [saving, setSaving] = useState(false);

  const calculateBMR = () => {
    const w = parseFloat(weight) || 70;
    const h = parseFloat(height) || 170;
    const a = parseFloat(age)    || 25;
    let bmr = gender === 'Male'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
    if (goal === 'Lose') bmr -= 500;
    if (goal === 'Gain') bmr += 500;
    return Math.round(bmr);
  };

  const handleStart = async () => {
    if (!weight || !height || !age) {
      Alert.alert('Missing info', 'Please fill in weight, height and age.');
      return;
    }
    setSaving(true);
    try {
      const dailyGoal = calculateBMR();
      await saveProfile({ weight, height, age, gender, goal, dailyGoal, name: 'Guest' });
      navigation.navigate('Main');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save profile. Is the server running?');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🥗</Text>
          </View>
          <Text style={styles.appName}>NutriTrack</Text>
          <Text style={styles.tagline}>Your personal nutrition companion</Text>
        </View>

        {/* Body Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tell us about yourself</Text>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {['Male', 'Female'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                  {g === 'Male' ? '♂ Male' : '♀ Female'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { marginRight: 8 }]}>
              <Text style={styles.label}>Weight</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="70" placeholderTextColor="#BDBDBD"
                  keyboardType="numeric" value={weight} onChangeText={setWeight} />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
            </View>
            <View style={[styles.inputGroup, { marginLeft: 8 }]}>
              <Text style={styles.label}>Height</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="175" placeholderTextColor="#BDBDBD"
                  keyboardType="numeric" value={height} onChangeText={setHeight} />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="28" placeholderTextColor="#BDBDBD"
                keyboardType="numeric" value={age} onChangeText={setAge} />
              <Text style={styles.inputUnit}>yrs</Text>
            </View>
          </View>

          {/* BMR preview */}
          {weight && height && age ? (
            <View style={styles.bmrPreview}>
              <Text style={styles.bmrLabel}>Estimated daily goal</Text>
              <Text style={styles.bmrValue}>{calculateBMR()} kcal</Text>
            </View>
          ) : null}
        </View>

        {/* Goal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What's your goal?</Text>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g.key}
              style={[styles.goalItem, goal === g.key && styles.goalItemActive]}
              onPress={() => setGoal(g.key)}
            >
              <Text style={styles.goalIcon}>{g.icon}</Text>
              <View style={styles.goalTextGroup}>
                <Text style={[styles.goalLabel, goal === g.key && styles.goalLabelActive]}>{g.label}</Text>
                <Text style={styles.goalDesc}>{g.desc}</Text>
              </View>
              <View style={[styles.radio, goal === g.key && styles.radioActive]}>
                {goal === g.key && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.startBtn, saving && { opacity: 0.7 }]}
          onPress={handleStart}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.startBtnText}>Get Started →</Text>}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>Calculated using Mifflin-St Jeor formula</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll:    { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E0F7FA', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoEmoji: { fontSize: 40 },
  appName:  { fontSize: 28, fontWeight: '800', color: '#1A1A2E', letterSpacing: 0.5 },
  tagline:  { fontSize: 15, color: '#757575', marginTop: 6 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  label:     { fontSize: 13, fontWeight: '600', color: '#616161', marginBottom: 8 },
  genderRow: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  genderBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E8ECF0', alignItems: 'center', backgroundColor: '#FAFAFA',
  },
  genderBtnActive:     { borderColor: PRIMARY, backgroundColor: '#E0F7FA' },
  genderBtnText:       { fontSize: 14, fontWeight: '600', color: '#757575' },
  genderBtnTextActive: { color: PRIMARY_DARK },
  inputRow:    { flexDirection: 'row', marginBottom: 0 },
  inputGroup:  { flex: 1, marginBottom: 16 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F7FA', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E8ECF0', paddingHorizontal: 14,
  },
  input:     { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1A1A2E', fontWeight: '600' },
  inputUnit: { fontSize: 13, color: '#9E9E9E', fontWeight: '600' },
  bmrPreview: {
    backgroundColor: '#E0F7FA', borderRadius: 10, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
  },
  bmrLabel: { fontSize: 13, color: PRIMARY_DARK, fontWeight: '600' },
  bmrValue: { fontSize: 20, fontWeight: '900', color: PRIMARY },
  goalItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E8ECF0', marginBottom: 10, backgroundColor: '#FAFAFA',
  },
  goalItemActive: { borderColor: PRIMARY, backgroundColor: '#E0F7FA' },
  goalIcon:  { fontSize: 24, marginRight: 14 },
  goalTextGroup: { flex: 1 },
  goalLabel:       { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  goalLabelActive: { color: PRIMARY_DARK },
  goalDesc:  { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  radio:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#BDBDBD', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: PRIMARY },
  radioDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  startBtn: {
    backgroundColor: PRIMARY, paddingVertical: 18, borderRadius: 14,
    alignItems: 'center', marginBottom: 14,
    shadowColor: PRIMARY, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  startBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  disclaimer:   { textAlign: 'center', fontSize: 12, color: '#BDBDBD' },
});

export default Onboarding;
