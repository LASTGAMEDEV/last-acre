import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { computeCompostQuality, getCompostGrade } from '../../engine/composting';
import { BUILDING_TYPES } from '../../data/buildingTypes';

export default function CompostScreen() {
  const state = useGameStore();
  const [newManure, setNewManure] = useState('500');
  const [newResidue, setNewResidue] = useState('500');

  const batchCapacity = (state.buildings ?? []).reduce((sum, bId) => {
    if (bId.startsWith('bld_compost_bay')) {
      const bt = BUILDING_TYPES.find(b => b.id === bId);
      return sum + (bt?.capacity ?? 0);
    }
    return sum;
  }, 0);
  const activeCount = state.compostBatches.filter((b: any) => b.status === 'active' || b.status === 'ready').length;

  const startBatch = () => {
    const m = parseInt(newManure, 10) || 0;
    const r = parseInt(newResidue, 10) || 0;
    if (m <= 0 || r <= 0) return;
    state.startCompostBatch(m, r);
    setNewManure('500');
    setNewResidue('500');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: S.md, gap: S.lg }}>
      {/* Summary card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🗑️ Composting Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Solid Manure</Text>
          <Text style={styles.value}>{Math.round(state.solidManureKg ?? 0).toLocaleString()} kg</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Crop Residue</Text>
          <Text style={styles.value}>{Math.round(state.cropResidueKg ?? 0).toLocaleString()} kg</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Compost Ready</Text>
          <Text style={styles.value}>{Math.round(state.compostInventoryKg ?? 0).toLocaleString()} kg</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Digestate</Text>
          <Text style={styles.value}>{Math.round(state.digestateKg ?? 0).toLocaleString()} L</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Batch Capacity</Text>
          <Text style={styles.value}>{activeCount} / {batchCapacity}</Text>
        </View>
      </View>

      {/* New batch */}
      {batchCapacity > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🍂 New Compost Batch</Text>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Manure (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={newManure}
              onChangeText={setNewManure}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Residue (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={newResidue}
              onChangeText={setNewResidue}
            />
          </View>
          <TouchableOpacity
            style={[styles.button, (parseInt(newManure, 10) > (state.solidManureKg ?? 0) || parseInt(newResidue, 10) > (state.cropResidueKg ?? 0) || activeCount >= batchCapacity) && styles.buttonDisabled]}
            onPress={startBatch}
            disabled={parseInt(newManure, 10) > (state.solidManureKg ?? 0) || parseInt(newResidue, 10) > (state.cropResidueKg ?? 0) || activeCount >= batchCapacity}
          >
            <Text style={styles.buttonText}>Start Batch</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active batches */}
      {state.compostBatches.filter((b: any) => b.status === 'active').map((batch: any) => {
        const projQuality = computeCompostQuality(batch);
        const projGrade = getCompostGrade(projQuality);
        const projColor = projGrade.grade === 'Premium' ? '#4caf50' : projGrade.grade === 'Standard' ? '#ff9800' : '#ef5350';
        return (
        <View key={batch.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>Batch #{batch.id.slice(-4)}</Text>
            <Text style={{ fontSize: F.size.xs, color: projColor }}>→ {projGrade.grade} (proj.)</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>C:N Ratio</Text>
            <Text style={[styles.value, batch.cnRatio >= 20 && batch.cnRatio <= 30 ? styles.good : styles.warning]}>
              {batch.cnRatio.toFixed(1)}:1 {batch.cnRatio < 20 || batch.cnRatio > 30 ? '(aim 20–30)' : ''}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Moisture</Text>
            <Text style={[styles.value, batch.moistureLevel >= 45 && batch.moistureLevel <= 65 ? styles.good : styles.warning]}>
              {batch.moistureLevel}% {batch.moistureLevel < 45 ? '↓ water needed' : batch.moistureLevel > 65 ? '↑ too wet' : ''}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Turnings</Text>
            <Text style={styles.value}>{batch.turnings} / 5</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Ready in</Text>
            <Text style={styles.value}>{Math.max(0, batch.maturationDay - state.day)} days</Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.smallButton, state.day - batch.lastTurnedDay < 7 && styles.buttonDisabled]}
              onPress={() => state.turnCompostBatch(batch.id)}
              disabled={state.day - batch.lastTurnedDay < 7}
            >
              <Text style={styles.smallButtonText}>Turn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => state.waterCompostBatch(batch.id)}
            >
              <Text style={styles.smallButtonText}>Water</Text>
            </TouchableOpacity>
          </View>
        </View>
        );
      })}

      {/* Ready batches */}
      {state.compostBatches.filter((b: any) => b.status === 'ready').map((batch: any) => {
        const quality = computeCompostQuality(batch);
        const grade = getCompostGrade(quality);
        const outputKg = Math.round((batch.manureKg + batch.residueKg) * 0.40);
        const gradeColor = grade.grade === 'Premium' ? '#4caf50' : grade.grade === 'Standard' ? '#ff9800' : '#ef5350';
        return (
          <View key={batch.id} style={[styles.card, styles.readyCard]}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>✅ Compost Ready</Text>
              <Text style={[styles.value, { color: gradeColor, fontWeight: 'bold' }]}>{grade.grade}</Text>
            </View>
            <Text style={[styles.value, { marginBottom: 4 }]}>{outputKg.toLocaleString()} kg</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              <View style={styles.nutrientPill}>
                <Text style={styles.nutrientLabel}>N</Text>
                <Text style={styles.nutrientVal}>{grade.nPer1000kg} kg/t</Text>
              </View>
              <View style={styles.nutrientPill}>
                <Text style={styles.nutrientLabel}>P</Text>
                <Text style={styles.nutrientVal}>{grade.pPer1000kg} kg/t</Text>
              </View>
              <View style={styles.nutrientPill}>
                <Text style={styles.nutrientLabel}>K</Text>
                <Text style={styles.nutrientVal}>{grade.kPer1000kg} kg/t</Text>
              </View>
              {grade.organicMatter > 0 && (
                <View style={styles.nutrientPill}>
                  <Text style={styles.nutrientLabel}>OM</Text>
                  <Text style={styles.nutrientVal}>+{grade.organicMatter}%</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.button} onPress={() => state.collectCompostBatch(batch.id)}>
              <Text style={styles.buttonText}>Collect to Inventory</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {batchCapacity === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🍂 Composting</Text>
          <Text style={styles.label}>Build a Compost Bay to start composting batches.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.lg, gap: S.sm },
  readyCard: { borderColor: C.green, borderWidth: 1 },
  cardTitle: { color: C.text, fontSize: F.size.lg, fontWeight: F.weight.bold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md },
  label: { color: C.textMuted, fontSize: F.size.md },
  value: { color: C.text, fontSize: F.size.md, fontWeight: F.weight.medium },
  good: { color: C.green },
  warning: { color: '#ff9800' },
  input: { backgroundColor: C.bg, color: C.text, borderRadius: R.sm, paddingHorizontal: S.md, paddingVertical: S.sm, width: 100, textAlign: 'right' },
  button: { backgroundColor: C.green, borderRadius: R.md, padding: S.md, alignItems: 'center', marginTop: S.sm },
  buttonDisabled: { backgroundColor: '#555' },
  buttonText: { color: C.white, fontWeight: F.weight.bold },
  buttonRow: { flexDirection: 'row', gap: S.md, marginTop: S.sm },
  smallButton: { flex: 1, backgroundColor: C.green, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  smallButtonText: { color: C.white, fontWeight: F.weight.bold, fontSize: F.size.sm },
  nutrientPill: { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.sm, padding: 4, alignItems: 'center' },
  nutrientLabel: { color: C.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  nutrientVal: { color: C.text, fontSize: F.size.sm, fontWeight: 'bold', marginTop: 1 },
});
