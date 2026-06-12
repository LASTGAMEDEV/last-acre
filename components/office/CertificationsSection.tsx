import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import {
  ORGANIC_YIELD_MOD,
  ORGANIC_TRANSITION_DAYS,
  canReapplyAfterDecertification,
  organicApplicationFee,
  organicPriceMultiplier,
  getOrganicPracticeBonus,
} from '../../engine/organicCert';
import { CROP_TYPES } from '../../data/cropTypes';

const STATUS_LABELS: Record<string, string> = {
  conventional: '🌾 Conventional',
  transition_1: '🔄 Transition Year 1',
  transition_2: '🔄 Transition Year 2',
  transition_3: '🔄 Transition Year 3',
  organic: '🌿 Certified Organic',
  decertified: '🚫 Decertified',
};

const STATUS_COLOR: Record<string, string> = {
  conventional: '#888',
  transition_1: '#ffa726',
  transition_2: '#ffa726',
  transition_3: '#ffa726',
  organic: C.green,
  decertified: '#ef5350',
};

const STAGE_CLEAN_YEARS: Partial<Record<string, number>> = {
  transition_1: 0, transition_2: 1, transition_3: 2, organic: 3,
};

const COVER_CROP_IDS = new Set(['rye', 'clover', 'mustard', 'buckwheat']);

function computePracticeBonus(parcel: any) {
  const status = parcel.organicStatus ?? 'conventional';
  const coverCropPresent = parcel.plantedCrop ? COVER_CROP_IDS.has(parcel.plantedCrop.cropId) : false;
  const organicMatter = parcel.soil?.organicMatter ?? 0;
  const microbialLife = (parcel.soil?.microbialLife ?? 0) / 100;
  const cleanYears = STAGE_CLEAN_YEARS[status] ?? 0;
  const bonus = getOrganicPracticeBonus({
    coverCropPresent,
    organicMatter,
    microbialLife,
    noSyntheticFertilizerYears: cleanYears,
  });
  const baseYield = ORGANIC_YIELD_MOD[status as keyof typeof ORGANIC_YIELD_MOD] ?? 1.0;
  const effectiveYield = status === 'conventional' || status === 'decertified'
    ? 1.0
    : Math.min(1.0, baseYield * bonus);
  return { coverCropPresent, organicMatter, microbialLife, cleanYears, bonus, baseYield, effectiveYield };
}

export default function CertificationsSection() {
  const { parcels, day, money, startOrganicTransition, fileContaminationAppeal } = useGameStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const owned = parcels.filter((p: any) => p.owned);
  const organicParcels = owned.filter((p: any) => p.organicStatus && p.organicStatus !== 'conventional');

  const TRANSITION_STAGE_NUM: Record<string, number> = {
    transition_1: 1, transition_2: 2, transition_3: 3, organic: 4,
  };
  const NEXT_STAGE_LABEL: Record<string, string> = {
    transition_1: 'Year 2', transition_2: 'Year 3', transition_3: 'Certified',
  };

  const certifiedCount = organicParcels.filter((p: any) => p.organicStatus === 'organic').length;
  const certifiedHa = organicParcels.filter((p: any) => p.organicStatus === 'organic').reduce((s: number, p: any) => s + p.hectares, 0);
  const conventionalHa = owned.filter((p: any) => !p.organicStatus || p.organicStatus === 'conventional').reduce((s: number, p: any) => s + p.hectares, 0);

  // Average practice bonus across organic/transition parcels
  const enrolledParcels = organicParcels;
  const avgEffective = enrolledParcels.length > 0
    ? enrolledParcels.reduce((s: number, p: any) => s + computePracticeBonus(p).effectiveYield, 0) / enrolledParcels.length
    : null;

  return (
    <ScrollView contentContainerStyle={{ padding: S.md, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={cs.header}>🌿 Organic Certification</Text>

      {/* Summary */}
      <View style={cs.card}>
        <Text style={cs.cardTitle}>Farm Overview</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <View style={cs.statBox}>
            <Text style={cs.statLabel}>ORGANIC</Text>
            <Text style={[cs.statVal, { color: C.green }]}>{certifiedCount} ({certifiedHa.toFixed(1)}ha)</Text>
          </View>
          <View style={cs.statBox}>
            <Text style={cs.statLabel}>IN TRANSITION</Text>
            <Text style={[cs.statVal, { color: '#ffa726' }]}>{organicParcels.length - certifiedCount}</Text>
          </View>
          <View style={cs.statBox}>
            <Text style={cs.statLabel}>CONVENTIONAL</Text>
            <Text style={cs.statVal}>{owned.length - organicParcels.length} ({conventionalHa.toFixed(1)}ha)</Text>
          </View>
        </View>
        {avgEffective !== null && (
          <Text style={[cs.muted, { marginTop: 6, color: C.greenSoft }]}>
            Avg organic yield: {Math.round(avgEffective * 100)}% (base × practice bonuses)
          </Text>
        )}
        <View style={{ marginTop: 6, gap: 2 }}>
          <Text style={cs.muted}>Organic price premium by crop type:</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
            {[
              { label: 'Grains', mult: '×1.8', color: '#ffa726' },
              { label: 'Veg/Fruit', mult: '×2.2', color: C.green },
              { label: 'Specialty', mult: '×2.5', color: '#ce93d8' },
              { label: 'Honey', mult: '×2.0', color: '#ffcc02' },
            ].map(({ label, mult, color }) => (
              <View key={label} style={cs.multChip}>
                <Text style={[cs.multLabel, { color }]}>{mult}</Text>
                <Text style={cs.multCrop}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Parcel list */}
      {owned.map((parcel: any) => {
        const status = parcel.organicStatus ?? 'conventional';
        const isDecertified = status === 'decertified';
        const canReapply = isDecertified && canReapplyAfterDecertification(parcel.lastDecertifiedDay, day);
        const fee = organicApplicationFee(parcel.hectares);
        const appeal = parcel.pendingContaminationAppeal;
        const appealOpen = appeal && !appeal.filed && day <= appeal.appealDeadlineDay;
        const isExpanded = expandedId === parcel.id;

        const inTransition = status === 'transition_1' || status === 'transition_2' || status === 'transition_3';
        const stageNum = TRANSITION_STAGE_NUM[status] ?? 0;
        const stageStart = parcel.organicTransitionStartDay;
        const dayInStage = stageStart != null ? day - (stageStart + (stageNum - 1) * ORGANIC_TRANSITION_DAYS) : null;
        const daysUntilNext = dayInStage != null ? Math.max(0, ORGANIC_TRANSITION_DAYS - dayInStage) : null;
        const daysUntilCertified = stageStart != null ? Math.max(0, (stageStart + 3 * ORGANIC_TRANSITION_DAYS) - day) : null;

        const isEnrolled = inTransition || status === 'organic';
        const practice = isEnrolled ? computePracticeBonus(parcel) : null;

        // Per-crop organic premium for currently planted crop
        const plantedCropId = parcel.plantedCrop?.cropId;
        const cropType = plantedCropId ? CROP_TYPES.find((c: any) => c.id === plantedCropId) : null;
        const cropMult = plantedCropId ? organicPriceMultiplier(plantedCropId) : null;

        // Revenue uplift for conventional parcel (if crop planted)
        const basePrice = cropType?.basePrice ?? 0;
        const revenueUplift = status === 'conventional' && cropMult && cropType
          ? `€${Math.round(basePrice * (cropMult - 1) * cropType.baseYield * parcel.hectares)}/season at current prices`
          : null;

        return (
          <View key={parcel.id} style={cs.card}>
            <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : parcel.id)} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={cs.row}>{parcel.name} · {parcel.hectares}ha</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[cs.badge, { color: STATUS_COLOR[status] }]}>
                    {STATUS_LABELS[status] ?? status}
                  </Text>
                  <Text style={cs.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </View>

              {/* Current planted crop + its organic multiplier */}
              {cropType && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={cs.muted}>{cropType.name} planted</Text>
                  {cropMult && (
                    <Text style={[cs.muted, { color: status === 'organic' ? C.green : '#ffa726' }]}>
                      {status === 'organic' ? `×${cropMult} organic` : `×${cropMult} if organic`}
                    </Text>
                  )}
                </View>
              )}

              {inTransition && daysUntilNext != null && (
                <View style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={cs.muted}>→ {NEXT_STAGE_LABEL[status]} in {daysUntilNext}d</Text>
                    {daysUntilCertified != null && (
                      <Text style={cs.muted}>🌿 certified in {daysUntilCertified}d</Text>
                    )}
                  </View>
                  <View style={cs.progressBar}>
                    <View style={[cs.progressFill, { width: `${Math.min(100, Math.round(((ORGANIC_TRANSITION_DAYS - daysUntilNext) / ORGANIC_TRANSITION_DAYS) * 100))}%` as any }]} />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Expanded detail */}
            {isExpanded && (
              <View style={{ marginTop: S.sm, gap: S.sm }}>

                {/* Practice bonus breakdown for enrolled parcels */}
                {practice && (
                  <View style={cs.infoBlock}>
                    <Text style={cs.infoLabel}>PRACTICE BONUSES</Text>
                    <View style={{ gap: 4, marginTop: 4 }}>
                      <PracticeRow
                        label="Cover crop planted (rye/clover/mustard)"
                        ok={practice.coverCropPresent}
                        bonus="+5%"
                      />
                      <PracticeRow
                        label={`Soil organic matter >0.6 (now: ${practice.organicMatter.toFixed(1)})`}
                        ok={practice.organicMatter > 0.6}
                        bonus="+8%"
                      />
                      <PracticeRow
                        label={`Microbial life >70% (now: ${Math.round(practice.microbialLife * 100)}%)`}
                        ok={practice.microbialLife > 0.7}
                        bonus="+6%"
                      />
                      <PracticeRow
                        label={`≥2 clean years (now: ${practice.cleanYears})`}
                        ok={practice.cleanYears >= 2}
                        bonus="+4%"
                      />
                    </View>
                    <View style={[cs.yieldSummary, { marginTop: 6 }]}>
                      <Text style={cs.yieldLabel}>Base organic yield:</Text>
                      <Text style={cs.yieldVal}>{Math.round(practice.baseYield * 100)}%</Text>
                    </View>
                    <View style={cs.yieldSummary}>
                      <Text style={cs.yieldLabel}>Practice bonus:</Text>
                      <Text style={[cs.yieldVal, { color: '#ffa726' }]}>×{practice.bonus.toFixed(2)}</Text>
                    </View>
                    <View style={[cs.yieldSummary, { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 4, marginTop: 2 }]}>
                      <Text style={[cs.yieldLabel, { fontWeight: '600', color: C.text }]}>Effective yield:</Text>
                      <Text style={[cs.yieldVal, { color: practice.effectiveYield >= 0.90 ? C.green : '#ffa726', fontWeight: 'bold' }]}>
                        {Math.round(practice.effectiveYield * 100)}%
                      </Text>
                    </View>
                  </View>
                )}

                {/* Soil health indicators */}
                <View style={cs.infoBlock}>
                  <Text style={cs.infoLabel}>SOIL HEALTH</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {[
                      { k: 'Organic Matter', v: `${(parcel.soil?.organicMatter ?? 0).toFixed(1)}/10` },
                      { k: 'Microbial Life', v: `${Math.round(parcel.soil?.microbialLife ?? 0)}%` },
                      { k: 'Compaction', v: `${Math.round(parcel.soil?.compaction ?? 0)}%` },
                      { k: 'Salinity', v: `${(parcel.soilSalinity ?? 0).toFixed(1)}%` },
                    ].map(({ k, v }) => (
                      <View key={k} style={cs.soilChip}>
                        <Text style={cs.soilChipKey}>{k}</Text>
                        <Text style={cs.soilChipVal}>{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Revenue uplift hint for conventional */}
                {revenueUplift && (
                  <View style={[cs.infoBlock, { backgroundColor: '#1a2a0a' }]}>
                    <Text style={cs.infoLabel}>ORGANIC UPLIFT POTENTIAL</Text>
                    <Text style={[cs.muted, { marginTop: 3, color: C.greenSoft }]}>
                      +{revenueUplift} from {cropType?.name} organic premium
                    </Text>
                    <Text style={[cs.muted, { marginTop: 2 }]}>
                      Fee: €{fee.toLocaleString()} · 3-year transition required
                    </Text>
                  </View>
                )}

                {appealOpen && (
                  <View style={[cs.alertBox, { backgroundColor: '#5c1a1a' }]}>
                    <Text style={cs.alertText}>
                      🌬️ Pesticide drift detected! Appeal deadline: Day {appeal.appealDeadlineDay}
                    </Text>
                    <TouchableOpacity
                      style={cs.actionBtn}
                      onPress={() => { fileContaminationAppeal(parcel.id); }}
                    >
                      <Text style={cs.actionBtnText}>📋 Document incident</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {status === 'conventional' && (
                  <TouchableOpacity
                    style={[cs.actionBtn, money < fee && { opacity: 0.5 }]}
                    disabled={money < fee}
                    onPress={() => startOrganicTransition(parcel.id)}
                  >
                    <Text style={cs.actionBtnText}>
                      📝 Start organic transition (€{fee.toLocaleString()})
                    </Text>
                  </TouchableOpacity>
                )}

                {isDecertified && (
                  <Text style={cs.muted}>
                    {canReapply
                      ? 'Lockout expired — can reapply now'
                      : `Locked until Day ${(parcel.lastDecertifiedDay ?? 0) + 1095}`}
                  </Text>
                )}
              </View>
            )}

            {/* Collapsed quick summary for enrolled parcels */}
            {!isExpanded && isEnrolled && practice && (
              <Text style={[cs.muted, { marginTop: 3 }]}>
                Effective yield: {Math.round(practice.effectiveYield * 100)}%
                {' · '}Bonus: ×{practice.bonus.toFixed(2)}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function PracticeRow({ label, ok, bonus }: { label: string; ok: boolean; bonus: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={[pr.label, { color: ok ? C.greenSoft : C.textMuted }]}>
        {ok ? '✓' : '✗'} {label}
      </Text>
      <Text style={[pr.bonus, { color: ok ? C.green : '#555' }]}>{ok ? bonus : '—'}</Text>
    </View>
  );
}

const pr = StyleSheet.create({
  label: { fontSize: 10, flex: 1, marginRight: 4 },
  bonus: { fontSize: 10, fontWeight: '600', width: 32, textAlign: 'right' },
});

const cs = StyleSheet.create({
  header: { fontSize: F.size.xl, fontWeight: 'bold', color: C.text, marginBottom: S.sm },
  card: { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 6 },
  cardTitle: { fontSize: F.size.md, fontWeight: '600', color: C.text },
  row: { fontSize: F.size.sm, color: C.text, fontWeight: 'bold' },
  muted: { fontSize: F.size.sm, color: C.textMuted },
  badge: { fontSize: F.size.sm, fontWeight: '600' },
  chevron: { color: C.textFaint, fontSize: 10 },
  alertBox: { borderRadius: R.sm, padding: S.sm, marginTop: 4 },
  alertText: { fontSize: F.size.sm, color: C.text },
  actionBtn: { backgroundColor: C.greenDark, borderRadius: R.sm, padding: S.sm, marginTop: 4, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: F.size.sm },
  statBox: { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, alignItems: 'center' },
  statLabel: { color: C.textFaint, fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  statVal: { color: C.text, fontSize: F.size.sm, fontWeight: 'bold', marginTop: 2 },
  progressBar: { height: 4, backgroundColor: C.bgDeep, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#ffa726', borderRadius: 2 },

  infoBlock: { backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm },
  infoLabel: { color: C.textFaint, fontSize: 8, fontWeight: '600', letterSpacing: 1 },

  yieldSummary: { flexDirection: 'row', justifyContent: 'space-between' },
  yieldLabel: { color: C.textMuted, fontSize: F.size.sm },
  yieldVal: { color: C.text, fontSize: F.size.sm },

  soilChip: { backgroundColor: '#1a2030', borderRadius: R.xs, paddingHorizontal: 8, paddingVertical: 4 },
  soilChipKey: { color: C.textFaint, fontSize: 8, letterSpacing: 0.5 },
  soilChipVal: { color: C.text, fontSize: F.size.sm, fontWeight: '600', marginTop: 1 },

  multChip: { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.xs, alignItems: 'center' },
  multLabel: { fontSize: F.size.md, fontWeight: 'bold' },
  multCrop: { fontSize: 8, color: C.textFaint, marginTop: 1 },
});
