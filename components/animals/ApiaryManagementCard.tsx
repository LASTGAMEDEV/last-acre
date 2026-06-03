import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { computeHiveHealth, getLinkedParcelCount, getColmenaCapacity } from '../../engine/pollination';
import { CROP_TYPES } from '../../data/cropTypes';

export default function ApiaryManagementCard() {
  const state = useGameStore();
  const [managingId, setManagingId] = useState<string | null>(null);

  const colmenaBuildings = (state.buildings ?? []).filter((b: string) => b.startsWith('bld_colmena'));
  if (colmenaBuildings.length === 0) return null;

  const abejaCount = state.animals.filter(a => a.typeId === 'abeja').length;
  if (abejaCount === 0) return null;

  if (managingId) {
    return <ManageLinksSheet colmenaId={managingId} onClose={() => setManagingId(null)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐝 Apiary Management</Text>
      {colmenaBuildings.map(colmenaId => {
        const health = computeHiveHealth(colmenaId, state.parcels, state.day);
        const linkedCount = getLinkedParcelCount(colmenaId, state.parcels);
        const capacity = getColmenaCapacity(colmenaId);
        const linkedParcels = state.parcels.filter(p => p.linkedColmenaId === colmenaId);
        const healthPct = Math.round(health * 100);
        const healthColor = healthPct >= 80 ? C.green : healthPct >= 50 ? '#ff9800' : '#ef5350';
        const healthLabel = healthPct >= 80 ? 'Healthy' : healthPct >= 50 ? 'Pesticide stress' : 'Colony struggling';

        return (
          <View key={colmenaId} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>
                {colmenaId.includes('_l') ? 'Large' : colmenaId.includes('_m') ? 'Medium' : 'Small'} Apiary
              </Text>
              <Text style={[styles.value, { color: healthColor }]}>{healthPct}% {healthLabel}</Text>
            </View>
            <View style={styles.healthBar}>
              <View style={[styles.healthFill, { width: `${healthPct}%`, backgroundColor: healthColor }]} />
            </View>
            <Text style={styles.label}>Linked: {linkedCount} / {capacity} parcels</Text>
            {linkedParcels.length > 0 && (
              <Text style={styles.label}>
                {linkedParcels.map(p => p.name).join(', ')}
              </Text>
            )}
            {linkedParcels.some(p => p.pesticideSprayedDay && state.day - p.pesticideSprayedDay < 14) && (
              <Text style={styles.warning}>⚠️ Pesticide active on linked parcels</Text>
            )}
            <TouchableOpacity style={styles.smallButton} onPress={() => setManagingId(colmenaId)}>
              <Text style={styles.smallButtonText}>Manage Links</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

function ManageLinksSheet({ colmenaId, onClose }: { colmenaId: string; onClose: () => void }) {
  const state = useGameStore();
  const capacity = getColmenaCapacity(colmenaId);
  const linkedIds = state.parcels.filter(p => p.linkedColmenaId === colmenaId).map(p => p.id);
  const otherLinkedIds = state.parcels.filter(p => p.linkedColmenaId && p.linkedColmenaId !== colmenaId).map(p => p.id);

  const toggleLink = (parcelId: string) => {
    const isLinked = linkedIds.includes(parcelId);
    if (isLinked) {
      state.linkParcelToColmena(parcelId, null);
    } else {
      if (linkedIds.length >= capacity) return;
      state.linkParcelToColmena(parcelId, colmenaId);
    }
  };

  return (
    <View style={{ padding: S.md, gap: S.lg }}>
      <TouchableOpacity onPress={onClose}>
        <Text style={{ color: C.green, fontSize: F.size.md }}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Manage Links ({linkedIds.length} / {capacity})</Text>
      {state.parcels.filter(p => p.owned).map(parcel => {
        const isLinked = linkedIds.includes(parcel.id);
        const isOther = otherLinkedIds.includes(parcel.id);
        const cropType = CROP_TYPES.find((c: any) => c.id === parcel.plantedCrop?.cropId);
        const beeBenefit = cropType && cropType.pollinationBonus > 0;
        return (
          <TouchableOpacity
            key={parcel.id}
            style={[styles.linkRow, isLinked && styles.linkRowActive, isOther && styles.linkRowDisabled]}
            onPress={() => !isOther && toggleLink(parcel.id)}
            disabled={isOther}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{parcel.name}</Text>
              <Text style={styles.label}>{parcel.hectares} ha · {cropType?.name ?? 'Fallow'}</Text>
            </View>
            {beeBenefit && <Text style={styles.good}>🐝</Text>}
            {isLinked && <Text style={styles.good}>✅</Text>}
            {isOther && <Text style={styles.label}>🔗 {parcel.linkedColmenaId}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: S.md, gap: S.md },
  title: { color: C.text, fontSize: F.size.xl, fontWeight: F.weight.bold },
  card: { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.lg, gap: S.sm, marginTop: S.sm },
  cardTitle: { color: C.text, fontSize: F.size.md, fontWeight: F.weight.bold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: C.textMuted, fontSize: F.size.sm },
  value: { color: C.text, fontSize: F.size.md, fontWeight: F.weight.medium },
  good: { color: C.green },
  warning: { color: '#ff9800', fontSize: F.size.sm },
  healthBar: { height: 6, backgroundColor: '#333', borderRadius: 3, overflow: 'hidden' },
  healthFill: { height: '100%', borderRadius: 3 },
  smallButton: { backgroundColor: C.green, borderRadius: R.md, padding: S.sm, alignItems: 'center', marginTop: S.sm },
  smallButtonText: { color: C.white, fontWeight: F.weight.bold, fontSize: F.size.sm },
  linkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: S.md },
  linkRowActive: { borderColor: C.green, borderWidth: 1 },
  linkRowDisabled: { opacity: 0.5 },
});
