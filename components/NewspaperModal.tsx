// components/NewspaperModal.tsx
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import { HistoricalEvent } from '../data/historicalEvents';
import { gameDayToDisplayDate } from '../engine/calendarUtils';

type Props = {
  event: HistoricalEvent | null;
  currentDay: number;
  onDismiss: () => void;
};

export default function NewspaperModal({ event, currentDay, onDismiss }: Props) {
  if (!event) return null;

  const dateDisplay = gameDayToDisplayDate(currentDay);
  const effectLines = event.effects.map(e => {
    if (e.multiplier !== undefined) {
      const pct = Math.round((e.multiplier - 1) * 100);
      const sign = pct >= 0 ? '+' : '';
      return `${e.target.replace(/_/g, ' ')}: ${sign}${pct}%`;
    }
    if (e.absolute !== undefined) {
      const pct = Math.round(e.absolute * 100);
      return `${e.target.replace(/_/g, ' ')}: +${pct}%`;
    }
    return null;
  }).filter(Boolean);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.paper}>
          {/* Masthead */}
          <View style={styles.masthead}>
            <Text style={styles.mastheadTitle}>THE FARM GAZETTE</Text>
            <View style={styles.mastheadLine} />
            <Text style={styles.mastheadDate}>{dateDisplay}</Text>
          </View>

          {/* Headline */}
          <Text style={styles.headline}>{event.headline.toUpperCase()}</Text>
          <View style={styles.divider} />

          {/* Narrative */}
          <Text style={styles.body}>{event.narrative}</Text>

          {/* Effects box */}
          {effectLines.length > 0 && (
            <View style={styles.effectBox}>
              <Text style={styles.effectTitle}>FARM IMPACT</Text>
              {effectLines.map((line, i) => (
                <Text key={i} style={styles.effectLine}>⚠ {line}</Text>
              ))}
            </View>
          )}

          {event.unlocks && event.unlocks.length > 0 && (
            <View style={[styles.effectBox, { borderColor: '#27ae60', backgroundColor: '#e8f5e9' }]}>
              <Text style={[styles.effectTitle, { color: '#27ae60' }]}>NOW AVAILABLE</Text>
              {event.unlocks.map((u, i) => (
                <Text key={i} style={[styles.effectLine, { color: '#27ae60' }]}>✓ {u.id.replace(/_/g, ' ')}</Text>
              ))}
            </View>
          )}

          {/* Dismiss */}
          <TouchableOpacity style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Continue Farming →</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  paper: {
    backgroundColor: '#f5f0e8',
    borderRadius: 4,
    padding: 20,
    maxWidth: Math.min(Dimensions.get('window').width - 32, 480),
    width: '100%',
  },
  masthead: { alignItems: 'center', marginBottom: 10 },
  mastheadTitle: {
    fontFamily: 'serif',
    fontSize: 11,
    letterSpacing: 4,
    color: '#5d4037',
    fontWeight: 'bold',
  },
  mastheadLine: {
    height: 2,
    backgroundColor: '#5d4037',
    width: '100%',
    marginVertical: 4,
  },
  mastheadDate: {
    fontFamily: 'serif',
    fontSize: 10,
    color: '#795548',
  },
  headline: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a1a',
    lineHeight: 26,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#8d6e63',
    marginBottom: 12,
  },
  body: {
    fontFamily: 'serif',
    fontSize: 13,
    color: '#333',
    lineHeight: 21,
    marginBottom: 14,
  },
  effectBox: {
    borderWidth: 1,
    borderColor: '#e65100',
    backgroundColor: '#fff3e0',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  effectTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#e65100',
    marginBottom: 4,
  },
  effectLine: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#4a7c59',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'serif',
    fontSize: 14,
  },
});
