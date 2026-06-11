import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';

const CATEGORY_LABELS: Record<string, string> = {
  crops:     '🌾 Crops',
  animals:   '🐄 Animals',
  processed: '🏭 Processing',
  contracts: '📋 Contracts',
};

function StatRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={fr.statRow}>
      <Text style={fr.statLabel}>{label}</Text>
      <Text style={[fr.statValue, color ? { color } : {}, bold ? { fontWeight: 'bold' } : {}]}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={fr.sectionHeader}>{title}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={fr.card}>{children}</View>;
}

function BarChart({ segments }: { segments: { label: string; amount: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.amount, 0);
  if (total === 0) return <Text style={fr.emptyText}>No data in this period</Text>;
  return (
    <View style={fr.barWrap}>
      <View style={fr.barTrack}>
        {segments.filter(s => s.amount > 0).map((seg, i) => (
          <View
            key={i}
            style={[fr.barSeg, { width: `${Math.round((seg.amount / total) * 100)}%` as any, backgroundColor: seg.color }]}
          />
        ))}
      </View>
      <View style={fr.legend}>
        {segments.filter(s => s.amount > 0).map((seg, i) => (
          <View key={i} style={fr.legendItem}>
            <View style={[fr.legendDot, { backgroundColor: seg.color }]} />
            <Text style={fr.legendText}>{seg.label} {Math.round((seg.amount / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function FinancialReportSection() {
  const { day, money, savings, loans, contracts, salesLog, totalRevenue, loanHistory } = useGameStore();

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  // Revenue periods
  const rev7  = salesLog.filter(s => s.day >= day - 7).reduce((a, s) => a + s.amount, 0);
  const rev30 = salesLog.filter(s => s.day >= day - 30).reduce((a, s) => a + s.amount, 0);
  const rev90 = salesLog.filter(s => s.day >= day - 90).reduce((a, s) => a + s.amount, 0);

  // Revenue by category (last 90 days)
  const catMap: Record<string, number> = {};
  salesLog.filter(s => s.day >= day - 90).forEach(s => {
    const cat = s.category ?? 'crops';
    catMap[cat] = (catMap[cat] ?? 0) + s.amount;
  });
  const catSegments = [
    { label: '🌾 Crops',      amount: catMap['crops'] ?? 0,     color: '#c8860a' },
    { label: '🐄 Animals',    amount: catMap['animals'] ?? 0,   color: '#4caf50' },
    { label: '🏭 Processing', amount: catMap['processed'] ?? 0, color: '#2196f3' },
    { label: '📋 Contracts',  amount: catMap['contracts'] ?? 0, color: '#9c27b0' },
  ];

  // Outstanding loans
  const activeLoans = loans.filter(l => !l.paid && !l.defaulted);
  const totalDebt = activeLoans.reduce((s, l) => s + l.totalOwed, 0);
  const loansNext7  = activeLoans.filter(l => l.payoffDay >= day && l.payoffDay <= day + 7);
  const loansNext30 = activeLoans.filter(l => l.payoffDay >= day && l.payoffDay <= day + 30);
  const loansNext90 = activeLoans.filter(l => l.payoffDay >= day && l.payoffDay <= day + 90);
  const outflowNext7  = loansNext7.reduce((s, l) => s + l.totalOwed, 0);
  const outflowNext30 = loansNext30.reduce((s, l) => s + l.totalOwed, 0);
  const outflowNext90 = loansNext90.reduce((s, l) => s + l.totalOwed, 0);

  // Contracts expiring
  const contractsNext30 = contracts.filter(c => !c.completed && !c.failed && c.deadlineDay >= day && c.deadlineDay <= day + 30);

  // Average daily revenue (use 30-day average, or 7-day if early game)
  const avgDailyRev = day > 7 ? rev30 / 30 : rev7 / Math.max(1, day);

  // Debt pressure meter
  const avgMonthlyRev = avgDailyRev > 0 ? avgDailyRev * 30 : rev30 || 1;
  const debtToAnnualRev = avgMonthlyRev > 0 ? totalDebt / (avgMonthlyRev * 12) : (totalDebt > 0 ? 99 : 0);
  const monthlyDebtService = outflowNext30;
  const debtServiceRatio = avgMonthlyRev > 0 ? monthlyDebtService / avgMonthlyRev : 0;
  const debtPressure: { level: 'none' | 'low' | 'moderate' | 'high' | 'critical'; color: string; label: string; advice: string } =
    totalDebt === 0
      ? { level: 'none',     color: '#4caf50', label: 'No Debt',   advice: 'Debt free. Strong financial position.' }
      : debtToAnnualRev < 0.5
      ? { level: 'low',      color: '#4caf50', label: 'Low',       advice: 'Debt is manageable relative to revenue.' }
      : debtToAnnualRev < 1.5
      ? { level: 'moderate', color: '#f59e0b', label: 'Moderate',  advice: 'Debt service is significant. Avoid new loans.' }
      : debtToAnnualRev < 3
      ? { level: 'high',     color: '#f97316', label: 'High',      advice: 'Debt exceeds annual revenue. Prioritize repayment.' }
      : { level: 'critical', color: '#ef5350', label: 'Critical',  advice: 'Severe debt load. Risk of default. Seek restructuring.' };
  const pressurePct = Math.min(100, Math.round(debtToAnnualRev * 33));

  // Projected cash at 7 / 30 / 90 days
  const projCash7  = money + avgDailyRev * 7  - outflowNext7;
  const projCash30 = money + avgDailyRev * 30 - outflowNext30;
  const projCash90 = money + avgDailyRev * 90 - outflowNext90;
  const projCash = projCash30;

  // Per-crop revenue (last 90 days)
  const cropRevMap: Record<string, number> = {};
  salesLog.filter(s => s.day >= day - 90 && s.category === 'crops' && s.cropId).forEach(s => {
    cropRevMap[s.cropId!] = (cropRevMap[s.cropId!] ?? 0) + s.amount;
  });
  const cropRevEntries = Object.entries(cropRevMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Loans paid on time
  const loansOnTime = loanHistory.filter(l => l.paidOnTime).length;
  const loansMissed = loanHistory.filter(l => !l.paidOnTime).length;

  // Savings
  const savingsBalance = savings?.balance ?? 0;

  return (
    <ScrollView contentContainerStyle={fr.container} showsVerticalScrollIndicator={false}>

      <SectionHeader title="💰 Revenue" />
      <Card>
        <StatRow label="Last 7 days"  value={fmt(rev7)} />
        <StatRow label="Last 30 days" value={fmt(rev30)} />
        <StatRow label="Last 90 days" value={fmt(rev90)} />
        <StatRow label="All time"     value={fmt(totalRevenue)} bold />
        <StatRow label="Avg daily"    value={fmt(avgDailyRev)} color="#888" />
      </Card>

      <SectionHeader title="📊 Revenue Mix (90 days)" />
      <Card>
        <BarChart segments={catSegments} />
        {catSegments.filter(s => s.amount > 0).map((seg, i) => (
          <StatRow key={i} label={seg.label} value={fmt(seg.amount)} />
        ))}
      </Card>

      <SectionHeader title="🏦 Balance Sheet" />
      <Card>
        <StatRow label="Cash on hand"   value={fmt(money)}          color="#4caf50" bold />
        <StatRow label="Savings"        value={fmt(savingsBalance)}  color="#64b5f6" />
        <StatRow label="Total debt"     value={totalDebt > 0 ? `-${fmt(totalDebt)}` : 'None'} color={totalDebt > 0 ? '#ef5350' : '#4caf50'} />
        <View style={fr.divider} />
        <StatRow label="Net liquid"     value={fmt(money + savingsBalance - totalDebt)} bold color={money + savingsBalance > totalDebt ? '#4caf50' : '#ef5350'} />
      </Card>

      <SectionHeader title="🌡️ Debt Pressure" />
      <Card>
        <View style={fr.pressureHeader}>
          <Text style={fr.pressureLabel}>Debt Pressure</Text>
          <Text style={[fr.pressureLevel, { color: debtPressure.color }]}>{debtPressure.label}</Text>
        </View>
        <View style={fr.pressureBarTrack}>
          <View style={[fr.pressureBarFill, { width: `${pressurePct}%` as any, backgroundColor: debtPressure.color }]} />
          {/* Zone markers */}
          <View style={[fr.pressureMarker, { left: '17%' as any }]} />
          <View style={[fr.pressureMarker, { left: '50%' as any }]} />
          <View style={[fr.pressureMarker, { left: '83%' as any }]} />
        </View>
        <View style={fr.pressureZones}>
          <Text style={fr.pressureZoneLabel}>Low</Text>
          <Text style={fr.pressureZoneLabel}>Mod</Text>
          <Text style={fr.pressureZoneLabel}>High</Text>
          <Text style={fr.pressureZoneLabel}>Crit</Text>
        </View>
        <Text style={[fr.pressureAdvice, { color: debtPressure.color + 'cc' }]}>{debtPressure.advice}</Text>
        <View style={fr.divider} />
        <StatRow label="Debt / annual rev"  value={totalDebt > 0 ? `${debtToAnnualRev.toFixed(2)}×` : '—'} color={debtPressure.color} />
        {monthlyDebtService > 0 && (
          <StatRow label="Due this month"   value={fmt(monthlyDebtService)} color={debtServiceRatio > 0.4 ? '#ef5350' : '#f59e0b'} />
        )}
        {avgMonthlyRev > 0 && monthlyDebtService > 0 && (
          <StatRow label="Service ratio"    value={`${Math.round(debtServiceRatio * 100)}% of monthly rev`} color={debtServiceRatio > 0.4 ? '#ef5350' : C.textMuted} />
        )}
      </Card>

      <SectionHeader title="📅 Cashflow Forecast" />
      <Card>
        <StatRow label="Daily avg (30d basis)" value={fmt(avgDailyRev)} color="#888" />
        <View style={fr.divider} />
        {/* Horizon rows */}
        {([
          { label: '7 days',  proj: projCash7,  outflow: outflowNext7  },
          { label: '30 days', proj: projCash30, outflow: outflowNext30 },
          { label: '90 days', proj: projCash90, outflow: outflowNext90 },
        ] as const).map(h => {
          const positive = h.proj >= 0;
          const barPct = Math.min(100, Math.max(0, (h.proj / Math.max(projCash90, money, 1)) * 100));
          return (
            <View key={h.label} style={fr.forecastRow}>
              <Text style={fr.forecastLabel}>{h.label}</Text>
              <View style={fr.forecastBarWrap}>
                <View style={[fr.forecastBar, { width: `${barPct}%` as any, backgroundColor: positive ? '#2e7d32' : '#c62828' }]} />
              </View>
              <View style={fr.forecastRight}>
                <Text style={[fr.forecastValue, { color: positive ? '#4caf50' : '#ef5350' }]}>{fmt(h.proj)}</Text>
                {h.outflow > 0 && <Text style={fr.forecastOutflow}>-{fmt(h.outflow)} loans</Text>}
              </View>
            </View>
          );
        })}
        {contractsNext30.length > 0 && (
          <View style={{ marginTop: S.sm }}>
            <Text style={fr.warningText}>⚠️ {contractsNext30.length} contract deadline{contractsNext30.length > 1 ? 's' : ''} in 30 days</Text>
          </View>
        )}
        {projCash30 < 0 && <Text style={[fr.warningText, { marginTop: 4 }]}>⚠️ Cash may go negative within 30 days — review expenses</Text>}
      </Card>

      {loansNext30.length > 0 && (
        <>
          <SectionHeader title="🏦 Loans Due This Month" />
          {loansNext30.map((loan, i) => (
            <Card key={i}>
              <StatRow label="Amount due"   value={fmt(loan.totalOwed)} color="#ef5350" />
              <StatRow label="Due on day"   value={`Day ${loan.payoffDay}`} />
              <StatRow label="Days left"    value={`${loan.payoffDay - day}d`} color={loan.payoffDay - day <= 3 ? '#ef5350' : '#f59e0b'} />
            </Card>
          ))}
        </>
      )}

      {cropRevEntries.length > 0 && (
        <>
          <SectionHeader title="🌾 Crop Revenue (90 days)" />
          <Card>
            {cropRevEntries.map(([cropId, rev], i) => {
              const crop = CROP_TYPES.find(c => c.id === cropId);
              const totalCropRev = cropRevEntries.reduce((s, [, v]) => s + v, 0);
              const pct = totalCropRev > 0 ? Math.round((rev / totalCropRev) * 100) : 0;
              return (
                <View key={cropId} style={fr.cropRow}>
                  <Text style={fr.cropRank}>#{i + 1}</Text>
                  <Text style={fr.cropName}>{crop?.name ?? cropId}</Text>
                  <View style={fr.cropBarWrap}>
                    <View style={[fr.cropBar, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={fr.cropRev}>{fmt(rev)}</Text>
                </View>
              );
            })}
          </Card>
        </>
      )}

      <SectionHeader title="📈 Track Record" />
      <Card>
        <StatRow label="Loans paid on time" value={`${loansOnTime}`} color="#4caf50" />
        {loansMissed > 0 && <StatRow label="Loans missed" value={`${loansMissed}`} color="#ef5350" />}
        <StatRow label="Active contracts" value={`${contracts.filter(c => !c.completed && !c.failed).length}`} />
        <StatRow label="Contracts completed" value={`${contracts.filter(c => c.completed).length}`} color="#4caf50" />
      </Card>

    </ScrollView>
  );
}

const fr = StyleSheet.create({
  container:    { padding: S.md, gap: S.sm, paddingBottom: 40 },
  sectionHeader:{ color: C.textMuted, fontSize: F.size.xs, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: S.md, marginBottom: 2 },
  card:         { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 2 },
  statRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  statLabel:    { color: C.textMuted, fontSize: F.size.sm, flex: 1 },
  statValue:    { color: C.text, fontSize: F.size.sm },
  divider:      { height: 1, backgroundColor: C.divider, marginVertical: 4 },
  barWrap:      { gap: S.sm, marginBottom: S.sm },
  barTrack:     { height: 10, borderRadius: 5, flexDirection: 'row', overflow: 'hidden', backgroundColor: C.bgDeep },
  barSeg:       { height: 10 },
  legend:       { flexDirection: 'row', flexWrap: 'wrap', gap: S.xs },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendText:   { color: C.textMuted, fontSize: F.size.xs },
  emptyText:    { color: C.textMuted, fontSize: F.size.sm, textAlign: 'center', paddingVertical: S.sm },
  warningText:  { color: '#f59e0b', fontSize: F.size.xs, marginTop: 4 },
  cropRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  cropRank:     { color: C.textFaint, fontSize: 10, width: 20 },
  cropName:     { color: C.text, fontSize: F.size.sm, width: 80 },
  cropBarWrap:  { flex: 1, height: 5, backgroundColor: C.bgDeep, borderRadius: 3, overflow: 'hidden' },
  cropBar:      { height: 5, backgroundColor: '#c8860a', borderRadius: 3 },
  cropRev:      { color: '#4caf50', fontSize: F.size.sm, width: 64, textAlign: 'right', fontWeight: 'bold' },
  pressureHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm },
  pressureLabel:    { color: C.textMuted, fontSize: F.size.sm },
  pressureLevel:    { fontWeight: 'bold', fontSize: F.size.md },
  pressureBarTrack: { height: 12, backgroundColor: C.bgDeep, borderRadius: 6, overflow: 'hidden', position: 'relative' },
  pressureBarFill:  { height: 12, borderRadius: 6 },
  pressureMarker:   { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#333' },
  pressureZones:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, paddingHorizontal: 2 },
  pressureZoneLabel:{ color: C.textFaint, fontSize: 8, width: '25%' as any, textAlign: 'center' },
  pressureAdvice:   { fontSize: F.size.xs, marginTop: S.xs },
  forecastRow:     { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 5 },
  forecastLabel:   { color: C.textMuted, fontSize: F.size.xs, width: 46 },
  forecastBarWrap: { flex: 1, height: 8, backgroundColor: C.bgDeep, borderRadius: 4, overflow: 'hidden' },
  forecastBar:     { height: 8, borderRadius: 4 },
  forecastRight:   { width: 90, alignItems: 'flex-end' },
  forecastValue:   { fontSize: F.size.xs, fontWeight: 'bold' },
  forecastOutflow: { color: '#ef5350', fontSize: 9, marginTop: 1 },
});
