import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { getSeason } from '../../engine/climate';
import { SEASON_THEME, C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import { ANIMAL_TYPES } from '../../data/animalTypes';

function DashboardSection() {
  const {
    money, savings, day, loans, contracts, seasonGoals, seasonHarvestCount,
    seasonStartRevenue, totalRevenue, parcels, animals, npcFarms, salesLog,
    personalRecords, inventory, prices,
  } = useGameStore();
  const season = getSeason(day);
  const theme = SEASON_THEME[season];

  const ownedParcels = parcels.filter(p => p.owned);
  const cropsReady = ownedParcels.filter(p => p.plantedCrop).length; // simplified

  // Net worth
  const inventoryValue = CROP_TYPES.reduce((sum, crop) => {
    const qty = inventory[crop.id] ?? 0;
    const price = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
    return sum + qty * price;
  }, 0);
  const animalValue = animals.reduce((sum, a) => {
    const type = ANIMAL_TYPES.find(t => t.id === a.typeId);
    return sum + (type?.buyCost ?? 0) * 0.6; // resale ~60%
  }, 0);
  const netWorth = money + savings.balance + inventoryValue + animalValue;
  const urgentLoans = loans.filter(l => !l.paid && !l.defaulted && l.payoffDay - day <= 7 && l.payoffDay >= day);
  const urgentContracts = contracts.filter(c => !c.completed && !c.failed && c.deadlineDay - day <= 7 && c.deadlineDay >= day);
  const rev7 = salesLog.filter(s => s.day >= day - 7).reduce((a, s) => a + s.amount, 0);
  const rev30 = salesLog.filter(s => s.day >= day - 30).reduce((a, s) => a + s.amount, 0);
  const topRival = [...(npcFarms ?? [])].sort((a, b) => b.wealth - a.wealth)[0];
  const seasonEarned = Math.max(0, (totalRevenue ?? 0) - (seasonStartRevenue ?? 0));
  const activeGoals = seasonGoals.filter(g => !g.claimed);

  function Card({ title, value, color, sub }: { title: string; value: string; color?: string; sub?: string }) {
    return (
      <View style={dash.card}>
        <Text style={dash.cardLabel}>{title}</Text>
        <Text style={[dash.cardValue, color ? { color } : {}]}>{value}</Text>
        {sub ? <Text style={dash.cardSub}>{sub}</Text> : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
      {/* Warnings row */}
      {(urgentLoans.length > 0 || urgentContracts.length > 0) && (
        <View style={[dash.warnBanner]}>
          {urgentLoans.map(l => (
            <Text key={l.id} style={dash.warnText}>⚠️ Loan ${ Math.round(l.totalOwed).toLocaleString()} due in {l.payoffDay - day}d</Text>
          ))}
          {urgentContracts.map(c => (
            <Text key={c.id} style={dash.warnText}>⚠️ Contract deadline in {c.deadlineDay - day}d</Text>
          ))}
        </View>
      )}

      {/* Finances row */}
      <View style={dash.row}>
        <Card title="💵 CASH" value={`$${Math.round(money).toLocaleString()}`} color="#4caf50" />
        <Card title="🏦 SAVINGS" value={`$${Math.round(savings.balance).toLocaleString()}`} color="#64b5f6" />
      </View>

      {/* Net worth */}
      <View style={dash.netWorthCard}>
        <Text style={dash.netWorthLabel}>💎 NET WORTH</Text>
        <Text style={dash.netWorthValue}>${Math.round(netWorth).toLocaleString()}</Text>
        <View style={dash.netWorthBreakdown}>
          <Text style={dash.netWorthSub}>Cash ${Math.round(money).toLocaleString()}</Text>
          <Text style={dash.netWorthDot}>·</Text>
          <Text style={dash.netWorthSub}>Savings ${Math.round(savings.balance).toLocaleString()}</Text>
          <Text style={dash.netWorthDot}>·</Text>
          <Text style={dash.netWorthSub}>Stock ${Math.round(inventoryValue).toLocaleString()}</Text>
          {animalValue > 0 && <><Text style={dash.netWorthDot}>·</Text><Text style={dash.netWorthSub}>Animals ${Math.round(animalValue).toLocaleString()}</Text></>}
        </View>
      </View>

      {/* Revenue row */}
      <View style={dash.row}>
        <Card title="📈 7-DAY REV" value={`$${Math.round(rev7).toLocaleString()}`} />
        <Card title="📊 30-DAY REV" value={`$${Math.round(rev30).toLocaleString()}`} />
      </View>

      {/* Farm row */}
      <View style={dash.row}>
        <Card title="🌾 OWNED PLOTS" value={`${ownedParcels.length}`} sub={`${ownedParcels.reduce((s, p) => s + p.hectares, 0).toFixed(1)} ha`} />
        <Card title="🐄 ANIMALS" value={`${animals.length}`} />
      </View>

      {/* Season goals strip */}
      {activeGoals.length > 0 && (
        <View style={dash.goalsCard}>
          <Text style={dash.goalsTitle}>{season.charAt(0).toUpperCase() + season.slice(1)} Goals</Text>
          {activeGoals.map(goal => {
            let progress = 0;
            if (goal.type === 'earn') progress = Math.min(1, seasonEarned / goal.target);
            if (goal.type === 'harvest_count') progress = Math.min(1, (seasonHarvestCount ?? 0) / goal.target);
            if (goal.type === 'own_ha') progress = Math.min(1, ownedParcels.reduce((s, p) => s + p.hectares, 0) / goal.target);
            return (
              <View key={goal.id} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#ccc', fontSize: 11 }}>{goal.icon} {goal.label}</Text>
                  <Text style={{ color: C.text, fontSize: 11 }}>{Math.round(progress * 100)}%</Text>
                </View>
                <View style={{ height: 4, backgroundColor: '#0d1117', borderRadius: 2, marginTop: 3 }}>
                  <View style={{ height: 4, width: `${Math.round(progress * 100)}%` as any, backgroundColor: progress >= 1 ? C.green : theme.accent, borderRadius: 2 }} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Top rival */}
      {topRival && (
        <View style={dash.rivalCard}>
          <Text style={{ color: '#ef9a9a', fontSize: 12, fontWeight: 'bold' }}>🏭 Top Rival: {topRival.name}</Text>
          <Text style={{ color: C.textMuted, fontSize: 11 }}>Wealth: ${Math.round(topRival.wealth).toLocaleString()} · sells in {Math.max(0, topRival.nextSellDay - day)}d</Text>
        </View>
      )}

      {/* Records peek */}
      <View style={dash.goalsCard}>
        <Text style={dash.goalsTitle}>📊 Personal Bests</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textMuted, fontSize: 10 }}>Peak Cash</Text>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: 'bold' }}>${Math.round(personalRecords?.peakMoney ?? 0).toLocaleString()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textMuted, fontSize: 10 }}>Total Harvests</Text>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: 'bold' }}>{personalRecords?.totalHarvests ?? 0}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textMuted, fontSize: 10 }}>Days Survived</Text>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: 'bold' }}>{personalRecords?.longestDay ?? day}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const dash = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 8 },
  card:      { flex: 1, backgroundColor: C.bgCard, borderRadius: 10, padding: S.md },
  cardLabel: { color: C.textMuted, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: S.xs },
  cardValue: { color: C.text, fontSize: F.size.xxl, fontWeight: 'bold' },
  cardSub:   { color: '#555', fontSize: F.size.xs, marginTop: 2 },
  netWorthCard:      { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, borderWidth: 1, borderColor: '#c8860a33' },
  netWorthLabel:     { color: C.textMuted, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  netWorthValue:     { color: '#c8860a', fontSize: 24, fontWeight: 'bold' },
  netWorthBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: S.xs, alignItems: 'center' },
  netWorthSub:       { color: '#555', fontSize: F.size.xs },
  netWorthDot:       { color: '#333', fontSize: F.size.xs },
  warnBanner:{ backgroundColor: '#3a1a00', borderRadius: R.md, padding: 10, gap: 4 },
  warnText:  { color: '#ffb74d', fontSize: 11, fontWeight: 'bold' },
  goalsCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md },
  goalsTitle:{ color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  rivalCard: { backgroundColor: '#1a1030', borderRadius: 10, padding: S.md, borderWidth: 1, borderColor: '#ef9a9a33' },
});

export default DashboardSection;
