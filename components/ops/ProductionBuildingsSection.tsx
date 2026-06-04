import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useGameStore, ProductionBuildingState } from '../../store/useGameStore';
import { BUILDING_TYPES, PRODUCTION_EQUIPMENT } from '../../data/buildingTypes';
import { C } from '../../constants/theme';

function ProductionBuildingsSection() {
  const {
    productionBuildings,
    workers,
    money,
    assignWorkerToBuilding,
    unassignWorkerFromBuilding,
    performDeepClean,
  } = useGameStore();

  const farmhands = (workers ?? []).filter((w: any) => w.role === 'field_hand');

  if (!productionBuildings || productionBuildings.length === 0) {
    return (
      <View style={{ backgroundColor: C.bgCard, borderRadius: 10, margin: 8, padding: 14 }}>
        <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 14, marginBottom: 6 }}>Production Buildings</Text>
        <Text style={{ color: '#aaa', fontSize: 12 }}>
          No production buildings built yet. Buy them in the Shop to stop paying contractor fees.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 8 }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: C.bgCard, borderRadius: 10, margin: 0, padding: 14 }}>
        <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 14, marginBottom: 10 }}>Production Buildings</Text>
        {productionBuildings.map((pb: ProductionBuildingState) => {
          const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
          if (!bt) return null;
          const certColor = pb.certificationTier === 'organic' ? C.green : pb.certificationTier === 'certified' ? '#2196f3' : '#9e9e9e';
          const certLabel = pb.certificationTier === 'organic' ? '🌿 Organic' : pb.certificationTier === 'certified' ? '✅ Certified' : 'Basic';
          const availableWorkers = farmhands.filter((w: any) => !pb.assignedWorkerIds.includes(w.id));
          const maxSlots = bt.equipmentSlotCount ?? 2;
          const availableEquipment = PRODUCTION_EQUIPMENT.filter(eq =>
            eq.applicableBuildingPrefixes.some(prefix => pb.buildingTypeId.startsWith(prefix)) &&
            !pb.equipmentSlots.includes(eq.id)
          );

          return (
            <View key={pb.id} style={{ borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10, marginTop: 10 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: C.text, fontWeight: 'bold' }}>{bt.name}</Text>
                <Text style={{ color: certColor, fontSize: 12 }}>{certLabel}</Text>
              </View>

              {/* Hygiene bar */}
              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 3 }}>Hygiene</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1, height: 8, backgroundColor: '#2a2a4a', borderRadius: 4 }}>
                  <View style={{
                    width: `${pb.hygiene}%` as any, height: 8, borderRadius: 4,
                    backgroundColor: pb.hygiene >= 80 ? C.green : pb.hygiene >= 60 ? '#ff9800' : pb.hygiene >= 40 ? '#ff5722' : '#ef5350',
                  }} />
                </View>
                <Text style={{ color: '#aaa', fontSize: 11, width: 32 }}>{Math.round(pb.hygiene)}%</Text>
              </View>

              {/* Cert progress hint */}
              {pb.certificationTier === 'basic' && (
                <Text style={{ color: '#aaa', fontSize: 10, marginBottom: 6 }}>
                  To Certified: {Math.max(0, 30 - pb.certDaysAtThreshold)}d at hygiene ≥60 + 1 inspection
                </Text>
              )}

              {/* Workers */}
              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Workers assigned: {pb.assignedWorkerIds.length}</Text>
              {pb.assignedWorkerIds.map((wid, idx) => (
                <View key={wid} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: C.green, fontSize: 12 }}>👷 Farmhand #{idx + 1}</Text>
                  <TouchableOpacity onPress={() => unassignWorkerFromBuilding(pb.id, wid)}>
                    <Text style={{ color: '#ef5350', fontSize: 12 }}>Unassign</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {availableWorkers.length > 0 && (
                <TouchableOpacity
                  style={{ backgroundColor: '#1e3a5f', borderRadius: 6, padding: 6, alignItems: 'center', marginBottom: 8 }}
                  onPress={() => assignWorkerToBuilding(pb.id, availableWorkers[0].id)}
                >
                  <Text style={{ color: '#90caf9', fontSize: 12 }}>+ Assign Farmhand</Text>
                </TouchableOpacity>
              )}

              {/* Equipment slots */}
              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>
                Equipment: {pb.equipmentSlots.length}/{maxSlots} slots used
              </Text>
              {pb.equipmentSlots.map(eqId => {
                const eq = PRODUCTION_EQUIPMENT.find(e => e.id === eqId);
                return (
                  <Text key={eqId} style={{ color: C.green, fontSize: 11, marginBottom: 2 }}>
                    ✓ {eq?.name ?? eqId}
                  </Text>
                );
              })}
              {pb.equipmentSlots.length < maxSlots && availableEquipment.length > 0 && (
                <Text style={{ color: '#aaa', fontSize: 10, marginTop: 2 }}>
                  Buy equipment in the Shop to fill remaining slots
                </Text>
              )}

              {/* Deep clean */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: pb.hygiene > 80 ? '#2a2a4a' : C.greenDark, borderRadius: 6, padding: 8, alignItems: 'center' }}
                  onPress={() => performDeepClean(pb.id, false)}
                  disabled={pb.hygiene > 80}
                >
                  <Text style={{ color: pb.hygiene > 80 ? '#555' : C.greenSoft, fontSize: 12 }}>
                    {pb.hygiene > 80 ? '✓ Clean' : '🧹 Deep Clean (Worker)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: money < 150 ? '#2a2a4a' : '#3e1f00', borderRadius: 6, padding: 8, alignItems: 'center' }}
                  onPress={() => performDeepClean(pb.id, true)}
                  disabled={money < 150}
                >
                  <Text style={{ color: money < 150 ? '#555' : '#ffcc80', fontSize: 12 }}>
                    🧹 Contractor ($150–$400)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default ProductionBuildingsSection;
