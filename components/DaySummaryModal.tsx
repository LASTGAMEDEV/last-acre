import React, { useEffect, useRef } from 'react';
import {
  Animated, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native';
import { C } from '../constants/theme';
import { useGameStore, DaySummaryEvent } from '../store/useGameStore';

const SEVERITY_COLORS: Record<DaySummaryEvent['severity'], string> = {
  info:    '#1e3a5f',
  good:    C.bgElevated,
  warning: '#3a2e10',
  danger:  '#3a1515',
};
const SEVERITY_BORDER: Record<DaySummaryEvent['severity'], string> = {
  info:    '#2a5080',
  good:    C.greenDark,
  warning: '#c8860a',
  danger:  '#c62828',
};
const SEVERITY_TEXT: Record<DaySummaryEvent['severity'], string> = {
  info:    '#90caf9',
  good:    C.greenSoft,
  warning: '#ffe082',
  danger:  '#ef9a9a',
};

type EventCategory = 'Urgent' | 'Money' | 'Fields' | 'Animals' | 'Market' | 'Weather' | 'Farm';

const CATEGORY_ICONS: Record<EventCategory, string> = {
  Urgent:  '🚨',
  Money:   '💰',
  Fields:  '🌾',
  Animals: '🐄',
  Market:  '📊',
  Weather: '☀️',
  Farm:    '🔧',
};

function inferCategory(event: DaySummaryEvent): EventCategory {
  if (event.severity === 'danger') return 'Urgent';
  const id = event.id;
  if (id.startsWith('loan_') || id.startsWith('default_') || id.startsWith('interest') ||
      id.startsWith('cap_') || id.startsWith('subsidy') || id.startsWith('aes_') ||
      id.startsWith('disposal_fee') || id.startsWith('auction_won') || id.startsWith('auction_sold'))
    return 'Money';
  if (id.startsWith('crops_ready') || id.startsWith('crop_') || id.startsWith('fire') ||
      id.startsWith('disease') || id.startsWith('field_') || id.startsWith('organic_') ||
      id.startsWith('hedgerow') || id.startsWith('pest_') || id.startsWith('season_change') ||
      id.startsWith('seasonal_event') || id.startsWith('event_end'))
    return 'Fields';
  if (id.startsWith('animal') || id.startsWith('hatch_') || id.startsWith('bee_') ||
      id.startsWith('swarm_') || id.startsWith('preg_') || id.startsWith('show_') ||
      id.startsWith('apiary_'))
    return 'Animals';
  if (id.startsWith('news') || id.startsWith('rival') || id.startsWith('contract_') ||
      id.startsWith('auction_new') || id.startsWith('auction_lost') || id.startsWith('auction_unsold') ||
      id.startsWith('animal_auction'))
    return 'Market';
  if (id.startsWith('weather') || id.startsWith('event_') || id.startsWith('fair'))
    return 'Weather';
  return 'Farm';
}

const CATEGORY_ORDER: EventCategory[] = ['Urgent', 'Money', 'Fields', 'Animals', 'Market', 'Weather', 'Farm'];

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

        {/* Events grouped by category */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {(() => {
            const events = daySummary ?? [];
            if (events.length === 0) {
              return <Text style={styles.emptyText}>Quiet day — nothing notable happened.</Text>;
            }
            const grouped: Partial<Record<EventCategory, DaySummaryEvent[]>> = {};
            for (const ev of events) {
              const cat = inferCategory(ev);
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat]!.push(ev);
            }
            return CATEGORY_ORDER.filter(cat => grouped[cat]?.length).map(cat => (
              <View key={cat} style={styles.categoryBlock}>
                <Text style={styles.categoryHeader}>{CATEGORY_ICONS[cat]} {cat}</Text>
                {grouped[cat]!.map(event => (
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
              </View>
            ));
          })()}
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
  categoryBlock: {
    gap: 6,
    marginBottom: 4,
  },
  categoryHeader: {
    color: '#c8860a',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    marginBottom: 2,
  },
  emptyText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
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
