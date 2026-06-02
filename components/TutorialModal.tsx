import React, { useState, useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { C, F, R, S } from '../constants/theme';

const { width: SW } = Dimensions.get('window');

// ── Visual demo components ─────────────────────────────────────────────────────

function CycleVisual() {
  const steps = [
    { icon: '🌱', label: 'Plant' },
    { icon: '⏩', label: 'Wait' },
    { icon: '🌾', label: 'Harvest' },
    { icon: '💰', label: 'Sell' },
  ];
  return (
    <View style={vis.row}>
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <View style={vis.cycleBox}>
            <Text style={vis.cycleIcon}>{s.icon}</Text>
            <Text style={vis.cycleLabel}>{s.label}</Text>
          </View>
          {i < steps.length - 1 && <Text style={vis.arrow}>→</Text>}
        </React.Fragment>
      ))}
    </View>
  );
}

function SeasonVisual() {
  const seasons = [
    { icon: '🌸', name: 'Spring', color: '#a5d6a7' },
    { icon: '☀️', name: 'Summer', color: '#fff176' },
    { icon: '🍂', name: 'Autumn', color: '#ffb74d' },
    { icon: '❄️', name: 'Winter', color: '#90caf9' },
  ];
  return (
    <View style={vis.row}>
      {seasons.map(s => (
        <View key={s.name} style={[vis.seasonBox, { borderColor: s.color + '66' }]}>
          <Text style={vis.seasonIcon}>{s.icon}</Text>
          <Text style={[vis.seasonLabel, { color: s.color }]}>{s.name}</Text>
          <Text style={vis.seasonDays}>90d</Text>
        </View>
      ))}
    </View>
  );
}

function FertilityVisual() {
  const bars = [
    { label: 'High 🟢', val: 0.9, color: '#4caf50' },
    { label: 'Med 🟡', val: 0.55, color: '#ffb74d' },
    { label: 'Low 🔴', val: 0.2, color: '#ef5350' },
  ];
  return (
    <View style={{ gap: 8 }}>
      {bars.map(b => (
        <View key={b.label} style={vis.fertRow}>
          <Text style={vis.fertLabel}>{b.label}</Text>
          <View style={vis.fertTrack}>
            <View style={[vis.fertFill, { width: `${b.val * 100}%` as any, backgroundColor: b.color }]} />
          </View>
          <Text style={[vis.fertPct, { color: b.color }]}>{Math.round(b.val * 100)}%</Text>
        </View>
      ))}
      <Text style={vis.fertNote}>Yield scales with fertility</Text>
    </View>
  );
}

function RotationVisual() {
  return (
    <View style={{ gap: 8 }}>
      <View style={[vis.rotBox, { borderColor: '#4caf5066', backgroundColor: '#0a2a0a' }]}>
        <Text style={vis.rotIcon}>🌽 → 🌾</Text>
        <Text style={[vis.rotLabel, { color: '#66bb6a' }]}>✅ +15% Rotation Bonus</Text>
        <Text style={vis.rotSub}>Different crop = yield boost</Text>
      </View>
      <View style={[vis.rotBox, { borderColor: '#ffb74d66', backgroundColor: '#2a1a00' }]}>
        <Text style={vis.rotIcon}>🌾 → 🌾</Text>
        <Text style={[vis.rotLabel, { color: '#ffb74d' }]}>⚠️ No Bonus</Text>
        <Text style={vis.rotSub}>Same crop, same soil</Text>
      </View>
    </View>
  );
}

function MarketVisual() {
  const items = [
    { crop: '🌾 Wheat', signal: '🟢 BUY', price: '+18%', color: '#4caf50' },
    { crop: '🌽 Corn',  signal: '🟡 HOLD', price: '+2%',  color: '#ffb74d' },
    { crop: '🍅 Tomato',signal: '🔴 WAIT', price: '-8%',  color: '#ef5350' },
  ];
  return (
    <View style={{ gap: 6 }}>
      {items.map(item => (
        <View key={item.crop} style={vis.mktRow}>
          <Text style={vis.mktCrop}>{item.crop}</Text>
          <Text style={[vis.mktSignal, { color: item.color }]}>{item.signal}</Text>
          <Text style={[vis.mktPrice, { color: item.color }]}>{item.price}</Text>
        </View>
      ))}
    </View>
  );
}

function MachinesVisual() {
  const machines = [
    { icon: '🚜', name: 'Tractor', effect: '+20% yield' },
    { icon: '💧', name: 'Irrigation', effect: '-30% water' },
    { icon: '⚡', name: 'Harvester', effect: 'Auto harvest' },
  ];
  return (
    <View style={{ gap: 8 }}>
      {machines.map(m => (
        <View key={m.name} style={vis.machRow}>
          <Text style={vis.machIcon}>{m.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={vis.machName}>{m.name}</Text>
          </View>
          <View style={vis.machBadge}>
            <Text style={vis.machEffect}>{m.effect}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const vis = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  arrow:      { color: C.textFaint, fontSize: 16 },
  cycleBox:   { alignItems: 'center', flex: 1 },
  cycleIcon:  { fontSize: 24 },
  cycleLabel: { color: C.textDim, fontSize: 10, marginTop: 2 },
  seasonBox:  { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 6 },
  seasonIcon: { fontSize: 18 },
  seasonLabel:{ fontSize: 9, fontWeight: 'bold', marginTop: 2 },
  seasonDays: { color: C.textFaint, fontSize: 9 },
  fertRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fertLabel:  { color: C.textDim, fontSize: 11, width: 70 },
  fertTrack:  { flex: 1, height: 8, backgroundColor: C.bgDeep, borderRadius: 4, overflow: 'hidden' },
  fertFill:   { height: 8, borderRadius: 4 },
  fertPct:    { fontSize: 11, width: 34, textAlign: 'right', fontWeight: 'bold' },
  fertNote:   { color: C.textFaint, fontSize: 10, textAlign: 'center', marginTop: 2 },
  rotBox:     { borderWidth: 1, borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rotIcon:    { fontSize: 20 },
  rotLabel:   { fontSize: 12, fontWeight: 'bold' },
  rotSub:     { color: C.textMuted, fontSize: 10 },
  mktRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgDeep, borderRadius: 8, padding: 8, gap: 8 },
  mktCrop:    { color: C.textDim, fontSize: 12, flex: 1 },
  mktSignal:  { fontSize: 11, fontWeight: 'bold', width: 74 },
  mktPrice:   { fontSize: 12, fontWeight: 'bold', width: 36, textAlign: 'right' },
  machRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bgDeep, borderRadius: 8, padding: 8 },
  machIcon:   { fontSize: 22 },
  machName:   { color: C.textDim, fontSize: 12, fontWeight: 'bold' },
  machBadge:  { backgroundColor: '#0f2044', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  machEffect: { color: '#64b5f6', fontSize: 11, fontWeight: 'bold' },
});

// ── Steps data ─────────────────────────────────────────────────────────────────

const STEPS: {
  icon: string;
  title: string;
  subtitle: string;
  Visual: React.FC;
  tip: string;
  navHint?: string;
}[] = [
  {
    icon: '🌾',
    title: 'Welcome to Last Acre',
    subtitle: 'You start with $3,500 and 2 plots. Build an agricultural empire.',
    Visual: CycleVisual,
    tip: 'Tap ▶ Advance (top-right) to pass time. Every crop needs days to grow.',
    navHint: 'Farm tab → tap a plot to plant',
  },
  {
    icon: '🍂',
    title: 'Seasons Change Everything',
    subtitle: 'The year is 360 days — four 90-day seasons, each with unique crops.',
    Visual: SeasonVisual,
    tip: 'Out-of-season crops are grayed out. Plan long-cycle crops at the right time.',
    navHint: 'Weather tab → see forecast & events',
  },
  {
    icon: '🌱',
    title: 'Soil Fertility',
    subtitle: 'Each parcel has a fertility score (1–25). Higher = more yield per harvest.',
    Visual: FertilityVisual,
    tip: 'Legumes (soy, alfalfa) drain no fertility. Leave land fallow to restore +1/30 days.',
  },
  {
    icon: '🔁',
    title: 'Crop Rotation Bonus',
    subtitle: 'Planting a different crop than last time gives +15% yield automatically.',
    Visual: RotationVisual,
    tip: 'The planting panel shows a green badge when rotation applies — use it!',
    navHint: 'Farm tab → tap a plot → see rotation hint',
  },
  {
    icon: '📈',
    title: 'Market Timing',
    subtitle: 'Prices drift daily and cycle seasonally. Selling off-season earns 15–30% more.',
    Visual: MarketVisual,
    tip: 'Watch the trend arrows (↗↘→) in the Market tab for the best sell windows.',
    navHint: 'Market tab → sell crops & animal products',
  },
  {
    icon: '🚜',
    title: 'Machines & Growth',
    subtitle: 'Unlock machines in the Processing tab as your farm expands.',
    Visual: MachinesVisual,
    tip: 'Most machines need 15+ ha or a specific crop tier. Buy land first, then upgrade.',
    navHint: 'Processing tab → buy machines & buildings',
  },
  {
    icon: '🐄',
    title: 'Animals & Livestock',
    subtitle: 'Animals produce goods every day — eggs, milk, honey, wool, and meat.',
    Visual: function AnimalsVisual() {
      return (
        <View style={vis.row}>
          {[['🐔','Eggs'],['🐄','Milk'],['🐝','Honey'],['🐑','Wool']].map(([icon, label]) => (
            <View key={label} style={vis.cycleBox}>
              <Text style={vis.cycleIcon}>{icon}</Text>
              <Text style={vis.cycleLabel}>{label}</Text>
            </View>
          ))}
        </View>
      );
    },
    tip: 'Tap Collect Production daily, or hire an Animal Keeper for automatic collection.',
    navHint: 'Animals tab → buy animals → collect each day',
  },
  {
    icon: '🏦',
    title: 'Banking & Finance',
    subtitle: 'Your credit score unlocks larger loans. Repay on time to improve it.',
    Visual: function BankingVisual() {
      return (
        <View style={{ gap: 6 }}>
          {[['20–49','Tier 1','$5k'],['50–74','Tier 2','$20k'],['75–100','Tier 3','$100k']].map(([range, tier, amount]) => (
            <View key={tier} style={[vis.rotBox, { borderColor: '#ffa72666', backgroundColor: '#1a1000' }]}>
              <Text style={vis.rotIcon}>Score {range}</Text>
              <Text style={[vis.rotLabel, { color: '#ffa726' }]}>{tier} — up to {amount}</Text>
            </View>
          ))}
        </View>
      );
    },
    tip: 'Put spare cash into Savings (4% APR) or a Time Deposit (6–8%). Never hit $0!',
    navHint: 'Office tab → Banking → take or repay loans',
  },
];

// ── Main component ─────────────────────────────────────────────────────────────

export default function TutorialModal() {
  const { tutorialSeen, markTutorialSeen } = useGameStore();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in on step change
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [step]);

  if (tutorialSeen) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = (step + 1) / STEPS.length;

  function goNext() {
    if (isLast) { markTutorialSeen(); return; }
    setStep(s => s + 1);
  }

  function goBack() {
    if (step > 0) setStep(s => s - 1);
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>

          {/* Step counter */}
          <Text style={styles.stepCount}>{step + 1} / {STEPS.length}</Text>

          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header */}
            <Text style={styles.icon}>{current.icon}</Text>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.subtitle}>{current.subtitle}</Text>

            {/* Visual demo */}
            <View style={styles.visualBox}>
              <current.Visual />
            </View>

            {/* Tip */}
            <View style={styles.tipBox}>
              <Text style={styles.tipLabel}>💡 Key insight</Text>
              <Text style={styles.tipText}>{current.tip}</Text>
            </View>

            {/* Nav hint */}
            {current.navHint && (
              <Text style={styles.navHint}>📍 {current.navHint}</Text>
            )}
          </Animated.View>

          {/* Dot indicators */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setStep(i)}>
                <View style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            {step > 0 ? (
              <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.skipBtn} onPress={markTutorialSeen}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
              <Text style={styles.nextText}>{isLast ? '🌾 Start farming!' : 'Next →'}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: S.lg,
  },
  card: {
    backgroundColor: C.bgCard,
    borderRadius: R.xl,
    padding: S.xl,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: C.border,
  },
  progressTrack: {
    height: 3,
    backgroundColor: C.bgDeep,
    borderRadius: 2,
    marginBottom: S.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: C.amber,
    borderRadius: 2,
  },
  stepCount: {
    color: C.textFaint,
    fontSize: F.size.xs,
    textAlign: 'right',
    marginBottom: S.md,
  },
  icon:     { fontSize: 38, textAlign: 'center', marginBottom: S.sm },
  title:    { color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy, textAlign: 'center', marginBottom: S.xs },
  subtitle: { color: C.textDim, fontSize: F.size.sm, textAlign: 'center', marginBottom: S.lg, lineHeight: 18 },
  visualBox: {
    backgroundColor: C.bgDeep,
    borderRadius: R.lg,
    padding: S.md,
    marginBottom: S.md,
  },
  tipBox: {
    backgroundColor: '#0f1a0a',
    borderRadius: R.md,
    padding: S.md,
    borderLeftWidth: 3,
    borderLeftColor: C.amber,
    marginBottom: S.sm,
  },
  tipLabel: { color: C.amber, fontSize: F.size.xs, fontWeight: F.weight.bold, marginBottom: 3 },
  tipText:  { color: C.textDim, fontSize: F.size.sm, lineHeight: 17 },
  navHint:  { color: C.textFaint, fontSize: F.size.xs, textAlign: 'center', marginBottom: S.xs },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: S.sm,
    marginTop: S.md,
    marginBottom: S.lg,
  },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: C.bgElevated },
  dotActive: { backgroundColor: C.amberSoft, width: 20 },
  dotDone:   { backgroundColor: C.surface },
  btnRow:    { flexDirection: 'row', gap: S.sm },
  backBtn:   { flex: 1, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  backText:  { color: C.textDim, fontSize: F.size.md },
  skipBtn:   { flex: 1, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  skipText:  { color: C.textFaint, fontSize: F.size.md },
  nextBtn:   { flex: 2, padding: S.md, borderRadius: R.md, backgroundColor: C.amberDark, alignItems: 'center' },
  nextText:  { color: '#fff', fontWeight: F.weight.heavy, fontSize: F.size.md },
});
