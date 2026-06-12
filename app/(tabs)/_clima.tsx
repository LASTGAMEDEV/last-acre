import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { getSeason, WeatherEvent, Season } from '../../engine/climate';
import { CROP_TYPES, CropTier } from '../../data/cropTypes';
import { CROP_CALENDAR, STATUS_COLORS, STATUS_ICONS, STATUS_LABELS, SeasonStatus } from '../../data/cropCalendar';

const WEATHER_ICONS: Record<WeatherEvent, string> = {
  perfect:    '🌟',
  sunny:      '☀️',
  cloudy:     '⛅',
  rain:       '🌧️',
  heavy_rain: '⛈️',
  drought:    '🏜️',
  frost:      '❄️',
  hail:       '🌨️',
  wind:       '💨',
  fog:        '🌫️',
};

const SEASON_LABELS: Record<Season, string> = {
  spring: '🌸 Spring',
  summer: '☀️ Summer',
  autumn: '🍂 Autumn',
  winter: '❄️ Winter',
};

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

const TIER_COLORS: Record<CropTier, string> = {
  D: '#9e9e9e', C: C.green, B: '#2196f3', A: '#9c27b0', S: '#ff9800',
};

function CalendarCell({ status, isCurrentSeason }: { status: SeasonStatus; isCurrentSeason: boolean }) {
  const bg = STATUS_COLORS[status];
  const icon = STATUS_ICONS[status];
  return (
    <View style={[
      styles.cell,
      { backgroundColor: status === 'avoid' ? C.bg : bg },
      isCurrentSeason && styles.cellCurrent,
    ]}>
      <Text style={styles.cellIcon}>{icon}</Text>
    </View>
  );
}

export default function ClimaScreen() {
  const { day, forecast, todayWeather, parcels } = useGameStore();
  const season = getSeason(day);
  const [calendarFilter, setCalendarFilter] = useState<'all' | Season>(season);

  // Filter crops by selected season — show only relevant ones
  const filteredCalendar = calendarFilter === 'all'
    ? CROP_CALENDAR
    : CROP_CALENDAR.filter(c => {
        const s = c.seasons[calendarFilter];
        return s === 'plant' || s === 'both' || s === 'harvest';
      });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Weather</Text>
      </View>

      {/* Today */}
      <View style={styles.todayCard}>
        <Text style={styles.todayLabel}>Today</Text>
        {todayWeather ? (
          <>
            <Text style={styles.todayIcon}>{WEATHER_ICONS[todayWeather.event]}</Text>
            <Text style={styles.todayEvent}>{todayWeather.event.replace('_', ' ')}</Text>
            <Text style={styles.todayMod}>
              Crop modifier: {(todayWeather.climateModifier * 100).toFixed(0)}%
              {'  '}🌡️ {todayWeather.minTemp?.toFixed(0) ?? '?'}–{todayWeather.maxTemp?.toFixed(0) ?? '?'}°C
            </Text>
          </>
        ) : (
          <Text style={styles.noWeather}>Advance the day to see weather</Text>
        )}
      </View>

      {/* 7-day forecast */}
      <Text style={styles.sectionLabel}>7-Day Forecast</Text>
      <FlatList
        data={forecast.slice(0, 7)}
        keyExtractor={(_, i) => String(i)}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.forecastList}
        renderItem={({ item, index }) => {
          const isFrost = item.event === 'frost';
          const isLowConfidence = item.probability <= 0.55;
          const streakLabel = item.streakDay != null
            ? `day ${item.streakDay}` : null;
          return (
            <View style={[
              styles.forecastCard,
              isFrost && styles.forecastCardFrost,
              isLowConfidence && styles.forecastCardDim,
            ]}>
              <Text style={styles.forecastDay}>+{index + 1}d</Text>
              <Text style={styles.forecastIcon}>{WEATHER_ICONS[item.event]}</Text>
              {item.probability < 1.0 && (
                <Text style={styles.forecastProb}>
                  {Math.round(item.probability * 100)}%
                </Text>
              )}
              <Text style={styles.forecastTemp}>
                {item.minTemp?.toFixed(0) ?? '?'}–{item.maxTemp?.toFixed(0) ?? '?'}°C
              </Text>
              {streakLabel && (
                <Text style={styles.forecastStreak}>{streakLabel}</Text>
              )}
            </View>
          );
        }}
      />

      {/* ── FIELD RISK ALERTS ── */}
      {(() => {
        const ownedParcels = (parcels ?? []).filter(p => p.owned && p.plantedCrop);
        if (ownedParcels.length === 0) return null;

        type RiskEntry = { icon: string; label: string; plots: string[]; daysOut: number; severity: 'critical' | 'warning' };
        const risks: RiskEntry[] = [];

        const frostDays = forecast.slice(0, 7).map((f, i) => ({ f, i })).filter(({ f }) => f.event === 'frost' || (f.minTemp != null && f.minTemp < 0));
        if (frostDays.length > 0) {
          const frostedPlots = ownedParcels.filter(p => !p.greenhouse).map(p => {
            const ct = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
            return ct?.name ?? p.plantedCrop!.cropId;
          });
          if (frostedPlots.length > 0) {
            const nearest = frostDays[0].i + 1;
            risks.push({ icon: '❄️', label: `Frost in ${nearest}d`, plots: [...new Set(frostedPlots)], daysOut: nearest, severity: nearest <= 2 ? 'critical' : 'warning' });
          }
        }

        const droughtDays = forecast.slice(0, 7).map((f, i) => ({ f, i })).filter(({ f }) => f.event === 'drought');
        if (droughtDays.length > 0) {
          const dryPlots = ownedParcels.filter(p => !p.irrigated).map(p => {
            const ct = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
            return ct?.name ?? p.plantedCrop!.cropId;
          });
          if (dryPlots.length > 0) {
            const nearest = droughtDays[0].i + 1;
            risks.push({ icon: '🏜️', label: `Drought in ${nearest}d — unirrigated plots`, plots: [...new Set(dryPlots)], daysOut: nearest, severity: 'warning' });
          }
        }

        const hailDays = forecast.slice(0, 7).map((f, i) => ({ f, i })).filter(({ f }) => f.event === 'hail');
        if (hailDays.length > 0) {
          const nearest = hailDays[0].i + 1;
          const allPlanted = ownedParcels.map(p => {
            const ct = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
            return ct?.name ?? p.plantedCrop!.cropId;
          });
          risks.push({ icon: '🌨️', label: `Hail in ${nearest}d`, plots: [...new Set(allPlanted)], daysOut: nearest, severity: 'critical' });
        }

        if (risks.length === 0) return null;
        return (
          <>
            <Text style={styles.sectionLabel}>⚠️ Field Risk Alerts</Text>
            <View style={styles.riskCard}>
              {risks.map((r, i) => (
                <View key={i} style={[styles.riskRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#1a1f2e', marginTop: 8, paddingTop: 8 }]}>
                  <Text style={styles.riskIcon}>{r.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.riskLabel, { color: r.severity === 'critical' ? '#ef9a9a' : '#fcd34d' }]}>{r.label}</Text>
                    <Text style={styles.riskPlots}>{r.plots.slice(0, 4).join(', ')}{r.plots.length > 4 ? ` +${r.plots.length - 4} more` : ''} at risk</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        );
      })()}

      {/* ── CALENDAR ── */}
      <Text style={styles.sectionLabel}>Crop Calendar</Text>

      {/* Season filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {(['all', ...SEASON_ORDER] as ('all' | Season)[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterTab, calendarFilter === s && styles.filterTabActive, s === season && styles.filterTabCurrent]}
            onPress={() => setCalendarFilter(s)}
          >
            <Text style={[styles.filterTabText, calendarFilter === s && styles.filterTabTextActive]}>
              {s === 'all' ? 'All' : SEASON_LABELS[s]}
              {s === season ? ' ◀' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        {(['plant', 'harvest', 'both', 'grow', 'avoid'] as SeasonStatus[]).map(s => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s === 'avoid' ? C.border : STATUS_COLORS[s] }]} />
            <Text style={styles.legendText}>{STATUS_ICONS[s]} {STATUS_LABELS[s]}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarWrap}>
        {/* Header row */}
        <View style={styles.calendarRow}>
          <View style={styles.calendarCropCol} />
          {SEASON_ORDER.map(s => (
            <View key={s} style={[styles.calendarSeasonHeader, s === season && styles.calendarSeasonHeaderCurrent]}>
              <Text style={[styles.calendarSeasonText, s === season && styles.calendarSeasonTextCurrent]} numberOfLines={1}>
                {s === 'spring' ? '🌸' : s === 'summer' ? '☀️' : s === 'autumn' ? '🍂' : '❄️'}
                {' '}{s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </View>
          ))}
        </View>

        {/* Crop rows */}
        {filteredCalendar.map(entry => {
          const crop = CROP_TYPES.find(c => c.id === entry.cropId);
          if (!crop) return null;
          return (
            <View key={entry.cropId} style={styles.calendarRow}>
              {/* Crop name */}
              <View style={styles.calendarCropCol}>
                <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[crop.tier] }]} />
                <Text style={styles.calendarCropName} numberOfLines={1}>{crop.name}</Text>
              </View>
              {/* Season cells */}
              {SEASON_ORDER.map(s => (
                <View key={s} style={styles.calendarCellWrap}>
                  <CalendarCell status={entry.seasons[s]} isCurrentSeason={s === season} />
                </View>
              ))}
            </View>
          );
        })}

        {filteredCalendar.length === 0 && (
          <Text style={styles.noCalendar}>No recommended crops for this season.</Text>
        )}
      </View>

      {/* Selected crop note — show note for crops plantable this season */}
      <View style={styles.notesCard}>
        <Text style={styles.notesTitle}>Crop notes — {SEASON_LABELS[season]}</Text>
        {CROP_CALENDAR
          .filter(e => e.seasons[season] === 'plant' || e.seasons[season] === 'both')
          .map(e => {
            const crop = CROP_TYPES.find(c => c.id === e.cropId);
            return (
              <View key={e.cropId} style={styles.noteRow}>
                <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[crop?.tier ?? 'D'] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteCropName}>{crop?.name}</Text>
                  <Text style={styles.noteText}>{e.note}</Text>
                </View>
              </View>
            );
          })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: S.lg, marginBottom: S.xs },
  title: { fontSize: F.size.title, fontWeight: 'bold', color: C.text },
  season: { fontSize: F.size.lg, color: C.textDim },
  dayLabel: { color: C.textMuted, fontSize: F.size.md, paddingHorizontal: S.lg, marginBottom: 10 },
  sectionLabel: { color: C.textMuted, fontSize: F.size.md, paddingHorizontal: S.lg, marginBottom: 6, marginTop: 10 },

  // Risk alerts
  riskCard:   { backgroundColor: C.bgCard, borderRadius: R.lg, marginHorizontal: S.md, padding: S.md },
  riskRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  riskIcon:   { fontSize: 20, lineHeight: 24 },
  riskLabel:  { fontSize: F.size.sm, fontWeight: 'bold', marginBottom: 2 },
  riskPlots:  { color: C.textMuted, fontSize: F.size.xs, lineHeight: 16 },

  // Today
  todayCard: { backgroundColor: C.bgCard, borderRadius: R.lg, marginHorizontal: S.md, padding: S.lg, alignItems: 'center' },
  todayLabel: { color: C.textMuted, fontSize: F.size.sm, marginBottom: S.xs },
  todayIcon: { fontSize: 48 },
  todayEvent: { color: C.text, fontSize: F.size.xl, fontWeight: 'bold', textTransform: 'capitalize', marginTop: 6 },
  todayMod: { color: C.textMuted, fontSize: F.size.md, marginTop: 2 },
  noWeather: { color: C.textFaint, fontSize: F.size.md },

  // Forecast
  forecastList: { paddingHorizontal: S.sm },
  forecastCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: 10, marginRight: S.sm, alignItems: 'center', width: 78 },
  forecastDay: { color: C.textMuted, fontSize: F.size.xs, marginBottom: S.xs },
  forecastIcon: { fontSize: 26 },
  forecastMod: { color: C.textMuted, fontSize: F.size.xs, marginTop: S.xs },
  forecastCardFrost: {
    borderColor: C.red,
    borderWidth: 1.5,
  },
  forecastCardDim: {
    opacity: 0.65,
  },
  forecastProb: {
    fontSize: F.size.xs,
    color: C.amber,
    fontWeight: F.weight.bold,
  },
  forecastTemp: {
    fontSize: F.size.xs,
    color: C.textMuted,
    marginTop: 2,
  },
  forecastStreak: {
    fontSize: F.size.xs,
    color: C.red,
    fontWeight: F.weight.bold,
    marginTop: 1,
  },

  // Filter tabs
  filterRow: { marginBottom: S.sm },
  filterTab: { borderRadius: 20, paddingHorizontal: S.md, paddingVertical: 6, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border },
  filterTabActive: { backgroundColor: C.bgElevated, borderColor: C.text },
  filterTabCurrent: { borderColor: C.textDim },
  filterTabText: { color: C.textFaint, fontSize: F.size.sm },
  filterTabTextActive: { color: C.text, fontWeight: 'bold' },

  // Legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: S.md, marginBottom: S.sm, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { color: C.textFaint, fontSize: F.size.xs },

  // Calendar grid
  calendarWrap: { marginHorizontal: 10, backgroundColor: C.bgDeep, borderRadius: 10, overflow: 'hidden' },
  calendarRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.divider },
  calendarCropCol: { width: 110, paddingVertical: S.sm, paddingHorizontal: S.sm, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tierDot: { width: 7, height: 7, borderRadius: R.xs, flexShrink: 0 },
  calendarCropName: { color: C.textMuted, fontSize: 11, flex: 1 },
  calendarSeasonHeader: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: S.sm, backgroundColor: C.bg },
  calendarSeasonHeaderCurrent: { backgroundColor: C.bgElevated },
  calendarSeasonText: { color: C.textFaint, fontSize: F.size.xs, fontWeight: 'bold' },
  calendarSeasonTextCurrent: { color: C.text },
  calendarCellWrap: { flex: 1, padding: 3 },
  cell: { borderRadius: R.xs, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },
  cellCurrent: { borderWidth: 1, borderColor: C.text + '50' },
  cellIcon: { fontSize: F.size.md },
  noCalendar: { color: C.textFaint, padding: S.lg, textAlign: 'center' },

  // Notes
  notesCard: { backgroundColor: C.bgCard, borderRadius: R.lg, margin: S.md, padding: 14 },
  notesTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.md, marginBottom: 10 },
  noteRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  noteCropName: { color: C.text, fontWeight: 'bold', fontSize: F.size.sm },
  noteText: { color: C.textFaint, fontSize: 11, marginTop: 1 },
});
