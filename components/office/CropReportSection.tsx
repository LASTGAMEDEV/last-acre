import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import type { LandParcel } from '../../types/domain/land';

const ORGANIC_LABEL: Record<string, string> = {
  conventional: 'Conv.',
  transition_1: 'Trans.1',
  transition_2: 'Trans.2',
  transition_3: 'Trans.3',
  organic: '🌿 Organic',
  decertified: '⚠ Decert.',
};
const ORGANIC_COLOR: Record<string, string> = {
  conventional: '#888',
  transition_1: '#f59e0b',
  transition_2: '#fbbf24',
  transition_3: '#a3e635',
  organic: '#4caf50',
  decertified: '#ef5350',
};

function SectionHeader({ title }: { title: string }) {
  return <Text style={cr.sectionHeader}>{title}</Text>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <View style={cr.card}>{children}</View>;
}

function SoilBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <View style={cr.soilTrack}>
      <View style={[cr.soilFill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function ActiveCropCard({ parcel, day }: { parcel: LandParcel; day: number }) {
  const pc = parcel.plantedCrop!;
  const ct = CROP_TYPES.find(c => c.id === pc.cropId);
  const plantDay = pc.plantedDay;
  const harvestDay = plantDay + (ct?.growthDays ?? 60);
  const progress = Math.min(1, (day - plantDay) / (ct?.growthDays ?? 60));
  const daysLeft = Math.max(0, harvestDay - day);
  const progressPct = Math.round(progress * 100);
  const estRevenue = ct ? Math.round((ct.baseYield * parcel.hectares * ct.basePrice)) : 0;

  return (
    <View style={cr.activeCard}>
      <View style={cr.activeCardHeader}>
        <Text style={cr.activeCardName}>{ct?.name ?? pc.cropId}</Text>
        <Text style={cr.activeCardParcel}>{parcel.name}</Text>
        {daysLeft === 0 ? (
          <Text style={cr.readyBadge}>READY</Text>
        ) : (
          <Text style={cr.daysLeft}>{daysLeft}d left</Text>
        )}
      </View>
      <View style={cr.progressTrack}>
        <View style={[cr.progressFill, { width: `${progressPct}%` as any, backgroundColor: progress >= 1 ? '#4caf50' : '#c8860a' }]} />
      </View>
      <View style={cr.activeCardMeta}>
        <Text style={cr.metaText}>{parcel.hectares.toFixed(1)} ha · est. ${estRevenue.toLocaleString()}</Text>
        {parcel.organicStatus && parcel.organicStatus !== 'conventional' && (
          <Text style={[cr.metaText, { color: ORGANIC_COLOR[parcel.organicStatus] ?? '#888' }]}>
            {ORGANIC_LABEL[parcel.organicStatus] ?? parcel.organicStatus}
          </Text>
        )}
      </View>
    </View>
  );
}

function ParcelStatusRow({ parcel }: { parcel: LandParcel }) {
  const soilN = parcel.soil?.nitrogen ?? parcel.fertility ?? 50;
  const soilP = parcel.soil?.phosphorus ?? 50;
  const soilK = parcel.soil?.potassium ?? 50;
  const avgSoil = Math.round((soilN + soilP + soilK) / 3);
  const soilColor = avgSoil >= 65 ? '#4caf50' : avgSoil >= 35 ? '#f59e0b' : '#ef5350';
  const lastCrop = parcel.cropHistory?.[parcel.cropHistory.length - 1];
  const lastCropName = lastCrop ? (CROP_TYPES.find(c => c.id === lastCrop)?.name ?? lastCrop) : '—';
  const organic = parcel.organicStatus ?? 'conventional';

  return (
    <View style={cr.parcelRow}>
      <View style={{ flex: 1 }}>
        <Text style={cr.parcelName}>{parcel.name}</Text>
        <Text style={cr.parcelMeta}>{parcel.hectares.toFixed(1)} ha · last: {lastCropName}</Text>
      </View>
      <View style={cr.parcelRight}>
        <View style={cr.soilBlock}>
          <Text style={[cr.soilPct, { color: soilColor }]}>{avgSoil}%</Text>
          <SoilBar value={avgSoil} color={soilColor} />
        </View>
        <Text style={[cr.organicTag, { color: ORGANIC_COLOR[organic] ?? '#888' }]}>
          {ORGANIC_LABEL[organic] ?? organic}
        </Text>
      </View>
    </View>
  );
}

export default function CropReportSection() {
  const { day, parcels, salesLog, prices } = useGameStore();

  const ownedParcels = (parcels ?? []).filter(p => p.owned);
  const activeParcels = ownedParcels.filter(p => p.plantedCrop);
  const idleParcels = ownedParcels.filter(p => !p.plantedCrop);

  // Per-crop revenue last 90 days
  const cropRevMap: Record<string, number> = {};
  (salesLog ?? [])
    .filter(s => s.day >= day - 90 && s.category === 'crops' && s.cropId)
    .forEach(s => {
      cropRevMap[s.cropId!] = (cropRevMap[s.cropId!] ?? 0) + s.amount;
    });
  const cropRevEntries = Object.entries(cropRevMap).sort((a, b) => b[1] - a[1]);
  const totalCropRev = cropRevEntries.reduce((s, [, v]) => s + v, 0);

  // Soil health distribution
  const soilScores = ownedParcels.map(p => {
    const n = p.soil?.nitrogen ?? p.fertility ?? 50;
    const ph = p.soil?.phosphorus ?? 50;
    const k = p.soil?.potassium ?? 50;
    return Math.round((n + ph + k) / 3);
  });
  const avgSoil = soilScores.length > 0 ? Math.round(soilScores.reduce((a, b) => a + b, 0) / soilScores.length) : 0;
  const poorParcels = soilScores.filter(s => s < 35).length;

  // Total land stats
  const totalHa = ownedParcels.reduce((s, p) => s + p.hectares, 0);
  const plantedHa = activeParcels.reduce((s, p) => s + p.hectares, 0);
  const utilizationPct = totalHa > 0 ? Math.round((plantedHa / totalHa) * 100) : 0;
  const organicParcels = ownedParcels.filter(p => p.organicStatus === 'organic').length;

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <ScrollView contentContainerStyle={cr.container} showsVerticalScrollIndicator={false}>

      <SectionHeader title="📊 Farm Overview" />
      <Card>
        <View style={cr.statRow}><Text style={cr.statLabel}>Total land</Text><Text style={cr.statValue}>{totalHa.toFixed(1)} ha</Text></View>
        <View style={cr.statRow}><Text style={cr.statLabel}>Utilization</Text><Text style={[cr.statValue, { color: utilizationPct >= 70 ? '#4caf50' : '#f59e0b' }]}>{utilizationPct}% planted</Text></View>
        <View style={cr.statRow}><Text style={cr.statLabel}>Active crops</Text><Text style={cr.statValue}>{activeParcels.length} of {ownedParcels.length} parcels</Text></View>
        <View style={cr.statRow}><Text style={cr.statLabel}>Avg soil health</Text><Text style={[cr.statValue, { color: avgSoil >= 65 ? '#4caf50' : avgSoil >= 35 ? '#f59e0b' : '#ef5350' }]}>{avgSoil}%</Text></View>
        {poorParcels > 0 && <View style={cr.statRow}><Text style={cr.statLabel}>⚠ Poor soil parcels</Text><Text style={[cr.statValue, { color: '#ef5350' }]}>{poorParcels}</Text></View>}
        {organicParcels > 0 && <View style={cr.statRow}><Text style={cr.statLabel}>🌿 Certified organic</Text><Text style={[cr.statValue, { color: '#4caf50' }]}>{organicParcels} parcel{organicParcels > 1 ? 's' : ''}</Text></View>}
        <View style={cr.statRow}><Text style={cr.statLabel}>Crop revenue (90d)</Text><Text style={[cr.statValue, { color: '#4caf50', fontWeight: 'bold' }]}>{fmt(totalCropRev)}</Text></View>
      </Card>

      {activeParcels.length > 0 && (
        <>
          <SectionHeader title="🌱 Growing Now" />
          {activeParcels
            .slice()
            .sort((a, b) => {
              const pc_a = a.plantedCrop!;
              const pc_b = b.plantedCrop!;
              const ct_a = CROP_TYPES.find(c => c.id === pc_a.cropId);
              const ct_b = CROP_TYPES.find(c => c.id === pc_b.cropId);
              const plantDay_a = pc_a.plantedDay;
              const plantDay_b = pc_b.plantedDay;
              const daysLeft_a = Math.max(0, plantDay_a + (ct_a?.growthDays ?? 60) - day);
              const daysLeft_b = Math.max(0, plantDay_b + (ct_b?.growthDays ?? 60) - day);
              return daysLeft_a - daysLeft_b;
            })
            .map(p => <ActiveCropCard key={p.id} parcel={p} day={day} />)
          }
        </>
      )}

      {cropRevEntries.length > 0 && (
        <>
          <SectionHeader title="💰 Crop Profitability (90 days)" />
          <Card>
            {cropRevEntries.map(([cropId, rev], i) => {
              const ct = CROP_TYPES.find(c => c.id === cropId);
              const pct = totalCropRev > 0 ? Math.round((rev / totalCropRev) * 100) : 0;
              const curPrice = (prices ?? []).find(p => p.cropId === cropId)?.price ?? ct?.basePrice ?? 0;
              // Estimate profitability: revenue - seed cost (approximated from harvest volume)
              const estUnits = ct && ct.basePrice > 0 ? rev / ct.basePrice : 0;
              const estHa = ct && ct.baseYield > 0 ? estUnits / ct.baseYield : 0;
              const estSeedCost = ct ? estHa * (ct.seedCost ?? 0) : 0;
              const estProfit = rev - estSeedCost;
              const estMarginPct = rev > 0 ? Math.round((estProfit / rev) * 100) : 0;
              const marginColor = estMarginPct >= 70 ? '#4caf50' : estMarginPct >= 40 ? '#f59e0b' : '#ef5350';
              return (
                <View key={cropId} style={cr.revRow}>
                  <Text style={cr.revRank}>#{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={cr.revTopRow}>
                      <Text style={cr.revName}>{ct?.name ?? cropId}</Text>
                      <Text style={cr.revAmt}>{fmt(rev)}</Text>
                    </View>
                    <View style={cr.revBarTrack}>
                      <View style={[cr.revBarFill, { width: `${pct}%` as any }]} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                      <Text style={cr.revPriceNote}>
                        ${curPrice.toFixed(2)}/{ct?.unit ?? 'kg'} · {pct}% of revenue
                      </Text>
                      {estSeedCost > 0 && (
                        <Text style={[cr.revPriceNote, { color: marginColor, fontWeight: 'bold' }]}>
                          ~{estMarginPct}% margin
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}

      <SectionHeader title="🗺 Parcel Status" />
      <Card>
        {ownedParcels.length === 0 ? (
          <Text style={cr.emptyText}>No owned parcels yet.</Text>
        ) : (
          ownedParcels.map(p => <ParcelStatusRow key={p.id} parcel={p} />)
        )}
      </Card>

      {idleParcels.length > 0 && (
        <>
          <SectionHeader title="⚠ Idle Parcels" />
          <Card>
            <Text style={cr.idleNote}>
              {idleParcels.length} parcel{idleParcels.length > 1 ? 's' : ''} ({idleParcels.reduce((s, p) => s + p.hectares, 0).toFixed(1)} ha) are not planted. Consider planting a cover crop to protect soil.
            </Text>
            {idleParcels.map(p => (
              <Text key={p.id} style={cr.idleParcelName}>· {p.name} ({p.hectares.toFixed(1)} ha)</Text>
            ))}
          </Card>
        </>
      )}

    </ScrollView>
  );
}

const cr = StyleSheet.create({
  container:      { padding: S.md, gap: S.sm, paddingBottom: 40 },
  sectionHeader:  { color: C.textMuted, fontSize: F.size.xs, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: S.md, marginBottom: 2 },
  card:           { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 2 },
  statRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  statLabel:      { color: C.textMuted, fontSize: F.size.sm, flex: 1 },
  statValue:      { color: C.text, fontSize: F.size.sm },
  emptyText:      { color: C.textMuted, fontSize: F.size.sm, textAlign: 'center', paddingVertical: S.sm },
  // Active crop cards
  activeCard:     { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.sm, marginBottom: S.xs, borderLeftWidth: 3, borderLeftColor: '#c8860a' },
  activeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  activeCardName: { color: C.text, fontSize: F.size.sm, fontWeight: 'bold', flex: 1 },
  activeCardParcel: { color: C.textMuted, fontSize: F.size.xs },
  readyBadge:     { backgroundColor: '#4caf50', color: '#fff', fontSize: 9, fontWeight: 'bold', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  daysLeft:       { color: '#f59e0b', fontSize: F.size.xs },
  progressTrack:  { height: 5, backgroundColor: C.bgDeep, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill:   { height: 5, borderRadius: 3 },
  activeCardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText:       { color: C.textMuted, fontSize: F.size.xs },
  // Revenue
  revRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.divider },
  revRank:        { color: C.textFaint, fontSize: 10, width: 24, paddingTop: 2 },
  revTopRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  revName:        { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  revAmt:         { color: '#4caf50', fontSize: F.size.sm, fontWeight: 'bold' },
  revBarTrack:    { height: 4, backgroundColor: C.bgDeep, borderRadius: 2, overflow: 'hidden', marginBottom: 2 },
  revBarFill:     { height: 4, backgroundColor: '#c8860a', borderRadius: 2 },
  revPriceNote:   { color: C.textFaint, fontSize: 10 },
  // Parcel rows
  parcelRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.divider },
  parcelName:     { color: C.text, fontSize: F.size.sm, fontWeight: '500' },
  parcelMeta:     { color: C.textMuted, fontSize: 10, marginTop: 1 },
  parcelRight:    { alignItems: 'flex-end', gap: 3 },
  soilBlock:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  soilPct:        { fontSize: 10, fontWeight: 'bold', width: 28, textAlign: 'right' },
  soilTrack:      { width: 48, height: 4, backgroundColor: C.bgDeep, borderRadius: 2, overflow: 'hidden' },
  soilFill:       { height: 4, borderRadius: 2 },
  organicTag:     { fontSize: 9, fontWeight: 'bold' },
  // Idle
  idleNote:       { color: '#f59e0b', fontSize: F.size.sm, marginBottom: 6 },
  idleParcelName: { color: C.textMuted, fontSize: F.size.sm, paddingVertical: 1 },
});
