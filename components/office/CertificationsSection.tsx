import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { ORGANIC_YIELD_MOD, canReapplyAfterDecertification, organicApplicationFee } from '../../engine/organicCert';

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
  organic: '#4caf50',
  decertified: '#ef5350',
};

export default function CertificationsSection() {
  const { parcels, day, money, startOrganicTransition, fileContaminationAppeal } = useGameStore();

  const owned = parcels.filter(p => p.owned);
  const organicParcels = owned.filter(p => p.organicStatus && p.organicStatus !== 'conventional');

  return (
    <ScrollView contentContainerStyle={{ padding: S.md, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={cs.header}>🌿 Organic Certification</Text>

      {/* Summary */}
      <View style={cs.card}>
        <Text style={cs.cardTitle}>Farm Overview</Text>
        <Text style={cs.row}>
          {organicParcels.length} of {owned.length} parcels in transition or certified
        </Text>
        {organicParcels.filter(p => p.organicStatus === 'organic').length > 0 && (
          <Text style={[cs.row, { color: '#4caf50' }]}>
            ✅ {organicParcels.filter(p => p.organicStatus === 'organic').length} parcels fully certified
          </Text>
        )}
      </View>

      {/* Parcel list */}
      {owned.map(parcel => {
        const status = parcel.organicStatus ?? 'conventional';
        const isDecertified = status === 'decertified';
        const canReapply = isDecertified && canReapplyAfterDecertification(parcel.lastDecertifiedDay, day);
        const fee = organicApplicationFee(parcel.hectares);
        const appeal = parcel.pendingContaminationAppeal;
        const appealOpen = appeal && !appeal.filed && day <= appeal.appealDeadlineDay;

        return (
          <View key={parcel.id} style={cs.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={cs.row}>{parcel.name}</Text>
              <Text style={[cs.badge, { color: STATUS_COLOR[status] }]}>
                {STATUS_LABELS[status] ?? status}
              </Text>
            </View>

            {status !== 'conventional' && status !== 'decertified' && (
              <Text style={cs.muted}>
                Yield penalty: {Math.round((1 - (ORGANIC_YIELD_MOD[status] ?? 1)) * 100)}%
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
  actionBtn: { backgroundColor: '#2e7d32', borderRadius: R.sm, padding: S.sm, marginTop: 4, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: F.size.sm },
});
