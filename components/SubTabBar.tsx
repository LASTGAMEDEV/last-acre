// components/SubTabBar.tsx
import React, { useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { C, S, F, R } from '../constants/theme';

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
  const scrollRef = useRef<ScrollView>(null);

  // Scroll active tab into view
  useEffect(() => {
    const idx = tabs.findIndex(t => t.id === active);
    if (idx > 1 && scrollRef.current) {
      // Approximation: assumes ~90px average pill width
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
                isActive ? styles.pillActive : styles.pillInactive,
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
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: S.md,
    gap: S.xs,
  },
  pill: {
    borderRadius: R.pill,
    paddingHorizontal: S.md,
    paddingVertical: 7,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontSize: F.size.sm,
  },
  labelActive:   { color: C.text, fontWeight: F.weight.bold },
  labelInactive: { color: C.textMuted, fontWeight: F.weight.normal },
});
