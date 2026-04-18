import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { MILESTONES } from '../../data/milestones';
import { CROP_TYPES } from '../../data/cropTypes';

const CATEGORY_DEFS: { id: string; label: string; icon: string; ids: string[] }[] = [
  {
    id: 'land',
    label: 'Land',
    icon: '🗺️',
    ids: ['five_ha', 'ten_ha', 'twenty_ha'],
  },
  {
    id: 'crops',
    label: 'Crops',
    icon: '🌾',
    ids: ['first_harvest', 'tier_c', 'tier_b', 'tier_a', 'tier_s'],
  },
  {
    id: 'money',
    label: 'Finance',
    icon: '💰',
    ids: ['cash_10k', 'cash_50k', 'cash_250k', 'savings_5k'],
  },
  {
    id: 'animals',
    label: 'Livestock',
    icon: '🐄',
    ids: ['first_animal', 'five_animals'],
  },
  {
    id: 'equipment',
    label: 'Equipment',
    icon: '🚜',
    ids: ['first_machine', 'three_machines'],
  },
  {
    id: 'business',
    label: 'Business',
    icon: '📋',
    ids: ['first_contract', 'first_insurance'],
  },
  {
    id: 'time',
    label: 'Survival',
    icon: '📅',
    ids: ['day_100', 'day_365'],
  },
];

function getProgress(
  milestoneId: string,
  state: {
    day: number;
    money: number;
    parcels: { owned: boolean; hectares: number }[];
    animals: { id: string }[];
    machines: { id: string }[];
    savings: { balance: number };
    harvestedCropIds: string[];
  }
): { current: number; target: number } | null {
  const ownedHa = state.parcels.filter(p => p.owned).reduce((s, p) => s + p.hectares, 0);
  switch (milestoneId) {
    case 'five_ha':    return { current: ownedHa, target: 5 };
    case 'ten_ha':     return { current: ownedHa, target: 10 };
    case 'twenty_ha':  return { current: ownedHa, target: 20 };
    case 'cash_10k':   return { current: state.money, target: 10_000 };
    case 'cash_50k':   return { current: state.money, target: 50_000 };
    case 'cash_250k':  return { current: state.money, target: 250_000 };
    case 'savings_5k': return { current: state.savings.balance, target: 5_000 };
    case 'first_animal':  return { current: state.animals.length, target: 1 };
    case 'five_animals':  return { current: state.animals.length, target: 5 };
    case 'first_machine': return { current: state.machines.length, target: 1 };
    case 'three_machines':return { current: state.machines.length, target: 3 };
    case 'day_100':    return { current: state.day, target: 100 };
    case 'day_365':    return { current: state.day, target: 365 };
    case 'tier_c':
      return {
        current: state.harvestedCropIds.some(id => CROP_TYPES.find(c => c.id === id)?.tier === 'C') ? 1 : 0,
        target: 1,
      };
    case 'tier_b':
      return {
        current: state.harvestedCropIds.some(id => CROP_TYPES.find(c => c.id === id)?.tier === 'B') ? 1 : 0,
        target: 1,
      };
    case 'tier_a':
      return {
        current: state.harvestedCropIds.some(id => CROP_TYPES.find(c => c.id === id)?.tier === 'A') ? 1 : 0,
        target: 1,
      };
    case 'tier_s':
      return {
        current: state.harvestedCropIds.some(id => CROP_TYPES.find(c => c.id === id)?.tier === 'S') ? 1 : 0,
        target: 1,
      };
    default:
      return null;
  }
}

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export default function LogrosScreen() {
  const { completedMilestones, day, money, parcels, animals, machines, savings, harvestedCropIds } =
    useGameStore();

  const done = new Set(completedMilestones);
  const totalDone = completedMilestones.length;
  const total = MILESTONES.length;
  const overallPct = (totalDone / total) * 100;

  const progressState = { day, money, parcels, animals, machines, savings, harvestedCropIds };

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Achievements</Text>

      {/* Overall progress */}
      <View style={styles.overallCard}>
        <View style={styles.overallRow}>
          <Text style={styles.overallCount}>
            {totalDone}
            <Text style={styles.overallTotal}>/{total}</Text>
          </Text>
          <Text style={styles.overallLabel}>Achievements Unlocked</Text>
        </View>
        <View style={styles.overallBarBg}>
          <View style={[styles.overallBar, { width: `${overallPct}%` as any }]} />
        </View>
        <Text style={styles.overallPct}>{Math.round(overallPct)}% complete</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {CATEGORY_DEFS.map(cat => {
          const catMilestones = MILESTONES.filter(m => cat.ids.includes(m.id));
          const catDone = catMilestones.filter(m => done.has(m.id)).length;
          return (
            <View key={cat.id} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                <Text style={styles.categoryCount}>{catDone}/{catMilestones.length}</Text>
              </View>

              {catMilestones.map(m => {
                const isDone = done.has(m.id);
                const progress = !isDone ? getProgress(m.id, progressState) : null;
                const pct = progress
                  ? Math.min(1, progress.current / progress.target)
                  : isDone ? 1 : 0;

                return (
                  <View key={m.id} style={[styles.milestoneCard, isDone && styles.milestoneCardDone]}>
                    <View style={[styles.iconBox, isDone && styles.iconBoxDone]}>
                      <Text style={styles.milestoneIcon}>{isDone ? m.icon : '🔒'}</Text>
                    </View>
                    <View style={styles.milestoneInfo}>
                      <Text style={[styles.milestoneName, isDone && styles.milestoneNameDone]}>
                        {m.title}
                      </Text>
                      <Text style={styles.milestoneDesc}>{m.description}</Text>
                      {!isDone && progress && (
                        <View style={styles.progressWrap}>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBar, { width: `${pct * 100}%` as any }]} />
                          </View>
                          <Text style={styles.progressLabel}>
                            {fmt(Math.min(progress.current, progress.target))}/{fmt(progress.target)}
                          </Text>
                        </View>
                      )}
                    </View>
                    {isDone && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                );
              })}
            </View>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.bg },
  screenTitle: {
    color: C.text,
    fontSize: F.size.xl,
    fontWeight: F.weight.bold,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
  scroll:        { flex: 1 },

  overallCard: {
    margin: S.md,
    backgroundColor: C.bgCard,
    borderRadius: 14,
    padding: S.lg,
    borderWidth: 1,
    borderColor: '#c8860a44',
  },
  overallRow:    { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  overallCount:  { color: '#c8860a', fontSize: 36, fontWeight: 'bold', marginRight: 10 },
  overallTotal:  { color: C.textMuted, fontSize: 20 },
  overallLabel:  { color: C.text, fontSize: F.size.lg, fontWeight: 'bold' },
  overallBarBg:  { height: 8, backgroundColor: '#0a1628', borderRadius: R.xs, overflow: 'hidden', marginBottom: 6 },
  overallBar:    { height: 8, backgroundColor: '#c8860a', borderRadius: R.xs },
  overallPct:    { color: C.textMuted, fontSize: 11, textAlign: 'right' },

  categoryBlock:  { paddingHorizontal: S.md, marginBottom: S.md },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: S.sm },
  categoryIcon:   { fontSize: F.size.xl, marginRight: 6 },
  categoryLabel:  { color: C.text, fontWeight: 'bold', fontSize: F.size.md, flex: 1 },
  categoryCount:  { color: C.textFaint, fontSize: F.size.sm },

  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgCard,
    borderRadius: 10,
    padding: S.md,
    marginBottom: 6,
    opacity: 0.55,
  },
  milestoneCardDone: { opacity: 1, borderWidth: 1, borderColor: '#c8860a33' },

  iconBox:     { width: 40, height: 40, borderRadius: R.md, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  iconBoxDone: { backgroundColor: '#3a2a00' },
  milestoneIcon: { fontSize: 20 },

  milestoneInfo:     { flex: 1 },
  milestoneName:     { color: C.textMuted, fontSize: F.size.md, fontWeight: 'bold', marginBottom: 2 },
  milestoneNameDone: { color: C.text },
  milestoneDesc:     { color: '#555', fontSize: 11 },

  progressWrap:    { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  progressBarBg:   { flex: 1, height: 4, backgroundColor: '#0a1628', borderRadius: 2, overflow: 'hidden' },
  progressBar:     { height: 4, backgroundColor: '#c8860a', borderRadius: 2 },
  progressLabel:   { color: C.textFaint, fontSize: F.size.xs, minWidth: 50, textAlign: 'right' },

  checkmark: { color: '#c8860a', fontWeight: 'bold', fontSize: F.size.xxl, marginLeft: S.xs },
});
