import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { getSeason } from '../../engine/climate';
import { isReady } from '../../engine/crops';
import { SEASON_THEME, C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import { ANIMAL_TYPES } from '../../data/animalTypes';
import { MACHINE_TYPES } from '../../data/machineTypes';
import GuideButton from '../GuideButton';
import FarmLegacyCard from './FarmLegacyCard';

type Priority = { icon: string; label: string; severity: 'critical' | 'warning' | 'action' };

function DashboardSection() {
  const {
    money, savings, day, loans, contracts, seasonGoals, seasonHarvestCount,
    seasonStartRevenue, totalRevenue, parcels, animals, npcFarms, salesLog,
    personalRecords, inventory, prices, animalWelfareScores, reputation, farmStyle,
    animalInventory, machines,
  } = useGameStore();
  const season = getSeason(day);
  const theme = SEASON_THEME[season];

  const ownedParcels = parcels.filter(p => p.owned);

  // Net worth
  const inventoryValue = CROP_TYPES.reduce((sum, crop) => {
    const qty = inventory[crop.id] ?? 0;
    const price = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
    return sum + qty * price;
  }, 0);
  const animalValue = animals.reduce((sum, a) => {
    const type = ANIMAL_TYPES.find(t => t.id === a.typeId);
    return sum + (type?.buyCost ?? 0) * 0.6;
  }, 0);
  const netWorth = money + savings.balance + inventoryValue + animalValue;

  const urgentLoans = loans.filter(l => !l.paid && !l.defaulted && l.payoffDay - day <= 7 && l.payoffDay >= day);
  const urgentContracts = contracts.filter(c => !c.completed && !c.failed && c.deadlineDay - day <= 7 && c.deadlineDay >= day);
  const rev7 = salesLog.filter(s => s.day >= day - 7).reduce((a, s) => a + s.amount, 0);
  const rev30 = salesLog.filter(s => s.day >= day - 30).reduce((a, s) => a + s.amount, 0);
  const topRival = [...(npcFarms ?? [])].sort((a, b) => b.wealth - a.wealth)[0];
  const seasonEarned = Math.max(0, (totalRevenue ?? 0) - (seasonStartRevenue ?? 0));
  const activeGoals = seasonGoals.filter(g => !g.claimed);

  // ── Today's Priorities ────────────────────────────────────────────────────
  const priorities: Priority[] = [];

  // Crops ready to harvest
  const readyParcels = ownedParcels.filter(p => {
    if (!p.plantedCrop) return false;
    const cropType = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
    return cropType ? isReady(p.plantedCrop, cropType, day) : false;
  });
  if (readyParcels.length > 0) {
    const names = [...new Set(readyParcels.map(p => {
      const ct = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
      return ct?.name ?? p.plantedCrop!.cropId;
    }))];
    priorities.push({
      icon: '🌾',
      label: `${readyParcels.length} plot${readyParcels.length > 1 ? 's' : ''} ready to harvest (${names.slice(0, 2).join(', ')}${names.length > 2 ? '…' : ''})`,
      severity: 'action',
    });
  }

  // Loans due
  urgentLoans.forEach(l => {
    const daysLeft = l.payoffDay - day;
    priorities.push({
      icon: '🏦',
      label: `Loan $${Math.round(l.totalOwed).toLocaleString()} due in ${daysLeft}d`,
      severity: daysLeft <= 3 ? 'critical' : 'warning',
    });
  });

  // Contracts at risk
  urgentContracts.forEach(c => {
    const daysLeft = c.deadlineDay - day;
    priorities.push({
      icon: '📋',
      label: `Contract deadline in ${daysLeft}d`,
      severity: daysLeft <= 3 ? 'critical' : 'warning',
    });
  });

  // Diseased plots
  const diseasedParcels = ownedParcels.filter(p => p.diseased);
  if (diseasedParcels.length > 0) {
    priorities.push({
      icon: '🦠',
      label: `${diseasedParcels.length} plot${diseasedParcels.length > 1 ? 's' : ''} diseased — treat or harvest soon`,
      severity: 'critical',
    });
  }

  // Low animal welfare
  const welfareScores = animalWelfareScores ?? {};
  const lowWelfareSpecies = Object.entries(welfareScores).filter(([, score]) => (score as number) < 60);
  lowWelfareSpecies.forEach(([typeId, score]) => {
    const animalType = ANIMAL_TYPES.find(a => a.id === typeId);
    const name = animalType?.name ?? typeId;
    priorities.push({
      icon: '🐄',
      label: `${name} welfare low (${Math.round(score as number)}%) — check feed & housing`,
      severity: (score as number) < 40 ? 'critical' : 'warning',
    });
  });

  // Machine condition warnings
  (machines ?? []).forEach(m => {
    const cond = m.condition ?? 100;
    if (cond < 20) {
      const mType = MACHINE_TYPES.find(t => t.id === m.typeId);
      priorities.push({
        icon: '🔧',
        label: `${mType?.name ?? 'Machine'} condition critical (${Math.round(cond)}%) — repair immediately`,
        severity: 'critical',
      });
    } else if (cond < 40) {
      const mType = MACHINE_TYPES.find(t => t.id === m.typeId);
      priorities.push({
        icon: '⚙️',
        label: `${mType?.name ?? 'Machine'} needs maintenance (${Math.round(cond)}%)`,
        severity: 'warning',
      });
    }
  });

  // Sort: critical first, then warning, then action
  const ORDER: Record<Priority['severity'], number> = { critical: 0, warning: 1, action: 2 };
  priorities.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

  // ── Farm Identity ─────────────────────────────────────────────────────────
  const organicParcelCount = ownedParcels.filter(p => p.organicStatus === 'organic').length;
  const animalRev90   = salesLog.filter(s => s.day >= day - 90 && s.category === 'animals').reduce((a, s) => a + s.amount, 0);
  const cropRev90     = salesLog.filter(s => s.day >= day - 90 && s.category === 'crops').reduce((a, s) => a + s.amount, 0);
  const processedRev90 = salesLog.filter(s => s.day >= day - 90 && s.category === 'processed').reduce((a, s) => a + s.amount, 0);
  const isOrganicFarm = organicParcelCount > 0 && organicParcelCount >= Math.ceil(ownedParcels.length * 0.5);
  let farmTypeLabel = 'Farm';
  if (farmStyle === 'livestock' && day < 365)          farmTypeLabel = 'Livestock Farm';
  else if (farmStyle === 'crop_focus' && day < 365)    farmTypeLabel = 'Crop Farm';
  else if (farmStyle === 'market_trader' && day < 365) farmTypeLabel = 'Trading Farm';
  else if (ownedParcels.length === 0)                                                  farmTypeLabel = 'Starting Farm';
  else if (animals.length >= 20 && animalRev90 > cropRev90 * 1.2)                     farmTypeLabel = 'Livestock Operation';
  else if (animals.length >= 5 && animalRev90 >= cropRev90 * 0.5 && cropRev90 > 0)   farmTypeLabel = 'Mixed Farm';
  else if (processedRev90 > 0 && processedRev90 >= cropRev90 + animalRev90)           farmTypeLabel = 'Processing Specialist';
  else                                                                                  farmTypeLabel = 'Grain Farm';
  const farmIdentity = (isOrganicFarm ? 'Organic ' : '') + farmTypeLabel;

  // ── Opportunity & tip cards ───────────────────────────────────────────────
  type OpCard = { icon: string; title: string; detail: string; kind: 'opportunity' | 'tip' | 'warning' };
  const opCards: OpCard[] = [];

  CROP_TYPES.forEach(crop => {
    const qty = inventory[crop.id] ?? 0;
    if (qty <= 0) return;
    const currentPrice = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
    if (currentPrice >= crop.basePrice * 1.25) {
      opCards.push({
        icon: '📈',
        title: `${crop.name} prices are high`,
        detail: `$${currentPrice.toFixed(2)} (+${Math.round((currentPrice / crop.basePrice - 1) * 100)}%) — ${qty.toLocaleString()} units in stock.`,
        kind: 'opportunity',
      });
    }
  });

  const idleParcels = ownedParcels.filter(p => !p.plantedCrop);
  if (idleParcels.length > 0) {
    opCards.push({
      icon: '🌱',
      title: `${idleParcels.length} idle plot${idleParcels.length > 1 ? 's' : ''} ready to plant`,
      detail: `${idleParcels.length > 1 ? 'These' : 'This'} can be planted this ${season}.`,
      kind: 'tip',
    });
  }

  if (animals.length >= 2) {
    const GRAIN_IDS = ['corn', 'barley', 'oats', 'sorghum', 'grass', 'alfalfa'];
    const grainStock = GRAIN_IDS.reduce((sum, id) => sum + (inventory[id] ?? 0), 0);
    const hayStock = (animalInventory ?? {})['hay'] ?? 0;
    const dailyGrainDemand = animals.reduce((sum, a) => {
      const type = ANIMAL_TYPES.find(t => t.id === a.typeId);
      return sum + (type?.feedType === 'grain' ? (type.feedKgPerDay ?? 0) : 0);
    }, 0);
    const dailyHayDemand = animals.reduce((sum, a) => {
      const type = ANIMAL_TYPES.find(t => t.id === a.typeId);
      return sum + (type?.feedType === 'hay' ? (type.feedKgPerDay ?? 0) : 0);
    }, 0);
    const grainDaysLeft = dailyGrainDemand > 0 ? Math.floor(grainStock / dailyGrainDemand) : 999;
    const hayDaysLeft = dailyHayDemand > 0 ? Math.floor(hayStock / dailyHayDemand) : 999;
    // Warn if critical (< 7 days) or winter is approaching (season === 'autumn' and < 60 days feed)
    const winterApproaching = season === 'autumn';
    const winterDaysNeeded = 90;
    if (dailyGrainDemand > 0 && (grainDaysLeft < 7 || (winterApproaching && grainDaysLeft < winterDaysNeeded))) {
      opCards.push({
        icon: '🌾',
        title: grainDaysLeft < 7 ? 'Grain reserves critically low' : 'Grain: not enough for winter',
        detail: `${grainDaysLeft}d left at ${dailyGrainDemand.toFixed(1)} kg/day. ${winterApproaching ? `Need ~${Math.round(dailyGrainDemand * winterDaysNeeded)} kg for winter.` : 'Buy or grow grain now.'}`,
        kind: grainDaysLeft < 7 ? 'warning' : 'tip',
      });
    }
    if (dailyHayDemand > 0 && (hayDaysLeft < 7 || (winterApproaching && hayDaysLeft < winterDaysNeeded))) {
      opCards.push({
        icon: '🌿',
        title: hayDaysLeft < 7 ? 'Hay reserves critically low' : 'Hay: not enough for winter',
        detail: `${hayDaysLeft}d left at ${dailyHayDemand.toFixed(1)} kg/day. ${winterApproaching ? `Need ~${Math.round(dailyHayDemand * winterDaysNeeded)} kg for winter.` : 'Cut hay or buy bales now.'}`,
        kind: hayDaysLeft < 7 ? 'warning' : 'tip',
      });
    }
  }

  const isNewPlayer = day < 120 && (personalRecords?.totalHarvests ?? 0) < 5;
  if (isNewPlayer && idleParcels.length > 0) {
    const candidates = CROP_TYPES.filter(c => c.seasons.includes(season) && (c.tier === 'D' || c.tier === 'C'));
    const rec = candidates.find(c => c.growthDays <= 90) ?? candidates[0];
    if (rec) {
      opCards.push({
        icon: '💡',
        title: `Beginner tip: plant ${rec.name} this ${season}`,
        detail: `${rec.growthDays}-day growth, low input cost ($${rec.seedCost}/ha seed). Great first-harvest crop.`,
        kind: 'tip',
      });
    }
  }

  // ── Recent sales ─────────────────────────────────────────────────────────
  const recentSales = salesLog
    .filter(s => s.day >= day - 14 && s.amount > 0)
    .sort((a, b) => b.day - a.day)
    .slice(0, 5);

  // ── Farm Health score ─────────────────────────────────────────────────────
  const totalDebt = loans.filter(l => !l.paid && !l.defaulted).reduce((s, l) => s + l.totalOwed, 0);
  const cashScore = Math.min(money / 10000, 1) * 25;
  const debtScore = totalDebt === 0 ? 25 : Math.max(0, 1 - totalDebt / (money + savings.balance + 1)) * 25;
  const avgFertility = ownedParcels.length > 0
    ? ownedParcels.reduce((s, p) => s + p.fertility, 0) / ownedParcels.length
    : 25;
  const soilScore = (avgFertility / 25) * 25;
  const welfareList = Object.values(welfareScores) as number[];
  const welfareScore = welfareList.length === 0 ? 25 : (welfareList.reduce((s, v) => s + v, 0) / welfareList.length / 100) * 25;
  const repScore = ((reputation?.score ?? 0) / 100) * 25;
  const farmHealth = Math.round(cashScore + debtScore + soilScore + welfareScore + repScore);
  const healthColor = farmHealth >= 75 ? '#4caf50' : farmHealth >= 50 ? '#f59e0b' : farmHealth >= 30 ? '#f97316' : '#ef4444';

  function Card({
    title,
    value,
    color,
    sub,
    guideEntryId,
  }: {
    title: string;
    value: string;
    color?: string;
    sub?: string;
    guideEntryId?: string;
  }) {
    return (
      <View style={dash.card}>
        <View style={dash.cardHeader}>
          <Text style={dash.cardLabel}>{title}</Text>
          {guideEntryId && <GuideButton entryId={guideEntryId} compact />}
        </View>
        <Text style={[dash.cardValue, color ? { color } : {}]}>{value}</Text>
        {sub ? <Text style={dash.cardSub}>{sub}</Text> : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
      {/* Farm Identity */}
      <View style={dash.identityRow}>
        <Text style={dash.identityText}>🏡 {farmIdentity}</Text>
        {isOrganicFarm && <View style={dash.organicBadge}><Text style={dash.organicBadgeText}>🌿 Organic</Text></View>}
        <Text style={dash.identityDay}>Day {day}</Text>
      </View>

      {/* Today's Priorities */}
      <View style={dash.prioritiesCard}>
        <Text style={dash.prioritiesTitle}>Today's Priorities</Text>
        {priorities.length === 0 ? (
          <Text style={dash.allClear}>✅ All clear — nothing urgent today</Text>
        ) : (
          priorities.map((p, i) => (
            <View key={i} style={[dash.priorityRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#1a1f2e' }]}>
              <View style={[dash.priorityDot, { backgroundColor: p.severity === 'critical' ? '#ef4444' : p.severity === 'warning' ? '#f59e0b' : '#22c55e' }]} />
              <Text style={[dash.priorityText, { color: p.severity === 'critical' ? '#fca5a5' : p.severity === 'warning' ? '#fcd34d' : '#86efac' }]}>
                {p.icon} {p.label}
              </Text>
            </View>
          ))
        )}
      </View>

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

      {/* Farm Health */}
      <View style={dash.healthCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm }}>
          <Text style={dash.goalsTitle}>🌿 Farm Health</Text>
          <Text style={[dash.healthScore, { color: healthColor }]}>{farmHealth}/100</Text>
        </View>
        <View style={dash.healthBar}>
          <View style={[dash.healthFill, { width: `${farmHealth}%` as any, backgroundColor: healthColor }]} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.sm }}>
          {[
            { label: 'Cash', score: cashScore },
            { label: 'Debt', score: debtScore },
            { label: 'Soil', score: soilScore },
            { label: 'Welfare', score: welfareScore },
            { label: 'Rep', score: repScore },
          ].map(({ label, score }) => {
            const pct = Math.round((score / 25) * 100);
            const col = pct >= 75 ? '#4caf50' : pct >= 50 ? '#f59e0b' : '#ef4444';
            return (
              <View key={label} style={dash.healthPill}>
                <Text style={[dash.healthPillText, { color: col }]}>{label} {pct}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Farm Legacy / Progression */}
      <FarmLegacyCard />

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

      {/* Opportunities & Tips */}
      {opCards.length > 0 && (
        <View style={dash.opCard}>
          <Text style={dash.goalsTitle}>💡 Opportunities & Tips</Text>
          {opCards.map((op, i) => (
            <View key={i} style={[dash.opRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#1a1f2e' }]}>
              <Text style={dash.opIcon}>{op.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[dash.opTitle, { color: op.kind === 'opportunity' ? '#4caf50' : op.kind === 'warning' ? '#f59e0b' : '#64b5f6' }]}>
                  {op.title}
                </Text>
                <Text style={dash.opDetail}>{op.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recent Sales Timeline */}
      {recentSales.length > 0 && (
        <View style={dash.goalsCard}>
          <Text style={dash.goalsTitle}>📅 Recent Sales</Text>
          {recentSales.map((s, i) => (
            <View key={i} style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, i > 0 && { marginTop: 5 }]}>
              <Text style={{ color: C.textMuted, fontSize: 11, textTransform: 'capitalize' }}>
                {s.category ?? 'sale'} · Day {s.day}
              </Text>
              <Text style={{ color: '#4caf50', fontSize: 11, fontWeight: 'bold' }}>+${Math.round(s.amount).toLocaleString()}</Text>
            </View>
          ))}
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
  cardHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.sm },
  cardLabel: { color: C.textMuted, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: S.xs },
  cardValue: { color: C.text, fontSize: F.size.xxl, fontWeight: 'bold' },
  cardSub:   { color: '#555', fontSize: F.size.xs, marginTop: 2 },
  netWorthCard:      { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, borderWidth: 1, borderColor: '#c8860a33' },
  netWorthLabel:     { color: C.textMuted, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  netWorthValue:     { color: '#c8860a', fontSize: 24, fontWeight: 'bold' },
  netWorthBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: S.xs, alignItems: 'center' },
  netWorthSub:       { color: '#555', fontSize: F.size.xs },
  netWorthDot:       { color: '#333', fontSize: F.size.xs },
  goalsCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md },
  goalsTitle:{ color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  rivalCard: { backgroundColor: '#1a1030', borderRadius: 10, padding: S.md, borderWidth: 1, borderColor: '#ef9a9a33' },
  // Today's Priorities
  prioritiesCard:  { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 0 },
  prioritiesTitle: { color: C.text, fontSize: F.size.sm, fontWeight: 'bold', marginBottom: S.sm },
  allClear:        { color: '#4caf50', fontSize: F.size.sm },
  priorityRow:     { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 6 },
  priorityDot:     { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  priorityText:    { fontSize: F.size.sm, flexShrink: 1 },
  // Farm Identity
  identityRow:      { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md },
  identityText:     { flex: 1, color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  identityDay:      { color: C.textMuted, fontSize: F.size.xs },
  organicBadge:     { backgroundColor: '#0f2a1a', borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#1e5a30' },
  organicBadgeText: { color: '#4caf50', fontSize: F.size.xs, fontWeight: 'bold' },
  // Opportunity cards
  opCard:   { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 0 },
  opRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, paddingVertical: 7 },
  opIcon:   { fontSize: 18, lineHeight: 22 },
  opTitle:  { fontSize: F.size.sm, fontWeight: 'bold', marginBottom: 1 },
  opDetail: { color: C.textMuted, fontSize: F.size.xs, lineHeight: 16 },
  // Farm Health
  healthCard:      { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md },
  healthScore:     { fontSize: F.size.xl, fontWeight: 'bold' },
  healthBar:       { height: 6, backgroundColor: '#1a1f2e', borderRadius: 3, overflow: 'hidden' },
  healthFill:      { height: 6, borderRadius: 3 },
  healthPill:      { backgroundColor: '#1a1f2e', borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3 },
  healthPillText:  { fontSize: F.size.xs, fontWeight: 'bold' },
});

export default DashboardSection;
