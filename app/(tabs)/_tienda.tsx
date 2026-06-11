import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import SubTabBar from '../../components/SubTabBar';
import GuideButton from '../../components/GuideButton';
import { CROP_TYPES, CropTier } from '../../data/cropTypes';
import { PRODUCT_TYPES, CATEGORY_LABELS, ProductCategory } from '../../data/productTypes';
import { BUILDING_TYPES, BUILDING_CATEGORY_LABELS, BuildingCategory, PRODUCTION_EQUIPMENT } from '../../data/buildingTypes';
import { MACHINE_TYPES } from '../../data/machineTypes';
import { ATTACHMENT_TYPES } from '../../data/attachmentTypes';
import { GUIDE_ENTRY_IDS } from '../../data/guideEntries';
import { isHistoricallyUnlocked } from '../../engine/timeline';

type ShopTab = 'seeds' | 'products' | 'buildings' | 'machinery';

const TIER_COLORS: Record<CropTier, string> = {
  D: C.textMuted, C: C.green, B: C.blue, A: C.purple, S: C.orange,
};

const PRODUCT_CATEGORY_ORDER: ProductCategory[] = [
  'fertilizer_solid', 'fertilizer_liquid', 'herbicide', 'fungicide', 'insecticide',
];

const BUILDING_CATEGORY_ORDER: BuildingCategory[] = ['animal', 'production', 'silo', 'industrial', 'lab', 'upgrade'];

// ── Seeds Tab ───────────────────────────────────────────────────────────────
function SeedsTab() {
  const { money, parcels, plantCrop } = useGameStore();
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const ownedEmpty = parcels.filter(p => p.owned && !p.plantedCrop);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={CROP_TYPES}
        keyExtractor={c => c.id}
        numColumns={2}
        style={[styles.list, { flex: 1 }]}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.seedCard, { borderLeftColor: TIER_COLORS[item.tier] }, selectedCrop === item.id && styles.cardSelected]}
            onPress={() => setSelectedCrop(item.id === selectedCrop ? null : item.id)}
          >
            <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.tier] }]}>
              <Text style={styles.tierText}>{item.tier}</Text>
            </View>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cropName}>{item.name}</Text>
              <GuideButton entryId={GUIDE_ENTRY_IDS.crop(item.id)} compact />
            </View>
            <Text style={styles.detail}>🌱 {item.growthDays}d · {item.baseYield} {item.unit}/ha</Text>
            <Text style={styles.detail}>💰 ${item.basePrice}/{item.unit}</Text>
            <Text style={styles.detail}>🛒 ${item.seedCost.toLocaleString()}/ha</Text>
            <Text style={styles.detail}>💧 {'●'.repeat(item.waterNeed)}{'○'.repeat(5 - item.waterNeed)}</Text>
          </TouchableOpacity>
        )}
      />
      {selectedCrop && (
        <View style={styles.plantPanel}>
          <Text style={styles.plantTitle}>
            Plant {CROP_TYPES.find(c => c.id === selectedCrop)?.name} on plot:
          </Text>
          {ownedEmpty.length === 0 ? (
            <Text style={styles.noParcel}>No empty plots</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ownedEmpty.map(p => {
                const crop = CROP_TYPES.find(c => c.id === selectedCrop)!;
                const cost = crop.seedCost * p.hectares;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.parcelBtn, money < cost && styles.btnDisabled]}
                    onPress={() => { plantCrop(p.id, selectedCrop, p.hectares); setSelectedCrop(null); }}
                    disabled={money < cost}
                  >
                    <Text style={styles.parcelBtnText}>{p.hectares} ha</Text>
                    <Text style={styles.parcelBtnCost}>${cost.toLocaleString()}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

// ── Products Tab ────────────────────────────────────────────────────────────
function ProductsTab() {
  const { money, productInventory, buyProduct } = useGameStore();
  const timeline = useGameStore(s => s.timeline);

  return (
    <ScrollView style={[styles.list, { flex: 1 }]} contentContainerStyle={{ paddingBottom: 20 }}>
      {PRODUCT_CATEGORY_ORDER.map(cat => {
        const items = PRODUCT_TYPES.filter(p => p.category === cat && (!p.unlockId || isHistoricallyUnlocked(timeline, p.unlockId)));
        return (
          <View key={cat} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{CATEGORY_LABELS[cat]}</Text>
            {items.map(product => {
              const owned = productInventory[product.id] ?? 0;
              const canAfford = money >= product.packCost;
              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productEffect}>{product.effectLabel}</Text>
                    <Text style={styles.productPack}>
                      Pack {product.packSize} doses · ${product.packCost.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.productRight}>
                    {owned > 0 && (
                      <Text style={styles.ownedCount}>{owned} doses</Text>
                    )}
                    <TouchableOpacity
                      style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
                      onPress={() => buyProduct(product.id)}
                      disabled={!canAfford}
                    >
                      <Text style={styles.buyBtnText}>Buy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Buildings Tab ───────────────────────────────────────────────────────────
function BuildingsTab() {
  const { money, buildings, buyBuilding, purchaseProductionBuilding, productionBuildings, installEquipment } = useGameStore();
  const timeline = useGameStore(s => s.timeline);

  const ownedProductionSpecies = new Set(
    (productionBuildings ?? []).map(pb => pb.animalTypeId)
  );

  const handleBuyBuilding = (buildingId: string) => {
    const bt = BUILDING_TYPES.find(b => b.id === buildingId);
    if (bt?.category === 'production' && bt.animalTypeId) {
      // Species-specific production buildings → production building state
      purchaseProductionBuilding(buildingId);
    } else {
      // All other buildings (including vet/breeding/infrastructure) → generic buildings[]
      buyBuilding(buildingId);
    }
  };

  return (
    <ScrollView style={[styles.list, { flex: 1 }]} contentContainerStyle={{ paddingBottom: 20 }}>
      {BUILDING_CATEGORY_ORDER.map(cat => {
        const items = BUILDING_TYPES.filter(b => b.category === cat && (!b.unlockId || isHistoricallyUnlocked(timeline, b.unlockId)));
        return (
          <View key={cat} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{BUILDING_CATEGORY_LABELS[cat]}</Text>
            <View style={styles.buildingGrid}>
              {items.map(building => {
                const bt = BUILDING_TYPES.find(b => b.id === building.id);
                const ownedCount = buildings.filter(id => id === building.id).length;
                const canAfford = money >= building.cost;
                const alreadyOwned =
                  (bt?.category === 'production' && !!bt.animalTypeId && ownedProductionSpecies.has(bt.animalTypeId)) ||
                  (bt?.category === 'production' && !bt.animalTypeId && (buildings ?? []).includes(building.id));
                return (
                  <View key={building.id} style={styles.buildingCard}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.buildingName}>{building.name}</Text>
                      <GuideButton entryId={GUIDE_ENTRY_IDS.building(building.id)} compact />
                    </View>
                    {building.capacity && (
                      <Text style={styles.buildingCapacity}>
                        {cat === 'animal'
                          ? `👥 Cap. ${building.capacity}`
                          : `📦 ${(building.capacity / 1000).toFixed(0)}k kg/L`}
                      </Text>
                    )}
                    <Text style={styles.buildingEffect}>{building.effectLabel}</Text>
                    <Text style={styles.buildingMaint}>
                      🔧 ${building.maintenancePerDay}/day
                    </Text>
                    <View style={styles.buildingFooter}>
                      {ownedCount > 0 && (
                        <Text style={styles.ownedBadge}>✓ ×{ownedCount}</Text>
                      )}
                      {alreadyOwned ? (
                        <Text style={[styles.buildBtnText, { color: C.green }]}>Owned</Text>
                      ) : (
                        <TouchableOpacity
                          style={[styles.buildBtn, !canAfford && styles.buildBtnDisabled]}
                          onPress={() => handleBuyBuilding(building.id)}
                          disabled={!canAfford}
                        >
                          <Text style={styles.buildBtnText}>
                            ${building.cost.toLocaleString()}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
            {/* Equipment for owned production buildings */}
            {cat === 'production' && (productionBuildings ?? []).length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>
                  Building Equipment
                </Text>
                {PRODUCTION_EQUIPMENT.map(eq => {
                  // Find if the player owns a building this equipment fits
                  const fitsOwnedBuilding = (productionBuildings ?? []).find(pb =>
                    eq.applicableBuildingPrefixes.some(prefix => pb.buildingTypeId.startsWith(prefix))
                  );
                  if (!fitsOwnedBuilding) return null;
                  const alreadyInstalled = fitsOwnedBuilding.equipmentSlots.includes(eq.id);
                  const bt2 = BUILDING_TYPES.find(b => b.id === fitsOwnedBuilding.buildingTypeId);
                  const maxSlots = bt2?.equipmentSlotCount ?? 2;
                  const slotsFull = fitsOwnedBuilding.equipmentSlots.length >= maxSlots;
                  const canAffordEq = money >= eq.cost;
                  return (
                    <View key={eq.id} style={{ backgroundColor: C.bgDeep, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                      <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 13 }}>{eq.name}</Text>
                      <Text style={{ color: C.textMuted, fontSize: 11, marginVertical: 4 }}>{eq.effectLabel}</Text>
                      <Text style={{ color: C.textMuted, fontSize: 11, marginBottom: 8 }}>
                        For: {bt2?.name ?? fitsOwnedBuilding.buildingTypeId}
                      </Text>
                      {alreadyInstalled ? (
                        <Text style={{ color: C.green, fontSize: 12 }}>✓ Installed</Text>
                      ) : slotsFull ? (
                        <Text style={{ color: C.textMuted, fontSize: 12 }}>All equipment slots full</Text>
                      ) : (
                        <TouchableOpacity
                          style={{ backgroundColor: canAffordEq ? C.bgElevated : C.bgCard, borderRadius: 6, padding: 8, alignItems: 'center' }}
                          onPress={() => installEquipment(fitsOwnedBuilding.id, eq.id)}
                          disabled={!canAffordEq}
                        >
                          <Text style={{ color: canAffordEq ? C.blue : C.textFaint, fontSize: 13 }}>
                            Install · ${eq.cost.toLocaleString()}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
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

// ── Machinery Tab ────────────────────────────────────────────────────────────
function MachineryTab() {
  const { money, machines, attachments, trailers, buyMachine, buyAttachment, buyTrailer } = useGameStore();
  const timeline = useGameStore(s => s.timeline);
  const [section, setSection] = useState<'tractors' | 'combines' | 'trucks' | 'attachments'>('tractors');
  const [comparing, setComparing] = useState<string[]>([]);

  function toggleCompare(id: string) {
    setComparing(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const tractors    = MACHINE_TYPES.filter(m => m.category === 'tractor' && (!m.unlockId || isHistoricallyUnlocked(timeline, m.unlockId)));
  const combines    = MACHINE_TYPES.filter(m => m.category === 'harvester' && (!m.unlockId || isHistoricallyUnlocked(timeline, m.unlockId)));
  const trucks      = MACHINE_TYPES.filter(m => m.category === 'truck' && (!m.unlockId || isHistoricallyUnlocked(timeline, m.unlockId)));
  const trailerTypes = MACHINE_TYPES.filter(m => m.category === 'trailer' && (!m.unlockId || isHistoricallyUnlocked(timeline, m.unlockId)));
  const irrigTypes  = MACHINE_TYPES.filter(m => m.category === 'irrigation' && (!m.unlockId || isHistoricallyUnlocked(timeline, m.unlockId)));

  const ownedCount = (typeId: string) =>
    [...(machines ?? []), ...(trailers ?? [])].filter(m => m.typeId === typeId).length;
  const ownedAttachCount = (typeId: string) =>
    (attachments ?? []).filter((a: { typeId: string }) => a.typeId === typeId).length;

  const SECTION_LABELS = [
    { key: 'tractors', label: '🚜 Tractors' },
    { key: 'combines', label: '🌾 Combines' },
    { key: 'trucks',   label: '🚛 Trucks' },
    { key: 'attachments', label: '⚙️ Attachments' },
  ] as const;

  const renderMachineCard = (m: (typeof MACHINE_TYPES)[0], onBuy: () => void, owned: number) => {
    const inCompare = comparing.includes(m.id);
    return (
      <View key={m.id} style={[mStyles.card, inCompare && { borderColor: '#64b5f6', borderWidth: 2 }]}>
        <View style={mStyles.cardHeader}>
          <Text style={mStyles.cardName}>{m.name}</Text>
          <GuideButton entryId={GUIDE_ENTRY_IDS.machine(m.id)} compact />
          {owned > 0 && <Text style={mStyles.ownedPill}>Owned: {owned}</Text>}
        </View>
        <Text style={mStyles.cardDetail}>💰 ${m.cost.toLocaleString()}</Text>
        <Text style={mStyles.cardDetail}>🔧 ${m.maintenancePerDay}/day maintenance</Text>
        {m.haPerDay !== undefined && <Text style={mStyles.cardDetail}>⚡ {m.haPerDay} ha/day</Text>}
        {m.capacityKg !== undefined && (
          <Text style={mStyles.cardDetail}>
            📦 {m.capacityKg === 0 ? 'Needs trailer' : `${m.capacityKg.toLocaleString()} kg`}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            style={[mStyles.buyBtn, { flex: 1 }, money < m.cost && mStyles.buyBtnDisabled]}
            onPress={onBuy}
            disabled={money < m.cost}
          >
            <Text style={mStyles.buyBtnText}>{money < m.cost ? "Can't afford" : 'Buy'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[mStyles.buyBtn, { flex: 0, paddingHorizontal: 10, backgroundColor: inCompare ? '#0d2a3a' : '#1a2a1a', borderWidth: 1, borderColor: inCompare ? '#64b5f6' : '#2a3a2a' }]}
            onPress={() => toggleCompare(m.id)}
          >
            <Text style={{ color: inCompare ? '#64b5f6' : '#aaa', fontSize: 11 }}>{inCompare ? '✓ vs' : 'vs'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAttachCard = (a: (typeof ATTACHMENT_TYPES)[0]) => (
    <View key={a.id} style={mStyles.card}>
      <View style={mStyles.cardHeader}>
        <Text style={mStyles.cardName}>{a.name}</Text>
        <GuideButton entryId="system_machinery_transport" compact />
        {ownedAttachCount(a.id) > 0 && <Text style={mStyles.ownedPill}>Owned: {ownedAttachCount(a.id)}</Text>}
      </View>
      <Text style={mStyles.cardDetail}>💰 ${a.cost.toLocaleString()}</Text>
      <Text style={mStyles.cardDetail}>⚡ {a.haPerDay} ha/day</Text>
      <Text style={mStyles.cardDetail}>🔧 {a.operation.charAt(0).toUpperCase() + a.operation.slice(1)}</Text>
      <Text style={mStyles.cardDetail}>Fits: {a.compatibleTractorSizes.join(', ')} tractors</Text>
      <TouchableOpacity
        style={[mStyles.buyBtn, money < a.cost && mStyles.buyBtnDisabled]}
        onPress={() => buyAttachment(a.id)}
        disabled={money < a.cost}
      >
        <Text style={mStyles.buyBtnText}>{money < a.cost ? "Can't afford" : 'Buy'}</Text>
      </TouchableOpacity>
    </View>
  );

  let listData: React.ReactNode;
  if (section === 'tractors') {
    listData = (
      <ScrollView>
        <Text style={mStyles.sectionHeader}>Tractors</Text>
        {tractors.map(m => renderMachineCard(m, () => buyMachine(m.id), ownedCount(m.id)))}
        <Text style={mStyles.sectionHeader}>Irrigation Systems</Text>
        {irrigTypes.map(m => renderMachineCard(m, () => buyMachine(m.id), ownedCount(m.id)))}
      </ScrollView>
    );
  } else if (section === 'combines') {
    listData = (
      <ScrollView>
        <Text style={mStyles.sectionHeader}>Combine Harvesters</Text>
        {combines.map(m => renderMachineCard(m, () => buyMachine(m.id), ownedCount(m.id)))}
      </ScrollView>
    );
  } else if (section === 'trucks') {
    listData = (
      <ScrollView>
        <Text style={mStyles.sectionHeader}>Vehicles</Text>
        {trucks.map(m => renderMachineCard(m, () => buyMachine(m.id), ownedCount(m.id)))}
        <Text style={mStyles.sectionHeader}>Trailers</Text>
        {trailerTypes.map(m => renderMachineCard(m, () => buyTrailer(m.id), ownedCount(m.id)))}
      </ScrollView>
    );
  } else {
    listData = (
      <ScrollView>
        {ATTACHMENT_TYPES.map(renderAttachCard)}
      </ScrollView>
    );
  }

  const comparePanel = comparing.length >= 2 ? (() => {
    const [idA, idB] = comparing;
    const mA = MACHINE_TYPES.find(m => m.id === idA);
    const mB = MACHINE_TYPES.find(m => m.id === idB);
    if (!mA || !mB) return null;

    type Row = { label: string; a: string; b: string; winner?: 'a' | 'b' | 'tie' };
    const rows: Row[] = [
      { label: 'Cost', a: `$${mA.cost.toLocaleString()}`, b: `$${mB.cost.toLocaleString()}`, winner: mA.cost < mB.cost ? 'a' : mB.cost < mA.cost ? 'b' : 'tie' },
      { label: 'Maintenance', a: `$${mA.maintenancePerDay}/d`, b: `$${mB.maintenancePerDay}/d`, winner: mA.maintenancePerDay < mB.maintenancePerDay ? 'a' : mB.maintenancePerDay < mA.maintenancePerDay ? 'b' : 'tie' },
    ];
    if (mA.haPerDay != null || mB.haPerDay != null) {
      const haA = mA.haPerDay ?? 0;
      const haB = mB.haPerDay ?? 0;
      rows.push({ label: 'Ha/day', a: haA > 0 ? `${haA}` : '—', b: haB > 0 ? `${haB}` : '—', winner: haA > haB ? 'a' : haB > haA ? 'b' : 'tie' });
      if (haA > 0 && haB > 0) {
        const effA = (haA / (mA.cost / 1000)).toFixed(2);
        const effB = (haB / (mB.cost / 1000)).toFixed(2);
        rows.push({ label: 'ha per $1k', a: effA, b: effB, winner: parseFloat(effA) > parseFloat(effB) ? 'a' : parseFloat(effB) > parseFloat(effA) ? 'b' : 'tie' });
      }
    }
    if (mA.capacityKg != null || mB.capacityKg != null) {
      const capA = mA.capacityKg ?? 0;
      const capB = mB.capacityKg ?? 0;
      rows.push({ label: 'Capacity', a: capA === 0 ? 'Needs trailer' : `${capA.toLocaleString()} kg`, b: capB === 0 ? 'Needs trailer' : `${capB.toLocaleString()} kg` });
    }

    return (
      <View style={{ backgroundColor: '#0d1a2e', borderRadius: 12, margin: 10, padding: 12, borderWidth: 1, borderColor: '#64b5f644' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#64b5f6', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 }}>⚖ COMPARISON</Text>
          <TouchableOpacity onPress={() => setComparing([])}>
            <Text style={{ color: '#555', fontSize: 11 }}>Clear ×</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          <View style={{ width: 90 }} />
          <Text style={{ flex: 1, color: C.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>{mA.name}</Text>
          <Text style={{ flex: 1, color: C.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>{mB.name}</Text>
        </View>
        {rows.map(row => (
          <View key={row.label} style={{ flexDirection: 'row', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#1a2a3a' }}>
            <Text style={{ width: 90, color: C.textMuted, fontSize: 11 }}>{row.label}</Text>
            <Text style={{ flex: 1, color: row.winner === 'a' ? '#4caf50' : C.text, fontSize: 11, textAlign: 'center', fontWeight: row.winner === 'a' ? 'bold' : 'normal' }}>
              {row.a}{row.winner === 'a' ? ' ✓' : ''}
            </Text>
            <Text style={{ flex: 1, color: row.winner === 'b' ? '#4caf50' : C.text, fontSize: 11, textAlign: 'center', fontWeight: row.winner === 'b' ? 'bold' : 'normal' }}>
              {row.b}{row.winner === 'b' ? ' ✓' : ''}
            </Text>
          </View>
        ))}
      </View>
    );
  })() : comparing.length === 1 ? (
    <View style={{ backgroundColor: '#0d1a2e', borderRadius: 10, margin: 10, padding: 10, borderWidth: 1, borderColor: '#64b5f622' }}>
      <Text style={{ color: '#64b5f6', fontSize: 11 }}>⚖ Select one more machine to compare</Text>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={mStyles.sectionBar}>
        {SECTION_LABELS.map(sl => (
          <TouchableOpacity
            key={sl.key}
            style={[mStyles.sectionBtn, section === sl.key && mStyles.sectionBtnActive]}
            onPress={() => setSection(sl.key)}
          >
            <Text style={[mStyles.sectionBtnText, section === sl.key && mStyles.sectionBtnTextActive]}>
              {sl.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {comparePanel}
      <View style={{ flex: 1 }}>{listData}</View>
    </View>
  );
}

const mStyles = StyleSheet.create({
  sectionBar:        { flexGrow: 0, paddingHorizontal: S.md, paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider },
  sectionBtn:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: R.xl, marginRight: S.sm, backgroundColor: C.bg },
  sectionBtnActive:  { backgroundColor: C.greenDark },
  sectionBtnText:    { color: C.textMuted, fontSize: F.size.sm },
  sectionBtnTextActive: { color: C.white, fontWeight: 'bold' },
  sectionHeader:     { color: C.text, fontSize: F.size.lg, fontWeight: 'bold', marginTop: S.lg, marginBottom: S.sm, paddingHorizontal: S.md },
  card:              { backgroundColor: C.bgCard, borderRadius: 10, margin: S.sm, padding: S.md },
  cardHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.sm, marginBottom: 6 },
  cardName:          { flex: 1, color: C.white, fontWeight: 'bold', fontSize: F.size.lg },
  ownedPill:         { backgroundColor: C.greenDark, borderRadius: R.md, paddingHorizontal: S.sm, paddingVertical: 2, color: C.textDim, fontSize: 11 },
  cardDetail:        { color: C.textMuted, fontSize: F.size.sm, marginBottom: 3 },
  buyBtn:            { backgroundColor: C.greenDark, borderRadius: R.md, padding: 10, alignItems: 'center', marginTop: S.sm },
  buyBtnDisabled:    { backgroundColor: C.bgElevated },
  buyBtnText:        { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
});

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function TiendaScreen() {
  const [activeTab, setActiveTab] = useState<ShopTab>('seeds');

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Shop</Text>
      </View>

      <SubTabBar
        tabs={[
          { id: 'seeds',     label: '🌾 Seeds' },
          { id: 'products',  label: '🧪 Products' },
          { id: 'buildings', label: '🏗️ Buildings' },
          { id: 'machinery', label: '🚜 Machinery' },
        ]}
        active={activeTab}
        onSelect={id => setActiveTab(id as ShopTab)}
      />

      {activeTab === 'seeds'     && <SeedsTab />}
      {activeTab === 'products'  && <ProductsTab />}
      {activeTab === 'buildings' && <BuildingsTab />}
      {activeTab === 'machinery' && <MachineryTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: S.lg, marginBottom: S.sm },
  title: { fontSize: F.size.title, fontWeight: 'bold', color: C.text },

  // Sub-tab bar

  list: { paddingHorizontal: S.sm },

  // Seeds
  seedCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, margin: 6, flex: 1, borderLeftWidth: 3, borderLeftColor: C.border },
  cardSelected: { borderWidth: 2, borderColor: C.text },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: S.xs, marginBottom: S.xs },
  tierBadge: { alignSelf: 'flex-start', borderRadius: R.xs, paddingHorizontal: 6, paddingVertical: 2, marginBottom: S.xs },
  tierText: { color: C.white, fontSize: 11, fontWeight: 'bold' },
  cropName: { flex: 1, color: C.text, fontWeight: 'bold', fontSize: F.size.lg },
  detail: { color: C.textMuted, fontSize: 11, marginBottom: 1 },
  plantPanel: { backgroundColor: C.bgElevated, padding: S.md, borderTopWidth: 1, borderTopColor: C.divider },
  plantTitle: { color: C.text, fontWeight: 'bold', marginBottom: S.sm, fontSize: F.size.md },
  noParcel: { color: C.textMuted },
  parcelBtn: { backgroundColor: C.greenDark, borderRadius: R.md, padding: 10, marginRight: S.sm, alignItems: 'center', minWidth: 80 },
  btnDisabled: { backgroundColor: C.bgElevated },
  parcelBtnText: { color: C.white, fontSize: F.size.md, fontWeight: 'bold' },
  parcelBtnCost: { color: C.textDim, fontSize: 11 },

  // Products
  categorySection: { marginBottom: S.lg },
  categoryTitle: { color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold', paddingHorizontal: S.sm, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  productCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginHorizontal: 0, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  productInfo: { flex: 1, marginRight: S.md },
  productName: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  productEffect: { color: C.textDim, fontSize: 11, marginTop: 2 },
  productPack: { color: C.textFaint, fontSize: 11, marginTop: 3 },
  productRight: { alignItems: 'center', gap: 6 },
  ownedCount: { color: C.green, fontSize: 11, fontWeight: 'bold' },
  buyBtn: { backgroundColor: C.blue, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 7 },
  buyBtnDisabled: { backgroundColor: C.bgElevated },
  buyBtnText: { color: C.white, fontSize: F.size.sm, fontWeight: 'bold' },

  // Buildings
  buildingGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  buildingCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, margin: 5, width: '47%' },
  buildingName: { flex: 1, color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  buildingCapacity: { color: C.blue, fontSize: 11, marginBottom: 2 },
  buildingEffect: { color: C.textMuted, fontSize: 11, marginBottom: S.xs },
  buildingMaint: { color: C.red, fontSize: F.size.xs, marginBottom: 6 },
  buildingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ownedBadge: { color: C.textDim, fontSize: 11, fontWeight: 'bold' },
  buildBtn: { backgroundColor: C.greenDark, borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: 5 },
  buildBtnDisabled: { backgroundColor: C.bgElevated },
  buildBtnText: { color: C.white, fontSize: 11, fontWeight: 'bold' },
  screenTitle: {
    color: C.text,
    fontSize: F.size.xl,
    fontWeight: F.weight.bold,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
});
