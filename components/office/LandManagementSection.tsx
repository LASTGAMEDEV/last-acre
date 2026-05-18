import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';

export default function LandManagementSection() {
  const {
    activeLeases, availableLeases, parcels, day, money,
    signLease, cancelLease,
  } = useGameStore();

  const active = (activeLeases ?? []).filter(l => l.status === 'active');
  const expired = (activeLeases ?? []).filter(l => l.status !== 'active');

  return (
    <ScrollView contentContainerStyle={{ padding: S.md, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={ls.header}>🗺️ Land Management</Text>

      {/* Owned */}
      <View style={ls.card}>
        <Text style={ls.cardTitle}>Owned Parcels</Text>
        <Text style={ls.row}>
          {parcels.filter(p => p.owned && !active.some(l => l.parcelId === p.id)).length} parcels
          ({parcels.filter(p => p.owned).reduce((s, p) => s + p.hectares, 0)} ha)
        </Text>
      </View>

      {/* Active leases */}
      <View style={ls.card}>
        <Text style={ls.cardTitle}>Active Leases</Text>
        {active.length === 0 && <Text style={ls.muted}>No active leases</Text>}
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
              style={[ls.actionBtn, { backgroundColor: '#2e7d32' }]}
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

const ls = StyleSheet.create({
  header: { fontSize: F.size.xl, fontWeight: 'bold', color: C.text, marginBottom: S.sm },
  card: { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 6 },
  cardTitle: { fontSize: F.size.md, fontWeight: '600', color: C.text },
  row: { fontSize: F.size.sm, color: C.text },
  muted: { fontSize: F.size.sm, color: C.textMuted },
  badge: { fontSize: F.size.sm, fontWeight: '600' },
  leaseRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, gap: 4 },
  actionBtn: { borderRadius: R.sm, padding: S.sm, marginTop: 4, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: F.size.sm },
});
