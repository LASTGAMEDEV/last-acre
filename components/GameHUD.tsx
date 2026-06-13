// components/GameHUD.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../store/useGameStore';
import { getSeason, WeatherEvent } from '../engine/climate';
import { gameDayToCalendarYear } from '../engine/calendarUtils';
import { farmerAge } from '../engine/dynasty';
import { SEASON_THEME, C, S, F, R } from '../constants/theme';
import { MACHINE_TYPES } from '../data/machineTypes';
import { BUILDING_TYPES } from '../data/buildingTypes';
import type { CoopId } from '../engine/cooperativeTypes';

const WARN_DAYS = 7;
const SEASON_DAYS = 90;

// Weather-specific colours (not in global theme palette)
const WEATHER_COLORS = {
  sunnyBg:    '#2a1a00',
  rainBg:     '#001225',
  hailBg:     '#0f0f2a',
  blueText:   '#93c5fd',
  blueLight:  '#60a5fa',
  icyText:    '#bae6fd',
  warnBg:     '#2a0f00',
} as const;

const WEATHER_DISPLAY: Record<WeatherEvent, { icon: string; pillBg: string; textColor: string }> = {
  perfect:    { icon: '✨', pillBg: C.bgElevated, textColor: C.greenSoft },
  sunny:      { icon: '☀️', pillBg: WEATHER_COLORS.sunnyBg,  textColor: C.amberSoft },
  cloudy:     { icon: '⛅', pillBg: C.bgCard,     textColor: C.textDim },
  rain:       { icon: '🌧️', pillBg: WEATHER_COLORS.rainBg,  textColor: WEATHER_COLORS.blueText },
  heavy_rain: { icon: '⛈️', pillBg: WEATHER_COLORS.rainBg,  textColor: WEATHER_COLORS.blueLight },
  drought:    { icon: '🌵', pillBg: '#2a0f00',   textColor: C.amberSoft },
  frost:      { icon: '❄️', pillBg: WEATHER_COLORS.rainBg,  textColor: WEATHER_COLORS.icyText },
  hail:       { icon: '🌨️', pillBg: WEATHER_COLORS.hailBg,  textColor: WEATHER_COLORS.blueText },
  wind:       { icon: '💨', pillBg: C.bgCard,    textColor: C.textDim },
  fog:        { icon: '🌫️', pillBg: C.bgCard,   textColor: C.textMuted },
};

const EVENT_COLORS: Record<string, string> = { heat_wave: '#2a0f00', flood: '#001225', frost: '#001225' };
const EVENT_TEXT_COLORS: Record<string, string> = { heat_wave: C.amberSoft, flood: '#93c5fd', frost: '#bae6fd' };
const EVENT_ICONS: Record<string, string> = { heat_wave: '🌡️', flood: '🌊', frost: '❄️' };
const EVENT_NAMES: Record<string, string> = { heat_wave: 'Heat Wave', flood: 'Flood', frost: 'Frost' };

function repBadgeColor(tier: string): string {
  switch (tier) {
    case 'legendary':  return '#5d4a00';
    case 'renowned':   return '#1a3a2a';
    case 'respected':  return '#1a2e1a';
    case 'local':      return '#1a2a1a';
    default:           return '#1a1a1a';
  }
}

const TIER_COLOR: Record<string, string> = {
  legendary: '#ffd700',
  renowned:  '#ce93d8',
  respected: '#64b5f6',
  local:     '#81c784',
  unknown:   '#555555',
};

const TIER_TEXT: Record<string, string> = {
  legendary: '#b8930055',
  renowned:  '#9c64b055',
  respected: '#4a90b055',
  local:     '#4a7c5955',
  unknown:   '#33333355',
};

export default function GameHUD() {
  const router = useRouter();
  const {
    money, day, savings, loans, contracts, seasonalEvent,
    farmName, workers, machines, buildings,
    todayWeather, recurringContracts, buyers,
    coopMemberships,
    dynasty,
  } = useGameStore();
  const reputation = useGameStore(s => s.reputation);

  const season = getSeason(day);
  const calYear = gameDayToCalendarYear(day);
  const farmer = dynasty.currentFarmer;
  const age = farmerAge(farmer, calYear);
  const healthPct = Math.max(0, Math.min(100, farmer.health));
  const healthColor = healthPct >= 60 ? C.green : healthPct >= 30 ? C.amber : C.red;
  const theme = SEASON_THEME[season];

  const daysIntoSeason = (day % (SEASON_DAYS * 4)) % SEASON_DAYS;
  const daysLeftInSeason = SEASON_DAYS - daysIntoSeason;

  const hasTaller = (buildings ?? []).includes('bld_taller');
  const machineMaint = (machines ?? []).reduce((s, m) => {
    const t = MACHINE_TYPES.find(mt => mt.id === m.typeId);
    return s + (t?.maintenancePerDay ?? 0);
  }, 0) * (hasTaller ? 0.75 : 1.0);
  const buildingMaint = (buildings ?? []).reduce((s, bId) => {
    const t = BUILDING_TYPES.find(bt => bt.id === bId);
    return s + (t?.maintenancePerDay ?? 0);
  }, 0);
  const dailyWages = (workers ?? []).reduce((sum, w) => {
    return sum + (w.wagePerDay ?? 0);
  }, 0);
  const dailyBurn = Math.round(dailyWages + machineMaint + buildingMaint);

  const urgentLoan = loans.find(l => !l.paid && !l.defaulted && l.payoffDay - day <= WARN_DAYS && l.payoffDay >= day);
  const urgentContract = contracts.find(c => !c.completed && !c.failed && c.deadlineDay - day <= WARN_DAYS && c.deadlineDay >= day);

  const urgentDelivery = (recurringContracts ?? [])
    .filter((c) => c.active)
    .map((c) => ({
      contract: c,
      daysToClose: (c.nextDeliveryDay + c.deliveryWindowDays) - day,
    }))
    .filter(({ daysToClose }) => daysToClose > 0 && daysToClose <= 3)
    .sort((a, b) => a.daysToClose - b.daysToClose)[0];

  const urgentDeliveryBuyer = urgentDelivery
    ? (buyers ?? []).find((b) => b.id === urgentDelivery.contract.buyerId)
    : undefined;

  const weather = todayWeather ? WEATHER_DISPLAY[todayWeather.event] : null;

  const coopBadges: { id: CoopId; label: string }[] = [
    { id: 'grain', label: 'G' },
    { id: 'horticulture', label: 'H' },
    { id: 'livestock', label: 'L' },
  ];

  const fmtMoney = (n: number) => {
    const abs = Math.abs(Math.round(n));
    return abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs}`;
  };

  return (
    <>
      <View style={[styles.hud, { backgroundColor: theme.tabBar, borderBottomColor: theme.accent + '33' }]}>

        {/* Row 1: Farm · Season · Weather · Day */}
        <View style={styles.row1}>
          <Text style={styles.farmName} numberOfLines={1}>🌿 {farmName ?? 'My Farm'}</Text>
          <View style={[styles.pill, { backgroundColor: theme.badge }]}>
            <Text style={[styles.pillText, { color: theme.badgeText }]}>{theme.icon} {season.charAt(0).toUpperCase() + season.slice(1)} · {daysLeftInSeason}d</Text>
          </View>
          {weather && (
            <View style={[styles.pill, { backgroundColor: weather.pillBg }]}>
              <Text style={[styles.pillText, { color: weather.textColor }]}>{weather.icon} {todayWeather!.event.replace('_', ' ')}</Text>
            </View>
          )}
          <View style={styles.yearBadge}>
            <Text style={styles.yearText}>{calYear}</Text>
          </View>
          {/* Reputation badge: score + tier */}
          <View style={[hudStyles.repBadge, { backgroundColor: repBadgeColor(reputation.tier) }]}>
            <Text style={[hudStyles.repScore, { color: TIER_COLOR[reputation.tier] ?? '#4a7c59' }]}>
              {Math.round(reputation.score ?? 0)}
            </Text>
            <Text style={[hudStyles.repText, { color: TIER_TEXT[reputation.tier] ?? '#4a7c59' }]}>
              {reputation.tier.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={hudStyles.farmerChip} onPress={() => router.push('/(tabs)/legado')}>
            <Text style={hudStyles.farmerName}>{farmer.firstName} · {age}y</Text>
          </TouchableOpacity>
          <View style={hudStyles.healthBarTrack}>
            <View style={[hudStyles.healthBarFill, { width: `${healthPct}%`, backgroundColor: healthColor }]} />
          </View>
          <Text style={styles.dayNum}>Day {day}</Text>
        </View>

        {/* Row 2: Stats · Advance · Skip */}
        <View style={styles.row2}>
          {/* Stats */}
          <View style={styles.cashGroup}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{fmtMoney(money)}</Text>
              <Text style={styles.statLabel}>CASH</Text>
            </View>
            {coopBadges.map(({ id, label }) =>
              (coopMemberships ?? {})[id] ? (
                <View key={id} style={hudStyles.coopBadge}>
                  <Text style={hudStyles.coopBadgeText}>{label}</Text>
                </View>
              ) : null
            )}
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: C.textDim }]}>{fmtMoney(savings.balance)}</Text>
            <Text style={styles.statLabel}>SAVINGS</Text>
          </View>
          {dailyBurn > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: C.red }]}>−{fmtMoney(dailyBurn)}</Text>
                <Text style={styles.statLabel}>BURN/D</Text>
              </View>
            </>
          )}

          <View style={{ flex: 1 }} />
        </View>
      </View>

      {/* Seasonal event banner */}
      {seasonalEvent && (
        <View style={[styles.warnStrip, { backgroundColor: EVENT_COLORS[seasonalEvent.type] ?? '#1a1a00' }]}>
          <Text style={[styles.warnText, { color: EVENT_TEXT_COLORS[seasonalEvent.type] ?? '#ffb74d' }]}>
            {EVENT_ICONS[seasonalEvent.type]} {EVENT_NAMES[seasonalEvent.type]} · {Math.max(0, seasonalEvent.endsDay - day)}d remaining
          </Text>
        </View>
      )}

      {/* Deadline warnings */}
      {(urgentLoan || urgentContract) && (
        <View style={styles.warnStrip}>
          {urgentLoan && (
            <Text style={styles.warnText}>
              ⚠️ Loan due in {urgentLoan.payoffDay - day}d · ${Math.round(urgentLoan.totalOwed).toLocaleString()} owed
            </Text>
          )}
          {urgentContract && (
            <Text style={styles.warnText}>
              ⚠️ Contract deadline in {urgentContract.deadlineDay - day}d
            </Text>
          )}
        </View>
      )}
      {urgentDelivery && (
        <View style={styles.warnStrip}>
          <Text style={styles.warnText}>
            ⚠️ Delivery closes in {urgentDelivery.daysToClose}d
            {' '}— {urgentDeliveryBuyer?.name ?? 'Buyer'}
            {' '}({urgentDelivery.contract.cropId} {urgentDelivery.contract.amountPerDelivery} kg)
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hud: {
    borderBottomWidth: 1,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.sm,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    marginBottom: S.xs + 1,
  },
  farmName: {
    color: C.textMuted,
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
    flexShrink: 1,
  },
  pill: {
    borderRadius: R.pill,
    paddingHorizontal: S.sm - 1,
    paddingVertical: 2,
  },
  pillText: {
    color: C.textDim,
    fontSize: 9,
    fontWeight: F.weight.bold,
  },
  yearBadge: {
    backgroundColor: C.bgElevated,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  yearText: {
    color: C.amber,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  dayNum: {
    color: C.text,
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
    marginLeft: 'auto',
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
  },
  stat: {
    flexDirection: 'column',
  },
  cashGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: C.text,
    fontSize: F.size.sm,
    fontWeight: F.weight.bold,
  },
  statLabel: {
    color: C.textFaint,
    fontSize: 7,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: C.divider,
    marginHorizontal: S.xs,
  },

  warnStrip: {
    backgroundColor: WEATHER_COLORS.warnBg,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    gap: 2,
  },
  warnText: {
    color: C.amber,
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
  },
});

const hudStyles = StyleSheet.create({
  coopBadge: { backgroundColor: C.blue, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginLeft: 4 },
  coopBadgeText: { color: C.text, fontSize: 10, fontWeight: 'bold' },
  farmerChip: { backgroundColor: C.bgElevated, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  farmerName: { color: C.greenSoft, fontSize: 9, fontWeight: 'bold' },
  healthBarTrack: { width: 36, height: 5, backgroundColor: C.bgDeep, borderRadius: 3, overflow: 'hidden' },
  healthBarFill: { height: '100%', borderRadius: 3 },
  repBadge:  { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginLeft: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  repScore:  { fontSize: 10, fontWeight: 'bold' },
  repText:   { fontSize: 7, fontWeight: 'bold', letterSpacing: 1, opacity: 0.7 },
});
