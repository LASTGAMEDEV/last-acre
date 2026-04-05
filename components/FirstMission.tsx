import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';

const STEPS = [
  { label: 'Plant a crop',           hint: 'Go to Farm → Fields → tap a plot → till → Plant Crop' },
  { label: 'Harvest when ready',     hint: 'Tap ▶ Advance until the crop matures, then tap Harvest' },
  { label: 'Sell your harvest',      hint: 'Open the parcel card and tap Sell, or go to Market' },
  { label: 'Hire a worker',          hint: 'Go to Office → Management → Workers → hire a Field Worker' },
  { label: 'Sign a delivery contract', hint: 'Go to Office → Contracts tab → tap Accept on any offer' },
];

export default function FirstMission() {
  const { firstMissionStep, tutorialSeen } = useGameStore();
  const step = firstMissionStep ?? 0;

  if (!tutorialSeen || step >= STEPS.length) return null;

  const current = STEPS[step];
  const pct = Math.round((step / STEPS.length) * 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.label}>⚡ MISSION {step + 1}/{STEPS.length}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` as any }]} />
        </View>
      </View>
      <View style={styles.bar}>
        <Text style={styles.task}>{current.label}</Text>
      </View>
      <Text style={styles.hint}>{current.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { backgroundColor: '#0f2a0f', borderBottomWidth: 1, borderBottomColor: '#2a5a2a', paddingHorizontal: 12, paddingVertical: 6 },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  label:   { color: '#4caf50', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.6 },
  track:   { flex: 1, height: 3, backgroundColor: '#1a3a1a', borderRadius: 2 },
  fill:    { height: 3, backgroundColor: '#66bb6a', borderRadius: 2 },
  bar:     { flexDirection: 'row', alignItems: 'center' },
  task:    { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold' },
  hint:    { color: '#666', fontSize: 10, marginTop: 2 },
});
