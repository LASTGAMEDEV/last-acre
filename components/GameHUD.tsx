// components/GameHUD.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { getSeason, WeatherEvent } from '../engine/climate';
import { SEASON_THEME, C, S, F, R, MIN_TOUCH } from '../constants/theme';
import { MACHINE_TYPES } from '../data/machineTypes';
import { BUILDING_TYPES } from '../data/buildingTypes';
import type { CoopId } from '../engine/cooperativeTypes';

const WARN_DAYS = 7;
const SEASON_DAYS = 90;

const WEATHER_DISPLAY: Record<WeatherEvent, { icon: string; pillBg: string; textColor: string }> = {
  perfect:    { icon: '✨', pillBg: '#1b3a1b', textColor: '#81c784' },
  sunny:      { icon: '☀️', pillBg: '#3a2800', textColor: '#ffd54f' },
  cloudy:     { icon: '⛅', pillBg: '#1b2e2e', textColor: '#90caf9' },
  rain:       { icon: '🌧️', pillBg: '#001a3a', textColor: '#90caf9' },
  heavy_rain: { icon: '⛈️', pillBg: '#001a3a', textColor: '#64b5f6' },
  drought:    { icon: '🌵', pillBg: '#3a1500', textColor: '#ffb74d' },
  frost:      { icon: '❄️', pillBg: '#001a3a', textColor: '#b3e5fc' },
  hail:       { icon: '🌨️', pillBg: '#1a1a3a', textColor: '#90caf9' },
  wind:       { icon: '💨', pillBg: '#1b2e1b', textColor: '#c8e6c9' },
  fog:        { icon: '🌫️', pillBg: '#1a1a1a', textColor: '#aaaaaa' },
};

const EVENT_COLORS: Record<string, string> = { heat_wave: '#5a1a00', flood: '#001a3a', frost: '#001a3a' };
const EVENT_TEXT_COLORS: Record<string, string> = { heat_wave: '#ffb74d', flood: '#64b5f6', frost: '#b3e5fc' };
const EVENT_ICONS: Record<string, string> = { heat_wave: '🌡️', flood: '🌊', frost: '❄️' };
const EVENT_NAMES: Record<string, string> = { heat_wave: 'Heat Wave', flood: 'Flood', frost: 'Frost' };

export default function GameHUD() {
  const {
    money, day, savings, loans, contracts, seasonalEvent,
    farmName, workers, machines, buildings,
    advanceDays,
    todayWeather, recurringContracts, buyers,
    coopMemberships,
  } = useGameStore();

  const season = getSeason(day);
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
    backgroundColor: '#3a1a00',
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    gap: 2,
  },
  warnText: {
    color: '#ffb74d',
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
  },
});

const hudStyles = StyleSheet.create({
  coopBadge: { backgroundColor: '#1565c0', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginLeft: 4 },
  coopBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
});
