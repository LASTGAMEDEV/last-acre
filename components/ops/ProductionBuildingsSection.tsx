import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore, ProductionBuildingState } from '../../store/useGameStore';
import { BUILDING_TYPES, PRODUCTION_EQUIPMENT } from '../../data/buildingTypes';
import { getWorkerBonuses } from '../../engine/workers';
import { C, S, F, R } from '../../constants/theme';

const CERT_COLOR: Record<string, string> = {
  basic: '#9e9e9e',
  certified: '#2196f3',
  organic: C.green,
};

const CERT_LABEL: Record<string, string> = {
  basic: 'Basic',
  certified: '✅ Certified',
  organic: '🌿 Organic',
};

// Requirements to reach each tier
const CERT_NEXT: Record<string, string> = {
  basic: '30d at hygiene ≥60 + 1 inspection',
  certified: '60d at hygiene ≥80 + no synthetic inputs (60d) + 2 inspections',
};

// Numeric thresholds (days required, inspections required)
const CERT_REQS: Record<string, { days: number; inspections: number; hygieneMin: number }> = {
  basic:     { days: 30,  inspections: 1, hygieneMin: 60 },
  certified: { days: 60,  inspections: 2, hygieneMin: 80 },
};

// Effects unlocked at each tier
const CERT_EFFECTS: Record<string, string> = {
  certified: '+10% product quality · premium buyer access',
  organic: '+25% product quality · organic product designation',
};

function ProductionBuildingsSection() {
  const {
    productionBuildings,
    workers,
    money,
    day,
    assignWorkerToBuilding,
    unassignWorkerFromBuilding,
    performDeepClean,
  } = useGameStore();

  const farmhands = (workers ?? []).filter((w: any) => w.role === 'field_hand');
  const workerMap = new Map((workers ?? []).map((w: any) => [w.id, w]));
  const workerBonuses = getWorkerBonuses(workers ?? []);

  if (!productionBuildings || productionBuildings.length === 0) {
    return (
      <View style={pbs.emptyCard}>
        <Text style={pbs.emptyTitle}>Production Buildings</Text>
        <Text style={pbs.emptyText}>
          No production buildings built yet. Buy them in the Shop to stop paying contractor fees.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={pbs.scroll} showsVerticalScrollIndicator={false}>
      {(workerBonuses.processingOutputMult > 1.0 || workerBonuses.autoProcessEnabled) && (
        <View style={pbs.bonusBanner}>
          <Text style={pbs.bonusBannerTitle}>🏭 Processing Worker Bonuses</Text>
          {workerBonuses.processingOutputMult > 1.0 && (
            <Text style={pbs.bonusBannerRow}>
              ×{workerBonuses.processingOutputMult.toFixed(2)} output — from processing technicians / quality controllers
            </Text>
          )}
          {workerBonuses.autoProcessEnabled && (
            <Text style={pbs.bonusBannerRow}>⚡ Auto-processing enabled — QC controller on staff</Text>
          )}
        </View>
      )}
      {productionBuildings.map((pb: ProductionBuildingState) => {
        const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
        if (!bt) return null;

        const certColor = CERT_COLOR[pb.certificationTier] ?? '#9e9e9e';
        const certLabel = CERT_LABEL[pb.certificationTier] ?? pb.certificationTier;
        const availableWorkers = farmhands.filter((w: any) => !pb.assignedWorkerIds.includes(w.id));
        const maxSlots = bt.equipmentSlotCount ?? 2;
        const availableEquipment = PRODUCTION_EQUIPMENT.filter(eq =>
          eq.applicableBuildingPrefixes.some(prefix => pb.buildingTypeId.startsWith(prefix)) &&
          !pb.equipmentSlots.includes(eq.id)
        );
        const installedEquipment = pb.equipmentSlots
          .map(id => PRODUCTION_EQUIPMENT.find(e => e.id === id))
          .filter(Boolean);

        // Cert progression
        const nextTierReq = CERT_NEXT[pb.certificationTier];
        const certEffect = CERT_EFFECTS[pb.certificationTier];

        // Hygiene status
        const hygieneColor = pb.hygiene >= 80 ? C.green : pb.hygiene >= 60 ? '#ff9800' : pb.hygiene >= 40 ? '#ff5722' : '#ef5350';
        const hygieneNote = pb.hygiene < 60
          ? 'Below 60% — cert progress paused, quality penalty active'
          : pb.hygiene < 80
          ? 'Below 80% — certified→organic progress paused'
          : 'Good hygiene';

        return (
          <View key={pb.id} style={pbs.card}>
            {/* Header */}
            <View style={pbs.header}>
              <View style={{ flex: 1 }}>
                <Text style={pbs.name}>{bt.name}</Text>
                <Text style={pbs.sub}>Capacity: {pb.capacity}/day · €{bt.maintenancePerDay}/day maintenance</Text>
              </View>
              <View style={[pbs.certBadge, { backgroundColor: certColor + '22', borderColor: certColor + '66' }]}>
                <Text style={[pbs.certText, { color: certColor }]}>{certLabel}</Text>
              </View>
            </View>

            {/* Active cert effect */}
            {certEffect && (
              <Text style={[pbs.certEffect, { color: certColor }]}>
                ✨ {certEffect}
              </Text>
            )}

            {/* Hygiene bar */}
            <View style={{ marginTop: 6 }}>
              <View style={pbs.labelRow}>
                <Text style={pbs.sectionLabel}>HYGIENE</Text>
                <Text style={[pbs.small, { color: hygieneColor }]}>{Math.round(pb.hygiene)}% — {hygieneNote}</Text>
              </View>
              <View style={pbs.bar}>
                <View style={[pbs.barFill, { width: `${pb.hygiene}%` as any, backgroundColor: hygieneColor }]} />
              </View>
            </View>

            {/* Cert progression */}
            {nextTierReq && (() => {
              const reqs = CERT_REQS[pb.certificationTier];
              const daysPct = reqs ? Math.min(100, Math.round((pb.certDaysAtThreshold / reqs.days) * 100)) : 0;
              const daysLeft = reqs ? Math.max(0, reqs.days - pb.certDaysAtThreshold) : 0;
              const inspsLeft = reqs ? Math.max(0, reqs.inspections - pb.certInspectionsPassed) : 0;
              const isProgressing = pb.hygiene >= (reqs?.hygieneMin ?? 60);
              const dayProgColor = isProgressing ? C.green : '#ff9800';
              return (
                <View style={pbs.certProgress}>
                  <Text style={pbs.sectionLabel}>CERT PROGRESS — {pb.certificationTier === 'basic' ? 'BASIC → CERTIFIED' : 'CERTIFIED → ORGANIC'}</Text>
                  <View style={pbs.certProgRow}>
                    <View style={pbs.certProgBarWrap}>
                      <View style={[pbs.certProgBarFill, { width: `${daysPct}%` as any, backgroundColor: dayProgColor }]} />
                    </View>
                    <Text style={[pbs.certProgLabel, { color: isProgressing ? dayProgColor : '#ff9800' }]}>
                      {pb.certDaysAtThreshold}/{reqs?.days ?? '?'}d
                      {isProgressing ? (daysLeft > 0 ? ` (${daysLeft}d left)` : ' ✓') : ' (hygiene too low)'}
                    </Text>
                  </View>
                  <Text style={[pbs.small, { marginTop: 3 }]}>
                    Inspections: {pb.certInspectionsPassed}/{reqs?.inspections ?? '?'}
                    {inspsLeft > 0 ? ` — ${inspsLeft} more needed` : ' ✓'}
                  </Text>
                  {!isProgressing && reqs && (
                    <Text style={[pbs.small, { color: '#ff9800', marginTop: 2 }]}>
                      ⚠ Hygiene must reach {reqs.hygieneMin}% to earn cert-days
                    </Text>
                  )}
                </View>
              );
            })()}

            {/* Installed equipment */}
            <View style={{ marginTop: 8 }}>
              <Text style={pbs.sectionLabel}>EQUIPMENT ({pb.equipmentSlots.length}/{maxSlots} slots)</Text>
              {installedEquipment.length === 0 && (
                <Text style={pbs.small}>No equipment installed — buy in the Shop</Text>
              )}
              {installedEquipment.map(eq => eq && (
                <View key={eq.id} style={pbs.equipRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={pbs.equipName}>✓ {eq.name}</Text>
                    <Text style={pbs.equipEffect}>{eq.effectLabel}</Text>
                  </View>
                </View>
              ))}
              {pb.equipmentSlots.length < maxSlots && availableEquipment.length > 0 && (
                <Text style={[pbs.small, { color: '#ffa726', marginTop: 3 }]}>
                  {maxSlots - pb.equipmentSlots.length} slot{maxSlots - pb.equipmentSlots.length !== 1 ? 's' : ''} free — buy equipment in the Shop
                </Text>
              )}
            </View>

            {/* Workers */}
            <View style={{ marginTop: 8 }}>
              <Text style={pbs.sectionLabel}>WORKERS ({pb.assignedWorkerIds.length} assigned)</Text>
              {pb.assignedWorkerIds.map(wid => {
                const w = workerMap.get(wid) as any;
                return (
                  <View key={wid} style={pbs.workerRow}>
                    <Text style={pbs.workerName}>👷 {w ? w.name : 'Unknown Worker'}</Text>
                    <TouchableOpacity onPress={() => unassignWorkerFromBuilding(pb.id, wid)}>
                      <Text style={pbs.unassign}>Unassign</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              {availableWorkers.length > 0 && (
                <TouchableOpacity
                  style={pbs.assignBtn}
                  onPress={() => assignWorkerToBuilding(pb.id, availableWorkers[0].id)}
                >
                  <Text style={pbs.assignBtnText}>+ Assign {availableWorkers[0].name ?? 'Farmhand'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Deep clean actions */}
            <View style={pbs.actionRow}>
              <TouchableOpacity
                style={[pbs.cleanBtn, { backgroundColor: pb.hygiene > 80 ? '#222' : C.greenDark, opacity: pb.hygiene > 80 ? 0.5 : 1 }]}
                onPress={() => performDeepClean(pb.id, false)}
                disabled={pb.hygiene > 80}
              >
                <Text style={[pbs.cleanBtnText, { color: pb.hygiene > 80 ? '#555' : C.greenSoft }]}>
                  {pb.hygiene > 80 ? '✓ Clean' : '🧹 Worker Deep Clean'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[pbs.cleanBtn, { backgroundColor: money < 150 ? '#222' : '#3e1f00', opacity: money < 150 ? 0.5 : 1 }]}
                onPress={() => performDeepClean(pb.id, true)}
                disabled={money < 150}
              >
                <Text style={[pbs.cleanBtnText, { color: money < 150 ? '#555' : '#ffcc80' }]}>
                  🧹 Contractor (€150–400)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

export default ProductionBuildingsSection;

const pbs = StyleSheet.create({
  scroll: { padding: S.sm, gap: S.sm },

  emptyCard: { backgroundColor: C.bgCard, borderRadius: R.md, margin: S.sm, padding: S.md },
  emptyTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.md, marginBottom: S.xs },
  emptyText: { color: C.textMuted, fontSize: F.size.sm },

  card: { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 0 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  name: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  sub: { color: C.textFaint, fontSize: 10, marginTop: 2 },

  certBadge: { borderRadius: R.pill, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  certText: { fontSize: 10, fontWeight: '700' },
  certEffect: { fontSize: F.size.xs, fontStyle: 'italic', marginBottom: 4 },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  sectionLabel: { color: C.textFaint, fontSize: 8, fontWeight: '700', letterSpacing: 1, marginTop: 6, marginBottom: 2 },
  small: { color: C.textMuted, fontSize: 10 },

  bar: { height: 6, backgroundColor: '#1a1a2a', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },

  certProgress: { backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.xs, marginTop: 6, gap: 2 },
  certProgRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  certProgBarWrap: { flex: 1, height: 5, backgroundColor: '#1a1a2a', borderRadius: 3, overflow: 'hidden' },
  certProgBarFill: { height: 5, borderRadius: 3 },
  certProgLabel: { fontSize: 10, fontWeight: '700', minWidth: 80, textAlign: 'right' },
  bonusBanner: { backgroundColor: '#0d2a1a', borderRadius: R.md, padding: S.sm, borderLeftWidth: 3, borderLeftColor: C.green },
  bonusBannerTitle: { color: C.green, fontSize: F.size.sm, fontWeight: '700', marginBottom: 3 },
  bonusBannerRow: { color: C.textMuted, fontSize: F.size.xs },

  equipRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  equipName: { color: C.greenSoft, fontSize: F.size.sm, fontWeight: '600' },
  equipEffect: { color: C.textMuted, fontSize: 10, marginTop: 1 },

  workerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  workerName: { color: C.greenSoft, fontSize: F.size.sm },
  unassign: { color: '#ef5350', fontSize: F.size.sm },

  assignBtn: { backgroundColor: '#1e3a5f', borderRadius: R.sm, padding: S.xs, alignItems: 'center', marginTop: 4 },
  assignBtnText: { color: '#90caf9', fontSize: F.size.sm },

  actionRow: { flexDirection: 'row', gap: S.xs, marginTop: S.sm },
  cleanBtn: { flex: 1, borderRadius: R.sm, padding: S.sm, alignItems: 'center' },
  cleanBtnText: { fontSize: F.size.sm, fontWeight: '600' },
});
