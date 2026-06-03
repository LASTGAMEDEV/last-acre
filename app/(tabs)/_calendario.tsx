import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import { getSeason } from '../../engine/climate';

type CalendarEntry = {
  id: string;
  icon: string;
  title: string;
  detail: string;
  daysLeft: number;
  category: 'contract' | 'loan' | 'futures' | 'season' | 'deposit' | 'recurring';
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
  const { day, contracts, loans, futures, timeDeposits, recurringContracts, buyers } = useGameStore();

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

  // Recurring contract delivery windows
  for (const c of (recurringContracts ?? [])) {
    if (!c.active) continue;
    if (c.nextDeliveryDay < day) continue;
    const buyer = (buyers ?? []).find((b) => b.id === c.buyerId);
    const daysLeft = c.nextDeliveryDay - day;
    const windowCloseDay = c.nextDeliveryDay + c.deliveryWindowDays;
    const daysToClose = windowCloseDay - day;
    const urgent = daysToClose <= 3;
    entries.push({
      id: `rc_${c.id}`,
      icon: urgent ? '⚠️' : '📋',
      title: `${buyer?.emoji ?? '🏭'} ${buyer?.name ?? c.buyerId} delivery`,
      detail: `${c.cropId} · ${c.amountPerDelivery} kg · window closes day ${windowCloseDay}`,
      daysLeft,
      category: 'recurring',
      urgent,
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
    contract:  '#1565c0',
    loan:      C.redDark,
    futures:   '#4a148c',
    deposit:   '#1b5e20',
    season:    '#e65100',
    recurring: C.greenDark,
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
        <View style={[styles.badge, { backgroundColor: entry.daysLeft < 0 ? C.redDark : entry.urgent ? '#bf360c' : C.bgElevated }]}>
          <Text style={styles.badgeDays}>
            {entry.daysLeft < 0 ? `${Math.abs(entry.daysLeft)}d overdue` : entry.daysLeft === 0 ? 'Today' : `${entry.daysLeft}d`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Calendar</Text>
      </View>
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
  scroll: { flex: 1, paddingHorizontal: S.md },
  dayLabel: { color: C.textMuted, fontSize: F.size.sm, marginTop: S.sm, marginBottom: S.xs },
  sectionLabel: { color: C.textFaint, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginTop: S.md, marginBottom: 6 },
  empty: { color: C.textFaint, padding: 20, textAlign: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgCard,
    borderRadius: 10,
    padding: S.md,
    marginBottom: S.sm,
    borderLeftWidth: 3,
  },
  cardUrgent: { backgroundColor: C.bgDeep },
  cardLeft: { marginRight: 10 },
  cardIcon: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  cardTitleUrgent: { color: C.red },
  cardDetail: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  badge: { borderRadius: R.md, paddingHorizontal: S.sm, paddingVertical: S.xs, marginLeft: S.sm, alignItems: 'center', minWidth: 56 },
  badgeDays: { color: C.white, fontSize: 11, fontWeight: 'bold' },
});
