// components/legado/CronicaSection.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { HISTORICAL_EVENTS } from '../../data/historicalEvents';
import { C, F, R } from '../../constants/theme';

type CronicaEntry = {
  year: number;
  icon: string;
  headline: string;
  kind: 'world' | 'personal';
};

const CATEGORY_ICONS: Record<string, string> = {
  economic: '📈', technology: '⚙️', regulation: '📋',
  disease: '🦠', weather: '🌩️', genetics: '🧬', product: '🛒',
};

export default function CronicaSection() {
  const { timeline, family } = useGameStore(s => ({
    timeline: s.timeline,
    family:   s.family,
  }));

  // Build entries from fired historical events
  const worldEntries: CronicaEntry[] = timeline.firedEventIds
    .map(id => HISTORICAL_EVENTS.find(e => e.id === id))
    .filter((e): e is NonNullable<typeof e> => e !== undefined)
    .map(e => ({
      year: parseInt(e.date.slice(0, 4), 10),
      icon: CATEGORY_ICONS[e.category] ?? '📰',
      headline: e.headline,
      kind: 'world' as const,
    }));

  // Build entries from life events that have been resolved
  const personalEntries: CronicaEntry[] = [];

  if (family.familyStartYear) {
    personalEntries.push({
      year: family.familyStartYear,
      icon: '💍',
      headline: `${family.spouse?.firstName ?? 'Your partner'} joined the farm family`,
      kind: 'personal',
    });
  }

  family.children.forEach(child => {
    personalEntries.push({
      year: child.birthYear,
      icon: '👶',
      headline: `${child.firstName} was born`,
      kind: 'personal',
    });
  });

  // Combine and sort
  const allEntries = [...worldEntries, ...personalEntries].sort((a, b) => a.year - b.year);

  if (allEntries.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Text style={{ color: C.textFaint, fontSize: F.size.sm, fontStyle: 'italic', textAlign: 'center' }}>
          Your chronicle is still being written. Keep farming.
        </Text>
      </View>
    );
  }

  // Group by decade
  const decades: Record<number, CronicaEntry[]> = {};
  for (const entry of allEntries) {
    const decade = Math.floor(entry.year / 10) * 10;
    if (!decades[decade]) decades[decade] = [];
    decades[decade].push(entry);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 16 }} showsVerticalScrollIndicator={false}>
      {Object.entries(decades)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([decade, entries]) => (
          <View key={decade}>
            <Text style={cr.decadeLabel}>THE {decade}s</Text>
            <View style={cr.decadeGroup}>
              {entries.map((entry, i) => (
                <View key={`${entry.year}-${entry.kind}-${i}`} style={cr.entry}>
                  <View style={cr.entryLeft}>
                    <Text style={cr.entryYear}>{entry.year}</Text>
                    <View style={[cr.entryDot, { backgroundColor: entry.kind === 'world' ? '#2d4060' : '#2a4a2a' }]} />
                    {i < entries.length - 1 && <View style={cr.entryLine} />}
                  </View>
                  <View style={cr.entryRight}>
                    <Text style={cr.entryIcon}>{entry.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={cr.entryHeadline}>{entry.headline}</Text>
                      <Text style={cr.entryKind}>{entry.kind === 'world' ? 'World event' : 'Personal'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
    </ScrollView>
  );
}

const cr = StyleSheet.create({
  decadeLabel:   { color: '#2d4060', fontSize: 9, fontWeight: 'bold', letterSpacing: 3, marginBottom: 8 },
  decadeGroup:   { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 12 },
  entry:         { flexDirection: 'row', gap: 10, marginBottom: 12 },
  entryLeft:     { alignItems: 'center', width: 36 },
  entryYear:     { color: C.textFaint, fontSize: 8, textAlign: 'center', marginBottom: 4 },
  entryDot:      { width: 8, height: 8, borderRadius: 4 },
  entryLine:     { width: 1, flex: 1, backgroundColor: '#1e2e1e', marginTop: 2 },
  entryRight:    { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  entryIcon:     { fontSize: 16, marginTop: -2 },
  entryHeadline: { color: C.text, fontSize: F.size.sm, lineHeight: 18 },
  entryKind:     { color: C.textFaint, fontSize: 9, marginTop: 2 },
});
