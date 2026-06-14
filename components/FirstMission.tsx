import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { C } from '../constants/theme';

const STEPS = [
  { label: 'Plant a crop',           hint: 'Go to Farm → Fields → tap a plot → till → Plant Crop' },
  { label: 'Harvest when ready',     hint: 'Tap ▶ Advance until the crop matures, then tap Harvest' },
  { label: 'Sell your harvest',      hint: 'Open the parcel card and tap Sell, or go to Market' },
  { label: 'Hire a worker',          hint: 'Go to Office → Management → Workers → hire a Field Worker' },
  { label: 'Sign a delivery contract', hint: 'Go to Office → Contracts tab → tap Accept on any offer' },
];

export default function FirstMission() {
  const [dismissed, setDismissed] = useState(false);
  const { firstMissionStep, tutorialSeen } = useGameStore();
  const step = firstMissionStep ?? 0;

  if (!tutorialSeen || step >= STEPS.length || dismissed) return null;

  const current = STEPS[step];
  const pct = Math.round((step / STEPS.length) * 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.label}>⚡ MISSION {step + 1}/{STEPS.length}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` as any }]} />
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.dismiss}>Skip missions ×</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bar}>
        <Text style={styles.task}>{current.label}</Text>
      </View>
      <Text style={styles.hint}>{current.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { backgroundColor: C.bgDeep, borderBottomWidth: 1, borderBottomColor: C.bgCard, paddingHorizontal: 12, paddingVertical: 6 },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  label:   { color: C.green, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.6 },
  track:   { flex: 1, height: 3, backgroundColor: C.bgCard, borderRadius: 2 },
  fill:    { height: 3, backgroundColor: C.green, borderRadius: 2 },
  bar:     { flexDirection: 'row', alignItems: 'center' },
  task:    { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold' },
  hint:    { color: '#666', fontSize: 10, marginTop: 2 },
  dismiss: { color: '#555', fontSize: 9 },
});
