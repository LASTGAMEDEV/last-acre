import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useGameStore, OwnedMachine, OwnedAttachment, OwnedTrailer, TractorJob, HarvestJob, DeliveryJob } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import SubTabBar from '../../components/SubTabBar';
import GuideButton from '../../components/GuideButton';
import { MACHINE_TYPES } from '../../data/machineTypes';
import { ATTACHMENT_TYPES } from '../../data/attachmentTypes';
import { GUIDE_ENTRY_IDS } from '../../data/guideEntries';

type MachineryTab = 'fleet' | 'attachments' | 'jobs' | 'deliveries';

// ── Fleet Tab ────────────────────────────────────────────────────────────────
function FleetTab() {
  const { machines, trailers, tractorJobs, harvestJobs, machineRepairs, day, fuel, buyFuel, buildings, money, listings, fuelPrice, startRepair } = useGameStore();
  const fuelCapacity = (buildings ?? []).reduce((cap: number, id: string) => {
    if (id === 'bld_fuel_tank_s') return cap + 500;
    if (id === 'bld_fuel_tank_l') return cap + 2000;
    return cap;
  }, 200);
  const fuelPct = Math.min(1, (fuel ?? 0) / fuelCapacity);
  const fuelColor = fuelPct > 0.5 ? C.green : fuelPct > 0.2 ? C.amber : C.red;
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
    const cond = m.condition ?? 100;
    const condColor = cond >= 70 ? '#81c784' : cond >= 35 ? '#ffb74d' : '#ef5350';
    const condLabel = cond >= 70 ? 'Good' : cond >= 35 ? 'Worn' : 'Critical';
    return (
      <View key={m.id} style={s.machineCard}>
        <View style={s.machineTitleRow}>
          <Text style={s.machineName}>{mt.name}</Text>
          <GuideButton entryId={GUIDE_ENTRY_IDS.machine(mt.id)} compact />
        </View>
        {/* Condition bar */}
        <View style={s.condRow}>
          <Text style={s.condLabel}>Condition</Text>
          <View style={s.condTrack}>
            <View style={[s.condFill, { width: `${cond}%` as any, backgroundColor: condColor }]} />
          </View>
          <Text style={[s.condPct, { color: condColor }]}>{Math.round(cond)}% {condLabel}</Text>
        </View>
        {repair && (
          <Text style={s.repairBadge}>
            {repair.startDay === null ? '⚠️ Broken' : `🔧 Repairing · ready day ${repair.readyDay}`}
          </Text>
        )}
        {cond < 35 && !repair && (
          <Text style={s.condWarning}>⚠️ Low condition — schedule a repair soon</Text>
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
        <View style={s.machineTitleRow}>
          <Text style={s.machineName}>{mt.name}</Text>
          <GuideButton entryId={GUIDE_ENTRY_IDS.machine(mt.id)} compact />
        </View>
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
        <Text style={{ color: C.textMuted, fontSize: 11 }}>⛽ ${liveFuelPrice.toFixed(2)}/L</Text>
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

      {(() => {
        const pendingRepairs = (machineRepairs ?? []).filter(r => r.startDay === null);
        if (pendingRepairs.length === 0) return null;
        const affordableRepairs = pendingRepairs.filter(r => {
          const netCost = Math.max(0, r.cost - r.insurancePaid);
          return money >= netCost;
        });
        const totalAffordableCost = affordableRepairs.reduce((sum, r) => sum + Math.max(0, r.cost - r.insurancePaid), 0);
        const canRepairAll = affordableRepairs.length > 0;
        return (
          <View style={s.repairAllCard}>
            <Text style={s.repairAllTitle}>🔧 Pending Repairs</Text>
            <Text style={s.repairAllSub}>
              {pendingRepairs.length} machine{pendingRepairs.length > 1 ? 's' : ''} need repair
              {affordableRepairs.length < pendingRepairs.length
                ? ` · ${affordableRepairs.length} affordable`
                : ''}
            </Text>
            <TouchableOpacity
              style={[s.repairAllBtn, !canRepairAll && s.repairAllBtnDisabled]}
              onPress={() => { affordableRepairs.forEach(r => startRepair(r.machineId)); }}
              disabled={!canRepairAll}
            >
              <Text style={s.repairAllBtnText}>
                {canRepairAll
                  ? `Repair ${affordableRepairs.length === 1 ? '' : `all ${affordableRepairs.length} `}· $${totalAffordableCost.toLocaleString()}`
                  : "Can't afford any repairs"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })()}

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
                <View style={s.machineTitleRow}>
                  <Text style={s.machineName}>{at.name}</Text>
                  <GuideButton entryId="system_machinery_transport" compact />
                </View>
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
                <View style={s.machineTitleRow}>
                  <Text style={s.machineName}>{tt.name} · {tt.capacityKg?.toLocaleString()} kg</Text>
                  <GuideButton entryId={GUIDE_ENTRY_IDS.machine(tt.id)} compact />
                </View>
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
        <Text style={{ color: C.textFaint, fontSize: 14 }}>No active deliveries.</Text>
        <Text style={{ color: C.textFaint, fontSize: 12, marginTop: 4 }}>
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
              <Text style={{ color: daysLeft === 0 ? C.green : C.textMuted, fontSize: 12 }}>
                {daysLeft === 0 ? 'Arriving today' : `${daysLeft}d left`}
              </Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 12 }}>{cargoSummary}</Text>
            <Text style={{ color: C.green, fontSize: 12, marginTop: 2 }}>
              Expected: ${job.expectedRevenue.toLocaleString()}
            </Text>
            {job.needsMaintenance && (
              <Text style={{ color: C.amber, fontSize: 11, marginTop: 4 }}>
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
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Machinery</Text>
      </View>
      <SubTabBar
        tabs={MACHINERY_TABS}
        active={tab}
        onSelect={id => setTab(id as MachineryTab)}
      />
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
  sectionHeader:{ color: C.text, fontSize: F.size.md, fontWeight: 'bold', paddingHorizontal: S.md, paddingTop: S.lg, paddingBottom: 6 },
  machineCard:  { backgroundColor: C.bgCard, borderRadius: 10, margin: S.sm, padding: S.md },
  machineTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: S.sm, marginBottom: S.xs },
  machineName:  { flex: 1, color: C.white, fontWeight: 'bold', fontSize: F.size.lg },
  machineDetail:{ color: C.textMuted, fontSize: F.size.sm, marginBottom: 2 },
  repairBadge:  { color: C.red, fontSize: F.size.sm, marginBottom: 2 },
  jobBadge:     { color: C.amber, fontSize: F.size.sm },
  idleBadge:    { color: C.textDim, fontSize: F.size.sm },
  condRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: S.xs },
  condLabel:    { color: C.textMuted, fontSize: 10, width: 60 },
  condTrack:    { flex: 1, height: 5, backgroundColor: C.bgDeep, borderRadius: 3, overflow: 'hidden' },
  condFill:     { height: 5, borderRadius: 3 },
  condPct:      { fontSize: 10, fontWeight: 'bold', width: 72, textAlign: 'right' },
  condWarning:  { color: '#ef5350', fontSize: 10, marginBottom: 4 },
  empty:        { color: C.textFaint, fontSize: F.size.md, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
  hitchRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: S.sm },
  smallBtn:     { backgroundColor: C.bgElevated, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { color: C.blue, fontSize: F.size.sm },
  jobCard:      { backgroundColor: C.bgCard, borderRadius: 10, margin: S.sm, padding: S.md },
  jobTitle:     { color: C.text, fontWeight: 'bold', fontSize: F.size.lg, marginBottom: S.xs },
  progressBar:  { height: 6, backgroundColor: C.bg, borderRadius: 3, marginTop: S.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.textDim, borderRadius: 3 },
  fuelCard:           { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, margin: S.sm, gap: 8 },
  fuelHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fuelTitle:          { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
  fuelAmount:         { color: C.textMuted, fontSize: 11 },
  fuelGaugeBg:        { height: 8, backgroundColor: C.bgDeep, borderRadius: R.xs, overflow: 'hidden' },
  fuelGaugeFill:      { height: 8, borderRadius: R.xs },
  fuelBuyRow:         { flexDirection: 'row', gap: 6 },
  fuelBuyBtn:         { flex: 1, backgroundColor: C.bgElevated, borderRadius: R.md, paddingVertical: 7, alignItems: 'center' },
  fuelBuyBtnDisabled: { backgroundColor: C.bg, opacity: 0.5 },
  fuelFillBtn:        { backgroundColor: C.bgElevated },
  fuelBuyBtnTop:      { color: C.text, fontSize: 11, fontWeight: 'bold' },
  fuelBuyBtnSub:      { color: C.green, fontSize: F.size.xs },
  escrowBadge: { backgroundColor: C.bgElevated, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 6 },
  escrowText:  { color: C.textFaint, fontSize: 11, fontStyle: 'italic' },
  repairAllCard: { backgroundColor: '#3a1a1a', borderRadius: 10, margin: S.sm, padding: S.md, borderLeftWidth: 3, borderLeftColor: '#ef5350', gap: 6 },
  repairAllTitle:{ color: '#ef5350', fontSize: F.size.md, fontWeight: 'bold' },
  repairAllSub:  { color: C.textMuted, fontSize: F.size.sm },
  repairAllBtn:  { backgroundColor: '#ef5350', borderRadius: R.md, paddingVertical: 10, alignItems: 'center' },
  repairAllBtnDisabled: { backgroundColor: C.bgDeep, opacity: 0.5 },
  repairAllBtnText: { color: '#fff', fontSize: F.size.sm, fontWeight: 'bold' },
});
