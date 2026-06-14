import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { gameDayToCalendarYear } from '../../engine/calendarUtils';
import { TECH_ERAS, getCurrentEra, getNextEra, getUnlockedEras, TechEra } from '../../data/techTimeline';
import { C, S, F, R } from '../../constants/theme';

const CATEGORY_ICON: Record<string, string> = {
  crops: '🌾',
  animals: '🐄',
  machinery: '⚙️',
  market: '📈',
  processing: '🏭',
  management: '📋',
};

export default function EraTimelineCard() {
  const { day } = useGameStore();
  const calYear = gameDayToCalendarYear(day);
  const currentEra = getCurrentEra(calYear);
  const nextEra = getNextEra(calYear);
  const unlockedEras = getUnlockedEras(calYear);

  const [expanded, setExpanded] = useState(false);
  const [selectedEra, setSelectedEra] = useState<TechEra>(currentEra);

  const yearsUntilNext = nextEra ? nextEra.startYear - calYear : null;

  return (
    <View style={[era.wrap, { borderColor: currentEra.color + '44' }]}>
      {/* Header */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded(v => !v)} style={era.header}>
        <Text style={era.headerIcon}>{currentEra.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[era.decade, { color: currentEra.color }]}>{currentEra.decade} — {currentEra.tagline}</Text>
          <Text style={era.yearLabel}>Year {calYear} · {unlockedEras.length}/{TECH_ERAS.length} eras unlocked</Text>
        </View>
        <Text style={era.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Era track */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={era.trackScroll} contentContainerStyle={era.track}>
        {TECH_ERAS.map((e, i) => {
          const unlocked = e.startYear <= calYear;
          const isCurrent = e.startYear === currentEra.startYear;
          return (
            <TouchableOpacity
              key={e.decade}
              activeOpacity={0.7}
              onPress={() => { setSelectedEra(e); setExpanded(true); }}
              style={era.trackItem}
            >
              <View style={[
                era.eraDot,
                { backgroundColor: unlocked ? e.color : '#1a1a2a', borderColor: unlocked ? e.color : '#333' },
                isCurrent && { shadowColor: e.color, shadowOpacity: 0.9, shadowRadius: 6, elevation: 5 },
              ]}>
                <Text style={era.eraDotIcon}>{e.icon}</Text>
              </View>
              {i < TECH_ERAS.length - 1 && (
                <View style={[era.connector, { backgroundColor: unlocked && TECH_ERAS[i + 1].startYear <= calYear ? e.color : '#222' }]} />
              )}
              <Text style={[era.eraLabel, { color: unlocked ? e.color : '#333' }]}>{e.decade}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Current era tech chips (collapsed view) */}
      {!expanded && (
        <View style={era.chipRow}>
          {currentEra.techs.map(t => (
            <View key={t.id} style={[era.chip, { borderColor: currentEra.color + '55' }]}>
              <Text style={era.chipIcon}>{CATEGORY_ICON[t.category] ?? '🔧'}</Text>
              <Text style={[era.chipText, { color: currentEra.color }]}>{t.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Expanded: show selected era's techs */}
      {expanded && (
        <View style={era.techList}>
          <Text style={[era.techListTitle, { color: selectedEra.color }]}>
            {selectedEra.icon} {selectedEra.decade} Technologies
            {selectedEra.startYear > calYear ? ' (locked)' : selectedEra.startYear === currentEra.startYear ? ' (current era)' : ' (unlocked)'}
          </Text>
          {selectedEra.techs.map(t => (
            <View key={t.id} style={[era.techRow, { opacity: selectedEra.startYear <= calYear ? 1 : 0.4 }]}>
              <Text style={era.techCatIcon}>{CATEGORY_ICON[t.category] ?? '🔧'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[era.techName, { color: selectedEra.startYear <= calYear ? C.text : '#444' }]}>{t.name}</Text>
                <Text style={era.techDesc}>{t.desc}</Text>
                <Text style={[era.techEffect, { color: selectedEra.color }]}>→ {t.effect}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Next era hint */}
      {nextEra && (
        <View style={era.nextEraHint}>
          <Text style={era.nextEraText}>
            {yearsUntilNext === 1 ? '⚡ Next era unlocks next year' : `Next era: ${nextEra.decade} (${nextEra.tagline}) — ${yearsUntilNext} year${(yearsUntilNext ?? 0) > 1 ? 's' : ''} away`}
          </Text>
        </View>
      )}
    </View>
  );
}

const era = StyleSheet.create({
  wrap: {
    backgroundColor: C.bgCard,
    borderRadius: R.md,
    padding: S.md,
    borderWidth: 1,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  headerIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
  decade: {
    fontSize: F.size.xs,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  yearLabel: {
    color: C.textMuted,
    fontSize: F.size.xs,
    marginTop: 1,
  },
  chevron: {
    color: '#555',
    fontSize: 10,
  },
  trackScroll: {
    flexGrow: 0,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 0,
  },
  trackItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  eraDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eraDotIcon: {
    fontSize: 14,
  },
  connector: {
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  eraLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    position: 'absolute',
    bottom: -14,
    left: 0,
    width: 32,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.bgDeep,
    borderRadius: R.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipIcon: {
    fontSize: 11,
  },
  chipText: {
    fontSize: F.size.xs,
    fontWeight: 'bold',
  },
  techList: {
    gap: 6,
    marginTop: 2,
  },
  techListTitle: {
    fontSize: F.size.xs,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  techRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2a',
  },
  techCatIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
    marginTop: 1,
  },
  techName: {
    fontSize: F.size.sm,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  techDesc: {
    color: C.textMuted,
    fontSize: F.size.xs,
    lineHeight: 15,
    marginBottom: 2,
  },
  techEffect: {
    fontSize: F.size.xs,
    fontWeight: 'bold',
  },
  nextEraHint: {
    backgroundColor: C.bgDeep,
    borderRadius: R.sm,
    paddingHorizontal: S.sm,
    paddingVertical: 6,
  },
  nextEraText: {
    color: C.textFaint,
    fontSize: F.size.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
