import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { gameDayToCalendarYear } from '../../engine/calendarUtils';
import { farmerAge } from '../../engine/dynasty';
import { useGameStore } from '../../store/useGameStore';
import { C, F, R } from '../../constants/theme';

const CAUSE_LABEL: Record<string, string> = {
  voluntary_handoff: 'Voluntary Retirement',
  health_decline: 'Health Decline',
  death: 'Passed Away',
};

const CAUSE_COLOR: Record<string, string> = {
  voluntary_handoff: '#64b5f6',
  health_decline: '#ff9800',
  death: '#aaaaaa',
};

export default function ArbolSection() {
  const { dynasty, day } = useGameStore();
  const calYear = gameDayToCalendarYear(day);
  const generation = dynasty.ancestors.length + 1;
  const farmer = dynasty.currentFarmer;
  const currentAge = farmerAge(farmer, calYear);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>
        Family Tree · {generation} Generation{generation > 1 ? 's' : ''}
      </Text>
      <Text style={styles.legacyTotal}>Total Dynasty Legacy: {dynasty.legacyScore.toLocaleString()} pts</Text>

      <View style={[styles.card, styles.activeCard]}>
        <View style={styles.genBadge}>
          <Text style={styles.genText}>Gen {generation}</Text>
        </View>
        <Text style={styles.name}>{farmer.firstName} {farmer.familyName}</Text>
        <Text style={styles.years}>{farmer.birthYear + 30} - Present · Age {currentAge}</Text>
        <View style={styles.row}>
          <Text style={styles.tag}>Active</Text>
          <Text style={styles.tagValue}>Health: {Math.round(farmer.health)}%</Text>
        </View>
      </View>

      {[...dynasty.ancestors].reverse().map((ancestor, index) => {
        const gen = dynasty.ancestors.length - index;
        const yearsServed = Math.max(0, ancestor.endYear - ancestor.startYear);
        const causeLabel = CAUSE_LABEL[ancestor.cause] ?? ancestor.cause;
        const causeColor = CAUSE_COLOR[ancestor.cause] ?? C.textMuted;

        return (
          <View key={ancestor.farmer.id} style={styles.card}>
            <View style={styles.genBadge}>
              <Text style={styles.genText}>Gen {gen}</Text>
            </View>
            <Text style={styles.name}>{ancestor.farmer.firstName} {ancestor.farmer.familyName}</Text>
            <Text style={styles.years}>
              {ancestor.startYear} - {ancestor.endYear} · {yearsServed} year{yearsServed !== 1 ? 's' : ''}
            </Text>
            <View style={styles.row}>
              <Text style={[styles.tag, { color: causeColor }]}>{causeLabel}</Text>
              <Text style={styles.tagValue}>+{ancestor.legacyContribution} legacy pts</Text>
            </View>
            {ancestor.farmer.unlockedKnowledge.length > 0 && (
              <Text style={styles.knowledge}>
                {ancestor.farmer.unlockedKnowledge.length} knowledge {ancestor.farmer.unlockedKnowledge.length === 1 ? 'entry' : 'entries'} earned
              </Text>
            )}
          </View>
        );
      })}

      {dynasty.ancestors.length === 0 && (
        <Text style={styles.emptyNote}>This is the first generation. Their story is still being written.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 12 },
  header: { color: C.text, fontSize: F.size.lg, fontWeight: 'bold' },
  legacyTotal: { color: '#c8860a', fontSize: F.size.sm, marginTop: -4 },
  card: { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  activeCard: { borderColor: '#c8860a55', borderWidth: 1 },
  genBadge: { alignSelf: 'flex-start', backgroundColor: C.bgCard, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  genText: { color: C.greenSoft, fontSize: 10, fontWeight: 'bold' },
  name: { color: C.text, fontSize: F.size.lg, fontWeight: 'bold' },
  years: { color: C.textMuted, fontSize: F.size.sm, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' },
  tag: { color: '#64b5f6', fontSize: F.size.sm },
  tagValue: { color: '#c8860a', fontSize: F.size.sm, fontWeight: 'bold' },
  knowledge: { color: C.greenSoft, fontSize: 11, marginTop: 6 },
  emptyNote: { color: C.textFaint, fontSize: F.size.sm, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
});
