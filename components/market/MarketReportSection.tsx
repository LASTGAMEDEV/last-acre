import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';

type Period = '7d' | '30d' | '90d';

function SectionTitle({ label }: { label: string }) {
  return <Text style={mr.sectionTitle}>{label}</Text>;
}

export default function MarketReportSection() {
  const { day, salesLog, prices, inventory, priceHistory, priceHistory15d, priceMomentum } = useGameStore() as any;
  const [period, setPeriod] = useState<Period>('30d');

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const prevStart = day - days * 2;
  const currStart = day - days;

  const currSales = (salesLog as any[]).filter((s: any) => s.day >= currStart);
  const prevSales = (salesLog as any[]).filter((s: any) => s.day >= prevStart && s.day < currStart);

  function revByCategory(sales: any[]) {
    const out: Record<string, number> = { crops: 0, animals: 0, processed: 0, contracts: 0, other: 0 };
    for (const s of sales) {
      const cat = s.category ?? 'other';
      out[cat] = (out[cat] ?? 0) + s.amount;
    }
    return out;
  }

  const currRev = revByCategory(currSales);
  const prevRev = revByCategory(prevSales);
  const currTotal = Object.values(currRev).reduce((s, v) => s + v, 0);
  const prevTotal = Object.values(prevRev).reduce((s, v) => s + v, 0);

  const CATEGORIES = [
    { key: 'crops',     icon: '🌾', label: 'Crops' },
    { key: 'animals',   icon: '🐄', label: 'Animals' },
    { key: 'processed', icon: '🏭', label: 'Processed' },
    { key: 'contracts', icon: '📋', label: 'Contracts' },
  ];

  // Per-crop revenue breakdown
  type CropPerf = { id: string; name: string; rev: number; units: number; avgPrice: number; basePrice: number };
  const cropPerfMap: Record<string, { rev: number; units: number }> = {};
  for (const s of currSales) {
    if (s.cropId) {
      if (!cropPerfMap[s.cropId]) cropPerfMap[s.cropId] = { rev: 0, units: 0 };
      cropPerfMap[s.cropId].rev += s.amount;
      cropPerfMap[s.cropId].units += s.units ?? 0;
    }
  }

  const cropPerfs: CropPerf[] = CROP_TYPES
    .filter(ct => cropPerfMap[ct.id])
    .map(ct => {
      const { rev, units } = cropPerfMap[ct.id];
      return {
        id: ct.id,
        name: ct.name,
        rev,
        units,
        avgPrice: units > 0 ? rev / units : 0,
        basePrice: ct.basePrice,
      };
    })
    .sort((a, b) => b.rev - a.rev);

  // Price signals — crops significantly above/below base
  type PriceSignal = { id: string; name: string; current: number; base: number; pct: number; trend: 'up' | 'down' | 'flat'; inStock: number };
  const signals: PriceSignal[] = CROP_TYPES.map(ct => {
    const current = (prices as any[]).find((p: any) => p.cropId === ct.id)?.price ?? ct.basePrice;
    const pct = ((current - ct.basePrice) / ct.basePrice) * 100;
    const hist = (priceHistory15d as Record<string, number[]>)?.[ct.id] ?? [];
    const momentum = (priceMomentum as Record<string, number>)?.[ct.id] ?? 0;
    const trend: 'up' | 'down' | 'flat' = momentum > 0.02 ? 'up' : momentum < -0.02 ? 'down' : 'flat';
    const inStock = (inventory as Record<string, number>)[ct.id] ?? 0;
    return { id: ct.id, name: ct.name, current, base: ct.basePrice, pct, trend, inStock };
  }).filter(s => Math.abs(s.pct) >= 10 || s.inStock > 0).sort((a, b) => b.pct - a.pct);

  const hotSignals   = signals.filter(s => s.pct >= 10);
  const coldSignals  = signals.filter(s => s.pct <= -10);
  const ownedSignals = signals.filter(s => s.inStock > 0 && s.pct < 10 && s.pct > -10);

  // Best days to sell (day-of-week revenue average)
  const dayBuckets: number[] = new Array(7).fill(0);
  const dayCount: number[] = new Array(7).fill(0);
  for (const s of salesLog as any[]) {
    const dow = s.day % 7;
    dayBuckets[dow] += s.amount;
    dayCount[dow]++;
  }
  const avgByDow = dayBuckets.map((total, i) => ({ dow: i, avg: dayCount[i] > 0 ? total / dayCount[i] : 0 }));
  const bestDow = [...avgByDow].sort((a, b) => b.avg - a.avg)[0];

  return (
    <ScrollView contentContainerStyle={mr.scroll} showsVerticalScrollIndicator={false}>

      {/* Period picker */}
      <View style={mr.periodRow}>
        {(['7d', '30d', '90d'] as Period[]).map(p => (
          <TouchableOpacity key={p} style={[mr.periodChip, period === p && mr.periodChipActive]} onPress={() => setPeriod(p)}>
            <Text style={[mr.periodChipText, period === p && mr.periodChipTextActive]}>
              {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue snapshot */}
      <SectionTitle label="💰 Revenue Snapshot" />
      <View style={mr.card}>
        <View style={mr.totalRow}>
          <Text style={mr.totalLabel}>Total Revenue</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={mr.totalValue}>${Math.round(currTotal).toLocaleString()}</Text>
            {prevTotal > 0 && (
              <Text style={[mr.totalChange, { color: currTotal >= prevTotal ? '#4caf50' : '#ef5350' }]}>
                {currTotal >= prevTotal ? '▲' : '▼'} {Math.abs(Math.round(((currTotal - prevTotal) / prevTotal) * 100))}% vs prior period
              </Text>
            )}
          </View>
        </View>
        <View style={mr.divider} />
        {CATEGORIES.map(cat => {
          const curr = currRev[cat.key] ?? 0;
          const prev = prevRev[cat.key] ?? 0;
          const pct = currTotal > 0 ? (curr / currTotal) * 100 : 0;
          if (curr === 0 && prev === 0) return null;
          const delta = prev > 0 ? ((curr - prev) / prev) * 100 : null;
          return (
            <View key={cat.key} style={mr.catRow}>
              <Text style={mr.catIcon}>{cat.icon}</Text>
              <Text style={mr.catLabel}>{cat.label}</Text>
              <View style={mr.catBarWrap}>
                <View style={[mr.catBar, { width: `${Math.max(1, pct)}%` as any, backgroundColor: '#1565c0' }]} />
              </View>
              <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                <Text style={mr.catValue}>${Math.round(curr).toLocaleString()}</Text>
                {delta !== null && (
                  <Text style={[mr.catDelta, { color: curr >= prev ? '#4caf50' : '#ef5350' }]}>
                    {curr >= prev ? '+' : ''}{Math.round(delta)}%
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Price signals */}
      {(hotSignals.length > 0 || coldSignals.length > 0) && (
        <>
          <SectionTitle label="📡 Price Signals" />
          <View style={mr.card}>
            {hotSignals.slice(0, 4).map(s => (
              <View key={s.id} style={[mr.signalRow, { borderLeftColor: '#4caf50' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={mr.signalName}>{s.name}</Text>
                  <Text style={mr.signalDetail}>${s.current.toFixed(2)} · base ${s.base.toFixed(2)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[mr.signalPct, { color: '#4caf50' }]}>+{Math.round(s.pct)}%</Text>
                  {s.inStock > 0 && <Text style={mr.signalStock}>{s.inStock.toLocaleString()} in stock</Text>}
                  <Text style={[mr.signalTrend, { color: s.trend === 'up' ? '#4caf50' : s.trend === 'down' ? '#ef5350' : '#555' }]}>
                    {s.trend === 'up' ? '▲ rising' : s.trend === 'down' ? '▼ falling' : '─ stable'}
                  </Text>
                </View>
              </View>
            ))}
            {coldSignals.slice(0, 3).map(s => (
              <View key={s.id} style={[mr.signalRow, { borderLeftColor: '#ef5350' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={mr.signalName}>{s.name}</Text>
                  <Text style={mr.signalDetail}>${s.current.toFixed(2)} · base ${s.base.toFixed(2)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[mr.signalPct, { color: '#ef5350' }]}>{Math.round(s.pct)}%</Text>
                  {s.inStock > 0 && <Text style={[mr.signalStock, { color: '#ef9a9a' }]}>{s.inStock.toLocaleString()} in stock — wait or sell?</Text>}
                </View>
              </View>
            ))}
            {ownedSignals.slice(0, 2).map(s => (
              <View key={s.id} style={[mr.signalRow, { borderLeftColor: '#555' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={mr.signalName}>{s.name}</Text>
                  <Text style={mr.signalDetail}>{s.inStock.toLocaleString()} in stock · ${s.current.toFixed(2)}/unit (neutral)</Text>
                </View>
                <Text style={[mr.signalTrend, { color: s.trend === 'up' ? '#4caf50' : s.trend === 'down' ? '#ef5350' : '#555' }]}>
                  {s.trend === 'up' ? '▲' : s.trend === 'down' ? '▼' : '─'}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Top crops by revenue */}
      {cropPerfs.length > 0 && (
        <>
          <SectionTitle label="🏆 Top Crops by Revenue" />
          <View style={mr.card}>
            {cropPerfs.slice(0, 6).map((cp, i) => {
              const aboveBase = cp.avgPrice > cp.basePrice * 1.05;
              const belowBase = cp.avgPrice < cp.basePrice * 0.95;
              return (
                <View key={cp.id} style={[mr.cropRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#1a1f2e' }]}>
                  <Text style={mr.cropRank}>#{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={mr.cropName}>{cp.name}</Text>
                    <Text style={mr.cropDetail}>
                      {cp.units > 0 ? `${cp.units.toLocaleString()} units · avg ${(cp.avgPrice).toFixed(2)}/unit` : 'via contracts'}
                      {aboveBase ? ' 📈' : belowBase ? ' 📉' : ''}
                    </Text>
                  </View>
                  <Text style={mr.cropRev}>${Math.round(cp.rev).toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Best sell timing */}
      {(salesLog as any[]).length >= 14 && bestDow.avg > 0 && (
        <>
          <SectionTitle label="⏰ Sell Timing Insight" />
          <View style={mr.card}>
            <Text style={mr.timingText}>
              On average, you earn most on <Text style={{ color: '#ffd54f', fontWeight: 'bold' }}>Day {bestDow.dow + 1}s</Text> —
              ${Math.round(bestDow.avg).toLocaleString()} avg per sell-day. This is based on your historical sale patterns.
            </Text>
            <View style={mr.dowRow}>
              {avgByDow.map(({ dow, avg }) => {
                const maxAvg = Math.max(...avgByDow.map(d => d.avg), 1);
                const h = Math.max(2, Math.round((avg / maxAvg) * 40));
                const isBest = dow === bestDow.dow;
                return (
                  <View key={dow} style={{ alignItems: 'center', flex: 1 }}>
                    <View style={[mr.dowBar, { height: h, backgroundColor: isBest ? '#ffd54f' : '#1565c0' }]} />
                    <Text style={[mr.dowLabel, isBest && { color: '#ffd54f' }]}>d{dow + 1}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}

      {currTotal === 0 && (
        <View style={mr.emptyCard}>
          <Text style={mr.emptyText}>No sales recorded in this period yet.</Text>
          <Text style={mr.emptyHint}>Sell crops, animals, or processed goods to start seeing market analytics here.</Text>
        </View>
      )}

    </ScrollView>
  );
}

const mr = StyleSheet.create({
  scroll:       { padding: S.md, gap: 10 },
  sectionTitle: { color: C.text, fontSize: F.size.sm, fontWeight: 'bold', marginTop: 6, marginBottom: 4 },
  card:         { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md },
  divider:      { height: 1, backgroundColor: '#1a1f2e', marginVertical: S.sm },
  // Period chips
  periodRow:         { flexDirection: 'row', gap: 6 },
  periodChip:        { flex: 1, backgroundColor: C.bgCard, borderRadius: R.pill, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4a' },
  periodChipActive:  { backgroundColor: '#0f3460', borderColor: '#1565c0' },
  periodChipText:    { color: '#555', fontSize: F.size.xs, fontWeight: 'bold' },
  periodChipTextActive: { color: '#90caf9' },
  // Revenue snapshot
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: S.sm },
  totalLabel:  { color: C.textMuted, fontSize: F.size.xs, fontWeight: 'bold' },
  totalValue:  { color: '#ffd54f', fontSize: 22, fontWeight: 'bold' },
  totalChange: { fontSize: F.size.xs, fontWeight: 'bold' },
  catRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 },
  catIcon:     { fontSize: 14, width: 20, textAlign: 'center' },
  catLabel:    { color: C.textDim, fontSize: F.size.xs, width: 60 },
  catBarWrap:  { flex: 1, height: 6, backgroundColor: '#0d1117', borderRadius: 3, overflow: 'hidden' },
  catBar:      { height: 6, borderRadius: 3 },
  catValue:    { color: C.text, fontSize: F.size.xs, fontWeight: 'bold' },
  catDelta:    { fontSize: 9, fontWeight: 'bold' },
  // Price signals
  signalRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderLeftWidth: 3, paddingLeft: 8, marginBottom: 4 },
  signalName:  { color: C.text, fontSize: F.size.sm, fontWeight: '600' as const },
  signalDetail:{ color: C.textMuted, fontSize: 10, marginTop: 1 },
  signalPct:   { fontSize: F.size.sm, fontWeight: 'bold' },
  signalStock: { color: '#888', fontSize: 9 },
  signalTrend: { fontSize: 9, fontWeight: 'bold' },
  // Top crops
  cropRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  cropRank:  { color: '#555', fontSize: F.size.xs, width: 20, textAlign: 'center' },
  cropName:  { color: C.text, fontSize: F.size.sm, fontWeight: '600' as const },
  cropDetail:{ color: C.textMuted, fontSize: 10, marginTop: 1 },
  cropRev:   { color: '#4caf50', fontSize: F.size.sm, fontWeight: 'bold' },
  // Timing
  timingText:{ color: C.textDim, fontSize: F.size.xs, lineHeight: 16, marginBottom: S.sm },
  dowRow:    { flexDirection: 'row', alignItems: 'flex-end', height: 50, gap: 2 },
  dowBar:    { width: '100%', borderRadius: 2, minHeight: 2 },
  dowLabel:  { color: '#555', fontSize: 8, marginTop: 2 },
  // Empty
  emptyCard: { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.lg, alignItems: 'center', gap: 6 },
  emptyText: { color: C.textMuted, fontSize: F.size.sm, textAlign: 'center' },
  emptyHint: { color: C.textFaint, fontSize: F.size.xs, textAlign: 'center', lineHeight: 16 },
});
