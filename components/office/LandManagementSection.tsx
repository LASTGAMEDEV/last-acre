import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import type { SoilStats } from '../../engine/crops';
import {
  pestControlForParcel, isWindProtected, pollinatorStripCount, hasBufferStrip,
  maturityProgress, HEDGEROW_PEST_CONTROL,
} from '../../engine/hedgerows';
import { degradationYieldModifier } from '../../engine/soilDegradation';

function soilScore(soil: SoilStats): number {
  const nScore = soil.nitrogen >= 60 && soil.nitrogen <= 80 ? 100
    : soil.nitrogen < 60 ? (soil.nitrogen / 60) * 100
    : Math.max(0, 100 - (soil.nitrogen - 80) * 5);
  const pHScore = soil.pH >= 6.0 && soil.pH <= 7.0 ? 100
    : soil.pH < 6.0 ? Math.max(0, ((soil.pH - 4) / 2) * 100)
    : Math.max(0, ((8.5 - soil.pH) / 1.5) * 100);
  const omScore = soil.organicMatter >= 4 && soil.organicMatter <= 7 ? 100
    : soil.organicMatter < 4 ? (soil.organicMatter / 4) * 100
    : Math.max(0, 100 - (soil.organicMatter - 7) * 20);
  const compScore = soil.compaction <= 25 ? 100 : Math.max(0, 100 - (soil.compaction - 25) * 2);
  return Math.round((nScore + pHScore + omScore + compScore) / 4);
}

function scoreColor(score: number) {
  if (score >= 75) return '#4caf50';
  if (score >= 50) return '#ffb74d';
  return '#ef5350';
}

const ORGANIC_LABELS: Record<string, string> = {
  transition_1: 'Org Yr1', transition_2: 'Org Yr2', transition_3: 'Org Yr3', organic: 'Organic', decertified: 'Decert.',
};

export default function LandManagementSection() {
  const {
    activeLeases, availableLeases, parcels, day, hedgerows,
    signLease, cancelLease,
  } = useGameStore();

  const [expandedParcelId, setExpandedParcelId] = useState<string | null>(null);

  const active = (activeLeases ?? []).filter(l => l.status === 'active');
  const ownedParcels = parcels.filter(p => p.owned);
  const leasedOutParcels = ownedParcels.filter(p => p.leasedOut);
  const totalHa = ownedParcels.reduce((s, p) => s + p.hectares, 0);
  const planted = ownedParcels.filter(p => p.plantedCrop).length;
  const avgSoil = ownedParcels.length > 0
    ? Math.round(ownedParcels.reduce((s, p) => s + soilScore(p.soil), 0) / ownedParcels.length)
    : 0;

  return (
    <ScrollView contentContainerStyle={{ padding: S.md, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={ls.header}>🗺️ Land Management</Text>

      {/* Summary stats */}
      <View style={[ls.card, { flexDirection: 'row', gap: 8 }]}>
        <View style={ls.statBox}>
          <Text style={ls.statLabel}>TOTAL AREA</Text>
          <Text style={ls.statVal}>{totalHa.toFixed(1)} ha</Text>
        </View>
        <View style={ls.statBox}>
          <Text style={ls.statLabel}>IN PRODUCTION</Text>
          <Text style={ls.statVal}>{planted}/{ownedParcels.length}</Text>
        </View>
        <View style={ls.statBox}>
          <Text style={ls.statLabel}>AVG SOIL</Text>
          <Text style={[ls.statVal, { color: scoreColor(avgSoil) }]}>{avgSoil}%</Text>
        </View>
      </View>

      {/* Per-parcel cards */}
      <View style={ls.card}>
        <Text style={ls.cardTitle}>Owned Parcels</Text>
        {ownedParcels.length === 0 && (
          <View style={ls.emptyCard}>
            <Text style={ls.muted}>No owned parcels yet.</Text>
            <Text style={ls.emptyHint}>Visit the Land tab to buy your first parcel and start planting crops. The Land Market shows parcels available for purchase or auction.</Text>
          </View>
        )}
        {ownedParcels.map(parcel => {
          const crop = parcel.plantedCrop ? CROP_TYPES.find(c => c.id === parcel.plantedCrop!.cropId) : null;
          const harvestDay = crop && parcel.plantedCrop ? parcel.plantedCrop.plantedDay + crop.growthDays : null;
          const daysLeft = harvestDay != null ? Math.max(0, harvestDay - day) : null;
          const growthPct = crop && parcel.plantedCrop && harvestDay != null
            ? Math.min(100, Math.round(((day - parcel.plantedCrop.plantedDay) / crop.growthDays) * 100))
            : 0;
          const frostDmg = parcel.plantedCrop?.frostDamage ?? 0;
          const score = soilScore(parcel.soil);
          const isExpanded = expandedParcelId === parcel.id;
          const organicLabel = parcel.organicStatus && ORGANIC_LABELS[parcel.organicStatus]
            ? ORGANIC_LABELS[parcel.organicStatus] : null;
          const issues: string[] = [];
          if (parcel.hasWeeds) issues.push('🌿 Weeds');
          if (parcel.diseased) issues.push('🦠 Disease');
          if (parcel.pestState && parcel.pestState.severity > 0) issues.push('🐛 Pests');
          if (parcel.leasedOut) issues.push('🔒 Leased out');
          if ((parcel.soilSalinity ?? 0) > 40) issues.push('🧂 High salinity');
          if ((parcel.topsoilErosion ?? 0) > 20) issues.push('💨 Erosion');

          return (
            <TouchableOpacity
              key={parcel.id}
              style={ls.parcelCard}
              onPress={() => setExpandedParcelId(isExpanded ? null : parcel.id)}
              activeOpacity={0.75}
            >
              {/* Header row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Text style={ls.parcelName}>{parcel.name}</Text>
                  <Text style={ls.parcelHa}>{parcel.hectares}ha</Text>
                  {organicLabel && (
                    <View style={[ls.pill, { backgroundColor: '#1a3a1a' }]}>
                      <Text style={[ls.pillText, { color: '#4caf50' }]}>{organicLabel}</Text>
                    </View>
                  )}
                  {parcel.greenhouse && (
                    <View style={[ls.pill, { backgroundColor: '#0d2040' }]}>
                      <Text style={[ls.pillText, { color: '#64b5f6' }]}>🏡 GH</Text>
                    </View>
                  )}
                  {parcel.irrigated && (
                    <View style={[ls.pill, { backgroundColor: '#0a2a3a' }]}>
                      <Text style={[ls.pillText, { color: '#4fc3f7' }]}>💧</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: scoreColor(score), fontSize: F.size.xs, fontWeight: 'bold' }}>
                  Soil {score}%{isExpanded ? ' ▲' : ' ▼'}
                </Text>
              </View>

              {/* Crop row */}
              {crop && parcel.plantedCrop ? (
                <View style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={ls.cropName}>{crop.name}</Text>
                    <Text style={ls.cropMeta}>
                      {daysLeft === 0 ? '✅ Ready to harvest' : `harvest in ${daysLeft}d`}
                    </Text>
                  </View>
                  <View style={ls.progressBar}>
                    <View style={[ls.progressFill, { width: `${growthPct}%` as any, backgroundColor: daysLeft === 0 ? '#4caf50' : '#66bb6a' }]} />
                  </View>
                  {frostDmg > 0 && (
                    <Text style={{ color: '#ef5350', fontSize: 9, marginTop: 2 }}>
                      ❄️ Frost damage {Math.round(frostDmg * 100)}%{frostDmg >= 1 ? ' — crop killed' : ''}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[ls.muted, { marginTop: 4, fontStyle: 'italic' }]}>
                  {parcel.leasedOut ? 'Leased out' : '— No crop planted —'}
                </Text>
              )}

              {/* Issues */}
              {issues.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                  {issues.map(issue => (
                    <Text key={issue} style={ls.issueTag}>{issue}</Text>
                  ))}
                </View>
              )}

              {/* Expanded soil detail */}
              {isExpanded && (
                <View style={ls.soilDetail}>
                  <Text style={ls.soilDetailTitle}>Soil Health</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    <SoilPill label="N" value={parcel.soil.nitrogen} optimal={[60, 80]} unit="" />
                    <SoilPill label="P" value={parcel.soil.phosphorus} optimal={[50, 80]} unit="" />
                    <SoilPill label="K" value={parcel.soil.potassium} optimal={[50, 80]} unit="" />
                    <SoilPill label="pH" value={parcel.soil.pH} optimal={[6, 7]} unit="" decimals={1} />
                    <SoilPill label="OM" value={parcel.soil.organicMatter} optimal={[4, 7]} unit="%" decimals={1} />
                    <SoilPill label="Compact" value={parcel.soil.compaction} optimal={[0, 25]} unit="" lowerBetter />
                    <SoilPill label="Microbes" value={parcel.soil.microbialLife} optimal={[60, 100]} unit="" />
                    {(parcel.soilSalinity ?? 0) > 0 && (
                      <SoilPill label="Salinity" value={parcel.soilSalinity ?? 0} optimal={[0, 20]} unit="" lowerBetter />
                    )}
                    {(parcel.topsoilErosion ?? 0) > 0 && (
                      <SoilPill label="Erosion" value={parcel.topsoilErosion ?? 0} optimal={[0, 10]} unit="%" lowerBetter />
                    )}
                  </View>
                  {(() => {
                    const degMod = degradationYieldModifier(parcel);
                    if (degMod >= 0.99) return null;
                    return (
                      <Text style={{ color: '#ef9a9a', fontSize: F.size.xs, marginTop: 4 }}>
                        ⚠ Degradation penalty: −{Math.round((1 - degMod) * 100)}% yield at harvest
                      </Text>
                    );
                  })()}
                  {parcel.soilType && (
                    <Text style={[ls.muted, { marginTop: 4 }]}>Type: {parcel.soilType}</Text>
                  )}
                  {parcel.tillageSystem && (
                    <Text style={[ls.muted, { marginTop: 2 }]}>Tillage: {parcel.tillageSystem}</Text>
                  )}
                  <HedgerowPanel parcelId={parcel.id} hedgerows={hedgerows ?? []} day={day} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active leases (on your land leased to others) */}
      {leasedOutParcels.length > 0 && (
        <View style={ls.card}>
          <Text style={ls.cardTitle}>Land Leased Out</Text>
          {active.map(l => {
            const parcel = parcels.find(p => p.id === l.parcelId);
            const daysLeft = l.endDay - day;
            return (
              <View key={l.id} style={ls.leaseRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={ls.row}>{l.npcName} · {parcel?.hectares ?? '?'}ha</Text>
                  <Text style={[ls.badge, { color: l.leaseType === 'sharecrop' ? '#ffa726' : '#64b5f6' }]}>
                    {l.leaseType.replace('_', ' ')}
                  </Text>
                </View>
                <Text style={ls.muted}>
                  {l.leaseType === 'sharecrop'
                    ? `${Math.round((l.landOwnerSharePct ?? 0.35) * 100)}% owner share`
                    : `€${l.cashRentPerSeason?.toLocaleString()}/season`}
                  {' · '}{daysLeft}d left
                  {l.autoRenew ? ' · ↻ auto' : ''}
                </Text>
                <TouchableOpacity
                  style={[ls.actionBtn, { backgroundColor: '#c62828' }]}
                  onPress={() => cancelLease(l.id)}
                >
                  <Text style={ls.actionBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Available leases */}
      <View style={ls.card}>
        <Text style={ls.cardTitle}>Available Leases</Text>
        {(availableLeases ?? []).length === 0 && <Text style={ls.muted}>No offers available (refreshes in Spring)</Text>}
        {(availableLeases ?? []).map((offer, i) => (
          <View key={offer.parcelId} style={ls.leaseRow}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={ls.row}>{offer.npcName}</Text>
              <Text style={[ls.badge, { color: offer.leaseType === 'sharecrop' ? '#ffa726' : '#64b5f6' }]}>
                {offer.leaseType.replace('_', ' ')}
              </Text>
            </View>
            <Text style={ls.muted}>
              {offer.leaseType === 'sharecrop'
                ? `${offer.termsPerSeason}% owner share`
                : `€${offer.termsPerSeason.toLocaleString()}/season`}
              {offer.improvementClauseAvailable ? ' · improvement clause available' : ''}
            </Text>
            <TouchableOpacity
              style={[ls.actionBtn, { backgroundColor: C.greenDark }]}
              onPress={() => signLease(i, false)}
            >
              <Text style={ls.actionBtnText}>Sign lease</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function HedgerowPanel({ parcelId, hedgerows, day }: {
  parcelId: string;
  hedgerows: import('../../engine/hedgerows').Hedgerow[];
  day: number;
}) {
  const parcelHedgerows = hedgerows.filter(h => h.parcelId === parcelId);
  if (parcelHedgerows.length === 0) return null;

  const pestControl = pestControlForParcel(parcelId, hedgerows, day);
  const windProtected = isWindProtected(parcelId, hedgerows, day);
  const pollStrips = pollinatorStripCount(parcelId, hedgerows, day);
  const bufferPresent = hasBufferStrip(parcelId, hedgerows);

  const HDGROW_NAMES: Record<string, string> = {
    hdg_mixed: 'Mixed Hedge', hdg_buffer: 'Buffer Strip',
    hdg_pollinator: 'Pollinator Strip', hdg_woodland: 'Woodland Edge',
  };

  return (
    <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#1a1a2a', paddingTop: 8 }}>
      <Text style={ls.soilDetailTitle}>Hedgerows ({parcelHedgerows.length})</Text>
      {parcelHedgerows.map(h => {
        const progress = maturityProgress(h, day);
        const isMat = h.mature || progress >= 1;
        return (
          <View key={h.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={[ls.muted, { fontSize: 10 }]}>{HDGROW_NAMES[h.type] ?? h.type} ({h.edge})</Text>
            <Text style={{ fontSize: 10, color: isMat ? '#4caf50' : '#ff9800' }}>
              {isMat ? '✓ Mature' : `${Math.round(progress * 100)}% grown`}
            </Text>
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
        {pestControl > 0 && (
          <View style={[ls.pill, { backgroundColor: '#1a2a1a' }]}>
            <Text style={[ls.pillText, { color: '#66bb6a' }]}>🐛 -{Math.round(pestControl * 100)}% pest</Text>
          </View>
        )}
        {windProtected && (
          <View style={[ls.pill, { backgroundColor: '#1a1a2a' }]}>
            <Text style={[ls.pillText, { color: '#90caf9' }]}>💨 Wind shield</Text>
          </View>
        )}
        {pollStrips > 0 && (
          <View style={[ls.pill, { backgroundColor: '#2a1a1a' }]}>
            <Text style={[ls.pillText, { color: '#ffcc80' }]}>🐝 ×{pollStrips} pollinator</Text>
          </View>
        )}
        {bufferPresent && (
          <View style={[ls.pill, { backgroundColor: '#0a2a1a' }]}>
            <Text style={[ls.pillText, { color: '#80cbc4' }]}>🌿 Buffer</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function SoilPill({
  label, value, optimal, unit, decimals = 0, lowerBetter = false,
}: {
  label: string; value: number; optimal: [number, number]; unit: string;
  decimals?: number; lowerBetter?: boolean;
}) {
  const inRange = lowerBetter ? value <= optimal[1] : (value >= optimal[0] && value <= optimal[1]);
  const color = inRange ? '#4caf50' : value < optimal[0] && !lowerBetter ? '#ffb74d' : '#ef5350';
  return (
    <View style={[ls.soilPill, { borderColor: color + '66' }]}>
      <Text style={[ls.soilPillLabel]}>{label}</Text>
      <Text style={[ls.soilPillVal, { color }]}>{value.toFixed(decimals)}{unit}</Text>
    </View>
  );
}

const ls = StyleSheet.create({
  header:          { fontSize: F.size.xl, fontWeight: 'bold', color: C.text, marginBottom: S.sm },
  card:            { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 6 },
  cardTitle:       { fontSize: F.size.md, fontWeight: '600', color: C.text, marginBottom: 2 },
  row:             { fontSize: F.size.sm, color: C.text },
  muted:           { fontSize: F.size.sm, color: C.textMuted },
  emptyCard:       { gap: 4 },
  emptyHint:       { fontSize: F.size.xs, color: C.textFaint, fontStyle: 'italic', lineHeight: 16 },
  badge:           { fontSize: F.size.sm, fontWeight: '600' },
  statBox:         { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, alignItems: 'center' },
  statLabel:       { color: C.textFaint, fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  statVal:         { color: C.text, fontSize: F.size.md, fontWeight: 'bold', marginTop: 2 },
  parcelCard:      { backgroundColor: C.bgDeep, borderRadius: R.sm, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  parcelName:      { color: C.text, fontSize: F.size.sm, fontWeight: '700' },
  parcelHa:        { color: C.textMuted, fontSize: F.size.xs },
  pill:            { borderRadius: R.pill, paddingHorizontal: 5, paddingVertical: 2 },
  pillText:        { fontSize: 9, fontWeight: '700' },
  cropName:        { color: '#81c784', fontSize: F.size.xs, fontWeight: '600' },
  cropMeta:        { color: C.textMuted, fontSize: F.size.xs },
  progressBar:     { height: 4, backgroundColor: '#1c2c1c', borderRadius: 2, overflow: 'hidden' },
  progressFill:    { height: 4, borderRadius: 2 },
  issueTag:        { color: '#ef9a9a', fontSize: 10, backgroundColor: '#2a1a1a', borderRadius: R.sm, paddingHorizontal: 5, paddingVertical: 2 },
  soilDetail:      { marginTop: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 },
  soilDetailTitle: { color: C.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  soilPill:        { flexDirection: 'row', gap: 4, backgroundColor: '#0d1117', borderRadius: R.sm, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1 },
  soilPillLabel:   { color: C.textFaint, fontSize: 10 },
  soilPillVal:     { fontSize: 10, fontWeight: '700' },
  leaseRow:        { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, gap: 4 },
  actionBtn:       { borderRadius: R.sm, padding: S.sm, marginTop: 4, alignItems: 'center' },
  actionBtnText:   { color: '#fff', fontWeight: '600', fontSize: F.size.sm },
});
