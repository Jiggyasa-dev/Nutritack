import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getProfile, saveProfile } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const PRIMARY      = '#00BCD4';
const PRIMARY_DARK = '#0097A7';
const BG           = '#F5F7FA';

const GOALS = [
  { key: 'Lose',     label: 'Lose Weight',  icon: '📉' },
  { key: 'Maintain', label: 'Maintain',     icon: '⚖️' },
  { key: 'Gain',     label: 'Gain Weight',  icon: '📈' },
];

const Profile = () => {
  const { user: authUser, signOut, updateUser } = useAuth();
  const [name,      setName]      = useState(authUser?.name || 'Guest');
  const [weight,    setWeight]    = useState('');
  const [height,    setHeight]    = useState('');
  const [age,       setAge]       = useState('');
  const [gender,    setGender]    = useState('Male');
  const [goal,      setGoal]      = useState('Maintain');
  const [reminders, setReminders] = useState(true);
  const [units,     setUnits]     = useState('Metric');
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setName(p.name || 'Guest');
        setWeight(p.weight || '');
        setHeight(p.height || '');
        setAge(p.age || '');
        setGender(p.gender || 'Male');
        setGoal(p.goal || 'Maintain');
        setDailyGoal(p.dailyGoal || 2000);
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  const calcBMR = () => {
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const newGoal = calcBMR();
      const updated = await saveProfile({ name, weight, height, age, gender, goal, dailyGoal: newGoal });
      setDailyGoal(updated.dailyGoal);
      updateUser({ name, dailyGoal: updated.dailyGoal });
      Alert.alert('Profile Updated', `Daily calorie goal: ${updated.dailyGoal} kcal`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const bmi = weight && height
    ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)
    : '--';
  const bmiColor =
    parseFloat(bmi) < 18.5 ? '#2196F3'
    : parseFloat(bmi) < 25 ? '#4CAF50'
    : parseFloat(bmi) < 30 ? '#FF9800'
    : '#F44336';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}><Text style={styles.headerTitle}>Profile</Text></View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        {/* Sign-out button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Avatar — Google photo or initials fallback */}
        {authUser?.avatar ? (
          <Image source={{ uri: authUser.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{name.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}

        <Text style={styles.headerName}>{name}</Text>
        {!!authUser?.email && (
          <Text style={styles.headerEmail}>{authUser.email}</Text>
        )}
        <Text style={styles.headerGoal}>
          {goal === 'Lose' ? '📉 Lose Weight' : goal === 'Gain' ? '📈 Gain Weight' : '⚖️ Maintain'}
          {' · '}{dailyGoal} kcal/day
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Stats Row */}
        <View style={styles.statsCard}>
          {[
            { label: 'Weight', val: weight ? `${weight} kg` : '--', icon: '⚖️', color: PRIMARY },
            { label: 'Height', val: height ? `${height} cm` : '--', icon: '📏', color: '#FF9800' },
            { label: 'BMI',    val: bmi,                             icon: '💪', color: bmiColor },
            { label: 'Goal',   val: `${dailyGoal}`,                 icon: '🎯', color: '#4CAF50', sub: 'kcal' },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              {s.sub && <Text style={[styles.statSub, { color: s.color }]}>{s.sub}</Text>}
            </View>
          ))}
        </View>

        {/* Name */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <Text style={styles.label}>Display Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#BDBDBD"
            />
          </View>
        </View>

        {/* Body Measurements */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Body Measurements</Text>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {['Male', 'Female'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderBtnTxt, gender === g && styles.genderBtnTxtActive]}>
                  {g === 'Male' ? '♂ Male' : '♀ Female'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputPair}>
            <View style={[styles.inputGroup, { marginRight: 8 }]}>
              <Text style={styles.label}>Weight</Text>
              <View style={styles.inputBox}>
                <TextInput style={styles.input} value={weight} onChangeText={setWeight}
                  keyboardType="numeric" placeholder="70" placeholderTextColor="#BDBDBD" />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
            </View>
            <View style={[styles.inputGroup, { marginLeft: 8 }]}>
              <Text style={styles.label}>Height</Text>
              <View style={styles.inputBox}>
                <TextInput style={styles.input} value={height} onChangeText={setHeight}
                  keyboardType="numeric" placeholder="175" placeholderTextColor="#BDBDBD" />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.input} value={age} onChangeText={setAge}
                keyboardType="numeric" placeholder="28" placeholderTextColor="#BDBDBD" />
              <Text style={styles.inputUnit}>yrs</Text>
            </View>
          </View>

          {/* BMR preview */}
          {weight && height && age ? (
            <View style={styles.bmrPreview}>
              <Text style={styles.bmrLabel}>Recalculated daily goal</Text>
              <Text style={styles.bmrValue}>{calcBMR()} kcal</Text>
            </View>
          ) : null}
        </View>

        {/* Goal */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>My Goal</Text>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g.key}
              style={[styles.goalRow, goal === g.key && styles.goalRowActive]}
              onPress={() => setGoal(g.key)}
            >
              <Text style={styles.goalIcon}>{g.icon}</Text>
              <Text style={[styles.goalLabel, goal === g.key && styles.goalLabelActive]}>{g.label}</Text>
              <View style={[styles.radio, goal === g.key && styles.radioActive]}>
                {goal === g.key && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preferences */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.prefRow}>
            <View>
              <Text style={styles.prefLabel}>Units</Text>
              <Text style={styles.prefSub}>Weight & measurements</Text>
            </View>
            <View style={styles.unitToggle}>
              {['Metric', 'Imperial'].map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, units === u && styles.unitBtnActive]}
                  onPress={() => setUnits(u)}
                >
                  <Text style={[styles.unitBtnText, units === u && styles.unitBtnTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.prefRow}>
            <View>
              <Text style={styles.prefLabel}>Daily Reminders</Text>
              <Text style={styles.prefSub}>Meal and water logging</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, reminders && styles.toggleOn]}
              onPress={() => setReminders(!reminders)}
            >
              <View style={[styles.toggleDot, reminders && styles.toggleDotOn]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        <Text style={styles.versionText}>NutriTrack v1.0 · Powered by Neon PostgreSQL</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header:    { backgroundColor: PRIMARY, alignItems: 'center', paddingTop: 16, paddingBottom: 28 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  signOutBtn: {
    alignSelf: 'flex-end', marginRight: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  signOutText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  avatarImage: {
    width: 72, height: 72, borderRadius: 36,
    marginBottom: 10, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  headerEmail: { fontSize: 12, color: '#B2EBF2', marginTop: 2, fontWeight: '500' },
  avatarText:  { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  headerName:  { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerGoal:  { fontSize: 13, color: '#B2EBF2', marginTop: 4, fontWeight: '600' },
  loadingBox:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:      { padding: 16, paddingBottom: 40 },
  statsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 14,
    flexDirection: 'row', justifyContent: 'space-around',
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  statBox:   { alignItems: 'center', flex: 1 },
  statIcon:  { fontSize: 20, marginBottom: 6 },
  statVal:   { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  statLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '600', marginTop: 2 },
  statSub:   { fontSize: 10, fontWeight: '700', marginTop: 1 },
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 16 },
  label:        { fontSize: 13, fontWeight: '600', color: '#616161', marginBottom: 8 },
  genderRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderBtn:    { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8ECF0', alignItems: 'center', backgroundColor: '#FAFAFA' },
  genderBtnActive:     { borderColor: PRIMARY, backgroundColor: '#E0F7FA' },
  genderBtnTxt:        { fontSize: 14, fontWeight: '600', color: '#757575' },
  genderBtnTxtActive:  { color: PRIMARY_DARK },
  inputPair:  { flexDirection: 'row', marginBottom: 0 },
  inputGroup: { flex: 1, marginBottom: 14 },
  inputBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1.5, borderColor: '#E8ECF0', paddingHorizontal: 14 },
  input:      { flex: 1, paddingVertical: 13, fontSize: 16, color: '#1A1A2E', fontWeight: '600' },
  inputUnit:  { fontSize: 13, color: '#9E9E9E', fontWeight: '600' },
  bmrPreview: { backgroundColor: '#E0F7FA', borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  bmrLabel:   { fontSize: 13, color: PRIMARY_DARK, fontWeight: '600' },
  bmrValue:   { fontSize: 20, fontWeight: '900', color: PRIMARY },
  goalRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1.5, borderColor: '#EEEEEE', backgroundColor: '#FAFAFA' },
  goalRowActive: { borderColor: PRIMARY, backgroundColor: '#E0F7FA' },
  goalIcon:        { fontSize: 20, marginRight: 12 },
  goalLabel:       { flex: 1, fontSize: 14, fontWeight: '700', color: '#424242' },
  goalLabelActive: { color: PRIMARY_DARK },
  radio:      { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#BDBDBD', alignItems: 'center', justifyContent: 'center' },
  radioActive:{ borderColor: PRIMARY },
  radioDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  prefRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  prefLabel:  { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  prefSub:    { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  divider:    { height: 1, backgroundColor: '#F5F5F5', marginVertical: 12 },
  unitToggle: { flexDirection: 'row', backgroundColor: '#F5F5F5', borderRadius: 8, padding: 3 },
  unitBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  unitBtnActive:    { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 2 },
  unitBtnText:      { fontSize: 12, fontWeight: '700', color: '#9E9E9E' },
  unitBtnTextActive:{ color: '#1A1A2E' },
  toggle:    { width: 50, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', padding: 3, justifyContent: 'center' },
  toggleOn:  { backgroundColor: PRIMARY },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 2 },
  toggleDotOn:{ transform: [{ translateX: 22 }] },
  saveBtn:    { backgroundColor: PRIMARY, paddingVertical: 17, borderRadius: 14, alignItems: 'center', marginBottom: 16, shadowColor: PRIMARY, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  saveBtnText:{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  versionText:{ textAlign: 'center', fontSize: 12, color: '#BDBDBD', marginBottom: 10 },
});

export default Profile;
