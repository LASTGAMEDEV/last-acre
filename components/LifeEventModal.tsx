// components/LifeEventModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { LIFE_EVENT_TEMPLATES } from '../data/lifeEvents';
import { gameDayToCalendarYear } from '../engine/calendarUtils';
import { C, F, S, R } from '../constants/theme';

const CATEGORY_ICONS: Record<string, string> = {
  meet_someone:             '💚',
  marriage_proposal:        '💍',
  pregnancy:                '👶',
  child_born:               '🍼',
  child_school_event:       '📚',
  farm_interest_drop:       '📉',
  farm_interest_reveal:     '🌾',
  illness_farmer:           '🩺',
  illness_family:           '🩺',
  county_fair:              '🏡',
  neighbor_interaction:     '🤝',
  sibling_friction:         '⚡',
  sibling_buyout:           '⚖️',
  sibling_coowner_decision: '🏛️',
};

export default function LifeEventModal() {
  const { day, family, makeLifeEventChoice } = useGameStore(s => ({
    day:               s.day,
    family:            s.family,
    makeLifeEventChoice: s.makeLifeEventChoice,
  }));

  const pending = family.pendingLifeEvents;
  if (pending.length === 0) return null;

  const current = pending[0];
  const template = LIFE_EVENT_TEMPLATES.find(t => t.id === current.templateId);
  if (!template) return null;

  const calYear = gameDayToCalendarYear(day);
  const queueCount = pending.length - 1;

  // Resolve member name for narrative substitution
  const memberName =
    current.memberId
      ? family.children.find(c => c.id === current.memberId)?.firstName
        ?? family.spouse?.firstName
        ?? 'your family member'
      : '';

  const narrative = template.narrativeTemplate
    .replace('{memberName}', memberName)
    .replace('{year}', String(calYear));

  const icon = CATEGORY_ICONS[current.templateId] ?? '📰';
  // Game has 360-day years, 30-day months. day starts at 1.
  const gameMonthIndex = Math.floor(((day - 1) % 360) / 30); // 0-11
  const seasonName = ['Winter','Winter','Spring','Spring','Spring','Summer','Summer','Summer','Autumn','Autumn','Autumn','Winter'][gameMonthIndex];
  const seasonDisplay = `${seasonName.toUpperCase()} ${calYear}`;

  return (
    <Modal visible transparent animationType="fade">
      <View style={lm.overlay}>
        <View style={lm.card}>

          {/* Header — portrait + year + title */}
          <View style={lm.header}>
            <View style={lm.portrait}>
              <Text style={lm.portraitIcon}>{icon}</Text>
            </View>
            <View style={lm.headerText}>
              <Text style={lm.yearTag}>{seasonDisplay}</Text>
              <Text style={lm.eventTitle}>{template.headline.replace('{memberName}', memberName)}</Text>
            </View>
          </View>

          <View style={lm.divider} />

          {/* Narrative */}
          <ScrollView style={{ maxHeight: 120 /* keep compact — scroll if narrative is long */ }} showsVerticalScrollIndicator={false}>
            <Text style={lm.narrative}>{narrative}</Text>
          </ScrollView>

          {/* Choices */}
          <View style={lm.choices}>
            {template.choices.map(choice => (
              <TouchableOpacity
                key={choice.id}
                style={lm.choice}
                onPress={() => makeLifeEventChoice(current.id, choice.id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={lm.choiceTitle}>{choice.label}</Text>
                  <Text style={lm.choiceDesc}>{choice.description}</Text>
                </View>
                {choice.reputationDelta && choice.reputationDelta > 0 && (
                  <Text style={lm.repBadge}>+{choice.reputationDelta} rep</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Queue indicator */}
          {queueCount > 0 && (
            <View style={lm.queueBadge}>
              <Text style={lm.queueText}>📋 {queueCount} more event{queueCount > 1 ? 's' : ''} waiting</Text>
            </View>
          )}

          {/* Footer */}
          <Text style={lm.footer}>Your choice shapes your story — no wrong answer</Text>

        </View>
      </View>
    </Modal>
  );
}

const lm = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center', padding: S.lg },
  card:         { backgroundColor: '#0d1117', borderRadius: R.xl, padding: 20, width: '100%', maxWidth: 480, borderWidth: 1, borderColor: '#1e3a1e' },
  header:       { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  portrait:     { width: 44, height: 44, backgroundColor: '#1a3a1a', borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  portraitIcon: { fontSize: 22 },
  headerText:   { flex: 1 },
  yearTag:      { color: '#c8860a', fontSize: 9, fontWeight: 'bold', letterSpacing: 2, marginBottom: 3 },
  eventTitle:   { color: C.text, fontSize: F.size.md, fontWeight: 'bold', lineHeight: 20 },
  divider:      { height: 1, backgroundColor: '#1e3a1e', marginBottom: 12 },
  narrative:    { color: C.textMuted, fontSize: F.size.sm, lineHeight: 20, marginBottom: 14 },
  choices:      { gap: 8, marginBottom: 12 },
  choice:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f1a0f', borderWidth: 1, borderColor: '#1e2e1e', borderRadius: R.md, padding: 12, gap: 8 },
  choiceTitle:  { color: '#c8e6c9', fontSize: F.size.sm, fontWeight: 'bold' },
  choiceDesc:   { color: '#3a5a3a', fontSize: 10, marginTop: 2 },
  repBadge:     { color: '#4a7c59', fontSize: 9, fontWeight: 'bold', borderWidth: 1, borderColor: '#2a5a2a', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  queueBadge:   { backgroundColor: '#0f1a0f', borderRadius: R.sm, padding: 8, alignItems: 'center', marginBottom: 8 },
  queueText:    { color: '#3a5a3a', fontSize: 10 },
  footer:       { color: '#1e3a1e', fontSize: 9, textAlign: 'center', fontStyle: 'italic' },
});
