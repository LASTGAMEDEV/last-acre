import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useGameStore, OwnedMachine, OwnedAttachment, OwnedTrailer, TractorJob, HarvestJob, DeliveryJob } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { MACHINE_TYPES } from '../../data/machineTypes';
import { ATTACHMENT_TYPES } from '../../data/attachmentTypes';

type MachineryTab = 'fleet' | 'attachments' | 'jobs' | 'deliveries';

// ── Fleet Tab ────────────────────────────────────────────────────────────────
function FleetTab() {
  const { machines, trailers, tractorJobs, harvestJobs, machineRepairs, day, fuel, buyFuel, buildings, money, listings, fuelPrice } = useGameStore();
  const fuelCapacity = (buildings ?? []).reduce((cap: number, id: string) => {
    if (id === 'bld_fuel_tank_s') return cap + 500;
    if (id === 'bld_fuel_tank_l') return cap + 2000;
    return cap;
  }, 200);
  const fuelPct = Math.min(1, (fuel ?? 0) / fuelCapacity);
  const fuelColor = fuelPct > 0.5 ? '#66bb6a' : fuelPct > 0.2 ? '#ffa726' : '#ef5350';
  const liveFuelPrice = fuelPrice ?? 1.20;
  const fillCost = Math.round(Math.max(0, fuelCapacity - (fuel ?? 0)) * liveFuelPrice);

  const getJobForTractor = (tractorId: string): TractorJob | undefined =>
    (tractorJobs ?? []).find((j: TractorJob) => j.tractorId === tractorId);
  const getJobForCombine = (combineId: string): HarvestJob | undefined =>
    (harvestJobs ?? []).find((j: HarvestJob) => j.combineId === combineId);

  const tractors   = (machines ?? []).filter((m: OwnedMachine) => MACHINE_TYPES.find(t => t.id === m.typeId)?.category === 'tractor');
  const combines   = (machines ?? []).filter((m: OwnedMachine) => MACHINE_TYPES.find(t => t.id === m.typeId)?.category === 'harvester');
  const trucks     = (machines ?? []).filter((m: OwnedMachine) => MACHINE_TYPES.find(t => t.id === m.typeId)?.category === 'truck');
  const irrigation = (machines ?? []).filter((m: OwnedMachine) => MACHINE_TYPES.find(t => t.id === m.typeId)?.category === 'irrigation');

  const renderMachine = (m: OwnedMachine, jobLine?: React.ReactNode) => {
    const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
    if (!mt) return null;
    const repair = (machineRepairs ?? []).find(r => r.machineId === m.id);
    const isListed = (listings ?? []).some(
      l => l.category === 'machinery' && l.machineId === m.id && !l.resolved
    );
    return (
      <View key={m.id} style={s.machineCard}>
        <Text style={s.machineName}>{mt.name}</Text>
        {repair && (
          <Text style={s.repairBadge}>
            {repair.startDay === null ? '⚠️ Broken' : `🔧 Repairing · ready day ${repair.readyDay}`}
          </Text>
        )}
        {isListed ? (
          <View style={s.escrowBadge}>
            <Text style={s.escrowText}>📋 Listed for auction</Text>
          </View>
        ) : (
          jobLine
        )}
      </View>
    );
  };

  const renderTruck = (m: OwnedMachine) => {
    const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
    if (!mt) return null;
    const hitched = (trailers ?? []).find((tr: OwnedTrailer) => tr.hitchedTo === m.id);
    const trailerType = hitched ? MACHINE_TYPES.find(t => t.id === hitched.typeId) : null;
    return (
      <View key={m.id} style={s.machineCard}>
        <Text style={s.machineName}>{mt.name}</Text>
        <Text style={s.machineDetail}>
          {trailerType
            ? `🔗 ${trailerType.name} (${trailerType.capacityKg?.toLocaleString()} kg)`
            : mt.capacityKg
            ? `📦 ${mt.capacityKg.toLocaleString()} kg standalone`
            : '📦 No trailer hitched'}
        </Text>
      </View>
    );
  };

  if ((machines ?? []).length === 0) {
    return <Text style={s.empty}>No machines owned yet. Buy from the Shop tab.</Text>;
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      {/* Fuel section */}
      <View style={s.fuelCard}>
        <View style={s.fuelHeader}>
          <Text style={s.fuelTitle}>⛽ Fuel</Text>
          <Text style={s.fuelAmount}>{Math.round(fuel ?? 0).toLocaleString()} / {fuelCapacity.toLocaleString()} L</Text>
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>⛽ ${liveFuelPrice.toFixed(2)}/L</Text>
        <View style={s.fuelGaugeBg}>
          <View style={[s.fuelGaugeFill, { width: `${Math.round(fuelPct * 100)}%` as `${number}%`, backgroundColor: fuelColor }]} />
        </View>
        <View style={s.fuelBuyRow}>
          {([50, 100, 200] as const).map(litres => {
            const cost = Math.round(litres * liveFuelPrice);
            const canAfford = money >= cost;
            const hasRoom = (fuel ?? 0) + litres <= fuelCapacity;
            return (
              <TouchableOpacity
                key={litres}
                style={[s.fuelBuyBtn, (!canAfford || !hasRoom) && s.fuelBuyBtnDisabled]}
                onPress={() => buyFuel(litres)}
                disabled={!canAfford || !hasRoom}
              >
                <Text style={s.fuelBuyBtnTop}>+{litres} L</Text>
                <Text style={s.fuelBuyBtnSub}>${cost}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[s.fuelBuyBtn, s.fuelFillBtn, (fillCost <= 0 || money < fillCost) && s.fuelBuyBtnDisabled]}
            onPress={() => buyFuel(fuelCapacity - (fuel ?? 0))}
            disabled={fillCost <= 0 || money < fillCost}
          >
            <Text style={s.fuelBuyBtnTop}>Fill</Text>
            <Text style={s.fuelBuyBtnSub}>${fillCost.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tractors.length > 0 && (
        <>
          <Text style={s.sectionHeader}>🚜 Tractors</Text>
          {tractors.map((m: OwnedMachine) => {
            const job = getJobForTractor(m.id);
            const jobLine = job ? (
              <Text style={s.jobBadge}>
                {job.operation.charAt(0).toUpperCase() + job.operation.slice(1)} · {job.completesDay - day}d left
              </Text>
            ) : <Text style={s.idleBadge}>Idle</Text>;
            return renderMachine(m, jobLine);
          })}
        </>
      )}
      {combines.length > 0 && (
        <>
          <Text style={s.sectionHeader}>🌾 Combines</Text>
          {combines.map((m: OwnedMachine) => {
            const job = getJobForCombine(m.id);
            const jobLine = job ? (
              <Text style={s.jobBadge}>Harvesting · {job.completesDay - day}d left</Text>
            ) : <Text style={s.idleBadge}>Idle</Text>;
            return renderMachine(m, jobLine);
          })}
        </>
      )}
      {trucks.length > 0 && (
        <>
          <Text style={s.sectionHeader}>🚛 Trucks</Text>
          {trucks.map(renderTruck)}
        </>
      )}
      {irrigation.length > 0 && (
        <>
          <Text style={s.sectionHeader}>💧 Irrigation</Text>
          {irrigation.map((m: OwnedMachine) => renderMachine(m))}
        </>
      )}
    </ScrollView>
  );
}

// ── Attachments Tab ──────────────────────────────────────────────────────────
function AttachmentsTab() {
  const { attachments, trailers, machines, hitchTrailer } = useGameStore();

  const trucks = (machines ?? []).filter((m: OwnedMachine) => {
    const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
    return mt?.category === 'truck' && (mt.capacityKg ?? 0) === 0;
  });

  const getAttachType = (typeId: string) => ATTACHMENT_TYPES.find(a => a.id === typeId);
  const getTrailerType = (typeId: string) => MACHINE_TYPES.find(m => m.id === typeId);

  return (
    <ScrollView style={{ flex: 1 }}>
      {(attachments ?? []).length === 0 && (trailers ?? []).length === 0 ? (
        <Text style={s.empty}>No attachments or trailers owned. Buy from the Shop tab.</Text>
      ) : null}

      {(attachments ?? []).length > 0 && (
        <>
          <Text style={s.sectionHeader}>⚙️ Attachments</Text>
          {(attachments ?? []).map((a: OwnedAttachment) => {
            const at = getAttachType(a.typeId);
            if (!at) return null;
            return (
              <View key={a.id} style={s.machineCard}>
                <Text style={s.machineName}>{at.name}</Text>
                <Text style={s.machineDetail}>{at.operation} · {at.haPerDay} ha/day · fits {at.compatibleTractorSizes.join('+')} tractors</Text>
              </View>
            );
          })}
        </>
      )}

      {(trailers ?? []).length > 0 && (
        <>
          <Text style={s.sectionHeader}>🔗 Trailers</Text>
          {(trailers ?? []).map((tr: OwnedTrailer) => {
            const tt = getTrailerType(tr.typeId);
            if (!tt) return null;
            const hitchedTruck = tr.hitchedTo
              ? (machines ?? []).find((m: OwnedMachine) => m.id === tr.hitchedTo)
              : null;
            const hitchedTruckType = hitchedTruck
              ? MACHINE_TYPES.find(mt => mt.id === hitchedTruck.typeId)
              : null;
            return (
              <View key={tr.id} style={s.machineCard}>
                <Text style={s.machineName}>{tt.name} · {tt.capacityKg?.toLocaleString()} kg</Text>
                <Text style={s.machineDetail}>
                  {hitchedTruckType ? `Hitched to: ${hitchedTruckType.name}` : 'Not hitched'}
                </Text>
                <View style={s.hitchRow}>
                  <TouchableOpacity style={s.smallBtn} onPress={() => hitchTrailer(tr.id, null)}>
                    <Text style={s.smallBtnText}>Unhitch</Text>
                  </TouchableOpacity>
                  {trucks.map((tk: OwnedMachine) => {
                    const tkType = MACHINE_TYPES.find(mt => mt.id === tk.typeId);
                    if (!tkType) return null;
                    const compatible = tt.compatibleTruckTypeIds?.includes(tk.typeId);
                    if (!compatible) return null;
                    return (
                      <TouchableOpacity key={tk.id} style={s.smallBtn} onPress={() => hitchTrailer(tr.id, tk.id)}>
                        <Text style={s.smallBtnText}>→ {tkType.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

// ── Jobs Tab ─────────────────────────────────────────────────────────────────
function JobsTab() {
  const { tractorJobs, harvestJobs, day } = useGameStore();
  const allJobs = [
    ...(tractorJobs ?? []).map((j: TractorJob) => ({ ...j, kind: 'tractor' as const })),
    ...(harvestJobs ?? []).map((j: HarvestJob) => ({ ...j, kind: 'harvest' as const })),
  ];

  if (allJobs.length === 0) {
    return <Text style={s.empty}>No active jobs. Assign operations from the Fields tab.</Text>;
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <Text style={s.sectionHeader}>Active Jobs</Text>
      {allJobs.map(job => {
        const daysLeft = Math.max(0, job.completesDay - day);
        const progress = job.kind === 'harvest'
          ? Math.round(((job as HarvestJob).processedHa / job.totalHa) * 100)
          : Math.round(((day - job.startDay) / Math.max(1, job.completesDay - job.startDay)) * 100);
        const progressWidth = `${Math.min(100, progress)}%` as ViewStyle['width'];
        return (
          <View key={job.id} style={s.jobCard}>
            <Text style={s.jobTitle}>
              {job.kind === 'harvest'
                ? '🌾 Harvest'
                : `🚜 ${(job as TractorJob).operation.charAt(0).toUpperCase() + (job as TractorJob).operation.slice(1)}`}
            </Text>
            <Text style={s.machineDetail}>{job.parcelIds.length} parcel(s) · {job.totalHa} ha total</Text>
            <Text style={s.machineDetail}>{daysLeft}d remaining (completes day {job.completesDay})</Text>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: progressWidth }]} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Deliveries Tab ───────────────────────────────────────────────────────────
function DeliveriesTab() {
  const { deliveryJobs, machines, day } = useGameStore();
  const activeJobs = (deliveryJobs as DeliveryJob[] | undefined) ?? [];

  if (activeJobs.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text style={{ color: '#555', fontSize: 14 }}>No active deliveries.</Text>
        <Text style={{ color: '#444', fontSize: 12, marginTop: 4 }}>
          Dispatch a truck from the sell screen.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
      {activeJobs.map((job: DeliveryJob) => {
        const truck = (machines ?? []).find((m: OwnedMachine) => m.id === job.truckId);
        const truckType = truck ? MACHINE_TYPES.find(t => t.id === truck.typeId) : null;
        const daysLeft = Math.max(0, job.returnDay - day);
        const cargoSummary = job.cargo.map((c: { quantity: number; itemId: string }) => `${c.quantity.toLocaleString()} ${c.itemId}`).join(', ');
        return (
          <View key={job.id} style={{ backgroundColor: C.bgCard, borderRadius: 10, padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: C.text, fontWeight: 'bold' }}>
                {truckType?.name ?? 'Truck'} → {job.marketId}
              </Text>
              <Text style={{ color: daysLeft === 0 ? '#66bb6a' : C.textMuted, fontSize: 12 }}>
                {daysLeft === 0 ? 'Arriving today' : `${daysLeft}d left`}
              </Text>
            </View>
            <Text style={{ color: '#aaa', fontSize: 12 }}>{cargoSummary}</Text>
            <Text style={{ color: '#66bb6a', fontSize: 12, marginTop: 2 }}>
              Expected: ${job.expectedRevenue.toLocaleString()}
            </Text>
            {job.needsMaintenance && (
              <Text style={{ color: '#ff9800', fontSize: 11, marginTop: 4 }}>
                ⚠ Broke down — delayed by {job.breakdownDaysAdded}d
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const MACHINERY_TABS: { id: MachineryTab; label: string }[] = [
  { id: 'fleet',       label: 'Fleet'       },
  { id: 'attachments', label: 'Attachments' },
  { id: 'jobs',        label: 'Jobs'        },
  { id: 'deliveries',  label: '🚛 Deliveries' },
];

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function MaquinariaScreen() {
  const [tab, setTab] = useState<MachineryTab>('fleet');

  return (
    <View style={s.container}>
      <Text style={s.screenTitle}>Machinery</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={{ flexDirection: 'row' }}>
        {MACHINERY_TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tabBtn, tab === t.id && s.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ flex: 1 }}>
        {tab === 'fleet'       && <FleetTab />}
        {tab === 'attachments' && <AttachmentsTab />}
        {tab === 'jobs'        && <JobsTab />}
        {tab === 'deliveries'  && <DeliveriesTab />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  screenTitle: {
    color: C.text,
    fontSize: F.size.xl,
    fontWeight: F.weight.bold,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
  tabBar:       { borderBottomWidth: 1, borderBottomColor: '#333' },
  tabBtn:       { flex: 1, padding: S.md, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#81c784' },
  tabText:      { color: '#aaa', fontSize: F.size.md },
  tabTextActive:{ color: '#81c784', fontWeight: 'bold' },
  sectionHeader:{ color: C.text, fontSize: F.size.md, fontWeight: 'bold', paddingHorizontal: S.md, paddingTop: S.lg, paddingBottom: 6 },
  machineCard:  { backgroundColor: C.bgCard, borderRadius: 10, margin: S.sm, padding: S.md },
  machineName:  { color: C.white, fontWeight: 'bold', fontSize: F.size.lg, marginBottom: S.xs },
  machineDetail:{ color: '#aaa', fontSize: F.size.sm, marginBottom: 2 },
  repairBadge:  { color: '#ef5350', fontSize: F.size.sm, marginBottom: 2 },
  jobBadge:     { color: '#ffb74d', fontSize: F.size.sm },
  idleBadge:    { color: '#81c784', fontSize: F.size.sm },
  empty:        { color: '#555', fontSize: F.size.md, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
  hitchRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: S.sm },
  smallBtn:     { backgroundColor: '#0f3460', borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { color: '#64b5f6', fontSize: F.size.sm },
  jobCard:      { backgroundColor: C.bgCard, borderRadius: 10, margin: S.sm, padding: S.md },
  jobTitle:     { color: C.text, fontWeight: 'bold', fontSize: F.size.lg, marginBottom: S.xs },
  progressBar:  { height: 6, backgroundColor: C.bg, borderRadius: 3, marginTop: S.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#81c784', borderRadius: 3 },
  fuelCard:           { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, margin: S.sm, gap: 8 },
  fuelHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fuelTitle:          { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
  fuelAmount:         { color: C.textMuted, fontSize: 11 },
  fuelGaugeBg:        { height: 8, backgroundColor: '#0d1117', borderRadius: R.xs, overflow: 'hidden' },
  fuelGaugeFill:      { height: 8, borderRadius: R.xs },
  fuelBuyRow:         { flexDirection: 'row', gap: 6 },
  fuelBuyBtn:         { flex: 1, backgroundColor: '#0f3460', borderRadius: R.md, paddingVertical: 7, alignItems: 'center' },
  fuelBuyBtnDisabled: { backgroundColor: C.bg, opacity: 0.5 },
  fuelFillBtn:        { backgroundColor: '#1a3a20' },
  fuelBuyBtnTop:      { color: C.text, fontSize: 11, fontWeight: 'bold' },
  fuelBuyBtnSub:      { color: '#66bb6a', fontSize: F.size.xs },
  escrowBadge: { backgroundColor: '#2a2a2a', borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 6 },
  escrowText:  { color: C.textFaint, fontSize: 11, fontStyle: 'italic' },
});
