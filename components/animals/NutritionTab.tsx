import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { ANIMAL_TYPES } from '../../data/animalTypes';
import { analyzeRation, generateDefaultRation, FEED_NUTRITION } from '../../engine/nutrition';
import { getSeason } from '../../engine/climate';

const INGREDIENTS = [
  { id: 'corn', name: 'Corn' },
  { id: 'wheat', name: 'Wheat' },
  { id: 'barley', name: 'Barley' },
  { id: 'oats', name: 'Oats' },
  { id: 'sorghum', name: 'Sorghum' },
  { id: 'soy', name: 'Soy' },
  { id: 'hay', name: 'Hay' },
  { id: 'silage', name: 'Silage' },
  { id: 'protein_meal', name: 'Protein Meal' },
];

export default function NutritionTab() {
  const state = useGameStore();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  const ownedTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of state.animals) counts[a.typeId] = (counts[a.typeId] ?? 0) + 1;
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([typeId]) => ANIMAL_TYPES.find(t => t.id === typeId)!)
      .filter(Boolean);
  }, [state.animals]);

  if (ownedTypes.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.lockedText}>No animals owned yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: S.md, gap: S.lg }}>
      {!selectedTypeId ? (
        ownedTypes.map(type => {
          const count = state.animals.filter(a => a.typeId === type.id).length;
          const saved = state.savedRations[type.id];
          return (
            <TouchableOpacity key={type.id} style={styles.card} onPress={() => setSelectedTypeId(type.id)}>
              <Text style={styles.cardTitle}>{type.name} ({count})</Text>
              <Text style={styles.label}>{saved ? 'Custom ration saved' : 'Default ration'}</Text>
            </TouchableOpacity>
          );
        })
      ) : (
        <RationDesigner
          animalType={ownedTypes.find(t => t.id === selectedTypeId)!}
          onBack={() => setSelectedTypeId(null)}
        />
      )}
    </ScrollView>
  );
}

function RationDesigner({ animalType, onBack }: { animalType: any; onBack: () => void }) {
  const state = useGameStore();
  const saved = state.savedRations[animalType.id];
  const defaultRation = generateDefaultRation(animalType);
  const [ingredients, setIngredients] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const ing of saved?.ingredients ?? defaultRation.ingredients) map[ing.ingredientId] = ing.pct;
    return map;
  });
  const [mineral, setMineral] = useState(saved?.mineralPremixKgPerAnimalPerDay ?? defaultRation.mineralPremixKgPerAnimalPerDay ?? 0);

  const count = state.animals.filter(a => a.typeId === animalType.id).length;

  const ration = {
    animalTypeId: animalType.id,
    ingredients: Object.entries(ingredients).filter(([, pct]) => pct > 0).map(([id, pct]) => ({ ingredientId: id, pct })),
    mineralPremixKgPerAnimalPerDay: mineral,
  };

  const hasOwnedParcels = state.parcels.some((p: any) => p.owned && !p.plantedCrop);
  const hasIrrigation = state.parcels.some((p: any) => p.owned && p.irrigated && !p.plantedCrop);
  let pastureKg = 0;
  if (animalType.enclosureType === 'corral' || animalType.enclosureType === 'caballeriza') {
    pastureKg = hasOwnedParcels ? (hasIrrigation ? 2.0 : 1.0) : 0;
  }
  const season = getSeason(state.day);
  const seasonPastureMult = season === 'winter' ? 0.15 : season === 'summer' ? 1.2 : 1.0;
  pastureKg *= seasonPastureMult;

  const analysis = analyzeRation(ration, animalType, { ...state.inventory, ...state.animalInventory, silage: state.silageLevel ?? 0 }, pastureKg);
  const tierColor = analysis.tier === 'deficient' ? '#ef5350' : analysis.tier === 'adequate' ? '#ff9800' : analysis.tier === 'optimal' ? C.green : '#2196f3';

  const setPct = (id: string, pct: number) => {
    setIngredients(prev => ({ ...prev, [id]: Math.max(0, Math.min(100, pct)) }));
  };

  const totalPct = Object.values(ingredients).reduce((a, b) => a + b, 0);

  return (
    <View style={{ gap: S.lg }}>
      <TouchableOpacity onPress={onBack}>
        <Text style={{ color: C.green, fontSize: F.size.md }}>← Back to species list</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{animalType.name} — Feed Ration Designer</Text>
        <Text style={styles.label}>{count} animals · {animalType.feedKgPerDay} kg/day each</Text>

        <View style={[styles.row, { marginTop: S.sm }]}>
          <Text style={styles.label}>Protein</Text>
          <Text style={[styles.value, analysis.proteinPct < animalType.nutritionProfile.minProteinPct && styles.danger]}>
            {analysis.proteinPct.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Energy</Text>
          <Text style={[styles.value, analysis.energyMJPerDay < animalType.nutritionProfile.minEnergyMJPerDay && styles.danger]}>
            {analysis.energyMJPerDay.toFixed(1)} MJ
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Roughage</Text>
          <Text style={[styles.value, analysis.roughagePct < animalType.nutritionProfile.minRoughagePct && styles.danger]}>
            {analysis.roughagePct.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Minerals</Text>
          <Text style={styles.value}>{analysis.hasMinerals ? '✅' : '❌'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tier</Text>
          <Text style={[styles.value, { color: tierColor, textTransform: 'uppercase' }]}>{analysis.tier}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cost / animal / day</Text>
          <Text style={styles.value}>€{analysis.costPerAnimalPerDay.toFixed(2)}</Text>
        </View>

        {analysis.issues.length > 0 && (
          <View style={{ backgroundColor: '#ffebee', borderRadius: R.sm, padding: S.sm, marginTop: S.sm }}>
            {analysis.issues.map((issue: string, i: number) => (
              <Text key={i} style={styles.danger}>• {issue}</Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ingredients</Text>
        {INGREDIENTS.map(ing => {
          const pct = ingredients[ing.id] ?? 0;
          const inStock = ing.id === 'hay' ? (state.animalInventory['hay'] ?? 0)
            : ing.id === 'silage' ? (state.silageLevel ?? 0)
            : ing.id === 'protein_meal' ? (state.animalInventory['protein_meal'] ?? 0)
            : (state.inventory[ing.id] ?? 0);
          const needed = (pct / 100) * animalType.feedKgPerDay * count;
          return (
            <View key={ing.id} style={styles.inputRow}>
              <Text style={[styles.label, { flex: 1 }]}>{ing.name}</Text>
              <Text style={[styles.label, { color: inStock >= needed ? C.green : '#ef5350', fontSize: F.size.xs }]}>
                {inStock >= needed ? '✓' : '✗'} {Math.round(inStock)} kg
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={pct.toString()}
                onChangeText={v => setPct(ing.id, parseInt(v, 10) || 0)}
              />
              <Text style={styles.label}>%</Text>
            </View>
          );
        })}
        <Text style={[styles.label, { textAlign: 'right', marginTop: S.xs }]}>Total: {totalPct}%</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mineral Premix</Text>
        <View style={styles.inputRow}>
          <Text style={styles.label}>kg / animal / day</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={mineral.toString()}
            onChangeText={v => setMineral(parseFloat(v) || 0)}
          />
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, totalPct > 105 && styles.buttonDisabled]}
          onPress={() => state.saveRation(animalType.id, ration)}
          disabled={totalPct > 105}
        >
          <Text style={styles.buttonText}>Save Ration</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButton} onPress={() => {
          setIngredients({ hay: 80, corn: 20 });
          setMineral(0);
        }}>
          <Text style={styles.smallButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: S.xl },
  lockedText: { color: C.textMuted, fontSize: F.size.lg },
  card: { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.lg, gap: S.sm },
  cardTitle: { color: C.text, fontSize: F.size.lg, fontWeight: F.weight.bold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md, marginVertical: 2 },
  label: { color: C.textMuted, fontSize: F.size.md },
  value: { color: C.text, fontSize: F.size.md, fontWeight: F.weight.medium },
  danger: { color: '#ef5350' },
  input: { backgroundColor: C.bg, color: C.text, borderRadius: R.sm, paddingHorizontal: S.md, paddingVertical: S.sm, width: 60, textAlign: 'right' },
  button: { flex: 2, backgroundColor: C.green, borderRadius: R.md, padding: S.md, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#555' },
  buttonText: { color: C.white, fontWeight: F.weight.bold },
  buttonRow: { flexDirection: 'row', gap: S.md },
  smallButton: { flex: 1, backgroundColor: '#444', borderRadius: R.md, padding: S.md, alignItems: 'center' },
  smallButtonText: { color: C.white, fontWeight: F.weight.bold, fontSize: F.size.sm },
});
