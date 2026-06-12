import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { ORGANIC_YIELD_MOD, ORGANIC_TRANSITION_DAYS, canReapplyAfterDecertification, organicApplicationFee, organicPriceMultiplier } from '../../engine/organicCert';

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

export default function CertificationsSection() {
  const { parcels, day, money, startOrganicTransition, fileContaminationAppeal } = useGameStore();

  const owned = parcels.filter(p => p.owned);
  const organicParcels = owned.filter(p => p.organicStatus && p.organicStatus !== 'conventional');

  const TRANSITION_STAGE_NUM: Record<string, number> = {
    transition_1: 1, transition_2: 2, transition_3: 3, organic: 4,
  };
  const NEXT_STAGE_LABEL: Record<string, string> = {
    transition_1: 'Year 2', transition_2: 'Year 3', transition_3: 'Certified',
  };

  const certifiedCount = organicParcels.filter(p => p.organicStatus === 'organic').length;
  const certifiedHa = organicParcels.filter(p => p.organicStatus === 'organic').reduce((s, p) => s + p.hectares, 0);
  const conventionalHa = owned.filter(p => !p.organicStatus || p.organicStatus === 'conventional').reduce((s, p) => s + p.hectares, 0);

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
        <Text style={[cs.muted, { marginTop: 6 }]}>
          Organic premium: ×1.8 grains · ×2.2 veg/fruit · ×2.5 specialty
        </Text>
      </View>

      {/* Parcel list */}
      {owned.map(parcel => {
        const status = parcel.organicStatus ?? 'conventional';
        const isDecertified = status === 'decertified';
        const canReapply = isDecertified && canReapplyAfterDecertification(parcel.lastDecertifiedDay, day);
        const fee = organicApplicationFee(parcel.hectares);
        const appeal = parcel.pendingContaminationAppeal;
        const appealOpen = appeal && !appeal.filed && day <= appeal.appealDeadlineDay;

        // Transition timeline
        const inTransition = status === 'transition_1' || status === 'transition_2' || status === 'transition_3';
        const stageNum = TRANSITION_STAGE_NUM[status] ?? 0;
        const stageStart = parcel.organicTransitionStartDay;
        const dayInStage = stageStart != null ? day - (stageStart + (stageNum - 1) * ORGANIC_TRANSITION_DAYS) : null;
        const daysUntilNext = dayInStage != null ? Math.max(0, ORGANIC_TRANSITION_DAYS - dayInStage) : null;
        const daysUntilCertified = stageStart != null ? Math.max(0, (stageStart + 3 * ORGANIC_TRANSITION_DAYS) - day) : null;

        return (
          <View key={parcel.id} style={cs.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={cs.row}>{parcel.name} · {parcel.hectares}ha</Text>
              <Text style={[cs.badge, { color: STATUS_COLOR[status] }]}>
                {STATUS_LABELS[status] ?? status}
              </Text>
            </View>

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

            {status !== 'conventional' && status !== 'decertified' && (
              <Text style={cs.muted}>
                Yield: {Math.round((ORGANIC_YIELD_MOD[status] ?? 1) * 100)}%
                {status === 'organic' ? ' · Premium price ×1.8–2.5' : ` · reaches 92% at certification`}
              </Text>
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
                  📝 Apply for organic (€{fee.toLocaleString()})
                </Text>
              </TouchableOpacity>
            )}

            {isDecertified && (
              <Text style={cs.muted}>
                {canReapply
                  ? 'Can reapply now'
                  : `Locked until Day ${(parcel.lastDecertifiedDay ?? 0) + 1095}`}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const cs = StyleSheet.create({
  header: { fontSize: F.size.xl, fontWeight: 'bold', color: C.text, marginBottom: S.sm },
  card: { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 6 },
  cardTitle: { fontSize: F.size.md, fontWeight: '600', color: C.text },
  row: { fontSize: F.size.sm, color: C.text },
  muted: { fontSize: F.size.sm, color: C.textMuted },
  badge: { fontSize: F.size.sm, fontWeight: '600' },
  alertBox: { borderRadius: R.sm, padding: S.sm, marginTop: 4 },
  alertText: { fontSize: F.size.sm, color: C.text },
  actionBtn: { backgroundColor: C.greenDark, borderRadius: R.sm, padding: S.sm, marginTop: 4, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: F.size.sm },
  statBox: { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, alignItems: 'center' },
  statLabel: { color: C.textFaint, fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  statVal: { color: C.text, fontSize: F.size.sm, fontWeight: 'bold', marginTop: 2 },
  progressBar: { height: 4, backgroundColor: C.bgDeep, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#ffa726', borderRadius: 2 },
});
