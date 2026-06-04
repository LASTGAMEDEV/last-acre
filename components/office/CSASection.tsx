import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CSACommitment } from '../../engine/csa';

export default function CSASection() {
  const {
    csaActive, csaSubscribers, csaCommitment, csaSeasonStart, csaWeeklyLog,
    toggleCSA, setCSACommitment,
  } = useGameStore();

  const subscribers = csaSubscribers ?? [];
  const weeklyLog = csaWeeklyLog ?? [];
  const latestWeek = weeklyLog[weeklyLog.length - 1];
  const totalSatisfaction = subscribers.length > 0
    ? subscribers.reduce((sum, s) => sum + (s.satisfaction ?? 100), 0) / subscribers.length
    : 0;

  const totalBoxes = (csaCommitment?.smallBoxes ?? 0) + (csaCommitment?.mediumBoxes ?? 0) + (csaCommitment?.largeBoxes ?? 0);

  const presets: { label: string; commitment: CSACommitment }[] = [
    { label: 'Small', commitment: { smallBoxes: 5, mediumBoxes: 0, largeBoxes: 0, priceModifier: 1.0 } },
    { label: 'Medium', commitment: { smallBoxes: 3, mediumBoxes: 5, largeBoxes: 0, priceModifier: 1.0 } },
    { label: 'Large', commitment: { smallBoxes: 2, mediumBoxes: 3, largeBoxes: 5, priceModifier: 1.0 } },
    { label: 'Mega', commitment: { smallBoxes: 5, mediumBoxes: 5, largeBoxes: 5, priceModifier: 0.95 } },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: S.md, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={csa.header}>🥬 Community Supported Agriculture</Text>

      {/* Toggle */}
      <View style={csa.card}>
        <Text style={csa.cardTitle}>Program Status</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity
            style={[csa.toggleBtn, csaActive && csa.seasonActive]}
            onPress={() => { if (!csaActive) toggleCSA(); }}
          >
            <Text style={csa.toggleText}>{csaActive ? '🟢 Active' : '⚪ Inactive'}</Text>
          </TouchableOpacity>
          {csaActive && (
            <TouchableOpacity
              style={[csa.toggleBtn, { backgroundColor: '#c62828' }]}
              onPress={() => toggleCSA()}
            >
              <Text style={csa.toggleText}>⛔ Stop</Text>
            </TouchableOpacity>
          )}
        </View>
        {csaActive && csaSeasonStart && (
          <Text style={csa.muted}>Season started Day {csaSeasonStart}</Text>
        )}
      </View>

      {/* Commitment presets */}
      {csaActive && (
        <View style={csa.card}>
          <Text style={csa.cardTitle}>Season Commitment</Text>
          <Text style={csa.row}>Current: {totalBoxes} boxes/week</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            {presets.map(p => (
              <TouchableOpacity
                key={p.label}
                style={[csa.chip,
                  csaCommitment?.smallBoxes === p.commitment.smallBoxes &&
                  csaCommitment?.mediumBoxes === p.commitment.mediumBoxes &&
                  csaCommitment?.largeBoxes === p.commitment.largeBoxes && csa.chipActive]}
                onPress={() => setCSACommitment(p.commitment)}
              >
                <Text style={[csa.chipText,
                  csaCommitment?.smallBoxes === p.commitment.smallBoxes &&
                  csaCommitment?.mediumBoxes === p.commitment.mediumBoxes &&
                  csaCommitment?.largeBoxes === p.commitment.largeBoxes && { color: '#fff' }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Subscribers */}
      <View style={csa.card}>
        <Text style={csa.cardTitle}>Subscribers ({subscribers.length})</Text>
        <Text style={csa.row}>Avg satisfaction: {totalSatisfaction.toFixed(0)}%</Text>
        {subscribers.length === 0 && <Text style={csa.muted}>No subscribers yet</Text>}
        {subscribers.map((s, i) => (
          <View key={i} style={csa.subRow}>
            <Text style={csa.row}>👤 {s.name} · {s.boxSize}</Text>
            <View style={csa.barBg}>
              <View style={[csa.barFill, { width: `${Math.max(0, Math.min(100, s.satisfaction ?? 0))}%`, backgroundColor: satisfactionColor(s.satisfaction ?? 0) }]} />
            </View>
          </View>
        ))}
      </View>

      {/* Weekly log */}
      {latestWeek && (
        <View style={csa.card}>
          <Text style={csa.cardTitle}>Last Delivery (Week {latestWeek.weekNumber})</Text>
          <Text style={csa.row}>
            Fill rate: {Math.round((latestWeek.fillRate ?? 0) * 100)}%
          </Text>
          <Text style={csa.row}>
            Variety met: {latestWeek.varietyMet ? '✅ Yes' : '❌ No'}
          </Text>
          {!latestWeek.varietyMet && (
            <Text style={csa.warn}>
              ⚠️ Not enough crop variety — subscribers expect ≥3 categories
            </Text>
          )}
          {latestWeek.bonusItemAdded && (
            <Text style={csa.row}>🎁 Bonus item included</Text>
          )}
          <Text style={csa.row}>
            Satisfaction change: {latestWeek.avgSatisfactionChange >= 0 ? '+' : ''}{latestWeek.avgSatisfactionChange.toFixed(1)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function satisfactionColor(val: number): string {
  if (val >= 75) return C.green;
  if (val >= 50) return '#ffa726';
  return '#ef5350';
}

const csa = StyleSheet.create({
  header: { fontSize: F.size.xl, fontWeight: 'bold', color: C.text, marginBottom: S.sm },
  card: { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 6 },
  cardTitle: { fontSize: F.size.md, fontWeight: '600', color: C.text },
  row: { fontSize: F.size.sm, color: C.text },
  muted: { fontSize: F.size.sm, color: C.textMuted },
  warn: { fontSize: F.size.sm, color: '#ef5350' },
  badge: { fontSize: F.size.sm, fontWeight: '600' },
  toggleBtn: { backgroundColor: '#333', borderRadius: R.sm, padding: S.sm, flex: 1, alignItems: 'center' },
  seasonActive: { backgroundColor: C.greenDark },
  toggleText: { color: '#fff', fontWeight: '600', fontSize: F.size.sm },
  chip: { backgroundColor: '#333', borderRadius: R.sm, padding: S.sm, minWidth: 50, alignItems: 'center' },
  chipActive: { backgroundColor: C.greenDark },
  chipText: { color: C.text, fontSize: F.size.sm },
  subRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, gap: 4 },
  barBg: { height: 6, backgroundColor: '#333', borderRadius: 3, marginTop: 4 },
  barFill: { height: '100%', borderRadius: 3 },
});
