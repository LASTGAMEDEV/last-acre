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

const ERA_THEMES: Record<number, { label: string; flavor: string; color: string; bg: string }> = {
  1970: { label: 'THE SEVENTIES',  flavor: 'Green Revolution · Oil shocks · EPA era',       color: '#8d6e63', bg: '#1a1008' },
  1980: { label: 'THE EIGHTIES',   flavor: 'Farm crisis · Biotech dawn · Globalization',     color: '#546e7a', bg: '#080e14' },
  1990: { label: 'THE NINETIES',   flavor: 'NAFTA · GMO introduction · Consolidation',       color: '#5d6b3a', bg: '#0e120a' },
  2000: { label: 'THE 2000s',      flavor: 'Organic boom · Biofuel surge · Commodity cycle', color: '#4caf50', bg: '#0a160a' },
  2010: { label: 'THE 2010s',      flavor: 'Digital farming · Local food · Climate pressure',color: '#2196f3', bg: '#080e18' },
  2020: { label: 'THE 2020s',      flavor: 'Pandemic disruption · Net-zero · AgTech wave',   color: '#9c27b0', bg: '#12081a' },
  2030: { label: 'THE 2030s',      flavor: 'Precision ag · Lab meat · Carbon markets',       color: '#c8860a', bg: '#180e04' },
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
        .map(([decade, entries]) => {
          const era = ERA_THEMES[Number(decade)];
          const eraColor = era?.color ?? '#2d4060';
          const eraBg = era?.bg ?? '#080c10';
          return (
          <View key={decade}>
            <View style={[cr.decadeHeader, { backgroundColor: eraBg, borderColor: eraColor + '44' }]}>
              <Text style={[cr.decadeLabel, { color: eraColor }]}>{era?.label ?? `THE ${decade}s`}</Text>
              {era?.flavor && <Text style={[cr.decadeFlavor, { color: eraColor + 'aa' }]}>{era.flavor}</Text>}
              <Text style={[cr.decadeCount, { color: eraColor + '88' }]}>{entries.length} event{entries.length !== 1 ? 's' : ''}</Text>
            </View>
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
        );})}
    </ScrollView>
  );
}

const cr = StyleSheet.create({
  decadeHeader:  { borderRadius: R.md, borderWidth: 1, padding: 12, marginBottom: 8 },
  decadeLabel:   { fontSize: 13, fontWeight: 'bold', letterSpacing: 3 },
  decadeFlavor:  { fontSize: 10, marginTop: 2, letterSpacing: 0.5 },
  decadeCount:   { fontSize: 9, marginTop: 4, letterSpacing: 1 },
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
