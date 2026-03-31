import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';

const STEPS = [
  { label: 'Plant a crop',         hint: 'Go to Farm → Fields → tap a plot → Plant Crop' },
  { label: 'Advance days & harvest', hint: 'Tap ▶ Advance until it grows, then tap Harvest' },
  { label: 'Sell your harvest',    hint: 'Go to Market → Economy → select crop → Sell All' },
];

export default function FirstMission() {
  const { firstMissionStep, tutorialSeen } = useGameStore();

  if (!tutorialSeen || firstMissionStep >= 3) return null;

  const step = STEPS[firstMissionStep];

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Text style={styles.label}>🎯 Mission {firstMissionStep + 1}/3: </Text>
        <Text style={styles.task}>{step.label}</Text>
      </View>
      <Text style={styles.hint}>{step.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#0f2a0f',
    borderBottomWidth: 1,
    borderBottomColor: '#2a5a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bar: { flexDirection: 'row', alignItems: 'center' },
  label: { color: '#4caf50', fontSize: 11, fontWeight: 'bold' },
  task:  { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold', flex: 1 },
  hint:  { color: '#888', fontSize: 10, marginTop: 2 },
});
