import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import * as Haptics from 'expo-haptics';
import { playSound } from '../engine/sounds';

const N = 20;
const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#66BB6A', '#DDA0DD', '#FF9800', '#64B5F6', '#FFEAA7'];

type Particle = {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  color: string;
};

function makeParticles(): Particle[] {
  return Array.from({ length: N }, (_, i) => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    opacity: new Animated.Value(0),
    color: COLORS[i % COLORS.length],
  }));
}

export default function MilestonePopup() {
  const { milestonePopup, clearMilestonePopup, hapticEnabled } = useGameStore();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const particles = useRef<Particle[]>(makeParticles()).current;

  useEffect(() => {
    if (!milestonePopup) return;

    playSound('milestone');
    if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Burst confetti outward from the banner center
    particles.forEach((p, i) => {
      const angle = (i / N) * 2 * Math.PI;
      const dist = 55 + (i % 3) * 28;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 20;

      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);

      Animated.parallel([
        Animated.timing(p.x, { toValue: tx, duration: 600 + (i % 5) * 60, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(p.y, { toValue: ty - 10, duration: 350, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: ty + 40, duration: 500, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(p.opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.delay(650),
          Animated.timing(p.opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
      ]).start();
    });

    // Banner slide in + pop + hold + slide out
    Animated.sequence([
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 7 }),
        Animated.spring(scale,      { toValue: 1, useNativeDriver: true, tension: 90, friction: 7 }),
        Animated.timing(opacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(2600),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => clearMilestonePopup());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestonePopup?.title]);

  if (!milestonePopup) return null;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY }], opacity }]}>
      {/* Confetti burst */}
      <View style={styles.confettiOrigin} pointerEvents="none">
        {particles.map((p, i) => (
          <Animated.Text
            key={i}
            style={[styles.particle, {
              color: p.color,
              transform: [{ translateX: p.x }, { translateY: p.y }],
              opacity: p.opacity,
            }]}
          >
            {i % 3 === 0 ? '●' : i % 3 === 1 ? '■' : '★'}
          </Animated.Text>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.card]}
        onPress={clearMilestonePopup}
        activeOpacity={0.9}
      >
        <Animated.View style={[styles.cardInner, { transform: [{ scale }] }]}>
          <Text style={styles.icon}>{milestonePopup.icon}</Text>
          <Text style={styles.title}>{milestonePopup.title}</Text>
          {milestonePopup.reward > 0 && (
            <Text style={styles.reward}>+${milestonePopup.reward.toLocaleString()}</Text>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
    pointerEvents: 'box-none',
  },
  confettiOrigin: {
    position: 'absolute',
    top: 22,
    alignSelf: 'center',
    width: 0,
    height: 0,
    zIndex: 998,
  },
  particle: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 12,
    overflow: 'visible',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3a00',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#4caf50',
    gap: 10,
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 12,
  },
  icon:   { fontSize: 22 },
  title:  { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14, flex: 1 },
  reward: { color: '#4caf50', fontWeight: 'bold', fontSize: 14 },
});
