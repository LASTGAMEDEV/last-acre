// components/HistoricalToast.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { HistoricalEvent } from '../data/historicalEvents';
import { gameDayToDisplayDate } from '../engine/calendarUtils';

type Props = {
  event: HistoricalEvent | null;
  currentDay: number;
  onDismiss: () => void;
};

const CATEGORY_ICONS: Record<string, string> = {
  economic: '📈',
  technology: '⚙️',
  regulation: '📋',
  disease: '🦠',
  weather: '🌩️',
  genetics: '🧬',
  product: '🛒',
};

export default function HistoricalToast({ event, currentDay, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (!event) return;

    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(5400),
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  if (!event) return null;

  const icon = CATEGORY_ICONS[event.category] ?? '📰';
  const effectSummary = event.effects[0]
    ? (() => {
        const e = event.effects[0];
        if (e.multiplier !== undefined) {
          const pct = Math.round((e.multiplier - 1) * 100);
          const sign = pct >= 0 ? '+' : '';
          return `${e.target.replace(/_/g, ' ')}: ${sign}${pct}%`;
        }
        return '';
      })()
    : '';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.textBlock}>
        <Text style={styles.date}>{gameDayToDisplayDate(currentDay).toUpperCase()}</Text>
        <Text style={styles.headline} numberOfLines={1}>{event.headline}</Text>
        {effectSummary ? <Text style={styles.effect}>⚠ {effectSummary}</Text> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a2a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#4a7c59',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 16,
    zIndex: 999,
    gap: 10,
  },
  icon: { fontSize: 22 },
  textBlock: { flex: 1 },
  date: { fontSize: 9, color: '#7cb87e', letterSpacing: 1 },
  headline: { fontSize: 13, color: '#fff', fontWeight: 'bold' },
  effect: { fontSize: 10, color: '#f39c12', marginTop: 2 },
});
