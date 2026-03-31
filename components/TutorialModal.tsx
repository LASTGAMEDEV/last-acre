import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../store/useGameStore';

const STEPS = [
  {
    title: 'Welcome to Last Acre',
    icon: '🌾',
    body: [
      'You start with a small farm, $3,500, and 2 plots of land.',
      'Your goal: build a thriving agricultural empire by growing crops, raising animals, and playing the market.',
      'Tap ▶ Advance in the top-right corner to pass one day.',
    ],
  },
  {
    title: 'The Core Loop',
    icon: '🔄',
    body: [
      '1. Plant a crop on an owned plot (Fields tab)',
      '2. Advance days until it grows',
      '3. Harvest and sell in the Economy tab',
      '4. Reinvest profits into more land and better crops',
      'Higher tier crops (D→C→B→A→S) take longer but earn far more per day.',
    ],
  },
  {
    title: 'Seasons Matter',
    icon: '🍂',
    body: [
      'The year has 4 seasons of 90 days each: Spring → Summer → Autumn → Winter.',
      'Many crops can only be planted in certain seasons — rice is summer-only, saffron is autumn-only.',
      'Out-of-season crops are grayed out in the planting menu.',
      'Plan ahead: if you want a long-cycle crop, start it at the right time.',
    ],
  },
  {
    title: 'Soil Fertility & Rotation',
    icon: '🌱',
    body: [
      'Each parcel has a fertility score (1–25). Higher fertility = more yield.',
      'Harvesting heavy crops (corn, potatoes) drains fertility by 1–2 points.',
      'Legumes like soy and alfalfa drain nothing — they fix nitrogen.',
      'Leaving land fallow restores +1 fertility every 30 days. Fertilizer restores +2.',
    ],
  },
  {
    title: 'Crop Rotation & Hidden Bonuses',
    icon: '🔁',
    body: [
      'Planting a DIFFERENT crop than the previous one on the same parcel gives +15% yield.',
      'Example: plant wheat → harvest → plant corn → get 15% more corn.',
      'The planting panel shows a green "+15% rotation" badge when this applies.',
      'Soil type also matters: each parcel is sandy, loamy, clay, or chalky — some crops thrive more in certain soils.',
      'Tip: check the soil badge on a parcel before planting for maximum yield.',
    ],
  },
  {
    title: 'Market Timing',
    icon: '📈',
    body: [
      'Crop prices drift ±2% every day and follow seasonal cycles.',
      'Prices are lowest during peak harvest season (supply glut).',
      'Selling the same crop off-season can earn 15–30% more.',
      'The Economy tab shows a 🟢/🟡/🔴 sell signal for the selected crop.',
      'Watch for news events — they can spike or crash a single crop\'s price by 30%.',
    ],
  },
  {
    title: 'Machines & Progression',
    icon: '🚜',
    body: [
      'Machines boost yield and reduce growth time.',
      'Most machines are locked until your farm meets requirements.',
      'Example: the Harvester requires 15+ ha owned and a Tier B crop harvested.',
      'Grow your land first — buy more parcels from the Fields tab or win auctions.',
      'Check My Office → Goals to track your milestones and unlock requirements.',
    ],
  },
];

export default function TutorialModal() {
  const { tutorialSeen, markTutorialSeen } = useGameStore();
  const [step, setStep] = useState(0);

  if (tutorialSeen) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.icon}>{current.icon}</Text>
          <Text style={styles.title}>{current.title}</Text>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {current.body.map((line, i) => (
              <Text key={i} style={styles.bodyLine}>{'• '}{line}</Text>
            ))}
          </ScrollView>

          {/* Step dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.skipBtn} onPress={markTutorialSeen}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => isLast ? markTutorialSeen() : setStep(s => s + 1)}
            >
              <Text style={styles.nextText}>{isLast ? 'Start farming!' : 'Next →'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { backgroundColor: '#16213e', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: '#0f3460' },
  icon: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  title: { color: '#e8d5a3', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  bodyScroll: { maxHeight: 200, marginBottom: 16 },
  bodyLine: { color: '#ccc', fontSize: 13, lineHeight: 20, marginBottom: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#333' },
  dotActive: { backgroundColor: '#e8d5a3' },
  btnRow: { flexDirection: 'row', gap: 10 },
  skipBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  skipText: { color: '#666', fontSize: 14 },
  nextBtn: { flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#c8860a', alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
