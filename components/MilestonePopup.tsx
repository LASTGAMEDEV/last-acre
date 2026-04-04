import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import * as Haptics from 'expo-haptics';

export default function MilestonePopup() {
  const { milestonePopup, clearMilestonePopup, hapticEnabled } = useGameStore();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!milestonePopup) return;

    if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(2800),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => clearMilestonePopup());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestonePopup?.title]);

  if (!milestonePopup) return null;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY }], opacity }]}>
      <TouchableOpacity style={styles.card} onPress={clearMilestonePopup} activeOpacity={0.9}>
        <Text style={styles.icon}>{milestonePopup.icon}</Text>
        <Text style={styles.title}>{milestonePopup.title}</Text>
        {milestonePopup.reward > 0 && (
          <Text style={styles.reward}>+${milestonePopup.reward.toLocaleString()}</Text>
        )}
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
  card: {
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
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 12,
  },
  icon:   { fontSize: 22 },
  title:  { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14, flex: 1 },
  reward: { color: '#4caf50', fontWeight: 'bold', fontSize: 14 },
});
