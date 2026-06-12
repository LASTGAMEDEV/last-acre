import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { gameDayToCalendarYear } from '../../engine/calendarUtils';
import { farmerAge, KNOWLEDGE_CATALOGUE } from '../../engine/dynasty';
import type { AncestorRecord } from '../../engine/dynasty';
import { useGameStore } from '../../store/useGameStore';
import { C, F, R, S } from '../../constants/theme';

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

const SKILL_ICONS: Record<string, string> = {
  crops: '🌾', livestock: '🐄', machinery: '🚜', finance: '💰', technology: '💻',
};

function topSkill(skills: Record<string, number>): { key: string; value: number } {
  const entries = Object.entries(skills);
  const [key, value] = entries.reduce((best, cur) => cur[1] > best[1] ? cur : best);
  return { key, value };
}

function AncestorCard({ ancestor, gen, expanded, onToggle }: {
  ancestor: AncestorRecord;
  gen: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const yearsServed = Math.max(0, ancestor.endYear - ancestor.startYear);
  const causeLabel = CAUSE_LABEL[ancestor.cause] ?? ancestor.cause;
  const causeColor = CAUSE_COLOR[ancestor.cause] ?? C.textMuted;
  const best = topSkill(ancestor.farmer.skills);

  const knowledge = ancestor.farmer.unlockedKnowledge
    .map(id => KNOWLEDGE_CATALOGUE.find(k => k.id === id))
    .filter((k): k is NonNullable<typeof k> => k !== undefined);

  return (
    <View style={ar.card}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
        <View style={ar.cardHeader}>
          <View style={ar.genBadge}>
            <Text style={ar.genText}>Gen {gen}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: S.sm }}>
            <Text style={ar.name}>{ancestor.farmer.firstName} {ancestor.farmer.familyName}</Text>
            <Text style={ar.years}>
              {ancestor.startYear} – {ancestor.endYear} · {yearsServed} yr{yearsServed !== 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={ar.expandChevron}>{expanded ? '▲' : '▼'}</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={[ar.tag, { color: causeColor }]}>{causeLabel}</Text>
          <Text style={ar.legacyPts}>+{ancestor.legacyContribution.toLocaleString()} pts</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: S.sm, gap: S.sm }}>
          {/* Skills highlight */}
          <View style={ar.infoBlock}>
            <Text style={ar.infoLabel}>SKILLS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {Object.entries(ancestor.farmer.skills).map(([sk, val]) => (
                <View key={sk} style={[ar.skillChip, sk === best.key && ar.skillChipBest]}>
                  <Text style={ar.skillChipText}>{SKILL_ICONS[sk] ?? '•'} {val}</Text>
                </View>
              ))}
            </View>
            <Text style={[ar.infoNote, { marginTop: 4 }]}>
              Strongest: {SKILL_ICONS[best.key] ?? ''} {best.key} ({best.value})
            </Text>
          </View>

          {/* Knowledge unlocked */}
          {knowledge.length > 0 && (
            <View style={ar.infoBlock}>
              <Text style={ar.infoLabel}>KNOWLEDGE UNLOCKED ({knowledge.length})</Text>
              {knowledge.map(k => (
                <View key={k.id} style={ar.knowledgeRow}>
                  <Text style={ar.knowledgeName}>🔓 {k.name}</Text>
                  <Text style={ar.knowledgeDesc}>{k.description}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Memorable events */}
          {ancestor.memorableEvents.length > 0 && (
            <View style={ar.infoBlock}>
              <Text style={ar.infoLabel}>NOTABLE EVENTS</Text>
              {ancestor.memorableEvents.map((e, i) => (
                <Text key={i} style={ar.eventLine}>· {e}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function ArbolSection() {
  const { dynasty, day } = useGameStore();
  const calYear = gameDayToCalendarYear(day);
  const generation = dynasty.ancestors.length + 1;
  const farmer = dynasty.currentFarmer;
  const currentAge = farmerAge(farmer, calYear);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [currentExpanded, setCurrentExpanded] = useState(false);

  // Dynasty stats
  const totalYears = dynasty.ancestors.reduce((s, a) => s + Math.max(0, a.endYear - a.startYear), 0);
  const totalKnowledge = dynasty.knowledgeBank.length;
  const currentBest = topSkill(farmer.skills);

  return (
    <ScrollView contentContainerStyle={ar.content} showsVerticalScrollIndicator={false}>

      {/* Dynasty summary */}
      <View style={ar.summaryCard}>
        <Text style={ar.summaryTitle}>Family Tree</Text>
        <Text style={ar.summaryLegacy}>{dynasty.legacyScore.toLocaleString()} dynasty pts</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <View style={ar.statBox}>
            <Text style={ar.statLabel}>GENERATIONS</Text>
            <Text style={ar.statVal}>{generation}</Text>
          </View>
          <View style={ar.statBox}>
            <Text style={ar.statLabel}>YEARS FARMED</Text>
            <Text style={ar.statVal}>{totalYears + (calYear - (farmer.birthYear + 30))}</Text>
          </View>
          <View style={ar.statBox}>
            <Text style={ar.statLabel}>KNOWLEDGE</Text>
            <Text style={[ar.statVal, { color: C.green }]}>{totalKnowledge}</Text>
          </View>
        </View>
      </View>

      {/* Current farmer */}
      <View style={[ar.card, ar.cardActive]}>
        <TouchableOpacity onPress={() => setCurrentExpanded(e => !e)} activeOpacity={0.8}>
          <View style={ar.cardHeader}>
            <View style={[ar.genBadge, { backgroundColor: '#0a2a0a', borderColor: C.green + '44', borderWidth: 1 }]}>
              <Text style={[ar.genText, { color: C.green }]}>Gen {generation}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: S.sm }}>
              <Text style={ar.name}>{farmer.firstName} {farmer.familyName}</Text>
              <Text style={ar.years}>{farmer.birthYear + 30} – Present · Age {currentAge}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={[ar.tag, { color: C.green }]}>Active</Text>
              <Text style={ar.expandChevron}>{currentExpanded ? '▲' : '▼'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={ar.years}>Health: {Math.round(farmer.health)}%</Text>
            <Text style={ar.legacyPts}>+{Math.round(dynasty.legacyScore * 0.1)} pts this gen</Text>
          </View>
        </TouchableOpacity>

        {currentExpanded && (
          <View style={{ marginTop: S.sm, gap: S.sm }}>
            <View style={ar.infoBlock}>
              <Text style={ar.infoLabel}>SKILLS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {Object.entries(farmer.skills).map(([sk, val]) => (
                  <View key={sk} style={[ar.skillChip, sk === currentBest.key && ar.skillChipBest]}>
                    <Text style={ar.skillChipText}>{SKILL_ICONS[sk] ?? '•'} {val}</Text>
                  </View>
                ))}
              </View>
            </View>
            {dynasty.knowledgeBank.length > 0 && (
              <View style={ar.infoBlock}>
                <Text style={ar.infoLabel}>DYNASTY KNOWLEDGE BANK ({dynasty.knowledgeBank.length})</Text>
                {dynasty.knowledgeBank.map(k => (
                  <View key={k.id} style={ar.knowledgeRow}>
                    <Text style={ar.knowledgeName}>🔓 {k.name}</Text>
                    <Text style={ar.knowledgeDesc}>{k.description}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Ancestor cards — newest first */}
      {[...dynasty.ancestors].reverse().map((ancestor, idx) => {
        const gen = dynasty.ancestors.length - idx;
        return (
          <AncestorCard
            key={ancestor.farmer.id}
            ancestor={ancestor}
            gen={gen}
            expanded={expandedIdx === idx}
            onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
          />
        );
      })}

      {dynasty.ancestors.length === 0 && (
        <Text style={ar.emptyNote}>
          This is the first generation. Their story is still being written.
        </Text>
      )}
    </ScrollView>
  );
}

const ar = StyleSheet.create({
  content:      { padding: 14, gap: 12 },
  summaryCard:  { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14, borderColor: '#c8860a33', borderWidth: 1 },
  summaryTitle: { color: C.text, fontSize: F.size.lg, fontWeight: 'bold' },
  summaryLegacy:{ color: '#c8860a', fontSize: F.size.sm, marginTop: 2 },
  statBox:      { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, alignItems: 'center' },
  statLabel:    { color: C.textFaint, fontSize: 8, fontWeight: '600', letterSpacing: 0.5 },
  statVal:      { color: C.text, fontSize: F.size.md, fontWeight: 'bold', marginTop: 2 },

  card:         { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  cardActive:   { borderColor: '#c8860a55', borderWidth: 1 },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start' },
  genBadge:     { backgroundColor: C.bgDeep, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  genText:      { color: C.greenSoft, fontSize: 10, fontWeight: 'bold' },
  name:         { color: C.text, fontSize: F.size.lg, fontWeight: 'bold' },
  years:        { color: C.textMuted, fontSize: F.size.sm, marginTop: 2 },
  tag:          { color: '#64b5f6', fontSize: F.size.sm },
  legacyPts:    { color: '#c8860a', fontSize: F.size.sm, fontWeight: 'bold' },
  expandChevron:{ color: C.textFaint, fontSize: 11, marginTop: 2 },

  infoBlock:    { backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm },
  infoLabel:    { color: C.textFaint, fontSize: 8, fontWeight: '600', letterSpacing: 1 },
  infoNote:     { color: C.textFaint, fontSize: 10 },

  skillChip:    { backgroundColor: '#1a2a1a', borderRadius: R.xs, paddingHorizontal: 8, paddingVertical: 3 },
  skillChipBest:{ backgroundColor: '#1a3a1a', borderColor: C.greenSoft + '55', borderWidth: 1 },
  skillChipText:{ color: C.textMuted, fontSize: 11 },

  knowledgeRow: { marginTop: 6 },
  knowledgeName:{ color: C.greenSoft, fontWeight: 'bold', fontSize: F.size.sm },
  knowledgeDesc:{ color: C.textMuted, fontSize: 11, marginTop: 2 },

  eventLine:    { color: C.textMuted, fontSize: F.size.sm, marginTop: 4 },
  emptyNote:    { color: C.textFaint, fontSize: F.size.sm, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
});
