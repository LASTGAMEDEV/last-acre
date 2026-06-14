import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import { gameDayToCalendarYear, gameDayToCalendarMonth } from '../../engine/calendarUtils';
import type { AnnualPlan } from '../../engine/annualPlanning';

const DAYS_PER_YEAR = 360;
const DAYS_PER_MONTH = 30;
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function SectionHeader({ title }: { title: string }) {
  return <Text style={ar.sectionHeader}>{title}</Text>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <View style={ar.card}>{children}</View>;
}
function StatRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={ar.statRow}>
      <Text style={ar.statLabel}>{label}</Text>
      <Text style={[ar.statValue, color ? { color } : {}, bold ? { fontWeight: 'bold' } : {}]}>{value}</Text>
    </View>
  );
}

export default function AnnualReportSection() {
  const {
    day, money, savings, loans, salesLog, cropsGrownThisYear,
    totalRevenue, parcels, animals, annualPlanning, reputation,
    personalRecords,
  } = useGameStore();

  const calYear   = gameDayToCalendarYear(day);
  const yearStart = (calYear - 1970) * DAYS_PER_YEAR + 1;
  const dayOfYear = day - yearStart + 1;
  const pctOfYear = Math.min(1, dayOfYear / DAYS_PER_YEAR);
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  // This-year sales
  const yearSales = salesLog.filter(s => s.day >= yearStart && s.day <= day);
  const yearRevenue = yearSales.reduce((a, s) => a + s.amount, 0);

  // Revenue by category
  const catMap: Record<string, number> = {};
  yearSales.forEach(s => {
    const cat = s.category ?? 'crops';
    catMap[cat] = (catMap[cat] ?? 0) + s.amount;
  });

  // Revenue by month (1–12)
  const monthlyRevenue: number[] = Array(12).fill(0);
  yearSales.forEach(s => {
    const m = gameDayToCalendarMonth(s.day) - 1; // 0-indexed
    monthlyRevenue[m] = (monthlyRevenue[m] ?? 0) + s.amount;
  });
  const maxMonthRev = Math.max(...monthlyRevenue, 1);
  const currentMonth = gameDayToCalendarMonth(day) - 1; // 0-indexed

  // Last year revenue for comparison
  const lastYearStart = yearStart - DAYS_PER_YEAR;
  const lastYearRevenue = salesLog
    .filter(s => s.day >= lastYearStart && s.day < yearStart)
    .reduce((a, s) => a + s.amount, 0);
  const revGrowth = lastYearRevenue > 0 ? ((yearRevenue / lastYearRevenue) - 1) * 100 : 0;

  // Top crops this year
  const cropRevMap: Record<string, number> = {};
  yearSales.filter(s => s.category === 'crops' && s.cropId).forEach(s => {
    cropRevMap[s.cropId!] = (cropRevMap[s.cropId!] ?? 0) + s.amount;
  });
  const topCrops = Object.entries(cropRevMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Debt
  const activeLoans = loans.filter(l => !l.paid && !l.defaulted);
  const totalDebt = activeLoans.reduce((s, l) => s + l.totalOwed, 0);
  const loansRepaidThisYear = loans.filter(l => l.paid && l.startDay >= yearStart).length;

  // Multi-year revenue comparison (up to 5 prior years)
  const currentGameYear = calYear - 1970; // years of farming (1-based)
  const multiYearData: Array<{ label: string; revenue: number }> = [];
  for (let y = Math.max(1, currentGameYear - 3); y <= currentGameYear; y++) {
    const ys = (y - 1) * DAYS_PER_YEAR + 1;
    const ye = y * DAYS_PER_YEAR;
    const rev = salesLog.filter(s => s.day >= ys && s.day <= ye).reduce((a, s) => a + s.amount, 0);
    multiYearData.push({ label: String(1970 + y - 1), revenue: rev });
  }
  const maxMultiYear = Math.max(...multiYearData.map(d => d.revenue), 1);

  // Annual goals from plan
  const plan: AnnualPlan | undefined = annualPlanning.active?.year === calYear
    ? annualPlanning.active
    : undefined;
  const review = annualPlanning.review?.year === calYear ? annualPlanning.review : undefined;
  const goalsData = plan?.goals ?? review?.completedGoals;

  // Farm snapshot
  const ownedParcels = parcels.filter(p => p.owned);
  const totalHa = ownedParcels.reduce((s, p) => s + p.hectares, 0);

  return (
    <ScrollView contentContainerStyle={ar.container} showsVerticalScrollIndicator={false}>

      {/* Year header */}
      <View style={ar.yearHeader}>
        <View>
          <Text style={ar.yearBadge}>ANNUAL REPORT</Text>
          <Text style={ar.yearTitle}>{calYear}</Text>
        </View>
        <View style={ar.yearProgress}>
          <Text style={ar.yearProgressLabel}>{dayOfYear}/{DAYS_PER_YEAR} days</Text>
          <View style={ar.yearProgressBar}>
            <View style={[ar.yearProgressFill, { width: `${Math.round(pctOfYear * 100)}%` as any }]} />
          </View>
          <Text style={ar.yearProgressPct}>{Math.round(pctOfYear * 100)}% complete</Text>
        </View>
      </View>

      {/* Revenue headline */}
      <SectionHeader title="💰 Revenue This Year" />
      <Card>
        <StatRow label="Total revenue" value={fmt(yearRevenue)} color="#4caf50" bold />
        {lastYearRevenue > 0 && (
          <StatRow
            label="vs last year"
            value={`${revGrowth >= 0 ? '+' : ''}${revGrowth.toFixed(1)}%`}
            color={revGrowth >= 0 ? '#4caf50' : '#ef5350'}
          />
        )}
        <StatRow label="Daily average" value={fmt(yearRevenue / Math.max(1, dayOfYear))} />
        <View style={ar.divider} />
        {(['crops','animals','processed','contracts'] as const).map(cat => {
          const v = catMap[cat] ?? 0;
          if (!v) return null;
          const icons: Record<string, string> = { crops: '🌾', animals: '🐄', processed: '🏭', contracts: '📋' };
          const pct = yearRevenue > 0 ? Math.round((v / yearRevenue) * 100) : 0;
          return <StatRow key={cat} label={`${icons[cat]} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`} value={`${fmt(v)} · ${pct}%`} />;
        })}
      </Card>

      {/* Monthly revenue chart */}
      <SectionHeader title="📅 Monthly Revenue" />
      <Card>
        <View style={ar.monthGrid}>
          {MONTH_ABBR.map((m, i) => {
            const rev = monthlyRevenue[i];
            const barPct = Math.round((rev / maxMonthRev) * 100);
            const isCurrent = i === currentMonth;
            const isFuture = i > currentMonth;
            return (
              <View key={m} style={ar.monthCol}>
                <View style={ar.monthBarTrack}>
                  <View style={[
                    ar.monthBarFill,
                    { height: `${barPct}%` as any },
                    isFuture ? ar.monthBarFuture : isCurrent ? ar.monthBarCurrent : ar.monthBarPast,
                  ]} />
                </View>
                <Text style={[ar.monthLabel, isCurrent && { color: C.text }]}>{m}</Text>
                {rev > 0 && <Text style={ar.monthVal}>${Math.round(rev / 1000) > 0 ? `${(rev / 1000).toFixed(0)}k` : Math.round(rev)}</Text>}
              </View>
            );
          })}
        </View>
      </Card>

      {/* Multi-year comparison */}
      {multiYearData.length > 1 && (
        <>
          <SectionHeader title="📊 Year-over-Year Revenue" />
          <Card>
            <View style={ar.multiYearGrid}>
              {multiYearData.map((d, i) => {
                const barPct = maxMultiYear > 0 ? (d.revenue / maxMultiYear) * 100 : 0;
                const isCurrentYear = i === multiYearData.length - 1;
                const prevRev = i > 0 ? multiYearData[i - 1].revenue : 0;
                const growth = prevRev > 0 ? ((d.revenue / prevRev) - 1) * 100 : null;
                return (
                  <View key={d.label} style={ar.multiYearCol}>
                    <Text style={[ar.multiYearRev, { color: isCurrentYear ? '#c8860a' : C.textMuted }]}>
                      {d.revenue >= 1000 ? `$${(d.revenue / 1000).toFixed(0)}k` : `$${d.revenue}`}
                    </Text>
                    {growth !== null && (
                      <Text style={{ color: growth >= 0 ? '#4caf50' : '#ef5350', fontSize: 8, marginBottom: 2 }}>
                        {growth >= 0 ? '▲' : '▼'}{Math.abs(growth).toFixed(0)}%
                      </Text>
                    )}
                    <View style={ar.multiYearBarTrack}>
                      <View style={[ar.multiYearBarFill, { height: `${barPct}%` as any, backgroundColor: isCurrentYear ? '#c8860a' : '#4a7c59' }]} />
                    </View>
                    <Text style={[ar.multiYearLabel, isCurrentYear && { color: C.text, fontWeight: 'bold' }]}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </>
      )}

      {/* Annual goals */}
      {(plan || review) && (
        <>
          <SectionHeader title="🎯 Annual Goals" />
          <Card>
            {review && (
              <View style={ar.reviewBanner}>
                <Text style={ar.reviewBannerText}>
                  ✅ Year reviewed: {review.completedGoals.length}/{(review.completedGoals.length + review.incompleteGoals.length)} goals completed
                </Text>
              </View>
            )}
            {(plan?.goals ?? []).map(goal => {
              const completed = plan?.completedGoalIds.includes(goal.id) ?? goal.completed;
              return (
                <View key={goal.id} style={ar.goalRow}>
                  <Text style={{ fontSize: 14, width: 20 }}>{completed ? '✅' : '⬜'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[ar.goalTitle, completed && { color: '#81c784' }]}>{goal.title}</Text>
                    <Text style={ar.goalMeta}>{goal.category} · {goal.unit ? `Target: ${goal.target} ${goal.unit}` : ''}</Text>
                  </View>
                </View>
              );
            })}
            {review && review.strongestResult && (
              <View style={{ marginTop: 8, backgroundColor: '#0a2a0a', borderRadius: R.sm, padding: S.sm }}>
                <Text style={{ color: '#81c784', fontSize: F.size.sm }}>💪 {review.strongestResult}</Text>
                {review.missedOpportunity && (
                  <Text style={{ color: '#ffb74d', fontSize: F.size.sm, marginTop: 4 }}>📌 {review.missedOpportunity}</Text>
                )}
              </View>
            )}
          </Card>
        </>
      )}

      {/* Top crops */}
      {topCrops.length > 0 && (
        <>
          <SectionHeader title="🌾 Top Crops by Revenue" />
          <Card>
            {topCrops.map(([cropId, rev], i) => {
              const crop = CROP_TYPES.find(c => c.id === cropId);
              const pct = yearRevenue > 0 ? (rev / yearRevenue) * 100 : 0;
              return (
                <View key={cropId} style={ar.cropRow}>
                  <Text style={ar.cropRank}>#{i + 1}</Text>
                  <Text style={ar.cropName}>{crop?.name ?? cropId}</Text>
                  <View style={ar.cropBarWrap}>
                    <View style={[ar.cropBar, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={ar.cropRev}>{fmt(rev)}</Text>
                </View>
              );
            })}
          </Card>
        </>
      )}

      {/* Crops grown this year */}
      {(cropsGrownThisYear ?? []).length > 0 && (
        <>
          <SectionHeader title="🌱 Crops Grown This Year" />
          <Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.xs }}>
              {(cropsGrownThisYear ?? []).map(cropId => {
                const crop = CROP_TYPES.find(c => c.id === cropId);
                return (
                  <View key={cropId} style={ar.cropChip}>
                    <Text style={ar.cropChipText}>{crop?.name ?? cropId}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </>
      )}

      {/* Finance snapshot */}
      <SectionHeader title="🏦 Finance Snapshot" />
      <Card>
        <StatRow label="Cash on hand"     value={fmt(money)}                color="#4caf50" bold />
        <StatRow label="Savings"          value={fmt(savings?.balance ?? 0)} color="#64b5f6" />
        <StatRow label="Total debt"       value={totalDebt > 0 ? `-${fmt(totalDebt)}` : 'Debt free'} color={totalDebt > 0 ? '#ef5350' : '#4caf50'} />
        {loansRepaidThisYear > 0 && (
          <StatRow label="Loans repaid this year" value={`${loansRepaidThisYear}`} color="#81c784" />
        )}
        <View style={ar.divider} />
        <StatRow label="Reputation score" value={`${Math.round(reputation?.score ?? 0)}/100`} color="#ce93d8" />
        <StatRow label="Total revenue (all time)" value={fmt(totalRevenue ?? 0)} />
        <StatRow label="All-time peak cash" value={fmt(personalRecords?.peakMoney ?? 0)} />
      </Card>

      {/* Farm snapshot */}
      <SectionHeader title="🏡 Farm at Year-End" />
      <Card>
        <StatRow label="Owned parcels"    value={`${ownedParcels.length}`} />
        <StatRow label="Total hectares"   value={`${totalHa.toFixed(1)} ha`} />
        <StatRow label="Animals"          value={`${animals.length}`} />
        <StatRow label="Days into game"   value={`Day ${day}`} />
      </Card>

      {/* First-Year Review — only shows in year 1 */}
      {calYear === 1970 && day >= 60 && (() => {
        const insights: { icon: string; text: string }[] = [];
        const harvestCount = personalRecords?.totalHarvests ?? 0;
        const completedContracts = (useGameStore.getState() as any).contracts?.filter((c: any) => c.completed).length ?? 0;
        const hasAnimals = animals.length > 0;
        const hasSavings = (savings?.balance ?? 0) >= 500;
        const revenue = yearRevenue;

        if (harvestCount >= 3)
          insights.push({ icon: '🌾', text: `You've completed ${harvestCount} harvests — you know how to grow a crop from seed to sale.` });
        else if (harvestCount >= 1)
          insights.push({ icon: '🌱', text: 'You planted and harvested your first crop — the hardest part is starting.' });
        if (completedContracts >= 1)
          insights.push({ icon: '📋', text: `You fulfilled ${completedContracts} contract${completedContracts > 1 ? 's' : ''} — buyers know your farm delivers.` });
        if (hasAnimals)
          insights.push({ icon: '🐄', text: `You started a livestock operation with ${animals.length} animal${animals.length > 1 ? 's' : ''}.` });
        if (hasSavings)
          insights.push({ icon: '🏦', text: `You kept $${Math.round(savings.balance).toLocaleString()} in savings — good financial discipline.` });
        if (revenue >= 5000)
          insights.push({ icon: '💰', text: `Year 1 revenue: ${fmt(revenue)}. Not bad for a first year.` });
        if ((reputation?.score ?? 0) >= 30)
          insights.push({ icon: '⭐', text: `Reputation score ${Math.round(reputation?.score ?? 0)} — the community is noticing you.` });

        const nextStepAdvice = !hasAnimals
          ? 'Year 2 tip: a small livestock operation adds daily income between harvests.'
          : revenue < 2000
          ? 'Year 2 tip: try locking in a contract before planting to guarantee income.'
          : ownedParcels.length < 3
          ? 'Year 2 tip: land expansion pays off — more parcels mean bigger harvests.'
          : 'Year 2 tip: consider diversifying into processing for higher margins.';

        return (
          <>
            <SectionHeader title="🌟 Year 1 in Review" />
            <View style={ar.reviewCard}>
              <Text style={ar.reviewTitle}>What you learned this year</Text>
              {insights.length === 0 ? (
                <Text style={ar.reviewBody}>The year is still early — keep farming and come back to see what you've built.</Text>
              ) : (
                insights.map((ins, i) => (
                  <View key={i} style={ar.reviewInsightRow}>
                    <Text style={ar.reviewInsightIcon}>{ins.icon}</Text>
                    <Text style={ar.reviewInsightText}>{ins.text}</Text>
                  </View>
                ))
              )}
              {day >= 180 && (
                <View style={ar.reviewNextStep}>
                  <Text style={ar.reviewNextStepText}>{nextStepAdvice}</Text>
                </View>
              )}
            </View>
          </>
        );
      })()}

    </ScrollView>
  );
}

const ar = StyleSheet.create({
  container:     { padding: S.md, gap: S.xs, paddingBottom: 40 },
  sectionHeader: { color: C.textMuted, fontSize: F.size.xs, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: S.md, marginBottom: 2 },
  card:          { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 2 },
  statRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  statLabel:     { color: C.textMuted, fontSize: F.size.sm, flex: 1 },
  statValue:     { color: C.text, fontSize: F.size.sm },
  divider:       { height: 1, backgroundColor: C.divider, marginVertical: 4 },

  yearHeader:        { backgroundColor: '#0f1f3d', borderRadius: R.lg, padding: S.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderWidth: 1, borderColor: '#c8860a33' },
  yearBadge:         { color: '#c8860a', fontSize: 9, fontWeight: 'bold', letterSpacing: 2, marginBottom: 2 },
  yearTitle:         { color: '#e8d5a3', fontSize: 28, fontWeight: 'bold' },
  yearProgress:      { alignItems: 'flex-end', gap: 4 },
  yearProgressLabel: { color: C.textMuted, fontSize: 10 },
  yearProgressBar:   { width: 80, height: 6, backgroundColor: '#1a2a3a', borderRadius: 3, overflow: 'hidden' },
  yearProgressFill:  { height: 6, backgroundColor: '#c8860a', borderRadius: 3 },
  yearProgressPct:   { color: '#c8860a', fontSize: 10, fontWeight: 'bold' },

  monthGrid:       { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 80 },
  monthCol:        { flex: 1, alignItems: 'center', height: '100%' as any, justifyContent: 'flex-end' },
  monthBarTrack:   { width: '100%', flex: 1, backgroundColor: '#1a2a3a', borderRadius: 2, overflow: 'hidden', justifyContent: 'flex-end' },
  monthBarFill:    { width: '100%', borderRadius: 2 },
  monthBarPast:    { backgroundColor: '#4a7c59' },
  monthBarCurrent: { backgroundColor: '#c8860a' },
  monthBarFuture:  { backgroundColor: '#1e2e3e' },
  monthLabel:      { color: C.textFaint, fontSize: 7, marginTop: 3 },
  monthVal:        { color: C.textFaint, fontSize: 7 },

  goalRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.divider },
  goalTitle:       { color: C.text, fontSize: F.size.sm },
  goalMeta:        { color: C.textFaint, fontSize: 9, marginTop: 1 },
  reviewBanner:    { backgroundColor: '#0a2a0a', borderRadius: R.sm, padding: S.sm, marginBottom: 6 },
  reviewBannerText:{ color: '#81c784', fontSize: F.size.sm, fontWeight: 'bold' },

  cropRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  cropRank:   { color: C.textFaint, fontSize: 10, width: 20 },
  cropName:   { color: C.text, fontSize: F.size.sm, width: 75 },
  cropBarWrap:{ flex: 1, height: 5, backgroundColor: C.bgDeep, borderRadius: 3, overflow: 'hidden' },
  cropBar:    { height: 5, backgroundColor: '#c8860a', borderRadius: 3 },
  cropRev:    { color: '#4caf50', fontSize: F.size.sm, width: 68, textAlign: 'right', fontWeight: 'bold' },

  cropChip:     { backgroundColor: C.bgDeep, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3 },
  cropChipText: { color: C.textMuted, fontSize: F.size.xs },

  multiYearGrid:     { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 },
  multiYearCol:      { flex: 1, alignItems: 'center', height: '100%' as any, justifyContent: 'flex-end' },
  multiYearBarTrack: { width: '100%', flex: 1, backgroundColor: '#1a2a3a', borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  multiYearBarFill:  { width: '100%', borderRadius: 3 },
  multiYearLabel:    { color: C.textFaint, fontSize: 9, marginTop: 4 },
  // First-year review
  reviewCard:           { backgroundColor: '#0d1f2e', borderRadius: R.lg, padding: S.md, borderWidth: 1, borderColor: '#c8860a44' },
  reviewTitle:          { color: '#c8860a', fontSize: F.size.sm, fontWeight: 'bold', marginBottom: S.sm },
  reviewBody:           { color: C.textMuted, fontSize: F.size.sm, lineHeight: 18 },
  reviewInsightRow:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
  reviewInsightIcon:    { fontSize: 14, width: 20, lineHeight: 18 },
  reviewInsightText:    { color: C.text, fontSize: F.size.sm, flex: 1, lineHeight: 18 },
  reviewNextStep:       { marginTop: S.sm, backgroundColor: '#1a2e3a', borderRadius: R.sm, padding: S.sm, borderLeftWidth: 3, borderLeftColor: '#64b5f6' },
  reviewNextStepText:   { color: '#90caf9', fontSize: F.size.sm, lineHeight: 16 },
  multiYearRev:      { fontSize: 9, fontWeight: 'bold', marginBottom: 2 },
});
