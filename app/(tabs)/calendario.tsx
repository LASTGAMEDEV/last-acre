import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import { getSeason } from '../../engine/climate';

type CalendarEntry = {
  id: string;
  icon: string;
  title: string;
  detail: string;
  daysLeft: number;
  category: 'contract' | 'loan' | 'futures' | 'season' | 'deposit';
  urgent: boolean;
};

const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_ICONS: Record<string, string> = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };

function nextSeasonChange(day: number): { season: string; daysLeft: number } {
  const seasonDay = ((day - 1) % 360) + 1;
  const daysIntoSeason = (seasonDay - 1) % 90;
  const daysLeft = 90 - daysIntoSeason;
  const currentSeason = getSeason(day);
  const nextIdx = (SEASON_ORDER.indexOf(currentSeason) + 1) % 4;
  return { season: SEASON_ORDER[nextIdx], daysLeft };
}

export default function CalendarioScreen() {
  const { day, contracts, loans, futures, timeDeposits } = useGameStore();

  const entries: CalendarEntry[] = [];

  // Contracts
  for (const c of contracts) {
    if (c.completed || c.failed) continue;
    const daysLeft = c.deadlineDay - day;
    const crop = CROP_TYPES.find(cr => cr.id === c.cropId);
    entries.push({
      id: `contract_${c.id}`,
      icon: daysLeft <= 3 ? '🚨' : daysLeft <= 7 ? '⚠️' : '📋',
      title: `Contract: ${crop?.name ?? c.cropId}`,
      detail: `${c.delivered}/${c.amount} ${crop?.unit ?? ''} delivered · due day ${c.deadlineDay}`,
      daysLeft,
      category: 'contract',
      urgent: daysLeft <= 5,
    });
  }

  // Loans
  for (const l of loans) {
    if (l.paid || l.defaulted) continue;
    const daysLeft = l.payoffDay - day;
    entries.push({
      id: `loan_${l.id}`,
      icon: daysLeft <= 7 ? '🚨' : '💳',
      title: `Loan due: ${l.label}`,
      detail: `$${Math.round(l.totalOwed).toLocaleString()} owed · day ${l.payoffDay}`,
      daysLeft,
      category: 'loan',
      urgent: daysLeft <= 7,
    });
  }

  // Futures
  for (const f of (futures ?? [])) {
    if (f.settled) continue;
    const daysLeft = f.deliveryDay - day;
    const crop = CROP_TYPES.find(c => c.id === f.cropId);
    entries.push({
      id: `future_${f.id}`,
      icon: '📊',
      title: `Futures: ${crop?.name ?? f.cropId}`,
      detail: `${f.quantity.toLocaleString()} ${crop?.unit ?? ''} @ $${f.lockPrice.toFixed(2)} · day ${f.deliveryDay}`,
      daysLeft,
      category: 'futures',
      urgent: daysLeft <= 5,
    });
  }

  // Time deposits
  for (const d of (timeDeposits ?? [])) {
    const daysLeft = (d.startDay + d.termDays) - day;
    entries.push({
      id: `deposit_${d.id}`,
      icon: '🏦',
      title: 'Time deposit matures',
      detail: `$${d.amount.toLocaleString()} at ${(d.rate * 100).toFixed(0)}% · day ${d.startDay + d.termDays}`,
      daysLeft,
      category: 'deposit',
      urgent: false,
    });
  }

  // Next season change
  const { season: nextSeason, daysLeft: seasonDays } = nextSeasonChange(day);
  entries.push({
    id: 'season_change',
    icon: SEASON_ICONS[nextSeason] ?? '🗓️',
    title: `${nextSeason.charAt(0).toUpperCase() + nextSeason.slice(1)} begins`,
    detail: 'New planting season',
    daysLeft: seasonDays,
    category: 'season',
    urgent: false,
  });

  // Sort by daysLeft ascending (overdue at top)
  entries.sort((a, b) => a.daysLeft - b.daysLeft);

  const overdue = entries.filter(e => e.daysLeft < 0);
  const upcoming = entries.filter(e => e.daysLeft >= 0);

  const CATEGORY_COLORS: Record<string, string> = {
    contract: '#1565c0',
    loan:     '#b71c1c',
    futures:  '#4a148c',
    deposit:  '#1b5e20',
    season:   '#e65100',
  };

  function EntryCard({ entry }: { entry: CalendarEntry }) {
    const color = CATEGORY_COLORS[entry.category];
    return (
      <View style={[styles.card, { borderLeftColor: color }, entry.urgent && styles.cardUrgent]}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardIcon}>{entry.icon}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, entry.urgent && styles.cardTitleUrgent]}>{entry.title}</Text>
          <Text style={styles.cardDetail}>{entry.detail}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: entry.daysLeft < 0 ? '#b71c1c' : entry.urgent ? '#bf360c' : '#1e2a3a' }]}>
          <Text style={styles.badgeDays}>
            {entry.daysLeft < 0 ? `${Math.abs(entry.daysLeft)}d overdue` : entry.daysLeft === 0 ? 'Today' : `${entry.daysLeft}d`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Calendar</Text>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.dayLabel}>Day {day} — {getSeason(day).charAt(0).toUpperCase() + getSeason(day).slice(1)}</Text>

        {overdue.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>OVERDUE</Text>
            {overdue.map(e => <EntryCard key={e.id} entry={e} />)}
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>UPCOMING</Text>
            {upcoming.map(e => <EntryCard key={e.id} entry={e} />)}
          </>
        )}

        {entries.length === 0 && (
          <Text style={styles.empty}>Nothing scheduled.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  screenTitle: {
    color: C.text,
    fontSize: F.size.xl,
    fontWeight: F.weight.bold,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
  scroll: { flex: 1, paddingHorizontal: 12 },
  dayLabel: { color: '#888', fontSize: 12, marginTop: 8, marginBottom: 4 },
  sectionLabel: { color: '#555', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  empty: { color: '#555', padding: 20, textAlign: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  cardUrgent: { backgroundColor: '#1a1010' },
  cardLeft: { marginRight: 10 },
  cardIcon: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  cardTitleUrgent: { color: '#ef9a9a' },
  cardDetail: { color: '#888', fontSize: 11, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8, alignItems: 'center', minWidth: 56 },
  badgeDays: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});
