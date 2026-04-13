// components/SubTabBar.tsx
import React, { useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { getSeason } from '../engine/climate';
import { SEASON_THEME, C, S, F, R, MIN_TOUCH } from '../constants/theme';

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onSelect: (id: string) => void;
}

export default function SubTabBar({ tabs, active, onSelect }: Props) {
  const { day } = useGameStore();
  const season = getSeason(day);
  const theme = SEASON_THEME[season];
  const scrollRef = useRef<ScrollView>(null);

  // Scroll active tab into view
  useEffect(() => {
    const idx = tabs.findIndex(t => t.id === active);
    if (idx > 1 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: idx * 90, animated: true });
    }
  }, [active, tabs]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map(t => {
          const isActive = t.id === active;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => onSelect(t.id)}
              style={[
                styles.pill,
                isActive
                  ? { backgroundColor: theme.accent }
                  : { backgroundColor: 'transparent', borderColor: C.textFaint, borderWidth: 1.5 },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: S.sm,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: S.md,
    gap: S.sm,
  },
  pill: {
    borderRadius: R.pill,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: F.size.sm,
    fontWeight: F.weight.bold,
  },
  labelActive:   { color: '#fff' },
  labelInactive: { color: C.textMuted },
});
