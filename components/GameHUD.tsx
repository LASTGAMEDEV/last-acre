import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { getSeason } from '../engine/climate';
import { SEASON_THEME, C } from '../constants/theme';
import { WORKER_TYPES } from '../data/workerTypes';
import { MACHINE_TYPES } from '../data/machineTypes';
import { BUILDING_TYPES } from '../data/buildingTypes';

const WARN_DAYS = 7;

const SEASON_DAYS = 90;

const EVENT_ICONS: Record<string, string> = { heat_wave: '🌡️', flood: '🌊', frost: '❄️' };
const EVENT_NAMES: Record<string, string> = { heat_wave: 'Heat Wave', flood: 'Flood', frost: 'Frost' };
const EVENT_COLORS: Record<string, string> = { heat_wave: '#5a1a00', flood: '#001a3a', frost: '#001a3a' };
const EVENT_TEXT_COLORS: Record<string, string> = { heat_wave: '#ffb74d', flood: '#64b5f6', frost: '#b3e5fc' };

export default function GameHUD() {
  const { money, day, savings, loans, contracts, seasonalEvent, farmName, workers, machines, buildings } = useGameStore();

  const dailyWages = (workers ?? []).reduce((sum, w) => {
    const def = WORKER_TYPES.find(t => t.id === w.typeId);
    return sum + (def?.dailyWage ?? 0);
  }, 0);
  const hasTaller = (buildings ?? []).includes('bld_taller');
  const machineMaint = (machines ?? []).reduce((s, m) => {
    const t = MACHINE_TYPES.find(mt => mt.id === m.typeId);
    return s + (t?.maintenancePerDay ?? 0);
  }, 0) * (hasTaller ? 0.75 : 1.0);
  const buildingMaint = (buildings ?? []).reduce((s, bId) => {
    const t = BUILDING_TYPES.find(bt => bt.id === bId);
    return s + (t?.maintenancePerDay ?? 0);
  }, 0);
  const dailyBurn = Math.round(dailyWages + machineMaint + buildingMaint);
  const urgentLoan = loans.find(l => !l.paid && !l.defaulted && l.payoffDay - day <= WARN_DAYS && l.payoffDay >= day);
  const urgentContract = contracts.find(c => !c.completed && !c.failed && c.deadlineDay - day <= WARN_DAYS && c.deadlineDay >= day);
  const season = getSeason(day);
  const theme = SEASON_THEME[season];
  const daysIntoSeason = (day % (SEASON_DAYS * 4)) % SEASON_DAYS;
  const daysLeftInSeason = SEASON_DAYS - daysIntoSeason;

  // Animate money delta when it changes
  const prevMoney = useRef(money);
  const deltaRef = useRef(0);
  const deltaOpacity = useRef(new Animated.Value(0)).current;
  const deltaY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const diff = money - prevMoney.current;
    if (diff !== 0) {
      deltaRef.current = diff;
      deltaOpacity.setValue(1);
      deltaY.setValue(0);
      Animated.parallel([
        Animated.timing(deltaOpacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
        Animated.timing(deltaY,       { toValue: -22, duration: 1400, useNativeDriver: true }),
      ]).start();
    }
    prevMoney.current = money;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [money]);

  const delta = deltaRef.current;
  const deltaColor = delta >= 0 ? C.greenSoft : C.red;
  const deltaText = delta >= 0 ? `+$${Math.round(delta).toLocaleString()}` : `-$${Math.abs(Math.round(delta)).toLocaleString()}`;

  return (
    <>
    <View style={[styles.hud, { backgroundColor: theme.tabBar, borderBottomColor: theme.accent + '44' }]}>
      {/* Farm name */}
      <View style={styles.hudCell}>
        <Text style={styles.hudLabel}>FARM</Text>
        <Text style={[styles.hudValue, { fontSize: 10 }]} numberOfLines={1}>{farmName ?? 'My Farm'}</Text>
      </View>

      <View style={styles.divider} />

      {/* Money */}
      <View style={styles.hudCell}>
        <Text style={styles.hudLabel}>CASH</Text>
        <View style={styles.hudValueRow}>
          <Text style={styles.hudValue}>${Math.round(money).toLocaleString()}</Text>
          {delta !== 0 && (
            <Animated.Text style={[styles.delta, { color: deltaColor, opacity: deltaOpacity, transform: [{ translateY: deltaY }] }]}>
              {deltaText}
            </Animated.Text>
          )}
        </View>
        {dailyBurn > 0 && (
          <Text style={styles.burnRate}>−${dailyBurn.toLocaleString()}/d</Text>
        )}
      </View>

      <View style={styles.divider} />

      {/* Day */}
      <View style={styles.hudCell}>
        <Text style={styles.hudLabel}>DAY</Text>
        <Text style={styles.hudValue}>{day}</Text>
      </View>

      <View style={styles.divider} />

      {/* Season */}
      <View style={styles.hudCell}>
        <Text style={styles.hudLabel}>SEASON</Text>
        <View style={[styles.seasonBadge, { backgroundColor: theme.badge }]}>
          <Text style={styles.seasonIcon}>{theme.icon}</Text>
          <Text style={[styles.seasonText, { color: theme.badgeText }]}>
            {season.charAt(0).toUpperCase() + season.slice(1)}
          </Text>
          <Text style={[styles.seasonDays, { color: theme.badgeText }]}>
            {daysLeftInSeason}d left
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Savings */}
      <View style={styles.hudCell}>
        <Text style={styles.hudLabel}>SAVINGS</Text>
        <Text style={[styles.hudValue, { color: C.greenSoft }]}>${Math.round(savings.balance).toLocaleString()}</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  hud: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  hudCell: {
    flex: 1,
    alignItems: 'center',
  },
  hudLabel: {
    color: C.faint,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  hudValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hudValue: {
    color: C.gold,
    fontSize: 12,
    fontWeight: 'bold',
  },
  delta: {
    position: 'absolute',
    left: '100%',
    marginLeft: 4,
    fontSize: 11,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: C.divider,
    marginHorizontal: 4,
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  seasonIcon: { fontSize: 10 },
  seasonText: { fontSize: 10, fontWeight: 'bold' },
  seasonDays: { fontSize: 8, opacity: 0.75, marginTop: 1 },
  burnRate:  { color: C.red, fontSize: 8, opacity: 0.75, marginTop: 1 },
  warnStrip: { backgroundColor: '#3a1a00', paddingHorizontal: 12, paddingVertical: 4, gap: 2 },
  warnText:  { color: '#ffb74d', fontSize: 10, fontWeight: 'bold' },
});
