import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, F, R, S } from '../../constants/theme';

type ChecklistKey = 'tilled' | 'planted' | 'advanced5' | 'harvested' | 'soldFirstCrop';
const ITEMS: { key: ChecklistKey; label: string; hint: string }[] = [
  { key: 'tilled',       label: 'Till your first field',    hint: 'Farm → Fields → tap a plot → Till' },
  { key: 'planted',      label: 'Plant a crop',             hint: 'After tilling → Plant Crop → choose a seed' },
  { key: 'advanced5',    label: 'Advance 5 days',           hint: 'Tap ▶ on the dashboard to skip time' },
  { key: 'harvested',    label: 'Harvest your first crop',  hint: 'When the crop is ready, tap Harvest on the plot' },
  { key: 'soldFirstCrop',label: 'Sell something at market', hint: 'Market tab → select crop → Sell all' },
];

export default function DayOneChecklist() {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { dayOneChecklist, day, totalRevenue } = useGameStore();

  const checklistWithSale = {
    ...dayOneChecklist,
    soldFirstCrop: (totalRevenue ?? 0) > 0,
  };
  const allDone = Object.values(checklistWithSale).every(Boolean);
  if (dismissed || day > 20 || allDone) return null;

  const doneCount = Object.values(checklistWithSale).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setCollapsed(c => !c)} activeOpacity={0.8}>
        <Text style={styles.headerText}>📋 Getting Started</Text>
        <View style={styles.progress}>
          <Text style={styles.progressText}>{doneCount}/{ITEMS.length}</Text>
        </View>
        <Text style={styles.chevron}>{collapsed ? '▸' : '▾'}</Text>
        <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.dismiss}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.list}>
          {ITEMS.map(item => {
            const done = checklistWithSale[item.key as keyof typeof checklistWithSale] as boolean;
            return (
              <View key={item.key} style={styles.item}>
                <Text style={[styles.check, done && styles.checkDone]}>
                  {done ? '✓' : '○'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, done && styles.itemDone]}>{item.label}</Text>
                  {!done && <Text style={styles.itemHint}>{item.hint}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: S.md,
    marginBottom: S.sm,
    backgroundColor: C.bgCard,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.md,
    gap: S.sm,
  },
  headerText: {
    color: C.text,
    fontSize: F.size.sm,
    fontWeight: F.weight.bold,
    flex: 1,
  },
  progress: {
    backgroundColor: C.bgElevated,
    borderRadius: R.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  progressText: {
    color: C.amber,
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
  },
  chevron: {
    color: C.textMuted,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: S.md,
    paddingBottom: S.md,
    gap: S.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  check: {
    color: C.textMuted,
    fontSize: 14,
    width: 16,
    textAlign: 'center',
  },
  checkDone: {
    color: C.green,
  },
  itemLabel: {
    color: C.textDim,
    fontSize: F.size.sm,
  },
  itemDone: {
    color: C.textFaint,
    textDecorationLine: 'line-through',
  },
  itemHint: {
    color: '#555',
    fontSize: F.size.xs,
    marginTop: 1,
  },
  dismiss: {
    color: '#555',
    fontSize: 18,
    lineHeight: 20,
    paddingLeft: 4,
  },
});
