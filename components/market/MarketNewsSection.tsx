import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import { NPC_FARM_DEFINITIONS } from '../../data/npcFarms';
import { gameDayToDisplayDate } from '../../engine/calendarUtils';
import { getSeason } from '../../engine/climate';

type NewsItem = {
  id: string;
  day: number;
  icon: string;
  headline: string;
  detail: string;
  kind: 'price_up' | 'price_down' | 'rival' | 'shock' | 'general';
};

function buildDailyBriefing(
  prices: { cropId: string; price: number; basePrice: number }[],
  activeShocks: { commodityId: string | null; magnitude: number; remainingDays: number }[],
  newsEvents: { cropId: string | null; modifier: number; daysRemaining: number; description: string }[]
): string {
  const lines: string[] = [];

  // Biggest movers vs base price
  const movers = (prices ?? [])
    .map((p: any) => ({ name: CROP_TYPES.find(c => c.id === p.cropId)?.name ?? p.cropId, pct: Math.round(((p.price - p.basePrice) / p.basePrice) * 100) }))
    .filter((m: any) => Math.abs(m.pct) >= 5)
    .sort((a: any, b: any) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 3);

  if (movers.length > 0) {
    const upMovers = movers.filter((m: any) => m.pct > 0);
    const downMovers = movers.filter((m: any) => m.pct < 0);
    if (upMovers.length > 0) {
      lines.push(`${upMovers.map((m: any) => `${m.name} (+${m.pct}%)`).join(', ')} trading above baseline.`);
    }
    if (downMovers.length > 0) {
      lines.push(`${downMovers.map((m: any) => `${m.name} (${m.pct}%)`).join(', ')} trading below baseline.`);
    }
  }

  // Active shocks
  const bigShocks = activeShocks.filter((s: any) => Math.abs(s.magnitude) >= 0.1);
  for (const s of bigShocks.slice(0, 2)) {
    const crop = s.commodityId ? CROP_TYPES.find(c => c.id === s.commodityId) : null;
    const name = crop?.name ?? 'All commodities';
    const pct = Math.abs(Math.round(s.magnitude * 100));
    lines.push(`${name} ${s.magnitude > 0 ? 'demand spike' : 'oversupply'} active (${s.magnitude > 0 ? '+' : '−'}${pct}%, ${s.remainingDays}d left).`);
  }

  // News event summary
  const activeNews = newsEvents.filter((n: any) => n.daysRemaining > 0);
  if (activeNews.length > 0 && lines.length < 3) {
    lines.push(`${activeNews.length} market event${activeNews.length > 1 ? 's' : ''} currently affecting prices.`);
  }

  if (lines.length === 0) lines.push('Commodity prices stable. No major shocks or events active.');
  return lines.join(' ');
}

type HarvestEntry = { farmName: string; crops: string[]; supply: 'heavy' | 'moderate' | 'light'; icon: string };

function buildHarvestReport(
  day: number,
  prices: { cropId: string; price: number; basePrice: number }[],
): { entries: HarvestEntry[]; pressureSummary: string } {
  const season = getSeason(day);
  const entries: HarvestEntry[] = [];

  for (const farm of NPC_FARM_DEFINITIONS) {
    // Crops this farm grows that are either in-season OR peaking now
    const activeCrops = (farm.specialization ?? []).filter(cropId => {
      const ct = CROP_TYPES.find(c => c.id === cropId);
      return ct && (ct.seasons.includes(season) || ct.peakSeason === season);
    });
    if (activeCrops.length === 0) continue;

    const cropNames = activeCrops.map(id => CROP_TYPES.find(c => c.id === id)?.name ?? id);
    const supply: 'heavy' | 'moderate' | 'light' = farm.tier === 3 ? 'heavy' : farm.tier === 2 ? 'moderate' : 'light';
    const icon = supply === 'heavy' ? '🔴' : supply === 'moderate' ? '🟡' : '🟢';
    entries.push({ farmName: farm.name, crops: cropNames, supply, icon });
  }

  // Price pressure summary: find crops below baseline
  const underBaseline = (prices ?? [])
    .filter(p => p.basePrice > 0 && p.price < p.basePrice * 0.95)
    .map(p => CROP_TYPES.find(c => c.id === p.cropId)?.name ?? p.cropId)
    .slice(0, 3);

  const pressureSummary = underBaseline.length > 0
    ? `Price pressure: ${underBaseline.join(', ')} trading below baseline — local supply driving values down.`
    : 'No significant local supply pressure at current prices.';

  return { entries, pressureSummary };
}

function shockHeadline(commodityId: string | null, magnitude: number): { headline: string; detail: string } {
  const crop = commodityId ? CROP_TYPES.find(c => c.id === commodityId) : null;
  const pct  = Math.abs(Math.round(magnitude * 100));
  const cropName = crop?.name ?? 'All commodities';
  if (magnitude > 0.15) return { headline: `${cropName} prices surge ${pct}%`, detail: 'Market shock driving prices up sharply' };
  if (magnitude > 0)    return { headline: `${cropName} prices up ${pct}%`, detail: 'Positive market movement' };
  if (magnitude < -0.15) return { headline: `${cropName} prices crash −${pct}%`, detail: 'Severe market downturn — hold or sell quickly' };
  return { headline: `${cropName} prices down −${pct}%`, detail: 'Market weakness for this commodity' };
}

export default function MarketNewsSection() {
  const { day, newsEvents = [], rivalNews = [], activeShocks = [], prices = [] } = useGameStore() as any;

  const items: NewsItem[] = [];

  // Active price shocks → top-of-feed alerts
  for (const shock of activeShocks) {
    const { headline, detail } = shockHeadline(shock.commodityId, shock.magnitude);
    const kind = shock.magnitude > 0 ? 'price_up' : 'price_down';
    items.push({
      id:       `shock_${shock.commodityId ?? 'all'}_${shock.remainingDays}`,
      day,
      icon:     shock.magnitude > 0 ? '📈' : '📉',
      headline,
      detail:   `${detail} · ${shock.remainingDays}d remaining`,
      kind,
    });
  }

  // news events (crop modifier events from the market engine)
  for (const ne of (newsEvents ?? [])) {
    const crop = ne.cropId ? CROP_TYPES.find(c => c.id === ne.cropId) : null;
    const cropName = crop?.name ?? 'Market';
    const pct = Math.abs(Math.round((ne.modifier - 1) * 100));
    const up  = ne.modifier >= 1;
    items.push({
      id:       `news_${ne.id}`,
      day,
      icon:     up ? '📰' : '📰',
      headline: ne.description || `${cropName} ${up ? 'boost' : 'downturn'} (${up ? '+' : '−'}${pct}%)`,
      detail:   `${ne.daysRemaining}d remaining · ${ne.modifier >= 1 ? `+${pct}%` : `−${pct}%`} price`,
      kind:     up ? 'price_up' : 'price_down',
    });
  }

  // rival news items (sorted newest first)
  const sortedRival = [...rivalNews].sort((a, b) => b.day - a.day).slice(0, 20);
  for (const rn of sortedRival) {
    items.push({
      id:       `rival_${rn.id}`,
      day:      rn.day,
      icon:     rn.icon,
      headline: rn.title,
      detail:   rn.detail,
      kind:     'rival',
    });
  }

  const KIND_COLOR: Record<NewsItem['kind'], string> = {
    price_up:  '#81c784',
    price_down: '#ef5350',
    rival:     '#64b5f6',
    shock:     '#ffb74d',
    general:   C.textMuted,
  };

  const noNews = items.length === 0;
  const harvestReport = buildHarvestReport(day, prices);

  return (
    <ScrollView contentContainerStyle={ns.container} showsVerticalScrollIndicator={false}>

      {/* Newspaper masthead */}
      <View style={ns.masthead}>
        <Text style={ns.mastheadTitle}>📰 VALLEY GAZETTE</Text>
        <Text style={ns.mastheadDate}>{gameDayToDisplayDate(day)} — Market Edition</Text>
      </View>

      {/* Daily market briefing */}
      <View style={ns.briefingCard}>
        <Text style={ns.briefingLabel}>TODAY'S BRIEFING</Text>
        <Text style={ns.briefingText}>{buildDailyBriefing(prices, activeShocks, newsEvents)}</Text>
      </View>

      {/* County harvest report */}
      {harvestReport.entries.length > 0 && (
        <View style={ns.harvestCard}>
          <Text style={ns.harvestLabel}>🌾 COUNTY HARVEST REPORT</Text>
          {harvestReport.entries.map((e, i) => (
            <View key={i} style={ns.harvestRow}>
              <Text style={ns.harvestIcon}>{e.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={ns.harvestFarm}>{e.farmName}</Text>
                <Text style={ns.harvestCrops}>{e.crops.join(', ')}</Text>
              </View>
              <Text style={[ns.harvestSupply, {
                color: e.supply === 'heavy' ? '#ef5350' : e.supply === 'moderate' ? '#f59e0b' : '#4caf50',
              }]}>{e.supply} supply</Text>
            </View>
          ))}
          <Text style={ns.harvestPressure}>{harvestReport.pressureSummary}</Text>
        </View>
      )}

      {noNews ? (
        <View style={ns.emptyCard}>
          <Text style={ns.emptyIcon}>🗞️</Text>
          <Text style={ns.emptyTitle}>No news today</Text>
          <Text style={ns.emptyDetail}>Advance a few days to see market events and rival activity here.</Text>
        </View>
      ) : (
        items.map(item => (
          <View key={item.id} style={[ns.newsCard, { borderLeftColor: KIND_COLOR[item.kind] }]}>
            <View style={ns.newsHeader}>
              <Text style={ns.newsIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={ns.newsHeadline}>{item.headline}</Text>
                <Text style={ns.newsDetail}>{item.detail}</Text>
              </View>
              {item.day < day && (
                <Text style={ns.newsDay}>Day {item.day}</Text>
              )}
            </View>
          </View>
        ))
      )}

      {/* Active shocks summary */}
      {activeShocks.length > 0 && (
        <>
          <Text style={ns.sectionHeader}>⚡ Active Market Shocks</Text>
          {activeShocks.map((shock: any, i: number) => {
            const crop = shock.commodityId ? CROP_TYPES.find(c => c.id === shock.commodityId) : null;
            const pct  = Math.abs(Math.round(shock.magnitude * 100));
            const up   = shock.magnitude > 0;
            return (
              <View key={i} style={ns.shockCard}>
                <Text style={[ns.shockPct, { color: up ? '#81c784' : '#ef5350' }]}>
                  {up ? '+' : '−'}{pct}%
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={ns.shockCrop}>{crop?.name ?? 'All commodities'}</Text>
                  <View style={ns.shockBarTrack}>
                    <View style={[ns.shockBarFill, {
                      width: `${Math.round((shock.remainingDays / shock.durationDays) * 100)}%` as any,
                      backgroundColor: up ? '#81c784' : '#ef5350',
                    }]} />
                  </View>
                  <Text style={ns.shockDays}>{shock.remainingDays}d / {shock.durationDays}d remaining</Text>
                </View>
              </View>
            );
          })}
        </>
      )}

    </ScrollView>
  );
}

const ns = StyleSheet.create({
  container:       { padding: S.md, gap: S.sm, paddingBottom: 40 },

  masthead:        { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, alignItems: 'center', marginBottom: S.sm },
  mastheadTitle:   { color: C.text, fontSize: F.size.xl, fontWeight: 'bold', letterSpacing: 2 },
  mastheadDate:    { color: C.textMuted, fontSize: F.size.sm, marginTop: 2 },

  briefingCard:    { backgroundColor: '#0f1a0f', borderRadius: R.md, padding: S.md, borderWidth: 1, borderColor: '#1e3a1e', marginBottom: S.sm },
  briefingLabel:   { color: '#4caf50', fontSize: 9, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 },
  briefingText:    { color: '#a5c8a5', fontSize: F.size.sm, lineHeight: 18, fontStyle: 'italic' },

  sectionHeader:   { color: C.textMuted, fontSize: F.size.xs, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: S.md, marginBottom: 2 },

  newsCard:        { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, borderLeftWidth: 3, borderLeftColor: C.textMuted },
  newsHeader:      { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm },
  newsIcon:        { fontSize: 20, width: 28 },
  newsHeadline:    { color: C.text, fontSize: F.size.md, fontWeight: 'bold', flex: 1 },
  newsDetail:      { color: C.textMuted, fontSize: F.size.sm, marginTop: 2 },
  newsDay:         { color: C.textFaint, fontSize: 10, marginLeft: S.sm, marginTop: 2 },

  shockCard:       { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, flexDirection: 'row', gap: S.sm, alignItems: 'center' },
  shockPct:        { fontSize: F.size.xl, fontWeight: 'bold', width: 50, textAlign: 'center' },
  shockCrop:       { color: C.text, fontSize: F.size.md, fontWeight: 'bold', marginBottom: 4 },
  shockBarTrack:   { height: 4, backgroundColor: C.bgDeep, borderRadius: 2, overflow: 'hidden', marginBottom: 2 },
  shockBarFill:    { height: 4, borderRadius: 2 },
  shockDays:       { color: C.textFaint, fontSize: 10 },

  emptyCard:       { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.xl, alignItems: 'center', gap: S.sm },
  emptyIcon:       { fontSize: 40 },
  emptyTitle:      { color: C.text, fontSize: F.size.lg, fontWeight: 'bold' },
  emptyDetail:     { color: C.textMuted, fontSize: F.size.sm, textAlign: 'center' },

  harvestCard:     { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 6, marginBottom: S.sm },
  harvestLabel:    { color: '#f59e0b', fontSize: 9, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  harvestRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  harvestIcon:     { fontSize: 14, width: 18 },
  harvestFarm:     { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  harvestCrops:    { color: C.textMuted, fontSize: F.size.xs },
  harvestSupply:   { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  harvestPressure: { color: C.textMuted, fontSize: F.size.xs, fontStyle: 'italic', marginTop: 4, borderTopWidth: 1, borderTopColor: '#1a1a2a', paddingTop: 6 },
});
