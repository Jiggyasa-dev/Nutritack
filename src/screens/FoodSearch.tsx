import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import {
  searchFoods, getAllFoods, getFoodsByCategory,
  addFoodToMeal, analyzeFood, dateKey,
  FoodEntry, MealLog, FoodAnalysisResult,
} from '../api/client';

const PRIMARY      = '#00BCD4';
const PRIMARY_DARK = '#0097A7';
const BG           = '#F5F7FA';

const CATEGORIES = [
  { label: 'Fruits',     icon: '🍎' },
  { label: 'Vegetables', icon: '🥦' },
  { label: 'Proteins',   icon: '🥩' },
  { label: 'Grains',     icon: '🍞' },
  { label: 'Dairy',      icon: '🧀' },
  { label: 'Nuts',       icon: '🌰' },
  { label: 'Snacks',     icon: '🍿' },
  { label: 'Beverages',  icon: '🧃' },
];

/* ── Confidence badge colours ───────────────────────────────── */
const CONF_COLOR = {
  high:   { bg: '#E8F5E9', text: '#2E7D32' },
  medium: { bg: '#FFF3E0', text: '#E65100' },
  low:    { bg: '#FFEBEE', text: '#C62828' },
};

/* ── Convert analysis result → FoodEntry for logging ────────── */
function analysisToEntry(a: FoodAnalysisResult): Omit<FoodEntry, 'id'> {
  return {
    name:     a.name,
    icon:     a.emoji,
    calories: a.calories,
    protein:  a.protein,
    carbs:    a.carbs,
    fat:      a.fat,
    fiber:    a.fiber,
    unit:     a.servingSize,
  };
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
const FoodSearch = ({ navigation, route }: any) => {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<FoodEntry[]>([]);
  const [allFoods,  setAllFoods]  = useState<FoodEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding,    setAdding]    = useState<string | null>(null);
  const [loadingAll,setLoadingAll]= useState(true);

  /* ── Scan state ──────────────────────────────────────────── */
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scannedImage,     setScannedImage]     = useState<string | null>(null);
  const [analyzing,        setAnalyzing]        = useState(false);
  const [scanResult,       setScanResult]       = useState<FoodAnalysisResult | null>(null);
  const [scanError,        setScanError]        = useState<string | null>(null);
  const [addingScanned,    setAddingScanned]    = useState(false);

  const mealType: keyof MealLog = route.params?.mealType || 'Breakfast';
  const date: string            = route.params?.date     || dateKey();

  useEffect(() => {
    getAllFoods(60)
      .then(setAllFoods)
      .catch(console.warn)
      .finally(() => setLoadingAll(false));
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchFoods(query.trim())); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  /* ── Food add (from search/browse) ──────────────────────── */
  const handleAdd = async (food: FoodEntry) => {
    setAdding(food.id);
    try {
      await addFoodToMeal(date, mealType, food);
      Alert.alert('Added!', `${food.name} added to ${mealType}`, [
        { text: 'Keep Adding' },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAdding(null);
    }
  };

  /* ── Camera / Gallery picker ─────────────────────────────── */
  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to scan food.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      startAnalysis(result.assets[0].base64 ?? '', result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      startAnalysis(result.assets[0].base64 ?? '', result.assets[0].uri);
    }
  };

  const startAnalysis = async (base64: string, uri: string) => {
    setScannedImage(uri);
    setScanResult(null);
    setScanError(null);
    setScanModalVisible(true);
    setAnalyzing(true);
    try {
      const mime =
        uri.toLowerCase().endsWith('.png') ? 'image/png' :
        uri.toLowerCase().endsWith('.webp') ? 'image/webp' :
        'image/jpeg';
      const result = await analyzeFood(base64, mime);
      setScanResult(result);
    } catch (err: any) {
      setScanError(err.message || 'Could not analyze the image. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  /* ── Add scanned food to meal ────────────────────────────── */
  const handleAddScanned = async () => {
    if (!scanResult) return;
    setAddingScanned(true);
    try {
      await addFoodToMeal(date, mealType, analysisToEntry(scanResult));
      setScanModalVisible(false);
      Alert.alert('Added!', `${scanResult.name} added to ${mealType}`, [
        { text: 'Scan Another', onPress: () => { setScannedImage(null); setScanResult(null); } },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAddingScanned(false);
    }
  };

  /* ── Render food row (search / browse) ───────────────────── */
  const renderFood = ({ item }: { item: FoodEntry }) => {
    const isLoading = adding === item.id;
    return (
      <View style={styles.foodRow}>
        <View style={styles.foodIconBox}>
          <Text style={styles.foodIconText}>{item.icon}</Text>
        </View>
        <View style={styles.foodInfo}>
          <Text style={styles.foodName}>{item.name}</Text>
          <Text style={styles.foodMeta}>{item.unit} · {item.calories} kcal</Text>
          <View style={styles.macroRow}>
            <View style={[styles.pill, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.pillText, { color: '#1565C0' }]}>P {item.protein}g</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.pillText, { color: '#E65100' }]}>C {item.carbs}g</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: '#F3E5F5' }]}>
              <Text style={[styles.pillText, { color: '#6A1B9A' }]}>F {item.fat}g</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, isLoading && styles.addBtnLoading]}
          onPress={() => handleAdd(item)}
          disabled={!!adding}
        >
          {isLoading
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={styles.addBtnText}>+</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  /* ─────────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Add to {mealType}</Text>
          <Text style={styles.headerDate}>{date}</Text>
        </View>
        {/* Camera scan button */}
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => Alert.alert(
            'Scan Food',
            'Choose an option',
            [
              { text: 'Take Photo',      onPress: openCamera  },
              { text: 'Choose from Library', onPress: openGallery },
              { text: 'Cancel', style: 'cancel' },
            ]
          )}
        >
          <Text style={styles.scanBtnIcon}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search foods…"
          placeholderTextColor="#BDBDBD"
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {searching
          ? <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 4 }} />
          : query.length > 0
            ? <TouchableOpacity onPress={() => setQuery('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            : null}
      </View>

      {/* ── Scan CTA banner (when query empty) ── */}
      {!query.trim() && (
        <TouchableOpacity
          style={styles.scanBanner}
          onPress={() => Alert.alert(
            'Scan Food',
            'Choose an option',
            [
              { text: 'Take Photo',          onPress: openCamera  },
              { text: 'Choose from Library', onPress: openGallery },
              { text: 'Cancel', style: 'cancel' },
            ]
          )}
          activeOpacity={0.85}
        >
          <View style={styles.scanBannerLeft}>
            <Text style={styles.scanBannerIcon}>📷</Text>
            <View>
              <Text style={styles.scanBannerTitle}>Scan Food with AI</Text>
              <Text style={styles.scanBannerSub}>Take a photo — get instant nutrition info</Text>
            </View>
          </View>
          <View style={styles.scanBannerArrow}>
            <Text style={styles.scanBannerArrowText}>›</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Results / Browse ── */}
      {query.trim() ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderFood}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !searching ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No results for "{query}"</Text>
                <Text style={styles.emptySubtitle}>Try a different term or scan a photo</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          keyExtractor={() => 'h'}
          ListHeaderComponent={
            <View style={styles.discoverSection}>
              <Text style={styles.sectionLabel}>Browse by Category</Text>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.label}
                    style={styles.categoryCard}
                    onPress={() => {
                      setQuery(cat.label);
                      getFoodsByCategory(cat.label)
                        .then(setResults)
                        .catch(() => setResults([]));
                    }}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>All Foods</Text>
              {loadingAll ? (
                <ActivityIndicator color={PRIMARY} style={{ marginTop: 20 }} />
              ) : (
                allFoods.map((food) => (
                  <View key={food.id} style={styles.foodRow}>
                    <View style={styles.foodIconBox}>
                      <Text style={styles.foodIconText}>{food.icon}</Text>
                    </View>
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.foodMeta}>{food.unit} · {food.calories} kcal</Text>
                      <View style={styles.macroRow}>
                        <View style={[styles.pill, { backgroundColor: '#E3F2FD' }]}>
                          <Text style={[styles.pillText, { color: '#1565C0' }]}>P {food.protein}g</Text>
                        </View>
                        <View style={[styles.pill, { backgroundColor: '#FFF3E0' }]}>
                          <Text style={[styles.pillText, { color: '#E65100' }]}>C {food.carbs}g</Text>
                        </View>
                        <View style={[styles.pill, { backgroundColor: '#F3E5F5' }]}>
                          <Text style={[styles.pillText, { color: '#6A1B9A' }]}>F {food.fat}g</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.addBtn, adding === food.id && styles.addBtnLoading]}
                      onPress={() => handleAdd(food)}
                      disabled={!!adding}
                    >
                      {adding === food.id
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <Text style={styles.addBtnText}>+</Text>}
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          }
        />
      )}

      {/* ══════════════════════════════════════════════════════
          SCAN RESULT MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal
        visible={scanModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { if (!analyzing && !addingScanned) setScanModalVisible(false); }}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => { if (!analyzing && !addingScanned) setScanModalVisible(false); }}
              disabled={analyzing || addingScanned}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>AI Food Analysis</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>

            {/* Scanned image preview */}
            {scannedImage && (
              <View style={styles.imagePreviewBox}>
                <Image source={{ uri: scannedImage }} style={styles.imagePreview} resizeMode="cover" />
              </View>
            )}

            {/* Analyzing spinner */}
            {analyzing && (
              <View style={styles.analyzingBox}>
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text style={styles.analyzingTitle}>Analyzing your food…</Text>
                <Text style={styles.analyzingSubtitle}>Claude AI is identifying nutrition details</Text>
              </View>
            )}

            {/* Error state */}
            {!analyzing && scanError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Could not analyze image</Text>
                <Text style={styles.errorMsg}>{scanError}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => {
                    setScanModalVisible(false);
                    setScanError(null);
                    setScannedImage(null);
                  }}
                >
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Result card */}
            {!analyzing && scanResult && (
              <View style={styles.resultCard}>

                {/* Food name + emoji */}
                <View style={styles.resultNameRow}>
                  <View style={styles.resultEmojiCircle}>
                    <Text style={styles.resultEmoji}>{scanResult.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{scanResult.name}</Text>
                    <Text style={styles.resultServing}>Per {scanResult.servingSize}</Text>
                  </View>
                  {/* Confidence badge */}
                  <View style={[styles.confBadge, { backgroundColor: CONF_COLOR[scanResult.confidence].bg }]}>
                    <Text style={[styles.confBadgeText, { color: CONF_COLOR[scanResult.confidence].text }]}>
                      {scanResult.confidence === 'high' ? '✓ High' :
                       scanResult.confidence === 'medium' ? '~ Medium' : '? Low'} confidence
                    </Text>
                  </View>
                </View>

                {/* Calories highlight */}
                <View style={styles.calHighlight}>
                  <Text style={styles.calHighlightNum}>{scanResult.calories}</Text>
                  <Text style={styles.calHighlightLabel}>kcal</Text>
                </View>

                {/* Macros grid */}
                <View style={styles.macrosGrid}>
                  {[
                    { label: 'Protein', val: scanResult.protein,  unit: 'g', bg: '#E3F2FD', color: '#1565C0' },
                    { label: 'Carbs',   val: scanResult.carbs,    unit: 'g', bg: '#FFF3E0', color: '#E65100' },
                    { label: 'Fat',     val: scanResult.fat,      unit: 'g', bg: '#F3E5F5', color: '#6A1B9A' },
                    { label: 'Fiber',   val: scanResult.fiber,    unit: 'g', bg: '#E8F5E9', color: '#2E7D32' },
                  ].map((m) => (
                    <View key={m.label} style={[styles.macroBox, { backgroundColor: m.bg }]}>
                      <Text style={[styles.macroBoxVal, { color: m.color }]}>{m.val}{m.unit}</Text>
                      <Text style={[styles.macroBoxLabel, { color: m.color }]}>{m.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Extra nutrients */}
                <View style={styles.extraNutriRow}>
                  <View style={styles.extraNutriItem}>
                    <Text style={styles.extraNutriLabel}>Sugar</Text>
                    <Text style={styles.extraNutriVal}>{scanResult.sugar}g</Text>
                  </View>
                  <View style={styles.extraNutriDivider} />
                  <View style={styles.extraNutriItem}>
                    <Text style={styles.extraNutriLabel}>Sodium</Text>
                    <Text style={styles.extraNutriVal}>{scanResult.sodium}mg</Text>
                  </View>
                </View>

                {/* Notes */}
                {!!scanResult.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesIcon}>💡</Text>
                    <Text style={styles.notesText}>{scanResult.notes}</Text>
                  </View>
                )}

                {/* Alternative names */}
                {scanResult.alternativeNames?.length > 0 && (
                  <View style={styles.altNamesRow}>
                    <Text style={styles.altNamesLabel}>Also known as: </Text>
                    <Text style={styles.altNamesVal}>{scanResult.alternativeNames.join(', ')}</Text>
                  </View>
                )}

                {/* Add to meal button */}
                <TouchableOpacity
                  style={[styles.addMealBtn, addingScanned && { opacity: 0.7 }]}
                  onPress={handleAddScanned}
                  disabled={addingScanned}
                >
                  {addingScanned
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={styles.addMealBtnText}>Add to {mealType}</Text>}
                </TouchableOpacity>

                {/* Scan another */}
                <TouchableOpacity
                  style={styles.scanAnotherBtn}
                  onPress={() => {
                    setScanModalVisible(false);
                    setScanResult(null);
                    setScannedImage(null);
                    setTimeout(() => {
                      Alert.alert('Scan Food', 'Choose an option', [
                        { text: 'Take Photo',          onPress: openCamera  },
                        { text: 'Choose from Library', onPress: openGallery },
                        { text: 'Cancel', style: 'cancel' },
                      ]);
                    }, 400);
                  }}
                >
                  <Text style={styles.scanAnotherText}>📷 Scan Another Food</Text>
                </TouchableOpacity>

                <Text style={styles.aiDisclaimer}>
                  ⚠️ Nutrition values are AI estimates. Verify against packaging for precise tracking.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

/* ═══════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backText:    { color: '#FFFFFF', fontSize: 26, fontWeight: '700', lineHeight: 30 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerDate:  { fontSize: 11, color: '#B2EBF2', marginTop: 1 },
  scanBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanBtnIcon: { fontSize: 20 },

  /* Search */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    margin: 14, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 4,
  },
  searchIcon:  { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A2E', paddingVertical: 14, fontWeight: '500' },
  clearBtn:    { fontSize: 16, color: '#BDBDBD', paddingHorizontal: 4 },

  /* Scan banner */
  scanBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', marginHorizontal: 14, marginBottom: 14,
    borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: PRIMARY,
    shadowColor: PRIMARY, shadowOpacity: 0.12, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 4,
  },
  scanBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scanBannerIcon:  { fontSize: 32 },
  scanBannerTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  scanBannerSub:   { fontSize: 12, color: '#9E9E9E', marginTop: 2, fontWeight: '500' },
  scanBannerArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0F7FA', alignItems: 'center', justifyContent: 'center' },
  scanBannerArrowText: { color: PRIMARY, fontSize: 18, fontWeight: '900' },

  /* Food list */
  discoverSection: { padding: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#1A1A2E', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, alignItems: 'center', width: '22%',
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2,
  },
  categoryIcon:  { fontSize: 26, marginBottom: 6 },
  categoryLabel: { fontSize: 11, fontWeight: '700', color: '#424242', textAlign: 'center' },
  listContent: { padding: 14 },
  foodRow: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2,
  },
  foodIconBox:  { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  foodIconText: { fontSize: 22 },
  foodInfo:     { flex: 1 },
  foodName:     { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  foodMeta:     { fontSize: 12, color: '#9E9E9E', marginTop: 2, marginBottom: 6, fontWeight: '500' },
  macroRow:     { flexDirection: 'row', gap: 4 },
  pill:         { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  pillText:     { fontSize: 10, fontWeight: '700' },
  addBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  addBtnLoading:{ backgroundColor: '#B2EBF2' },
  addBtnText:   { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  emptyState:   { alignItems: 'center', paddingTop: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 16 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#424242', marginBottom: 6 },
  emptySubtitle:{ fontSize: 13, color: '#9E9E9E' },

  /* ─── Modal ─── */
  modalContainer: { flex: 1, backgroundColor: BG },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: PRIMARY_DARK, paddingHorizontal: 16, paddingVertical: 14,
  },
  modalCloseBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalTitle:     { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  modalScroll:    { padding: 16, paddingBottom: 40 },

  /* Image preview */
  imagePreviewBox: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  imagePreview: { width: '100%', height: 220 },

  /* Analyzing */
  analyzingBox:     { alignItems: 'center', paddingVertical: 40, gap: 16 },
  analyzingTitle:   { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  analyzingSubtitle:{ fontSize: 13, color: '#9E9E9E', fontWeight: '500' },

  /* Error */
  errorBox:    { alignItems: 'center', paddingVertical: 32, gap: 10 },
  errorIcon:   { fontSize: 48 },
  errorTitle:  { fontSize: 18, fontWeight: '800', color: '#C62828' },
  errorMsg:    { fontSize: 13, color: '#9E9E9E', textAlign: 'center', lineHeight: 20 },
  retryBtn:    { backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13, marginTop: 8 },
  retryBtnText:{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  /* Result card */
  resultCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 14, elevation: 6,
  },
  resultNameRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  resultEmojiCircle:{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  resultEmoji:     { fontSize: 30 },
  resultName:      { fontSize: 20, fontWeight: '900', color: '#1A1A2E', flexShrink: 1 },
  resultServing:   { fontSize: 12, color: '#9E9E9E', marginTop: 3, fontWeight: '500' },

  confBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  confBadgeText: { fontSize: 11, fontWeight: '800' },

  /* Calories */
  calHighlight: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    backgroundColor: '#E0F7FA', borderRadius: 14, paddingVertical: 16, marginBottom: 16,
  },
  calHighlightNum:   { fontSize: 52, fontWeight: '900', color: PRIMARY_DARK, lineHeight: 56 },
  calHighlightLabel: { fontSize: 18, color: PRIMARY, fontWeight: '700', marginLeft: 6, marginBottom: 6 },

  /* Macros */
  macrosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  macroBox:   { flex: 1, minWidth: '44%', borderRadius: 12, padding: 12, alignItems: 'center' },
  macroBoxVal:  { fontSize: 20, fontWeight: '900' },
  macroBoxLabel:{ fontSize: 12, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  /* Extra nutrients */
  extraNutriRow:     { flexDirection: 'row', backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14, marginBottom: 12 },
  extraNutriItem:    { flex: 1, alignItems: 'center' },
  extraNutriDivider: { width: 1, backgroundColor: '#EEEEEE' },
  extraNutriLabel:   { fontSize: 12, color: '#9E9E9E', fontWeight: '600', marginBottom: 4 },
  extraNutriVal:     { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },

  /* Notes */
  notesBox: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF8E1',
    borderRadius: 12, padding: 12, marginBottom: 10, gap: 10,
  },
  notesIcon: { fontSize: 18 },
  notesText: { flex: 1, fontSize: 13, color: '#795548', fontWeight: '500', lineHeight: 19 },

  altNamesRow:  { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  altNamesLabel:{ fontSize: 12, color: '#9E9E9E', fontWeight: '600' },
  altNamesVal:  { fontSize: 12, color: '#616161', fontWeight: '500' },

  /* Add button */
  addMealBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', marginBottom: 12, marginTop: 4,
    shadowColor: PRIMARY, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  addMealBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  scanAnotherBtn:  { alignItems: 'center', paddingVertical: 12, marginBottom: 10 },
  scanAnotherText: { fontSize: 14, fontWeight: '700', color: PRIMARY },

  aiDisclaimer: {
    fontSize: 11, color: '#BDBDBD', textAlign: 'center',
    lineHeight: 16, fontStyle: 'italic',
  },
});

export default FoodSearch;
