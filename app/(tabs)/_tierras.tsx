import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { playSound } from '../../engine/sounds';
import { useRouter } from 'expo-router';
import { useGameStore, LandParcel, FieldEvent } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import HintCard from '../../components/HintCard';
import { CROP_TYPES, PlantingSeason } from '../../data/cropTypes';
import { MACHINE_TYPES } from '../../data/machineTypes';
import { BUILDING_TYPES } from '../../data/buildingTypes';
import { getSeason } from '../../engine/climate';
import { getSoilModifier, SoilStats, SOIL_DEFAULTS, computeSoilYieldModifier } from '../../engine/crops';
import { wellFlowRate, PUMP_SPECS, pipeCost } from '../../engine/water';
import { PRODUCT_TYPES } from '../../data/productTypes';
import { PEST_CONFIG } from '../../engine/pests';
import ContractorModal from '../../components/ContractorModal';
import { getContractorCost, ContractorOperation } from '../../engine/machinery';
import HelpSheet from '../../components/HelpSheet';
import { HedgerowType, HEDGEROW_COST } from '../../engine/hedgerows';
import { TILLAGE_FUEL_MULT } from '../../engine/tillage';

const MAP_COLS = 8;

function geneGrade(v: number): string {
  if (v >= 1.4) return 'S';
  if (v >= 1.2) return 'A';
  if (v >= 1.0) return 'B';
  if (v >= 0.8) return 'C';
  return 'D';
}

const SOIL_ICONS: Record<string, string> = {
  loamy: '🟫', sandy: '🟡', clay: '🔵', chalky: '⬜',
};

const CROP_ICONS: Record<string, string> = {
  grass: '🌿', alfalfa: '🌱', barley: '🌾', oats: '🌾',
  wheat: '🌾', corn: '🌽', sorghum: '🌾', rice: '🍚',
  potatoes: '🥔', sugarbeet: '🌰', soy: '🫘', sugarcane: '🎋',
  sunflower: '🌻', rapeseed: '🌼', canola: '🌼', cotton: '🩷',
  saffron: '🌸', vanilla: '🌺', lavender: '💜', ginseng: '🫚',
  grapes: '🍇', tomatoes: '🍅', strawberries: '🍓', olives: '🫒', almonds: '🥜',
};

const SOIL_BAR_COLORS = {
  good: '#4caf50',
  warn: '#ffa726',
  bad:  '#ef5350',
};

function soilStatColor(value: number, low: number, high: number, invert = false): string {
  const pct = (value - low) / (high - low);
  const good = invert ? pct < 0.3 : pct > 0.6;
  const bad  = invert ? pct > 0.5 : pct < 0.3;
  return good ? SOIL_BAR_COLORS.good : bad ? SOIL_BAR_COLORS.bad : SOIL_BAR_COLORS.warn;
}

function SoilTab({ parcel, onAmendment, onCoverCrop }: {
  parcel: LandParcel;
  onAmendment: (type: 'lime' | 'sulfur' | 'subsoiler') => void;
  onCoverCrop: (cropId: string) => void;
}) {
  const soil = parcel.soil ?? SOIL_DEFAULTS;
  const modifier = computeSoilYieldModifier(soil);

  const stats: { label: string; value: number; min: number; max: number; invert?: boolean; unit?: string }[] = [
    { label: 'Nitrogen',       value: soil.nitrogen,      min: 0,   max: 100 },
    { label: 'Organic Matter', value: soil.organicMatter,  min: 0,   max: 10,  unit: '%' },
    { label: 'Compaction',     value: soil.compaction,     min: 0,   max: 100, invert: true },
    { label: 'pH',             value: soil.pH,             min: 4.0, max: 8.5 },
    { label: 'Microbial Life', value: soil.microbialLife,  min: 0,   max: 100 },
  ];

  return (
    <View style={{ padding: S.md }}>
      <Text style={{ color: C.textMuted, fontSize: F.size.xs, marginBottom: S.sm }}>
        Yield modifier: {modifier >= 1 ? '+' : ''}{Math.round((modifier - 1) * 100)}%
      </Text>

      {stats.map((st) => {
        const pct = Math.max(0, Math.min(1, (st.value - st.min) / (st.max - st.min)));
        const barPct = st.invert ? 1 - pct : pct;
        const color = soilStatColor(st.value, st.min, st.max, st.invert);
        return (
          <View key={st.label} style={{ marginBottom: S.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>{st.label}</Text>
              <Text style={{ color: C.text, fontSize: F.size.xs }}>
                {st.value.toFixed(st.unit === '%' ? 1 : 0)}{st.unit ?? ''}
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: C.bgCard, borderRadius: 3, marginTop: 3 }}>
              <View style={{ width: `${barPct * 100}%` as any, height: 6, borderRadius: 3, backgroundColor: color }} />
            </View>
          </View>
        );
      })}

      <Text style={{ color: C.textMuted, fontSize: F.size.xs, marginTop: S.md, marginBottom: S.xs, fontWeight: '600' }}>
        Amendments
      </Text>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        {[
          { id: 'lime' as const,      label: '🪨 Lime',    hint: 'pH +0.5 · €120' },
          { id: 'sulfur' as const,    label: '🟡 Sulfur',  hint: 'pH −0.5 · €100' },
          { id: 'subsoiler' as const, label: '⚙️ Subsoil', hint: 'Compact −18 · €200' },
        ].map((a) => (
          <TouchableOpacity
            key={a.id}
            style={{ flex: 1, backgroundColor: C.bgCard, borderRadius: R.md, padding: S.sm, alignItems: 'center' }}
            onPress={() => onAmendment(a.id)}
          >
            <Text style={{ color: C.text, fontSize: F.size.xs }}>{a.label}</Text>
            <Text style={{ color: C.textFaint, fontSize: 10 }}>{a.hint}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!parcel.plantedCrop && (
        <>
          <Text style={{ color: C.textMuted, fontSize: F.size.xs, marginTop: S.md, marginBottom: S.xs, fontWeight: '600' }}>
            Cover Crops
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {[
              { id: 'rye',       label: '🌾 Rye',      hint: 'Compact −8' },
              { id: 'clover',    label: '🍀 Clover',    hint: 'N +20, OM +2%' },
              { id: 'mustard',   label: '🌼 Mustard',   hint: 'Pest −15%' },
              { id: 'buckwheat', label: '🌿 Buckwheat', hint: 'Microbes +10' },
            ].map((cc) => (
              <TouchableOpacity
                key={cc.id}
                style={{ backgroundColor: C.bgCard, borderRadius: R.md, padding: S.sm, alignItems: 'center', minWidth: 80 }}
                onPress={() => onCoverCrop(cc.id)}
              >
                <Text style={{ color: C.text, fontSize: F.size.xs }}>{cc.label}</Text>
                <Text style={{ color: C.textFaint, fontSize: 10 }}>{cc.hint}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function WaterParcelSection({ parcel }: { parcel: LandParcel }) {
  const { wells, aquiferLevel, assignHydrogeologist, connectParcel, disconnectParcel, workers } = useGameStore();

  const connectedWell = (wells ?? []).find(w => w.connectedParcelIds.includes(parcel.id) || w.parcelId === parcel.id);
  const hasHydro = (workers ?? []).some(w => w.role === 'hydrogeologist');
  const busySurvey = (wells ?? []).some(w => w.status === 'surveying');

  const cardStyle = { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.sm };
  const btnStyle = { backgroundColor: C.green, borderRadius: R.md, padding: S.sm, alignItems: 'center' as const };
  const btnTextStyle = { color: C.text, fontWeight: 'bold' as const, fontSize: F.size.md };

  return (
    <View style={{ gap: 8 }}>
      {/* Current water source */}
      <View style={cardStyle}>
        <Text style={{ color: C.text, fontWeight: 'bold', marginBottom: 4 }}>Water Source</Text>
        {connectedWell ? (
          <Text style={{ color: C.faint, fontSize: F.size.md }}>
            Well · {connectedWell.status === 'active' && connectedWell.pumpTier
              ? `Active (${wellFlowRate(connectedWell, aquiferLevel ?? 75).toFixed(0)} L/hr effective)`
              : connectedWell.status}
          </Text>
        ) : parcel.irrigated ? (
          <Text style={{ color: C.green, fontSize: F.size.md }}>Grid water (enabled farm-wide)</Text>
        ) : (
          <Text style={{ color: C.faint, fontSize: F.size.md }}>No water source connected</Text>
        )}
      </View>

      {/* Survey / connect actions */}
      {!connectedWell && (
        <View style={cardStyle}>
          {hasHydro && !busySurvey ? (
            <TouchableOpacity
              style={btnStyle}
              onPress={() => assignHydrogeologist(parcel.id)}
            >
              <Text style={btnTextStyle}>🔍 Start Hydrogeologist Survey</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: C.faint, fontSize: F.size.sm }}>
              {!hasHydro
                ? 'Hire a Hydrogeologist (Workers tab) to survey this parcel for well spots.'
                : 'Hydrogeologist is currently busy with another survey.'}
            </Text>
          )}
        </View>
      )}

      {/* Connect to existing well */}
      {!connectedWell && (wells ?? []).filter(w => w.status === 'active' && w.pumpTier).length > 0 && (
        <View style={cardStyle}>
          <Text style={{ color: C.text, fontWeight: 'bold', marginBottom: 6 }}>Connect to Existing Well</Text>
          {(wells ?? []).filter(w => w.status === 'active' && w.pumpTier).map(w => {
            const allParcels = useGameStore.getState().parcels;
            const wellIdx = allParcels.findIndex(p => p.id === w.parcelId);
            const targetIdx = allParcels.findIndex(p => p.id === parcel.id);
            const cost = pipeCost(wellIdx, targetIdx);
            return (
              <TouchableOpacity key={w.id} style={[btnStyle, { marginBottom: 4 }]} onPress={() => connectParcel(w.id, parcel.id)}>
                <Text style={btnTextStyle}>Connect via pipe · €{cost.toLocaleString()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Disconnect */}
      {connectedWell && connectedWell.parcelId !== parcel.id && (
        <TouchableOpacity
          style={[btnStyle, { backgroundColor: C.gray }]}
          onPress={() => disconnectParcel(connectedWell.id, parcel.id)}
        >
          <Text style={btnTextStyle}>Disconnect from well</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ManagementTab({ parcel, onClose }: { parcel: LandParcel; onClose: () => void }) {
  const { money, activeLeases, setTillageSystem, installHedgerow, hedgerows } = useGameStore();
  const edges: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
  const edgeLabels: Record<string, string> = { north: '⬆️ North', south: '⬇️ South', east: '➡️ East', west: '⬅️ West' };
  const lease = (activeLeases ?? []).find(l => l.parcelId === parcel.id && l.status === 'active');

  return (
    <ScrollView style={{ padding: S.md }} showsVerticalScrollIndicator={false}>
      {/* Lease warning */}
      {lease && (
        <View style={{ backgroundColor: '#2a1a00', borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <Text style={{ color: C.amber, fontSize: 12, fontWeight: 'bold' }}>📝 Leased from {lease.npcName}</Text>
          <Text style={{ color: '#888', fontSize: 11 }}>
            {lease.leaseType === 'sharecrop'
              ? `${Math.round((lease.landOwnerSharePct ?? 0.35) * 100)}% harvest share`
              : `€${lease.cashRentPerSeason?.toLocaleString()}/season`}
          </Text>
        </View>
      )}

      {/* Tillage system */}
      <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Tillage System</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        {(['conventional', 'reduced', 'notill'] as const).map(sys => (
          <TouchableOpacity
            key={sys}
            style={{
              flex: 1,
              backgroundColor: parcel.tillageSystem === sys ? '#1565c0' : C.bgCard,
              borderRadius: R.md,
              padding: S.sm,
              alignItems: 'center',
            }}
            onPress={() => setTillageSystem(parcel.id, sys)}
          >
            <Text style={{ color: parcel.tillageSystem === sys ? '#fff' : C.text, fontSize: 11, fontWeight: 'bold' }}>
              {sys === 'conventional' ? '🔧 Conv' : sys === 'reduced' ? '⚙️ Reduced' : '🚜 No-till'}
            </Text>
            <Text style={{ color: parcel.tillageSystem === sys ? '#bbdefb' : '#888', fontSize: 9 }}>
              Fuel {Math.round((TILLAGE_FUEL_MULT[sys] ?? 1) * 100)}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hedgerows */}
      <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Hedgerows</Text>
      {edges.map(edge => {
        const existing = (hedgerows ?? []).find(h => h.parcelId === parcel.id && h.edge === edge);
        return (
          <View key={edge} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bgCard, borderRadius: 8, padding: 10, marginBottom: 6 }}>
            <Text style={{ color: C.text, fontSize: 12 }}>{edgeLabels[edge]}</Text>
            {existing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: C.green, fontSize: 11 }}>
                  🌳 {existing.type.replace('hdg_', '')} · {existing.mature ? 'Mature' : 'Growing'}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {(['hdg_mixed', 'hdg_buffer', 'hdg_pollinator', 'hdg_woodland'] as HedgerowType[]).map(type => {
                  const cost = Math.round(HEDGEROW_COST[type] ?? 0);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={{
                        backgroundColor: money >= cost ? C.bgElevated : '#2a2a2a',
                        borderRadius: R.sm,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                      disabled={money < cost}
                      onPress={() => { installHedgerow(parcel.id, edge, type); onClose(); }}
                    >
                      <Text style={{ color: money >= cost ? C.green : C.textFaint, fontSize: 10 }}>
                        {type.replace('_', ' ')} €{cost.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

export default function TierrasScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const CELL_SIZE = Math.min(68, Math.floor((Math.min(screenWidth, 480) - 20) / MAP_COLS));

  const {
    parcels, money, day, inventory, machines, buildings, cooperative, prices, forecast,
    buyParcel, plantCrop, harvestCrop, harvestAllReady,
    fieldEvents, resolveFieldEvent, productInventory,
    clearWeeds, fertilizeCrop, installGreenhouse, removeGreenhouse, installIrrigation,
    seedVault, selectSeedForParcel,
    tractorJobs, harvestJobs, assignJob, assignHarvestJob, hireContractor,
    cureDisease, treatPest, plantCropBatch, hapticEnabled,
    applySoilAmendment, plantCoverCrop,
  } = useGameStore();

  // True if a frost event is forecast within the next 3 days
  const frostInNext3Days = forecast.slice(0, 3).some(w => w.event === 'frost');
  const [batchCropId, setBatchCropId] = useState<string | null>(null);
  const [batchModal, setBatchModal] = useState(false);

  const [plantingParcel, setPlantingParcel] = useState<LandParcel | null>(null);
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  const [contractorModal, setContractorModal] = useState<{
    visible: boolean;
    operation: ContractorOperation;
    parcelIds: string[];
    totalHa: number;
    totalCost: number;
    cropId?: string;
  } | null>(null);
  const currentSeason: PlantingSeason = getSeason(day);
  const [mapView, setMapView] = useState(false);
  const [mapSelected, setMapSelected] = useState<LandParcel | null>(null);
  const [activeParcelTab, setActiveParcelTab] = useState<'info' | 'soil' | 'water' | 'mgmt'>('info');
  type FieldFilter = 'all' | 'empty' | 'growing' | 'ready' | 'events';
  const [fieldFilter, setFieldFilter] = useState<FieldFilter>('all');

  const owned = parcels.filter(p => p.owned);
  const available = parcels.filter(p => !p.owned);
  const activeFieldEvents = fieldEvents.filter(e => !e.resolved);

  // Storage info
  const BASE_SILO = 10_000;
  const siloCapacity = buildings.reduce((s, bId) => {
    if (!bId.startsWith('bld_silo')) return s;
    const caps: Record<string, number> = { bld_silo_s: 50000, bld_silo_m: 200000, bld_silo_l: 600000, bld_silo_xl: 2000000 };
    return s + (caps[bId] ?? 0);
  }, BASE_SILO);
  const totalInventory = Object.values(inventory).reduce((a, b) => a + b, 0);

  // Greenhouse slots
  const totalGHSlots = buildings.reduce((s: number, bId: string) => {
    if (!bId.startsWith('bld_greenhouse')) return s;
    const t = BUILDING_TYPES.find(bt => bt.id === bId);
    return s + (t?.capacity ?? 0);
  }, 0);
  const usedGHSlots = parcels.filter(p => p.greenhouse).length;

  function isReady(parcel: LandParcel): boolean {
    if (!parcel.plantedCrop) return false;
    const cropType = CROP_TYPES.find(c => c.id === parcel.plantedCrop!.cropId);
    if (!cropType) return false;
    const effectiveDays = Math.round(cropType.growthDays);
    return day >= parcel.plantedCrop.plantedDay + effectiveDays;
  }

  function daysLeft(parcel: LandParcel): number {
    if (!parcel.plantedCrop) return 0;
    const cropType = CROP_TYPES.find(c => c.id === parcel.plantedCrop!.cropId);
    if (!cropType) return 0;
    const effectiveDays = Math.round(cropType.growthDays);
    return Math.max(0, parcel.plantedCrop.plantedDay + effectiveDays - day);
  }

  function getEventForParcel(parcelId: string): FieldEvent | undefined {
    return activeFieldEvents.find(e => e.parcelId === parcelId);
  }

  const ownedCombines = (machines ?? []).filter((m: any) =>
    MACHINE_TYPES.find(t => t.id === m.typeId)?.category === 'harvester'
  );

  const getParcelJob = (parcelId: string) =>
    (tractorJobs ?? []).find((j: any) => j.parcelIds.includes(parcelId));
  const getHarvestJob = (parcelId: string) =>
    (harvestJobs ?? []).find((j: any) => j.parcelIds.includes(parcelId));

  function renderMapCell(parcel: LandParcel) {
    const event = getEventForParcel(parcel.id);
    const ready = isReady(parcel);
    const selected = mapSelected?.id === parcel.id;

    let bg = '#060a14';
    let borderColor = C.border;
    let mainIcon = '';
    let statusIcon = '';

    if (parcel.owned) {
      if (parcel.diseased) {
        bg = '#1f0800'; borderColor = '#7a2800'; statusIcon = '🦠';
      } else if (event) {
        bg = '#1f0808'; borderColor = '#991b1b'; statusIcon = '⚠️';
      } else if (parcel.pestState?.detectedDay) {
        bg = '#1f0e00'; borderColor = '#c2410c'; statusIcon = '\ud83d\udc1b';
      } else if (parcel.hasWeeds) {
        bg = '#1a1600'; borderColor = '#a16207';
      } else if (parcel.plantedCrop && ready) {
        bg = '#082a10'; borderColor = C.green;
      } else if (parcel.plantedCrop) {
        bg = '#081a0d'; borderColor = C.greenDark;
      } else if (parcel.tilled) {
        bg = '#1a1200'; borderColor = '#78350f'; statusIcon = '⬛';
      } else {
        bg = '#0f172a'; borderColor = C.border;
      }
      mainIcon = parcel.plantedCrop ? (CROP_ICONS[parcel.plantedCrop.cropId] ?? '🌱') : '';
      if (parcel.hasWeeds && !parcel.diseased) statusIcon = '🌿';
    }

    if (selected) borderColor = '#c8860a';

    return (
      <TouchableOpacity
        key={parcel.id}
        onPress={() => setMapSelected(parcel)}
        activeOpacity={0.7}
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          margin: 2,
          borderRadius: 10,
          backgroundColor: bg,
          borderWidth: selected ? 2 : 1,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {parcel.owned ? (
          <>
            {mainIcon ? <Text style={{ fontSize: CELL_SIZE * 0.38 }}>{mainIcon}</Text> : null}
            {statusIcon ? (
              <Text style={{ fontSize: CELL_SIZE * 0.28, position: 'absolute', top: 1, right: 2 }}>{statusIcon}</Text>
            ) : null}
            {parcel.linkedColmenaId ? (
              <Text style={{ fontSize: CELL_SIZE * 0.22, position: 'absolute', bottom: 1, right: 2 }}>
                🐝{parcel.pesticideSprayedDay ? '⚠️' : ''}
              </Text>
            ) : null}
            {ready && !statusIcon ? (
              <Text style={{ fontSize: CELL_SIZE * 0.22, color: '#a5d6a7', fontWeight: 'bold' }}>✓</Text>
            ) : null}
            <Text style={{ fontSize: CELL_SIZE * 0.2, color: '#88aacc', marginTop: 1 }}>{parcel.hectares}ha</Text>
          </>
        ) : (
          <Text style={{ fontSize: CELL_SIZE * 0.3, opacity: 0.35 }}>🔒</Text>
        )}
      </TouchableOpacity>
    );
  }

  const fungicideIds = PRODUCT_TYPES.filter(p => p.category === 'fungicide' && (productInventory[p.id] ?? 0) > 0).map(p => p.id);
  const insecticideIds = PRODUCT_TYPES.filter(p => p.category === 'insecticide' && (productInventory[p.id] ?? 0) > 0).map(p => p.id);
  const nematicideIds = PRODUCT_TYPES.filter(p => p.category === 'nematicide' && (productInventory[p.id] ?? 0) > 0).map(p => p.id);
  const herbicideIds = PRODUCT_TYPES.filter(p => p.category === 'herbicide' && (productInventory[p.id] ?? 0) > 0).map(p => p.id);
  const fertilizerIds = PRODUCT_TYPES.filter(p => (p.category === 'fertilizer_solid' || p.category === 'fertilizer_liquid') && (productInventory[p.id] ?? 0) > 0).map(p => p.id);

  function renderOwnedParcel(parcel: LandParcel) {
    const ready = isReady(parcel);
    const fieldEvent = getEventForParcel(parcel.id);
    const cropType = parcel.plantedCrop ? CROP_TYPES.find(c => c.id === parcel.plantedCrop!.cropId) : null;
    const storageFull = totalInventory >= siloCapacity;

    return (
      <View key={parcel.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{parcel.name}</Text>
            <Text style={styles.cardSub}>{parcel.hectares} ha</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.fertility}>♦ {parcel.fertility}/25</Text>
            {parcel.soilType && (
              <Text style={styles.soilBadge}>{SOIL_ICONS[parcel.soilType]} {parcel.soilType}</Text>
            )}
          </View>
        </View>

        {/* Organic / lease / tillage badges */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
          {parcel.organicStatus && parcel.organicStatus !== 'conventional' && (
            <Text style={[styles.badge, { color: parcel.organicStatus === 'organic' ? '#4caf50' : '#ffa726' }]}>
              {parcel.organicStatus === 'organic' ? '🌿 Organic' : `🔄 ${parcel.organicStatus.replace('_', ' ')}`}
            </Text>
          )}
          {parcel.tillageSystem && parcel.tillageSystem !== 'conventional' && (
            <Text style={[styles.badge, { color: '#64b5f6' }]}>
              {parcel.tillageSystem === 'notill' ? '🚜 No-till' : '⚙️ Reduced'}
            </Text>
          )}
          {parcel.waterwayAdjacent && (
            <Text style={[styles.badge, { color: '#4fc3f7' }]}>💧 Waterway</Text>
          )}
        </View>

        {/* Greenhouse badge / toggle */}
        {parcel.greenhouse ? (
          <View style={styles.ghRow}>
            <Text style={styles.ghBadge}>🏠 Greenhouse</Text>
            <TouchableOpacity onPress={() => removeGreenhouse(parcel.id)}>
              <Text style={styles.ghRemove}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : totalGHSlots > usedGHSlots && !parcel.plantedCrop ? (
          <TouchableOpacity style={styles.ghInstallBtn} onPress={() => installGreenhouse(parcel.id)}>
            <Text style={styles.smallBtnText}>🏠 Install GH (€2k)</Text>
          </TouchableOpacity>
        ) : null}

        {/* Irrigation badge / install */}
        {parcel.irrigated ? (
          <Text style={styles.irrigatedBadge}>💧 Irrigated +20% yield</Text>
        ) : money >= 3000 ? (
          <TouchableOpacity style={styles.irrigateBtn} onPress={() => installIrrigation(parcel.id)}>
            <Text style={styles.smallBtnText}>💧 Irrigate (€3k)</Text>
          </TouchableOpacity>
        ) : null}

        {parcel.diseased && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2a0a00', borderRadius: 6, padding: 8, marginBottom: 4 }}>
            <Text style={{ color: '#ff8a65', fontSize: 11 }}>🦠 Blight · {parcel.diseasedDay ? `day ${day - parcel.diseasedDay} of 20` : 'active'}</Text>
            <TouchableOpacity
              style={{ backgroundColor: '#4a1a00', borderRadius: 5, paddingHorizontal: 10, paddingVertical: 4 }}
              onPress={() => cureDisease(parcel.id)}
              disabled={money < 150}
            >
              <Text style={{ color: money >= 150 ? '#ffb74d' : '#555', fontSize: 11, fontWeight: 'bold' }}>Treat €150</Text>
            </TouchableOpacity>
          </View>
        )}

        {parcel.pestState?.detectedDay && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2a0a00', borderRadius: 6, padding: 8, marginBottom: 4 }}>
            <Text style={{ color: '#ff8a65', fontSize: 11 }}>
              {'\ud83d\udc1b'} {PEST_CONFIG[parcel.pestState.type].label} &middot; severity {parcel.pestState.severity.toFixed(1)}/10
            </Text>
            {(() => {
              const treatmentCategory = PEST_CONFIG[parcel.pestState.type].treatment;
              const available = PRODUCT_TYPES.filter(p => p.category === treatmentCategory && (productInventory[p.id] ?? 0) > 0);
              if (available.length > 0) {
                return (
                  <TouchableOpacity
                    style={{ backgroundColor: '#4a1a00', borderRadius: 5, paddingHorizontal: 10, paddingVertical: 4 }}
                    onPress={() => treatPest(parcel.id, available[0].id)}
                  >
                    <Text style={{ color: '#ffb74d', fontSize: 11, fontWeight: 'bold' }}>Treat (1 unit)</Text>
                  </TouchableOpacity>
                );
              }
              return <Text style={{ color: '#ef9a9a', fontSize: 11 }}>No {treatmentCategory}</Text>;
            })()}
          </View>
        )}

        {parcel.plantedCrop ? (
          <Text style={styles.cropTag}>
            🌱 {cropType?.name ?? parcel.plantedCrop.cropId}
            {(parcel.plantedCrop.appliedN ?? 1.0) > 1.0 ? ' ?' : ''}
          </Text>
        ) : (
          <Text style={styles.emptyTag}>Empty</Text>
        )}

        {frostInNext3Days && parcel.plantedCrop && !parcel.greenhouse && (
          <View style={styles.frostWarning}>
            <Text style={styles.frostWarningText}>❄️ Frost risk</Text>
          </View>
        )}

        {parcel.owned && (() => {
          const tractorJob = getParcelJob(parcel.id);
          const harvestJob = getHarvestJob(parcel.id);

          if (tractorJob) {
            const daysRemaining = Math.max(0, tractorJob.completesDay - day);
            return (
              <View style={localStyles.progressRow}>
                <Text style={localStyles.progressText}>
                  {tractorJob.operation.charAt(0).toUpperCase() + tractorJob.operation.slice(1)} · {daysRemaining}d remaining
                </Text>
              </View>
            );
          }
          if (harvestJob) {
            const daysRemaining = Math.max(0, harvestJob.completesDay - day);
            return (
              <View style={localStyles.progressRow}>
                <Text style={localStyles.progressText}>Harvesting · {daysRemaining}d remaining</Text>
              </View>
            );
          }

          if (!parcel.tilled && !parcel.plantedCrop) {
            // Till assignment is done from Machinery → Jobs; this button offers the contractor fallback
            return (
              <TouchableOpacity
                style={localStyles.opBtn}
                onPress={() => {
                  const cost = getContractorCost('till', parcel.hectares);
                  setContractorModal({ visible: true, operation: 'till', parcelIds: [parcel.id], totalHa: parcel.hectares, totalCost: cost });
                }}
              >
                <Text style={localStyles.opBtnText}>Till Field</Text>
              </TouchableOpacity>
            );
          }

          if (parcel.tilled && !parcel.plantedCrop) {
            return (
              <TouchableOpacity style={localStyles.opBtn} onPress={() => { setPlantingParcel(parcel); if (parcel.lastCropId) setSelectedCropId(parcel.lastCropId); }}>
                <Text style={localStyles.opBtnText}>Plant Crop{parcel.lastCropId ? ` (last: ${CROP_TYPES.find(c => c.id === parcel.lastCropId)?.name ?? parcel.lastCropId})` : ''}</Text>
              </TouchableOpacity>
            );
          }

          if (parcel.plantedCrop && !ready) {
            const sprayCost = getContractorCost('spray', parcel.hectares);
            return (
              <TouchableOpacity
                style={[localStyles.opBtn, localStyles.opBtnYellow]}
                onPress={() => setContractorModal({ visible: true, operation: 'spray', parcelIds: [parcel.id], totalHa: parcel.hectares, totalCost: sprayCost })}
              >
                <Text style={localStyles.opBtnText}>Spray (optional)</Text>
              </TouchableOpacity>
            );
          }

          if (ready) {
            const harvestCostVal = getContractorCost('harvest', parcel.hectares);
            return (
              <TouchableOpacity
                style={[localStyles.opBtn, localStyles.opBtnRed]}
                onPress={() => {
                  if (ownedCombines.length > 0) {
                    harvestCrop(parcel.id);
                    playSound('harvest');
                    if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } else {
                    setContractorModal({ visible: true, operation: 'harvest', parcelIds: [parcel.id], totalHa: parcel.hectares, totalCost: harvestCostVal });
                  }
                }}
              >
                <Text style={localStyles.opBtnText}>Harvest</Text>
              </TouchableOpacity>
            );
          }

          return null;
        })()}

        {parcel.hasWeeds && (
          <View style={styles.weedRow}>
            <Text style={styles.weedTag}>⚠️ Weeds</Text>
            {herbicideIds.length > 0 ? (
              <TouchableOpacity style={styles.resolveBtn} onPress={() => clearWeeds(parcel.id)}>
                <Text style={styles.resolveBtnText}>Clear (1 dose)</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noProductText}>No herbicide</Text>
            )}
          </View>
        )}

        {fieldEvent && (
          <View style={styles.eventAlert}>
            <Text style={styles.eventText}>
              {fieldEvent.type === 'disease' ? '🍄 Disease' : '🐛 Pest'}
            </Text>
            {(fieldEvent.type === 'disease' ? fungicideIds : insecticideIds).slice(0, 1).map(pid => (
              <TouchableOpacity key={pid} style={styles.resolveBtn} onPress={() => resolveFieldEvent(fieldEvent.id, pid)}>
                <Text style={styles.resolveBtnText}>Treat (1 unit)</Text>
              </TouchableOpacity>
            ))}
            {(fieldEvent.type === 'disease' ? fungicideIds : insecticideIds).length === 0 && (
              <Text style={styles.noProductText}>
                No {fieldEvent.type === 'disease' ? 'fungicide' : 'insecticide'}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  function renderMarketParcel(parcel: LandParcel) {
    const cost = parcel.pricePerHa * parcel.hectares;
    return (
      <View key={parcel.id} style={[styles.card, styles.marketCard]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{parcel.name}</Text>
            <Text style={styles.cardSub}>{parcel.hectares} ha</Text>
          </View>
          <Text style={styles.fertility}>♦ {parcel.fertility}/25</Text>
        </View>
        <Text style={styles.priceTag}>€{cost.toLocaleString()}</Text>
        <TouchableOpacity
          style={[styles.buyBtn, money < cost && styles.btnDisabled]}
          onPress={() => buyParcel(parcel.id)}
          disabled={money < cost}
        >
          <Text style={styles.btnText}>Comprar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Map selected parcel detail helpers
  const mapSelectedEvent = mapSelected ? getEventForParcel(mapSelected.id) : null;
  const mapSelectedCropType = mapSelected?.plantedCrop
    ? CROP_TYPES.find(c => c.id === mapSelected.plantedCrop!.cropId)
    : null;
  const mapSelectedReady = mapSelected ? isReady(mapSelected) : false;
  const mapSelectedDays = mapSelected ? daysLeft(mapSelected) : 0;
  const mapSelectedHerbicide = herbicideIds.length > 0;
  const mapSelectedFertilizer = fertilizerIds.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={localStyles.screenTitle}>My Fields</Text>
        <TouchableOpacity style={styles.viewToggle} onPress={() => { setMapView(v => !v); setMapSelected(null); }}>
          <Text style={styles.viewToggleText}>{mapView ? '📋 List' : '🗺️ Map'}</Text>
        </TouchableOpacity>
      </View>

      {/* Hint cards */}
      {!parcels.some(p => p.owned && p.plantedCrop) && (
        <HintCard id="hint_plant" title="Plant your first crop" body="Tap any owned parcel (green), then tap Till and Plant Crop to get started. Crops take a few days to mature." />
      )}
      {parcels.some(p => p.owned && p.plantedCrop && isReady(p)) && (
        <HintCard id="hint_harvest" title="Crop is ready to harvest!" body="One or more of your crops has finished growing. Tap the parcel and hit Harvest to collect it." />
      )}
      {parcels.some(p => p.owned && p.plantedCrop && (p.plantedCrop.appliedN ?? 1.0) <= 1.0) && !parcels.some(p => p.owned && p.plantedCrop && isReady(p)) && (
        <HintCard id="hint_fertilize" title="Boost yield with fertilizer" body="You have a growing crop that wasn't fertilized. Buy fertilizer from the Shop and apply it to increase your harvest by up to 30%." />
      )}
      {day > 30 && (
        <HintCard id="hint_worldmap" title="Expand to new regions" body="After day 30 you can scout and purchase fields on the World Map. Bigger farms unlock better contracts and prestige bonuses." />
      )}

      {/* World Map button */}
      <TouchableOpacity
        style={styles.worldMapBtn}
        onPress={() => router.push('/world-map')}
      >
        <Text style={styles.worldMapBtnText}>🗺️  World Map</Text>
      </TouchableOpacity>

      {/* Field events banner */}
      {activeFieldEvents.length > 0 && (
        <View style={styles.eventsBanner}>
          <Text style={styles.eventsBannerText}>
            ⚠️ {activeFieldEvents.length} active event{activeFieldEvents.length > 1 ? 's' : ''} · check your plots
          </Text>
        </View>
      )}

      {mapView ? (
        /* ── MAP VIEW ── */
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: mapSelected ? 196 : 8 }}>
            <Text style={styles.sectionLabel}>
              {owned.length} plots · tap to inspect
            </Text>
            {/* Map legend */}
            <View style={styles.mapLegend}>
              {[
                { bg: '#0f3a0f', label: 'Planted' },
                { bg: '#1a5c1a', label: 'Ready' },
                { bg: '#3a1010', label: 'Event' },
                { bg: '#2a1f00', label: 'Weeds' },
                { bg: C.bgCard, label: 'Empty' },
              ].map(item => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.bg }]} />
                  <Text style={styles.legendLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, marginBottom: 8 }}>
              {parcels.map(p => renderMapCell(p))}
            </View>

            {/* Market below map */}
            <Text style={styles.sectionLabel}>Available on market ({available.length})</Text>
            <View style={styles.grid}>
              {available.map(p => renderMarketParcel(p))}
            </View>
          </ScrollView>

          {/* ── SELECTED PARCEL PANEL ── */}
          {mapSelected && (() => {
            const p = mapSelected;
            const event = getEventForParcel(p.id);
            const ready = isReady(p);
            const days = daysLeft(p);
            const cropType = p.plantedCrop ? CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId) : null;
            const storageFull = totalInventory >= siloCapacity;
            const canAfford = money >= p.pricePerHa * p.hectares;
            const cost = Math.round(p.pricePerHa * p.hectares);
            return (
              <View style={styles.mapPanel}>
                {/* Header */}
                <View style={styles.mapPanelHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mapPanelTitle}>{p.name}</Text>
                    <Text style={styles.mapPanelSub}>
                      {p.hectares} ha
                      {p.soilType ? ` · ${SOIL_ICONS[p.soilType]} ${p.soilType}` : ''}
                      {p.owned ? ` · ♦ ${p.fertility}/25` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setMapSelected(null)} style={styles.mapPanelClose}>
                    <Text style={styles.mapPanelCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Status / actions */}
                <View style={styles.mapPanelActions}>
                  {!p.owned ? (
                    <TouchableOpacity
                      style={[styles.mapActionBtn, styles.mapActionBuy, !canAfford && styles.mapActionDisabled]}
                      onPress={() => { buyParcel(p.id); setMapSelected(null); }}
                      disabled={!canAfford}
                    >
                      <Text style={styles.mapActionText}>
                        {canAfford ? `Buy · $€{cost.toLocaleString()}` : `$€{cost.toLocaleString()} needed`}
                      </Text>
                    </TouchableOpacity>
                  ) : event ? (
                    <View style={styles.mapActionAlert}>
                      <Text style={styles.mapActionAlertText}>⚠️ {event.type === 'disease' ? 'Disease' : 'Pest'} · treat with fungicide/insecticide</Text>
                    </View>
                  ) : p.hasWeeds ? (
                    <View style={styles.mapActionRow}>
                      <View style={styles.mapActionAlert}>
                        <Text style={styles.mapActionAlertText}>🌿 Weeds affecting yield</Text>
                      </View>
                      {herbicideIds.length > 0 && (
                        <TouchableOpacity
                          style={[styles.mapActionBtn, styles.mapActionHarvest]}
                          onPress={() => { clearWeeds(p.id); setMapSelected(null); }}
                        >
                          <Text style={styles.mapActionText}>Clear Weeds</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : ready ? (
                    <TouchableOpacity
                      style={[styles.mapActionBtn, styles.mapActionHarvest, storageFull && styles.mapActionDisabled]}
                      onPress={() => { harvestCrop(p.id); setMapSelected(null); playSound('harvest'); if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                      disabled={storageFull}
                    >
                      <Text style={styles.mapActionText}>
                        {storageFull ? 'Storage full' : `🌾 Harvest ${cropType?.name ?? ''}`}
                      </Text>
                    </TouchableOpacity>
                  ) : p.plantedCrop ? (
                    <View style={styles.mapActionInfo}>
                      <Text style={styles.mapActionInfoText}>
                        🌱 {cropType?.name ?? ''} · {days}d to harvest
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.mapActionBtn, styles.mapActionPlant]}
                      onPress={() => { setMapView(false); setPlantingParcel(p); setMapSelected(null); }}
                    >
                      <Text style={styles.mapActionText}>🌱 Plant Crop</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })()}
        </View>
      ) : (
        /* ── LIST VIEW ── */
        <ScrollView>
          {/* Filter bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
            {([
              { id: 'all',    label: `All (${owned.length})` },
              { id: 'empty',  label: '🟦 Empty' },
              { id: 'growing',label: '🌱 Growing' },
              { id: 'ready',  label: '🌾 Ready' },
              { id: 'events', label: '⚠️ Events' },
            ] as { id: FieldFilter; label: string }[]).map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, fieldFilter === f.id && styles.filterChipActive]}
                onPress={() => setFieldFilter(f.id)}
              >
                <Text style={[styles.filterChipText, fieldFilter === f.id && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Batch harvest */}
          {(() => {
            const readyCount = owned.filter(p => isReady(p)).length;
            return readyCount > 0 ? (
              <TouchableOpacity style={styles.batchHarvestBtn} onPress={() => { harvestAllReady(); playSound('harvest'); if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}>
                <Text style={styles.batchHarvestText}>🌾 Harvest All Ready ({readyCount})</Text>
              </TouchableOpacity>
            ) : null;
          })()}

          {/* Batch plant */}
          {(() => {
            const idleCount = owned.filter(p => !p.plantedCrop && !p.hasWeeds).length;
            if (idleCount === 0) return null;
            return batchModal ? (
              <View style={localStyles.batchBox}>
                <Text style={localStyles.batchTitle}>🌱 Plant All Idle ({idleCount} plots)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                  {CROP_TYPES.filter(c => c.seasons.includes(currentSeason)).map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[localStyles.batchChip, batchCropId === c.id && localStyles.batchChipActive]}
                      onPress={() => setBatchCropId(c.id)}
                    >
                      <Text style={[localStyles.batchChipText, batchCropId === c.id && { color: C.white }]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {batchCropId && (() => {
                  const crop = CROP_TYPES.find(c => c.id === batchCropId)!;
                  const total = owned.filter(p => !p.plantedCrop && !p.hasWeeds).reduce((s, p) => s + Math.round(crop.seedCost * p.hectares), 0);
                  return (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[localStyles.opBtn, { flex: 1 }]}
                        onPress={() => { plantCropBatch(batchCropId); setBatchModal(false); }}
                        disabled={money < total}
                      >
                        <Text style={localStyles.opBtnText}>Plant (${total.toLocaleString()})</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={localStyles.batchCancel} onPress={() => setBatchModal(false)}>
                        <Text style={{ color: '#555', fontSize: 12 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </View>
            ) : (
              <TouchableOpacity style={localStyles.batchPlantBtn} onPress={() => setBatchModal(true)}>
                <Text style={localStyles.batchPlantText}>🌱 Plant All Idle ({idleCount})</Text>
              </TouchableOpacity>
            );
          })()}

          <Text style={styles.sectionLabel}>Owned plots ({owned.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
            {owned
              .filter(p => {
                if (fieldFilter === 'empty')   return !p.plantedCrop;
                if (fieldFilter === 'growing') return !!p.plantedCrop && !isReady(p);
                if (fieldFilter === 'ready')   return isReady(p);
                if (fieldFilter === 'events')  return !!getEventForParcel(p.id);
                return true;
              })
              .map(p => renderOwnedParcel(p))}
            {owned.length === 0 && <Text style={styles.empty}>No plots.</Text>}
          </ScrollView>

          <Text style={styles.sectionLabel}>Available on market ({available.length})</Text>
          <View style={styles.grid}>
            {available.map(p => renderMarketParcel(p))}
          </View>
        </ScrollView>
      )}

      {/* Plant crop modal */}
      <Modal visible={!!plantingParcel} transparent animationType="slide" onRequestClose={() => { setPlantingParcel(null); setSelectedCropId(null); setSelectedSeedId(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              Plant on {plantingParcel?.name} ({plantingParcel?.hectares} ha)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.seasonLabel}>
                Season: {currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)}
                {plantingParcel?.soilType ? ` · ${SOIL_ICONS[plantingParcel.soilType]} ${plantingParcel.soilType} soil` : ''}
              </Text>
              {plantingParcel?.soilType && (
                <HelpSheet
                  title="Soil Type"
                  body="Each soil type favours different crops. Loamy soil gives balanced yields, sandy soil suits drought-tolerant crops, clay soil suits root vegetables, and chalky soil suits specialty crops. Matching crop to soil gives up to +20% yield."
                />
              )}
            </View>


            <ScrollView style={styles.cropList} showsVerticalScrollIndicator={false}>
              {CROP_TYPES.map(crop => {
                const isGreenhouse = !!plantingParcel?.greenhouse;
                const inSeason = isGreenhouse || crop.seasons.includes(currentSeason);
                const coopDiscount = cooperative?.member ? 0.90 : 1.0;
                const ha = plantingParcel?.hectares ?? 1;
                const seedCost = crop.seedCost * ha * coopDiscount;
                const canAfford = money >= seedCost;
                const rotation = plantingParcel?.lastCropId !== undefined && plantingParcel.lastCropId !== crop.id;
                const soilMod = getSoilModifier(plantingParcel?.soilType, crop.id);
                const disabled = !inSeason || !canAfford;
                const currentPrice = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
                const estGross = crop.baseYield * ha * soilMod * (rotation ? 1.15 : 1.0) * currentPrice;
                const estProfit = estGross - seedCost;
                return (
                  <TouchableOpacity
                    key={crop.id}
                    style={[
                      styles.cropOption,
                      !inSeason && styles.cropOptionOutOfSeason,
                      inSeason && !canAfford && styles.cropOptionDisabled,
                      selectedCropId === crop.id && { borderColor: '#4fc3f7', borderWidth: 1, backgroundColor: '#0f3460' },
                    ]}
                    disabled={disabled}
                    onPress={() => {
                      setSelectedCropId(crop.id);
                      setSelectedSeedId(null);
                    }}
                  >
                    <View style={styles.cropOptionLeft}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.cropOptionName, !inSeason && { color: '#555' }]}>{crop.name}</Text>
                        {inSeason && rotation && (
                          <View style={styles.rotationBadge}>
                            <Text style={styles.rotationBadgeText}>🔄 +15% yield</Text>
                          </View>
                        )}
                        {inSeason && soilMod !== 1.0 && (
                          <View style={[styles.rotationBadge, { borderColor: soilMod > 1 ? '#ff9800' : '#f44336', backgroundColor: soilMod > 1 ? '#2a1f00' : '#2a0000' }]}>
                            <Text style={[styles.rotationBadgeText, { color: soilMod > 1 ? '#ffb74d' : '#ef9a9a' }]}>
                              {soilMod > 1 ? `🌱 +${Math.round((soilMod - 1) * 100)}% soil` : `⚠️ ${Math.round((soilMod - 1) * 100)}% soil`}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cropOptionDetail}>
                        {inSeason
                          ? `${crop.growthDays}d · ${crop.baseYield} ${crop.unit}/ha`
                          : `🚫 ${crop.seasons.join(', ')} only`}
                      </Text>
                      {inSeason && (
                        <Text style={{ fontSize: 10, color: estProfit >= 0 ? '#4caf50' : '#f44336', marginTop: 1 }}>
                          Est. profit: {estProfit >= 0 ? '+' : ''}${Math.round(estProfit).toLocaleString()}
                        </Text>
                      )}
                    </View>
                    {inSeason && (
                      <Text style={[styles.cropOptionCost, !canAfford && { color: '#f44336' }]}>
                        ${Math.round(seedCost).toLocaleString()}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Rotation advisor */}
            {selectedCropId && plantingParcel && (() => {
              const lastId = plantingParcel.lastCropId;
              const willRotate = lastId !== undefined && lastId !== selectedCropId;
              const noRotate = lastId !== undefined && lastId === selectedCropId;
              if (!lastId) return null; // first planting, no advice needed
              if (willRotate) {
                return (
                  <View style={{ backgroundColor: '#0a2a0a', borderRadius: 8, padding: 10, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#4caf50' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: '#66bb6a', fontSize: 12, fontWeight: 'bold' }}>✅ +15% Rotation Bonus</Text>
                      <HelpSheet
                        title="Crop Rotation"
                        body="Planting a different crop than the previous one gives a +15% yield bonus. Rotating also slows fertility loss over time. Try to avoid planting the same high-drain crop twice in a row."
                      />
                    </View>
                    <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>Different crop from last harvest · you get a yield boost.</Text>
                  </View>
                );
              }
              // Same crop · suggest alternatives
              const lastCrop = CROP_TYPES.find(c => c.id === lastId);
              const alternatives = CROP_TYPES.filter(c =>
                c.id !== lastId &&
                c.seasons.includes(getSeason(day)) &&
                (plantingParcel.greenhouse || c.seasons.includes(getSeason(day)))
              ).slice(0, 3);
              return (
                <View style={{ backgroundColor: '#2a1a00', borderRadius: 8, padding: 10, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#ffb74d' }}>
                  <Text style={{ color: '#ffb74d', fontSize: 12, fontWeight: 'bold' }}>⚠️ No Rotation Bonus</Text>
                  <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>Same as last crop ({lastCrop?.name}). Plant something else for +15% yield.</Text>
                  {alternatives.length > 0 && (
                    <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>
                      Try: {alternatives.map(c => c.name).join(', ')}
                    </Text>
                  )}
                </View>
              );
            })()}

            {/* Profit preview for selected crop */}
            {selectedCropId && plantingParcel && (() => {
              const crop = CROP_TYPES.find(c => c.id === selectedCropId);
              if (!crop) return null;
              const coopDiscount = cooperative?.member ? 0.90 : 1.0;
              const ha = plantingParcel.hectares;
              const rotation = plantingParcel.lastCropId !== undefined && plantingParcel.lastCropId !== selectedCropId;
              const soilMod = getSoilModifier(plantingParcel.soilType, crop.id);
              const baseSeedCost = Math.round(crop.seedCost * ha * coopDiscount);
              const seedCostPrev = baseSeedCost;

              const fertilityMod = 0.5 + (plantingParcel.fertility / 25) * 0.5;
              const weedMod = plantingParcel.hasWeeds ? 0.75 : 1.0;
              const estYield = crop.baseYield * ha * fertilityMod * weedMod * soilMod
                * (rotation ? 1.15 : 1.0)
                * (rotation ? 1.15 : 1.0);
              const currentPrice = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
              const estRevenue = Math.round(estYield * currentPrice);
              const estProfit = estRevenue - seedCostPrev;
              const dailyRate = Math.round(estProfit / crop.growthDays);
              const profitColor = estProfit >= 0 ? '#66bb6a' : '#ef5350';
              const cheapestHerbicide = PRODUCT_TYPES
                .filter(p => p.category === 'herbicide')
                .sort((a, b) => a.cost - b.cost)[0];
              const herbCost = plantingParcel.hasWeeds
                ? Math.round((cheapestHerbicide?.cost ?? 70) * ha)
                : 0;
              const rows: [string, string, string][] = [
                ['Seed cost', `-$${baseSeedCost.toLocaleString()}`, '#ef9a9a'],

                [`Est. yield (${Math.round(estYield).toLocaleString()} ${crop.unit})`, `+$${estRevenue.toLocaleString()}`, '#4caf50'],
                ['Est. profit', `${estProfit >= 0 ? '+' : ''}$${estProfit.toLocaleString()}`, profitColor],
                ['Daily return', `$${dailyRate.toLocaleString()}/day`, dailyRate >= 0 ? '#64b5f6' : '#ef5350'],
                ['Ready in', `${crop.growthDays}d`, C.textMuted],
              ];
              return (
                <View style={{ backgroundColor: '#0d1117', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#1e2a3a' }}>
                  <Text style={{ color: C.text, fontSize: 11, fontWeight: 'bold', marginBottom: 8 }}>📊 {crop.name} · Profit Preview</Text>
                  {rows.map(([label, value, color]) => (
                    <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ color: C.textFaint, fontSize: 11 }}>{label}</Text>
                      <Text style={{ color, fontSize: 11, fontWeight: 'bold' }}>{value}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ color: C.textFaint, fontSize: 11 }}>Fertility after harvest</Text>
                    <Text style={{ color: crop.fertilityDrain === 0 ? '#66bb6a' : crop.fertilityDrain >= 2 ? '#ef5350' : '#ffb74d', fontSize: 11, fontWeight: 'bold' }}>
                      {crop.fertilityDrain === 0 ? '✅ No drain (fixes N₂)' : `⚠️ -${crop.fertilityDrain} pt${crop.fertilityDrain > 1 ? 's' : ''}`}
                    </Text>
                  </View>
                  {herbCost > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ color: C.textFaint, fontSize: 11 }}>⚠️ Herbicide (weeds)</Text>
                      <Text style={{ color: '#ffb74d', fontSize: 11, fontWeight: 'bold' }}>~-${herbCost.toLocaleString()}</Text>
                    </View>
                  )}
                  {herbCost > 0 && (
                    <Text style={{ color: '#665500', fontSize: 9, marginBottom: 2 }}>* Yield shown at −25% weed penalty. Herbicide cost advisory only.</Text>
                  )}
                  <Text style={{ color: '#444', fontSize: 9, marginTop: 6 }}>* Estimate. Actual yield varies with weather, events, and workers.</Text>
                </View>
              );
            })()}

            {/* Seed selection */}
            {(() => {
              const cropId = selectedCropId;
              if (!cropId) return null;
              const availableSeeds = seedVault.filter(s => s.cropId === cropId);
              return (
                <View style={{ marginTop: 10 }}>
                  {availableSeeds.length > 0 && (
                    <>
                      <Text style={{ color: C.textMuted, fontSize: 11, marginBottom: 6 }}>🌱 Seed (optional)</Text>
                      <TouchableOpacity
                        style={{ backgroundColor: !selectedSeedId ? '#0f3460' : C.bgCard, borderRadius: 6, padding: 7, marginBottom: 4, borderWidth: !selectedSeedId ? 1 : 0, borderColor: '#4fc3f7' }}
                        onPress={() => setSelectedSeedId(null)}
                      >
                        <Text style={{ color: !selectedSeedId ? C.text : C.textMuted, fontSize: 11 }}>Base seeds (no bonus)</Text>
                      </TouchableOpacity>
                      {availableSeeds.map(s => (
                        <TouchableOpacity
                          key={s.id}
                          style={{ backgroundColor: selectedSeedId === s.id ? '#0f3460' : C.bgCard, borderRadius: 6, padding: 7, marginBottom: 4, borderWidth: selectedSeedId === s.id ? 1 : 0, borderColor: '#4fc3f7' }}
                          onPress={() => setSelectedSeedId(s.id)}
                        >
                          <Text style={{ color: C.text, fontSize: 11 }}>Gen {s.generation} · Yld {geneGrade(s.genes.yield)} / Drt {geneGrade(s.genes.drought)} / Grw {geneGrade(s.genes.growth)} / Qlt {geneGrade(s.genes.quality)}</Text>
                          <Text style={{ color: C.textMuted, fontSize: 10 }}>{s.quantity} batch{s.quantity !== 1 ? 'es' : ''} available</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.plantBtn, { marginTop: 6 }]}
                    onPress={() => {
                      if (plantingParcel && cropId) {
                        plantCrop(plantingParcel.id, cropId, plantingParcel.hectares);
                        playSound('plant');
                        if (selectedSeedId && plantingParcel) {
                          selectSeedForParcel(plantingParcel.id, selectedSeedId);
                        }
                        setSelectedSeedId(null);
                        setSelectedCropId(null);
                        setPlantingParcel(null);
                        setPlantingParcel(null);
                      }
                    }}
                  >
                    <Text style={styles.btnText}>🌱 Plant</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setPlantingParcel(null); setSelectedCropId(null); setSelectedSeedId(null); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {contractorModal && (
        <ContractorModal
          visible={contractorModal.visible}
          operation={contractorModal.operation}
          parcelCount={contractorModal.parcelIds.length}
          totalHa={contractorModal.totalHa}
          totalCost={contractorModal.totalCost}
          canAfford={money >= contractorModal.totalCost}
          onConfirm={() => {
            hireContractor(contractorModal.operation, contractorModal.parcelIds, contractorModal.cropId);
            setContractorModal(null);
          }}
          onCancel={() => setContractorModal(null)}
        />
      )}

      {/* Map parcel action modal */}
      <Modal visible={!!mapSelected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { setMapSelected(null); setActiveParcelTab('info'); }} />
          <View style={styles.modalBox}>
            {mapSelected && (
              <>
                <View style={styles.mapModalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{mapSelected.name}</Text>
                    <Text style={styles.cardSub}>{mapSelected.hectares} ha · ♦ Fertility {mapSelected.fertility}/25</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setMapSelected(null); setActiveParcelTab('info'); }}>
                    <Text style={{ color: C.textMuted, fontSize: 18 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Sub-tab bar (only for owned parcels) */}
                {mapSelected.owned && (
                  <View style={{ flexDirection: 'row', marginBottom: S.sm, gap: S.xs }}>
                    {([
                      { id: 'info' as const, label: '📋 Info' },
                      { id: 'soil' as const, label: '🌱 Soil' },
                      { id: 'water' as const, label: '💧 Water' },
                      { id: 'mgmt' as const, label: '⚙️ Mgmt' },
                    ]).map(tab => (
                      <TouchableOpacity
                        key={tab.id}
                        style={{
                          flex: 1,
                          backgroundColor: activeParcelTab === tab.id ? '#1565c0' : C.bgCard,
                          borderRadius: R.md,
                          paddingVertical: 6,
                          alignItems: 'center',
                        }}
                        onPress={() => setActiveParcelTab(tab.id)}
                      >
                        <Text style={{ color: activeParcelTab === tab.id ? C.white : C.textMuted, fontSize: F.size.sm, fontWeight: 'bold' }}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Info tab content (default) */}
                {activeParcelTab === 'info' && (
                  <>
                    {!mapSelected.owned ? (
                      <>
                        <Text style={styles.mapModalPrice}>${(mapSelected.pricePerHa * mapSelected.hectares).toLocaleString()}</Text>
                        <TouchableOpacity
                          style={[styles.harvestBtn, money < mapSelected.pricePerHa * mapSelected.hectares && styles.btnDisabled]}
                          onPress={() => { buyParcel(mapSelected.id); setMapSelected(null); setActiveParcelTab('info'); }}
                          disabled={money < mapSelected.pricePerHa * mapSelected.hectares}
                        >
                          <Text style={styles.btnText}>Buy</Text>
                        </TouchableOpacity>
                      </>
                    ) : mapSelected.plantedCrop ? (
                      <>
                        <Text style={styles.cropTag}>
                          {CROP_ICONS[mapSelected.plantedCrop.cropId] ?? '🌱'} {mapSelectedCropType?.name ?? mapSelected.plantedCrop.cropId}
                          {(mapSelected.plantedCrop.appliedN ?? 1.0) > 1.0 ? ' ?' : ''}
                        </Text>
                        {mapSelectedReady ? (
                          <TouchableOpacity
                            style={[styles.harvestBtn, totalInventory >= siloCapacity && styles.btnDisabled]}
                            onPress={() => { harvestCrop(mapSelected.id); setMapSelected(null); setActiveParcelTab('info'); }}
                            disabled={totalInventory >= siloCapacity}
                          >
                            <Text style={styles.btnText}>{totalInventory >= siloCapacity ? '📦 Silo full' : '🌾 Harvest'}</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.daysLeft}>⏳ {mapSelectedDays}d left</Text>
                        )}
                        {(mapSelected.plantedCrop.appliedN ?? 1.0) <= 1.0 && mapSelectedFertilizer && (
                          <TouchableOpacity style={styles.fertilizeBtn} onPress={() => { fertilizeCrop(mapSelected.id, fertilizerIds[0]); }}>
                            <Text style={styles.smallBtnText}>✨ Fertilize (1 dose)</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <TouchableOpacity style={styles.plantBtn} onPress={() => { setMapSelected(null); setPlantingParcel(mapSelected); setActiveParcelTab('info'); }}>
                        <Text style={styles.btnText}>🌱 Plant</Text>
                      </TouchableOpacity>
                    )}

                    {mapSelected.owned && mapSelected.hasWeeds && (
                      <View style={styles.weedRow}>
                        <Text style={styles.weedTag}>⚠️ Weeds</Text>
                        {mapSelectedHerbicide ? (
                          <TouchableOpacity style={styles.resolveBtn} onPress={() => { clearWeeds(mapSelected.id); setMapSelected(p => p ? { ...p, hasWeeds: false } : p); }}>
                            <Text style={styles.resolveBtnText}>Clear</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.noProductText}>No herbicide</Text>
                        )}
                      </View>
                    )}

                    {mapSelectedEvent && (
                      <View style={styles.eventAlert}>
                        <Text style={styles.eventText}>
                          {mapSelectedEvent.type === 'disease' ? '🍄 Disease' : '🐛 Pest'}
                        </Text>
                        {(mapSelectedEvent.type === 'disease' ? fungicideIds : insecticideIds).slice(0, 1).map(pid => (
                          <TouchableOpacity key={pid} style={styles.resolveBtn} onPress={() => { resolveFieldEvent(mapSelectedEvent.id, pid); setMapSelected(null); setActiveParcelTab('info'); }}>
                            <Text style={styles.resolveBtnText}>Treat (1 unit)</Text>
                          </TouchableOpacity>
                        ))}
                        {(mapSelectedEvent.type === 'disease' ? fungicideIds : insecticideIds).length === 0 && (
                          <Text style={styles.noProductText}>No {mapSelectedEvent.type === 'disease' ? 'fungicide' : 'insecticide'}</Text>
                        )}
                      </View>
                    )}

                    {/* Pests section */}
                    {mapSelected.owned && (
                      <View style={{ marginTop: S.sm }}>
                        {!mapSelected.pestState?.detectedDay ? (
                          <Text style={{ color: '#555', fontSize: 11 }}>No active infestation</Text>
                        ) : (
                          <View style={{ backgroundColor: '#2a0a00', borderRadius: R.sm, padding: S.sm }}>
                            <Text style={{ color: '#ff8a65', fontSize: F.size.sm, fontWeight: 'bold', marginBottom: S.xs }}>
                              {'\ud83d\udc1b'} {PEST_CONFIG[mapSelected.pestState.type].label}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: S.xs }}>
                              <Text style={{ color: C.textMuted, fontSize: 11, marginRight: 8 }}>Severity</Text>
                              <View style={{ flex: 1, height: 8, backgroundColor: C.bgCard, borderRadius: 4 }}>
                                <View style={{
                                  width: `${Math.min(10, mapSelected.pestState.severity) * 10}%` as any,
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: mapSelected.pestState.severity <= 5 ? '#ffa726' : mapSelected.pestState.severity <= 8 ? '#ef5350' : '#b71c1c',
                                }} />
                              </View>
                              <Text style={{ color: C.textMuted, fontSize: 11, marginLeft: 8 }}>{mapSelected.pestState.severity.toFixed(1)}/10</Text>
                            </View>
                            {(() => {
                              const treatmentCategory = PEST_CONFIG[mapSelected.pestState.type].treatment;
                              const available = PRODUCT_TYPES.filter(p => p.category === treatmentCategory && (productInventory[p.id] ?? 0) > 0);
                              return available.length > 0 ? (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                  {available.map(prod => (
                                    <TouchableOpacity
                                      key={prod.id}
                                      style={[styles.resolveBtn, { minHeight: 44, justifyContent: 'center' }]}
                                      onPress={() => { treatPest(mapSelected.id, prod.id); setMapSelected(p => p ? { ...p, pestState: undefined } : p); }}
                                    >
                                      <Text style={styles.resolveBtnText}>{prod.name} (1 unit)</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              ) : (
                                <Text style={styles.noProductText}>No {treatmentCategory} available</Text>
                              );
                            })()}
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}

                {/* Soil tab content */}
                {activeParcelTab === 'soil' && mapSelected.owned && (
                  <SoilTab
                    parcel={mapSelected}
                    onAmendment={(type) => applySoilAmendment(mapSelected.id, type)}
                    onCoverCrop={(cropId) => {
                      plantCoverCrop(mapSelected.id, cropId);
                    }}
                  />
                )}

                {/* Water tab content */}
                {activeParcelTab === 'water' && mapSelected.owned && (
                  <WaterParcelSection parcel={mapSelected} />
                )}

                {/* Management tab content */}
                {activeParcelTab === 'mgmt' && mapSelected.owned && (
                  <ManagementTab parcel={mapSelected} onClose={() => setMapSelected(null)} />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: S.lg },
  viewToggle: { backgroundColor: C.bgCard, borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 5 },
  viewToggleText: { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },

  // Map view
  mapLegend: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: S.md, marginBottom: S.sm, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { color: C.textMuted, fontSize: F.size.xs },

  mapModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  mapModalPrice: { color: '#64b5f6', fontSize: F.size.xxl, fontWeight: 'bold', marginBottom: 10 },
  sectionLabel: { color: C.textMuted, fontSize: F.size.md, paddingHorizontal: S.lg, marginTop: S.sm, marginBottom: S.xs },
  hScroll: { paddingHorizontal: S.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: S.sm },
  empty: { color: '#555', padding: S.lg },

  eventsBanner: { backgroundColor: '#7f2020', paddingVertical: S.sm, paddingHorizontal: S.lg, marginHorizontal: S.md, borderRadius: R.md, marginBottom: S.xs },
  eventsBannerText: { color: '#ffcdd2', fontWeight: 'bold', fontSize: F.size.md },

  card: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, margin: 6, width: 160 },
  marketCard: { width: '45%' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.xs },
  cardTitle: { color: C.text, fontWeight: 'bold', fontSize: 15 },
  fertility: { color: C.textMuted, fontSize: F.size.sm },
  soilBadge: { color: C.textMuted, fontSize: F.size.xs, marginTop: 2 },
  badge: { fontSize: 10, fontWeight: '600', backgroundColor: '#1a1a2e', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  cropTag: { color: C.textDim, fontSize: F.size.sm, marginTop: 2 },
  emptyTag: { color: '#555', fontSize: F.size.sm, marginTop: 2 },
  frostWarning: {
    backgroundColor: '#1a1a3a',
    borderRadius: R.xs,
    paddingHorizontal: S.xs,
    paddingVertical: 2,
    marginTop: 2,
    borderWidth: 1,
    borderColor: C.blue,
  },
  frostWarningText: {
    fontSize: F.size.xs,
    color: '#90caf9',
  },
  weedTag: { color: '#ffb74d', fontSize: 11, marginTop: 3 },
  daysLeft: { color: C.textMuted, fontSize: 11, marginTop: S.xs },
  priceTag: { color: '#64b5f6', fontSize: F.size.md, fontWeight: 'bold', marginTop: 2, marginBottom: S.xs },

  harvestBtn: { backgroundColor: C.greenDark, borderRadius: R.sm, padding: 6, marginTop: 6, alignItems: 'center' },
  plantBtn: { backgroundColor: '#1565c0', borderRadius: R.sm, padding: 6, marginTop: 6, alignItems: 'center' },
  buyBtn: { backgroundColor: C.greenDark, borderRadius: R.sm, padding: 6, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#333' },
  btnText: { color: C.white, fontSize: F.size.sm, fontWeight: 'bold' },

  eventAlert: { backgroundColor: '#4a1515', borderRadius: R.sm, padding: S.sm, marginTop: 6 },
  eventText: { color: '#ffcdd2', fontSize: F.size.sm, fontWeight: 'bold', marginBottom: S.xs },
  resolveBtn: { backgroundColor: C.redDark, borderRadius: 5, padding: 5, alignItems: 'center' },
  resolveBtnText: { color: C.white, fontSize: 11, fontWeight: 'bold' },
  noProductText: { color: '#ef9a9a', fontSize: 11 },
  fertilizeBtn: { backgroundColor: '#1565c0', borderRadius: R.sm, padding: 5, marginTop: S.xs, alignItems: 'center' },
  weedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.xs },
  smallBtnText: { color: C.white, fontSize: 11, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: C.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { color: C.text, fontWeight: 'bold', fontSize: 17, marginBottom: S.md },
  fertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  fertLabel: { color: C.textMuted, fontSize: F.size.sm, flex: 1, marginRight: S.sm },
  fertToggle: { backgroundColor: '#333', borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 6 },
  fertToggleOn: { backgroundColor: '#1565c0' },
  fertToggleText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  cropList: { maxHeight: 320 },
  cropOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider },
  cropOptionDisabled: { opacity: 0.4 },
  cropOptionOutOfSeason: { opacity: 0.35, borderColor: '#333' },
  seasonLabel: { color: C.textMuted, fontSize: F.size.sm, marginBottom: 6, fontStyle: 'italic' },
  cropOptionLeft: { flex: 1 },
  cropOptionName: { color: C.text, fontWeight: 'bold', fontSize: F.size.lg },
  cropOptionDetail: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  cropOptionCost: { color: C.green, fontWeight: 'bold', fontSize: F.size.lg },
  rotationBadge: { backgroundColor: C.bgElevated, borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#4caf50' },
  rotationBadgeText: { color: C.textDim, fontSize: F.size.xs, fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#333', borderRadius: 10, padding: S.md, alignItems: 'center', marginTop: S.md },
  cancelBtnText: { color: C.textMuted, fontWeight: 'bold', fontSize: F.size.lg },

  // Filters
  filterBar: { paddingHorizontal: S.sm, marginBottom: S.xs },
  filterChip: { backgroundColor: C.bgCard, borderRadius: R.xl, paddingHorizontal: S.md, paddingVertical: 5, marginRight: 6, marginVertical: S.xs },
  filterChipActive: { backgroundColor: C.bgElevated },
  filterChipText: { color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold' },
  filterChipTextActive: { color: C.text },

  // Batch harvest
  batchHarvestBtn: { backgroundColor: C.greenDark, borderRadius: R.md, marginHorizontal: S.md, marginBottom: 6, padding: 10, alignItems: 'center' },
  batchHarvestText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },

  // Greenhouse
  ghRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.xs },
  ghBadge: { color: C.textDim, fontSize: 11, fontWeight: 'bold' },
  ghRemove: { color: '#ef9a9a', fontSize: 11 },
  ghInstallBtn: { backgroundColor: '#1b3a20', borderRadius: R.sm, padding: 5, marginTop: S.xs, alignItems: 'center' },
  cardSub: { color: C.textMuted, fontSize: 11, marginTop: 1 },
  // Irrigation
  irrigatedBadge: { color: '#4fc3f7', fontSize: 11, fontWeight: 'bold', marginTop: S.xs },
  irrigateBtn: { backgroundColor: '#0d2840', borderRadius: R.sm, padding: 5, marginTop: S.xs, alignItems: 'center' },

  // Map selection panel
  mapPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.bgDeep,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: S.lg,
    maxHeight: 200,
  },
  mapPanelHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  mapPanelTitle:     { color: C.text, fontWeight: 'bold', fontSize: 15 },
  mapPanelSub:       { color: C.textMuted, fontSize: 11, marginTop: 2 },
  mapPanelClose:     { padding: S.xs },
  mapPanelCloseText: { color: C.textFaint, fontSize: F.size.xl, fontWeight: 'bold' },

  mapPanelActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mapActionRow:    { flexDirection: 'row', gap: 8, flex: 1, flexWrap: 'wrap' },
  mapActionBtn:    { flex: 1, borderRadius: 10, padding: 11, alignItems: 'center', minWidth: 100 },
  mapActionDisabled: { opacity: 0.45 },
  mapActionBuy:    { backgroundColor: '#1565c0' },
  mapActionPlant:  { backgroundColor: '#1b5e20' },
  mapActionHarvest:{ backgroundColor: C.greenDark },
  mapActionText:   { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  mapActionAlert:  { flex: 1, backgroundColor: '#3a1200', borderRadius: 10, padding: 11, alignItems: 'center' },
  mapActionAlertText: { color: '#ffb74d', fontSize: F.size.sm, fontWeight: 'bold', textAlign: 'center' },
  mapActionInfo:   { flex: 1, backgroundColor: '#1a2744', borderRadius: 10, padding: 11, alignItems: 'center' },
  mapActionInfoText: { color: C.textDim, fontSize: F.size.md, fontWeight: 'bold' },

  // World Map button
  worldMapBtn: {
    backgroundColor: '#0e1e2a',
    borderWidth: 1,
    borderColor: '#1e4060',
    borderRadius: R.md,
    paddingVertical: 10,
    paddingHorizontal: S.lg,
    marginHorizontal: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  worldMapBtnText: {
    color: '#4a8ab0',
    fontSize: F.size.lg,
    fontWeight: '600',
  },
});

const localStyles = StyleSheet.create({
  opBtn:          { backgroundColor: '#0f3460', borderRadius: R.md, padding: S.sm, alignItems: 'center', marginTop: S.sm },
  opBtnYellow:    { backgroundColor: '#e65100' },
  opBtnRed:       { backgroundColor: C.redDark },
  opBtnText:      { color: C.white, fontSize: F.size.sm, fontWeight: 'bold' },
  progressRow:    { backgroundColor: C.bg, borderRadius: R.md, padding: S.sm, marginTop: S.sm },
  progressText:   { color: '#ffb74d', fontSize: F.size.sm, textAlign: 'center' },
  batchPlantBtn:  { backgroundColor: '#1a3a1a', borderRadius: R.md, padding: 10, alignItems: 'center', marginHorizontal: S.md, marginTop: 6 },
  batchPlantText: { color: '#66bb6a', fontSize: F.size.md, fontWeight: 'bold' },
  batchBox:       { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginHorizontal: S.md, marginTop: 6 },
  batchTitle:     { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
  batchChip:      { backgroundColor: '#0d1a2e', borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, borderWidth: 1, borderColor: '#2a3a5e' },
  batchChipActive:{ backgroundColor: '#1a3a1a', borderColor: '#66bb6a' },
  batchChipText:  { color: C.textMuted, fontSize: 11 },
  batchCancel:    { justifyContent: 'center', paddingHorizontal: S.md },
  screenTitle: {
    color: C.text,
    fontSize: F.size.xxl,
    fontWeight: F.weight.heavy,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
});
