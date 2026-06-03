import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, F, R, S } from '../../constants/theme';

const ITEMS: { key: 'tilled' | 'planted' | 'advanced5' | 'harvested'; label: string }[] = [
  { key: 'tilled',    label: 'Till your first field' },
  { key: 'planted',   label: 'Plant a crop' },
  { key: 'advanced5', label: 'Advance 5 days' },
  { key: 'harvested', label: 'Harvest your first crop' },
];

export default function DayOneChecklist() {
  const [collapsed, setCollapsed] = useState(false);
  const { dayOneChecklist, day } = useGameStore();

  const allDone = Object.values(dayOneChecklist).every(Boolean);
  if (day > 15 || allDone) return null;

  const doneCount = Object.values(dayOneChecklist).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setCollapsed(c => !c)} activeOpacity={0.8}>
        <Text style={styles.headerText}>📋 Getting Started</Text>
        <View style={styles.progress}>
          <Text style={styles.progressText}>{doneCount}/{ITEMS.length}</Text>
        </View>
        <Text style={styles.chevron}>{collapsed ? '▸' : '▾'}</Text>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.list}>
          {ITEMS.map(item => {
            const done = dayOneChecklist[item.key];
            return (
              <View key={item.key} style={styles.item}>
                <Text style={[styles.check, done && styles.checkDone]}>
                  {done ? '✓' : '○'}
                </Text>
                <Text style={[styles.itemLabel, done && styles.itemDone]}>
                  {item.label}
                </Text>
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
});
