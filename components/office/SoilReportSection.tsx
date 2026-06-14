import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';

function soilBarColor(pct: number) {
  return pct >= 75 ? '#4caf50' : pct >= 50 ? '#f59e0b' : '#ef5350';
}

function nitrogenScore(n: number): number {
  if (n >= 60 && n <= 80) return 100;
  if (n < 60) return Math.round((n / 60) * 100);
  return Math.max(0, Math.round(100 - (n - 80) * 5));
}

function phScore(ph: number): number {
  if (ph >= 6.0 && ph <= 7.0) return 100;
  if (ph < 6.0) return Math.max(0, Math.round(((ph - 4) / 2) * 100));
  return Math.max(0, Math.round(((8.5 - ph) / 1.5) * 100));
}

function omScore(om: number): number {
  if (om >= 4 && om <= 7) return 100;
  if (om < 4) return Math.round((om / 4) * 100);
  return Math.max(0, Math.round(100 - (om - 7) * 20));
}

function compScore(c: number): number {
  return c <= 25 ? 100 : Math.max(0, Math.round(100 - (c - 25) * 2));
}

function totalSoilScore(soil: any): number {
  return Math.round((nitrogenScore(soil.nitrogen) + phScore(soil.pH) + omScore(soil.organicMatter) + compScore(soil.compaction)) / 4);
}

function SoilBar({ label, pct, value }: { label: string; pct: number; value: string }) {
  const col = soilBarColor(pct);
  return (
    <View style={sr.soilBarRow}>
      <Text style={sr.soilBarLabel}>{label}</Text>
      <View style={sr.soilBarTrack}>
        <View style={[sr.soilBarFill, { width: `${Math.min(100, pct)}%` as any, backgroundColor: col }]} />
      </View>
      <Text style={[sr.soilBarValue, { color: col }]}>{value}</Text>
    </View>
  );
}

const ORGANIC_LABEL: Record<string, { text: string; color: string }> = {
  organic:      { text: 'Organic', color: '#4caf50' },
  transition_1: { text: 'Yr 1/3',  color: '#f59e0b' },
  transition_2: { text: 'Yr 2/3',  color: '#f59e0b' },
  transition_3: { text: 'Yr 3/3',  color: '#4caf50' },
  decertified:  { text: 'Decert.', color: '#ef5350' },
};

export default function SoilReportSection() {
  const { parcels } = useGameStore() as any;
  const owned = (parcels as any[]).filter((p: any) => p.owned);

  if (owned.length === 0) {
    return (
      <View style={sr.empty}>
        <Text style={sr.emptyText}>No owned parcels yet.</Text>
        <Text style={sr.emptyHint}>Buy land in the Land tab to start tracking soil health.</Text>
      </View>
    );
  }

  const scores = owned.map((p: any) => totalSoilScore(p.soil));
  const avgScore = Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length);
  const totalHa = owned.reduce((s: number, p: any) => s + p.hectares, 0);
  const organicCount = owned.filter((p: any) => p.organicStatus === 'organic').length;
  const poorParcels = owned.filter((_: any, i: number) => scores[i] < 50);
  const highSalinity = owned.filter((p: any) => (p.soilSalinity ?? 0) > 40);
  const highErosion = owned.filter((p: any) => (p.topsoilErosion ?? 0) > 20);
  const highCompaction = owned.filter((p: any) => p.soil.compaction > 50);

  const avgN = Math.round(owned.reduce((s: number, p: any) => s + p.soil.nitrogen, 0) / owned.length);
  const avgPH = (owned.reduce((s: number, p: any) => s + p.soil.pH, 0) / owned.length).toFixed(1);
  const avgOM = (owned.reduce((s: number, p: any) => s + p.soil.organicMatter, 0) / owned.length).toFixed(1);
  const avgComp = Math.round(owned.reduce((s: number, p: any) => s + p.soil.compaction, 0) / owned.length);

  const scoreColor = soilBarColor(avgScore);

  const sorted = [...owned].map((p: any, i: number) => ({ p, score: scores[i] })).sort((a, b) => a.score - b.score);

  return (
    <ScrollView contentContainerStyle={sr.scroll} showsVerticalScrollIndicator={false}>

      {/* Overview */}
      <Text style={sr.sectionTitle}>🌱 Farm Soil Overview</Text>
      <View style={sr.card}>
        <View style={sr.overviewRow}>
          <View style={sr.overviewStat}>
            <Text style={sr.overviewLabel}>AVG SOIL SCORE</Text>
            <Text style={[sr.overviewValue, { color: scoreColor }]}>{avgScore}%</Text>
          </View>
          <View style={sr.overviewStat}>
            <Text style={sr.overviewLabel}>TOTAL AREA</Text>
            <Text style={sr.overviewValue}>{totalHa.toFixed(1)} ha</Text>
          </View>
          <View style={sr.overviewStat}>
            <Text style={sr.overviewLabel}>ORGANIC</Text>
            <Text style={[sr.overviewValue, { color: organicCount > 0 ? '#4caf50' : '#555' }]}>{organicCount}/{owned.length}</Text>
          </View>
        </View>
        <View style={sr.divider} />
        <SoilBar label="Nitrogen" pct={nitrogenScore(avgN)} value={`${avgN} ppm`} />
        <SoilBar label="pH"       pct={phScore(parseFloat(avgPH))} value={avgPH} />
        <SoilBar label="Org. Matter" pct={omScore(parseFloat(avgOM))} value={`${avgOM}%`} />
        <SoilBar label="Compaction" pct={compScore(avgComp)} value={`${avgComp}%`} />
      </View>

      {/* Alerts */}
      {(poorParcels.length > 0 || highSalinity.length > 0 || highErosion.length > 0 || highCompaction.length > 0) && (
        <>
          <Text style={sr.sectionTitle}>⚠️ Soil Alerts</Text>
          <View style={sr.alertCard}>
            {poorParcels.length > 0 && (
              <View style={sr.alertRow}>
                <Text style={sr.alertIcon}>🔴</Text>
                <View style={{ flex: 1 }}>
                  <Text style={sr.alertTitle}>{poorParcels.length} parcel{poorParcels.length > 1 ? 's' : ''} with poor soil (&lt;50%)</Text>
                  <Text style={sr.alertHint}>{poorParcels.map((p: any) => p.name).join(', ')} — apply lime, compost, or rest the field</Text>
                </View>
              </View>
            )}
            {highSalinity.length > 0 && (
              <View style={sr.alertRow}>
                <Text style={sr.alertIcon}>🧂</Text>
                <View style={{ flex: 1 }}>
                  <Text style={sr.alertTitle}>{highSalinity.length} parcel{highSalinity.length > 1 ? 's' : ''} with high salinity</Text>
                  <Text style={sr.alertHint}>{highSalinity.map((p: any) => p.name).join(', ')} — avoid excess fertilizer, consider gypsum</Text>
                </View>
              </View>
            )}
            {highErosion.length > 0 && (
              <View style={sr.alertRow}>
                <Text style={sr.alertIcon}>💨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={sr.alertTitle}>{highErosion.length} parcel{highErosion.length > 1 ? 's' : ''} with topsoil erosion</Text>
                  <Text style={sr.alertHint}>{highErosion.map((p: any) => p.name).join(', ')} — plant cover crops, add hedgerows</Text>
                </View>
              </View>
            )}
            {highCompaction.length > 0 && (
              <View style={sr.alertRow}>
                <Text style={sr.alertIcon}>🪨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={sr.alertTitle}>{highCompaction.length} compacted parcel{highCompaction.length > 1 ? 's' : ''}</Text>
                  <Text style={sr.alertHint}>{highCompaction.map((p: any) => p.name).join(', ')} — avoid heavy machinery, subsoil till</Text>
                </View>
              </View>
            )}
          </View>
        </>
      )}

      {/* Per-parcel breakdown */}
      <Text style={sr.sectionTitle}>📋 Parcel Breakdown</Text>
      {sorted.map(({ p, score }) => {
        const scoreCol = soilBarColor(score);
        const orgLabel = p.organicStatus && ORGANIC_LABEL[p.organicStatus];
        const salinity = p.soilSalinity ?? 0;
        const erosion = p.topsoilErosion ?? 0;
        return (
          <View key={p.id} style={sr.parcelCard}>
            <View style={sr.parcelHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={sr.parcelName}>{p.name}</Text>
                  <Text style={sr.parcelHa}>{p.hectares}ha</Text>
                  {orgLabel && (
                    <View style={[sr.orgBadge, { borderColor: orgLabel.color + '88' }]}>
                      <Text style={[sr.orgBadgeText, { color: orgLabel.color }]}>{orgLabel.text}</Text>
                    </View>
                  )}
                </View>
                {p.plantedCrop && <Text style={sr.parcelCrop}>Planted: {p.plantedCrop.cropId}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[sr.parcelScore, { color: scoreCol }]}>{score}%</Text>
                <Text style={sr.parcelScoreLabel}>soil</Text>
              </View>
            </View>
            <View style={sr.soilGrid}>
              <View style={sr.soilCell}>
                <Text style={sr.soilCellLabel}>N</Text>
                <Text style={[sr.soilCellValue, { color: soilBarColor(nitrogenScore(p.soil.nitrogen)) }]}>{Math.round(p.soil.nitrogen)}</Text>
              </View>
              <View style={sr.soilCell}>
                <Text style={sr.soilCellLabel}>pH</Text>
                <Text style={[sr.soilCellValue, { color: soilBarColor(phScore(p.soil.pH)) }]}>{p.soil.pH.toFixed(1)}</Text>
              </View>
              <View style={sr.soilCell}>
                <Text style={sr.soilCellLabel}>OM%</Text>
                <Text style={[sr.soilCellValue, { color: soilBarColor(omScore(p.soil.organicMatter)) }]}>{p.soil.organicMatter.toFixed(1)}</Text>
              </View>
              <View style={sr.soilCell}>
                <Text style={sr.soilCellLabel}>Comp</Text>
                <Text style={[sr.soilCellValue, { color: soilBarColor(compScore(p.soil.compaction)) }]}>{Math.round(p.soil.compaction)}%</Text>
              </View>
              {salinity > 0 && (
                <View style={sr.soilCell}>
                  <Text style={sr.soilCellLabel}>🧂</Text>
                  <Text style={[sr.soilCellValue, { color: salinity > 40 ? '#ef5350' : '#f59e0b' }]}>{Math.round(salinity)}</Text>
                </View>
              )}
              {erosion > 0 && (
                <View style={sr.soilCell}>
                  <Text style={sr.soilCellLabel}>💨</Text>
                  <Text style={[sr.soilCellValue, { color: erosion > 20 ? '#ef5350' : '#f59e0b' }]}>{Math.round(erosion)}%</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}

    </ScrollView>
  );
}

const sr = StyleSheet.create({
  scroll:       { padding: S.md, gap: 10 },
  sectionTitle: { color: C.text, fontSize: F.size.sm, fontWeight: 'bold', marginTop: 4, marginBottom: 2 },
  card:         { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md },
  divider:      { height: 1, backgroundColor: '#1a1f2e', marginVertical: S.sm },
  // Overview
  overviewRow:    { flexDirection: 'row', marginBottom: S.sm },
  overviewStat:   { flex: 1, alignItems: 'center' },
  overviewLabel:  { color: C.textMuted, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  overviewValue:  { color: C.text, fontSize: F.size.xxl, fontWeight: 'bold' },
  // Soil bar
  soilBarRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  soilBarLabel: { color: C.textMuted, fontSize: F.size.xs, width: 70 },
  soilBarTrack: { flex: 1, height: 5, backgroundColor: '#0d1117', borderRadius: 3, overflow: 'hidden' },
  soilBarFill:  { height: 5, borderRadius: 3 },
  soilBarValue: { fontSize: F.size.xs, fontWeight: 'bold', width: 52, textAlign: 'right' },
  // Alerts
  alertCard:  { backgroundColor: '#1a0808', borderRadius: R.lg, padding: S.md, borderWidth: 1, borderColor: '#ef535033', gap: 8 },
  alertRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  alertIcon:  { fontSize: 14, lineHeight: 18, width: 20, textAlign: 'center' },
  alertTitle: { color: '#ef9a9a', fontSize: F.size.sm, fontWeight: '600' as const, marginBottom: 1 },
  alertHint:  { color: C.textMuted, fontSize: F.size.xs, lineHeight: 15 },
  // Parcel card
  parcelCard:   { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.sm, gap: S.xs },
  parcelHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: S.xs },
  parcelName:   { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  parcelHa:     { color: '#555', fontSize: F.size.xs },
  parcelCrop:   { color: C.textMuted, fontSize: 10, marginTop: 1 },
  parcelScore:  { fontSize: F.size.xl, fontWeight: 'bold' },
  parcelScoreLabel: { color: '#555', fontSize: 9 },
  orgBadge:     { borderRadius: R.pill, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  orgBadgeText: { fontSize: 9, fontWeight: 'bold' },
  soilGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  soilCell:     { backgroundColor: '#0d1117', borderRadius: R.sm, paddingHorizontal: 7, paddingVertical: 3, alignItems: 'center', minWidth: 46 },
  soilCellLabel:{ color: '#555', fontSize: 8, fontWeight: 'bold' },
  soilCellValue:{ fontSize: F.size.xs, fontWeight: 'bold', marginTop: 1 },
  // Empty
  empty:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: S.xl, gap: S.sm },
  emptyText: { color: C.textMuted, fontSize: F.size.md, textAlign: 'center' },
  emptyHint: { color: C.textFaint, fontSize: F.size.xs, textAlign: 'center', lineHeight: 16 },
});
