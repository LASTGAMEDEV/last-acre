import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { getSeason } from '../engine/climate';
import { SEASON_THEME, C } from '../constants/theme';

interface Props {
  title: string;
  subtitle?: string;
}

export default function ScreenHeader({ title, subtitle }: Props) {
  const { day } = useGameStore();
  const season = getSeason(day);
  const theme = SEASON_THEME[season];

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.badge, { backgroundColor: theme.badge }]}>
        <Text style={styles.badgeIcon}>{theme.icon}</Text>
        <Text style={[styles.badgeText, { color: theme.badgeText }]}>
          {season.charAt(0).toUpperCase() + season.slice(1)} · Day {day}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  left: { flex: 1 },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.gold,
  },
  subtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    marginLeft: 8,
  },
  badgeIcon: { fontSize: 12 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
});
