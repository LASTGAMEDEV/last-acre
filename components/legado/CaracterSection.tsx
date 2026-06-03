import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { gameDayToCalendarYear } from '../../engine/calendarUtils';
import { FarmerSkills, farmerAge } from '../../engine/dynasty';
import { useGameStore } from '../../store/useGameStore';
import { C, F, R } from '../../constants/theme';

const SKILL_LABELS: { key: keyof FarmerSkills; label: string }[] = [
  { key: 'crops', label: 'Crops' },
  { key: 'livestock', label: 'Livestock' },
  { key: 'machinery', label: 'Machinery' },
  { key: 'finance', label: 'Finance' },
  { key: 'technology', label: 'Technology' },
];

export default function CaracterSection() {
  const { dynasty, day, farmName, triggerVoluntaryHandoff } = useGameStore();
  const calYear = gameDayToCalendarYear(day);
  const farmer = dynasty.currentFarmer;
  const age = farmerAge(farmer, calYear);
  const generation = dynasty.ancestors.length + 1;
  const healthPct = Math.max(0, Math.min(100, farmer.health));
  const healthColor = healthPct >= 60 ? C.green : healthPct >= 30 ? '#ff9800' : '#ef5350';

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.farmName}>{farmName}</Text>
        <Text style={styles.farmerName}>{farmer.firstName} {farmer.familyName}</Text>
        <Text style={styles.sub}>Generation {generation} · Born {farmer.birthYear} · Age {age}</Text>

        <View style={styles.block}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Health</Text>
            <Text style={[styles.label, { color: healthColor }]}>{Math.round(healthPct)}%</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${healthPct}%`, backgroundColor: healthColor }]} />
          </View>
        </View>

        <View style={[styles.labelRow, styles.legacyRow]}>
          <Text style={styles.label}>Dynasty Legacy Score</Text>
          <Text style={styles.legacyValue}>{dynasty.legacyScore.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Skills</Text>
        {SKILL_LABELS.map(({ key, label }) => {
          const value = farmer.skills[key];
          return (
            <View key={key} style={styles.skillRow}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.label}>{value}</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${value}%`, backgroundColor: '#64b5f6' }]} />
              </View>
            </View>
          );
        })}
        <Text style={styles.note}>Skills improve each year through farming activity.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Knowledge Bank</Text>
        {dynasty.knowledgeBank.length === 0 && (
          <Text style={styles.emptyNote}>No dynasty knowledge earned yet. Build the farm to unlock entries.</Text>
        )}
        {dynasty.knowledgeBank.map(entry => (
          <View key={entry.id} style={styles.knowledgeEntry}>
            <Text style={styles.knowledgeName}>{entry.name}</Text>
            <Text style={styles.knowledgeDesc}>{entry.description}</Text>
          </View>
        ))}
      </View>

      {dynasty.mentorFarmer && dynasty.mentorExpiresYear && (
        <View style={[styles.card, styles.mentorCard]}>
          <Text style={styles.mentorTitle}>
            Mentor: {dynasty.mentorFarmer.firstName} {dynasty.mentorFarmer.familyName}
          </Text>
          <Text style={styles.sub}>Passing knowledge until {dynasty.mentorExpiresYear}</Text>
        </View>
      )}

      <View style={[styles.card, styles.handoffCard]}>
        <Text style={[styles.sectionTitle, { color: '#ef5350' }]}>Pass the Farm</Text>
        <Text style={styles.emptyNote}>Ready to hand the reins to the next generation? This cannot be undone.</Text>
        <TouchableOpacity style={styles.handoffBtn} onPress={triggerVoluntaryHandoff}>
          <Text style={styles.handoffBtnText}>Begin Voluntary Handoff</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 14 },
  card: { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  farmName: { color: C.textFaint, fontSize: F.size.xs, marginBottom: 2 },
  farmerName: { color: C.text, fontSize: 22, fontWeight: 'bold' },
  sub: { color: C.textMuted, fontSize: F.size.sm, marginTop: 4 },
  block: { marginTop: 12 },
  sectionTitle: { color: C.text, fontSize: F.size.md, fontWeight: 'bold', marginBottom: 10 },
  label: { color: '#aaa', fontSize: F.size.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  legacyRow: { marginTop: 10 },
  legacyValue: { color: '#c8860a', fontWeight: 'bold', fontSize: F.size.md },
  barTrack: { height: 8, backgroundColor: '#1a1a1a', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  skillRow: { marginBottom: 8 },
  note: { color: C.textFaint, fontSize: 10, marginTop: 8, fontStyle: 'italic' },
  knowledgeEntry: { backgroundColor: C.bg, borderRadius: R.sm, padding: 10, marginBottom: 6 },
  knowledgeName: { color: C.greenSoft, fontWeight: 'bold', fontSize: F.size.sm },
  knowledgeDesc: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  emptyNote: { color: C.textFaint, fontSize: F.size.sm, fontStyle: 'italic', marginBottom: 10 },
  mentorCard: { borderColor: C.greenSoft + '44', borderWidth: 1 },
  mentorTitle: { color: C.greenSoft, fontWeight: 'bold', fontSize: F.size.md },
  handoffCard: { borderColor: '#ef535044', borderWidth: 1 },
  handoffBtn: { backgroundColor: '#3a0a0a', borderRadius: R.md, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  handoffBtnText: { color: '#ef5350', fontWeight: 'bold', fontSize: F.size.md },
});
