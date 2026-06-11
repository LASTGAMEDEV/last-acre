import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { C, R, S, F } from '../constants/theme';
import type { ChoiceOption } from '../data/choiceEvents';

const KIND_COLORS: Record<ChoiceOption['kind'], { bg: string; border: string; text: string }> = {
  good:    { bg: '#0a2a0a', border: '#2a5a2a', text: '#81c784' },
  neutral: { bg: '#0f1f3d', border: '#2a3a5a', text: '#90caf9' },
  risky:   { bg: '#2a1a0a', border: '#5a3a10', text: '#ffb74d' },
};

export default function ChoiceEventModal() {
  const { pendingChoiceEvent, resolveChoiceEvent } = useGameStore(s => ({
    pendingChoiceEvent: s.pendingChoiceEvent,
    resolveChoiceEvent: s.resolveChoiceEvent,
  }));

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(600)).current;

  const visible = pendingChoiceEvent !== null;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, backdropOpacity, cardY]);

  if (!visible || !pendingChoiceEvent) return null;

  const event = pendingChoiceEvent;

  function pick(optionIndex: number) {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(cardY, { toValue: 600, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      cardY.setValue(600);
      resolveChoiceEvent(optionIndex);
    });
  }

  return (
    <Animated.View style={[ce.backdrop, { opacity: backdropOpacity }]}>
      <Animated.View style={[ce.card, { transform: [{ translateY: cardY }] }]}>
        {/* Header */}
        <View style={ce.header}>
          <Text style={ce.eventIcon}>{event.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={ce.badgeText}>📬 EVENT</Text>
            <Text style={ce.title}>{event.title}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={ce.description}>{event.description}</Text>

        {/* Divider */}
        <View style={ce.divider} />

        <Text style={ce.chooseLabel}>YOUR DECISION</Text>

        {/* Options */}
        {event.options.map((opt, i) => {
          const colors = KIND_COLORS[opt.kind];
          return (
            <TouchableOpacity
              key={i}
              style={[ce.optionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => pick(i)}
              activeOpacity={0.75}
            >
              <Text style={[ce.optionLabel, { color: colors.text }]}>{opt.label}</Text>
              <Text style={ce.optionEffect}>{opt.effectDesc}</Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </Animated.View>
  );
}

const { height } = Dimensions.get('window');

const ce = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    zIndex: 998,
  },
  card: {
    backgroundColor: '#0c1929',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.72,
    paddingBottom: 32,
    borderTopWidth: 2,
    borderTopColor: '#1e4080',
    padding: S.lg,
    gap: S.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.md,
  },
  eventIcon: {
    fontSize: 36,
    lineHeight: 42,
  },
  badgeText: {
    color: '#2a5a8a',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    color: '#e8d5a3',
    fontSize: F.size.xl,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  description: {
    color: '#aac0d8',
    fontSize: F.size.md,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e3a5f',
  },
  chooseLabel: {
    color: '#2a5a8a',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  optionBtn: {
    borderRadius: R.md,
    borderWidth: 1,
    padding: S.md,
    gap: 4,
  },
  optionLabel: {
    fontSize: F.size.md,
    fontWeight: 'bold',
  },
  optionEffect: {
    color: '#888',
    fontSize: F.size.sm,
  },
});
