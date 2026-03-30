import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { MACHINE_TYPES } from '../../data/machineTypes';
import { CROP_TYPES } from '../../data/cropTypes';
import ScreenHeader from '../../components/ScreenHeader';

const TIER_ORDER: Record<string, number> = { D: 0, C: 1, B: 2, A: 3 };

export default function MaquinariaScreen() {
  const { money, machines, parcels, harvestedCropIds, workers, buyMachine, machineRepairs = [], startRepair, day } = useGameStore();
  const repDays = (workers ?? []).some(w => w.typeId === 'engineer') ? 2
    : (workers ?? []).some(w => w.typeId === 'mechanic') ? 3 : 5;
  const ownedIds = new Set(machines.map(m => m.typeId));
  const ownedHa = parcels.filter(p => p.owned).reduce((s, p) => s + p.hectares, 0);

  function reqsMet(req?: { minHa?: number; minTier?: 'C' | 'B' }): { ok: boolean; reason?: string } {
    if (!req) return { ok: true };
    if (req.minHa && ownedHa < req.minHa) {
      return { ok: false, reason: `Need ${req.minHa}+ ha (you have ${ownedHa.toFixed(1)})` };
    }
    if (req.minTier) {
      const requiredLevel = TIER_ORDER[req.minTier] ?? 0;
      const has = harvestedCropIds.some(id => {
        const crop = CROP_TYPES.find(c => c.id === id);
        return crop && (TIER_ORDER[crop.tier] ?? 0) >= requiredLevel;
      });
      if (!has) return { ok: false, reason: `Harvest a Tier ${req.minTier} crop first` };
    }
    return { ok: true };
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Machinery" />

      <Text style={styles.sectionLabel}>My machines ({machines.length})</Text>
      {machines.length === 0 ? (
        <Text style={styles.empty}>You have no machinery yet.</Text>
      ) : (
        <FlatList
          data={machines}
          keyExtractor={m => m.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.list}
          renderItem={({ item }) => {
            const type = MACHINE_TYPES.find(t => t.id === item.typeId)!;
            const repair = machineRepairs.find(r => r.machineId === item.id);
            const isBroken = repair !== undefined;
            const repairInProgress = isBroken && repair!.startDay !== null;
            const netCost = isBroken ? Math.max(0, repair!.cost - repair!.insurancePaid) : 0;
            return (
              <View style={[styles.ownedCard, isBroken && { borderWidth: 1, borderColor: repairInProgress ? '#ffb74d' : '#ef5350' }]}>
                <Text style={styles.machineName}>{isBroken ? '⚠️ ' : ''}{type.name}</Text>
                <Text style={styles.detail}>+{Math.round((type.yieldBonus - 1) * 100)}% yield{isBroken ? ' (50%)' : ''}</Text>
                <Text style={styles.detail}>-${type.maintenancePerDay}/day</Text>

                {isBroken && !repairInProgress && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: '#ef5350', fontSize: 11, marginBottom: 4 }}>Machine broken</Text>
                    <Text style={{ color: '#888', fontSize: 10, marginBottom: 6 }}>
                      Cost: ${repair!.cost.toLocaleString()}{repair!.insurancePaid > 0 ? ` (-$${repair!.insurancePaid.toLocaleString()} ins.)` : ''}{'\n'}Net: ${netCost.toLocaleString()} · {repDays}d
                    </Text>
                    <TouchableOpacity
                      onPress={() => startRepair(item.id)}
                      style={{ backgroundColor: money >= netCost ? '#1565c0' : '#333', borderRadius: 5, padding: 6, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>Start Repair</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isBroken && repairInProgress && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: '#ffb74d', fontSize: 11 }}>🔧 Repairing</Text>
                    <Text style={{ color: '#888', fontSize: 10 }}>
                      {Math.max(0, (repair!.readyDay ?? 0) - day)}d remaining
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      <Text style={styles.sectionLabel}>Catalog</Text>
      <FlatList
        data={MACHINE_TYPES}
        keyExtractor={m => m.id}
        numColumns={2}
        style={styles.list}
        renderItem={({ item }) => {
          const owned = ownedIds.has(item.id);
          const canAfford = money >= item.cost;
          const { ok, reason } = reqsMet(item.requires);
          const locked = !ok;
          const disabled = owned || locked || !canAfford;

          return (
            <TouchableOpacity
              style={[
                styles.card,
                owned && styles.cardOwned,
                locked && styles.cardLocked,
                !locked && !canAfford && !owned && styles.cardDisabled,
              ]}
              onPress={() => !disabled && buyMachine(item.id)}
              disabled={disabled}
            >
              <Text style={styles.machineName}>{item.name}</Text>
              <Text style={styles.categoryTag}>{item.category}</Text>
              <Text style={styles.detail}>💰 ${item.cost.toLocaleString()}</Text>
              <Text style={styles.detail}>📈 +{Math.round((item.yieldBonus - 1) * 100)}% yield</Text>
              {item.speedBonus < 1 && (
                <Text style={styles.detail}>⚡ -{Math.round((1 - item.speedBonus) * 100)}% time</Text>
              )}
              {locked && (
                <Text style={styles.lockText}>🔒 {reason}</Text>
              )}
              {owned && <Text style={styles.ownedBadge}>✓ Owned</Text>}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  sectionLabel: { color: '#888', fontSize: 13, paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
  list: { paddingHorizontal: 8 },
  empty: { color: '#555', paddingHorizontal: 16, marginBottom: 8 },
  ownedCard: { backgroundColor: '#0f3460', borderRadius: 10, padding: 12, marginRight: 10, width: 150 },
  card: { backgroundColor: '#16213e', borderRadius: 10, padding: 12, margin: 6, flex: 1 },
  cardOwned: { backgroundColor: '#1b5e20', opacity: 0.8 },
  cardLocked: { opacity: 0.45, borderWidth: 1, borderColor: '#333' },
  cardDisabled: { opacity: 0.4 },
  machineName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  categoryTag: { color: '#888', fontSize: 11, marginBottom: 4, textTransform: 'uppercase' },
  detail: { color: '#aaa', fontSize: 12 },
  lockText: { color: '#e57373', fontSize: 11, marginTop: 5, fontStyle: 'italic' },
  ownedBadge: { color: '#81c784', fontSize: 12, marginTop: 4 },
});
