import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { getSeason } from '../../engine/climate';
import { C, S, F, R } from '../../constants/theme';
import { getEFACount } from '../../engine/hedgerows';

export default function SubsidiesSection() {
  const {
    day, parcels, hedgerows, cropsGrownThisYear, strawBurnedThisYear,
    aesEnrollments, subsidyLog,
  } = useGameStore();

  const ownedHa = parcels.filter(p => p.owned).reduce((s, p) => s + p.hectares, 0);
  const efaCount = getEFACount(hedgerows ?? [], day);
  const diversityMet = (cropsGrownThisYear ?? []).length >= 3;
  const efaMet = efaCount >= 2;
  const noburn = !(strawBurnedThisYear ?? false);
  const greeningQualified = diversityMet && efaMet && noburn;

  const lastPayment = subsidyLog?.slice(-1)[0];

  function Badge({ ok, label }: { ok: boolean; label: string }) {
    return (
      <View style={[ss.badge, { backgroundColor: ok ? '#1b5e20' : '#5c1a1a' }]}>
        <Text style={ss.badgeText}>{ok ? '✅' : '❌'} {label}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: S.md, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={ss.header}>💶 CAP Subsidies</Text>

      {/* Greening status */}
      <View style={ss.card}>
        <Text style={ss.cardTitle}>Greening Requirements</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          <Badge ok={diversityMet} label={`Crops: ${cropsGrownThisYear?.length ?? 0}/3`} />
          <Badge ok={efaMet} label={`EFA: ${efaCount}/2`} />
          <Badge ok={noburn} label="No straw burn" />
        </View>
        {greeningQualified ? (
          <Text style={[ss.statusText, { color: '#66bb6a' }]}>✅ Greening qualified (+30%)</Text>
        ) : (
          <Text style={[ss.statusText, { color: '#ef5350' }]}>
            ⚠️ Missing: {[
              !diversityMet && 'crop diversity',
              !efaMet && 'EFA units',
              !noburn && 'straw burn',
            ].filter(Boolean).join(', ')}
          </Text>
        )}
      </View>

      {/* Land area */}
      <View style={ss.card}>
        <Text style={ss.cardTitle}>Basic Payment</Text>
        <Text style={ss.row}>Owned land: {ownedHa} ha × €180 = €{(ownedHa * 180).toLocaleString()}</Text>
        {day <= 1825 && (
          <Text style={[ss.row, { color: '#64b5f6' }]}>👨‍🌾 Young Farmer bonus (+25%) active</Text>
        )}
      </View>

      {/* AES enrollments */}
      <View style={ss.card}>
        <Text style={ss.cardTitle}>Agri-Environment Schemes</Text>
        {(aesEnrollments ?? []).length === 0 && (
          <Text style={ss.muted}>No active AES enrollments</Text>
        )}
        {(aesEnrollments ?? []).map(en => (
          <View key={en.id} style={ss.aesRow}>
            <Text style={ss.row}>
              {en.schemeId.replace('aes_', '')} · {en.enrolledHa}ha · {en.status}
              {en.status === 'active' ? ' ✅' : en.status === 'violated' ? ' 🚫' : ''}
            </Text>
          </View>
        ))}
      </View>

      {/* Payment history */}
      <View style={ss.card}>
        <Text style={ss.cardTitle}>Payment History</Text>
        {lastPayment ? (
          <>
            <Text style={ss.row}>Last payment (Day {lastPayment.day}): €{lastPayment.total.toLocaleString()}</Text>
            <Text style={ss.muted}>
              Basic €{lastPayment.basic.toLocaleString()} · Greening €{lastPayment.greening.toLocaleString()} ·
              Young €{lastPayment.youngFarmer.toLocaleString()} · AES €{lastPayment.aes.toLocaleString()}
            </Text>
          </>
        ) : (
          <Text style={ss.muted}>No payments received yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  header: { fontSize: F.size.xl, fontWeight: 'bold', color: C.text, marginBottom: S.sm },
  card: { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 4 },
  cardTitle: { fontSize: F.size.md, fontWeight: '600', color: C.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.sm },
  badgeText: { color: '#fff', fontSize: F.size.xs, fontWeight: '600' },
  statusText: { fontSize: F.size.sm, fontWeight: '600', marginTop: 8 },
  row: { fontSize: F.size.sm, color: C.text },
  muted: { fontSize: F.size.sm, color: C.textMuted },
  aesRow: { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border },
});
