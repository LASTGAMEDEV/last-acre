import React, { useEffect, useRef } from 'react';
import {
  Animated, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native';
import { useGameStore, DaySummaryEvent } from '../store/useGameStore';

const SEVERITY_COLORS: Record<DaySummaryEvent['severity'], string> = {
  info:    '#1e3a5f',
  good:    '#1b3a1b',
  warning: '#3a2e10',
  danger:  '#3a1515',
};
const SEVERITY_BORDER: Record<DaySummaryEvent['severity'], string> = {
  info:    '#2a5080',
  good:    '#2e7d32',
  warning: '#c8860a',
  danger:  '#c62828',
};
const SEVERITY_TEXT: Record<DaySummaryEvent['severity'], string> = {
  info:    '#90caf9',
  good:    '#a5d6a7',
  warning: '#ffe082',
  danger:  '#ef9a9a',
};

export default function DaySummaryModal() {
  const { day, daySummary, clearDaySummary } = useGameStore();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(500)).current;

  const visible = daySummary !== null;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, backdropOpacity, cardY]);

  if (!visible) return null;

  function dismiss() {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(cardY, { toValue: 500, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      cardY.setValue(500);
      clearDaySummary();
    });
  }

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
      <TouchableOpacity style={styles.backdropTap} activeOpacity={1} onPress={dismiss} />

      <Animated.View style={[styles.card, { transform: [{ translateY: cardY }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dayLabel}>DAY {day}</Text>
          <Text style={styles.headerTitle}>Day Summary</Text>
        </View>

        {/* Events */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {(daySummary ?? []).map(event => (
            <View
              key={event.id}
              style={[
                styles.eventRow,
                { backgroundColor: SEVERITY_COLORS[event.severity], borderLeftColor: SEVERITY_BORDER[event.severity] },
              ]}
            >
              <Text style={styles.eventIcon}>{event.icon}</Text>
              <View style={styles.eventText}>
                <Text style={[styles.eventTitle, { color: SEVERITY_TEXT[event.severity] }]}>
                  {event.title}
                </Text>
                {event.detail ? (
                  <Text style={styles.eventDetail}>{event.detail}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Dismiss */}
        <TouchableOpacity style={styles.btn} onPress={dismiss}>
          <Text style={styles.btnText}>Start the day →</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  backdropTap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  card: {
    backgroundColor: '#0f1f3d',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.72,
    paddingBottom: 20,
    borderTopWidth: 2,
    borderTopColor: '#c8860a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  dayLabel: {
    color: '#c8860a',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    color: '#e8d5a3',
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 12,
    gap: 10,
  },
  eventIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
  eventText: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  eventDetail: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  btn: {
    backgroundColor: '#c8860a',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
