import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import SubTabBar from '../../components/SubTabBar';
import { CROP_TYPES, CropTier } from '../../data/cropTypes';
import { PRODUCT_TYPES, CATEGORY_LABELS, ProductCategory } from '../../data/productTypes';
import { BUILDING_TYPES, BUILDING_CATEGORY_LABELS, BuildingCategory, PRODUCTION_EQUIPMENT } from '../../data/buildingTypes';
import { MACHINE_TYPES } from '../../data/machineTypes';
import { ATTACHMENT_TYPES } from '../../data/attachmentTypes';

type ShopTab = 'seeds' | 'products' | 'buildings' | 'machinery';

const TIER_COLORS: Record<CropTier, string> = {
  D: '#9e9e9e', C: '#4caf50', B: '#2196f3', A: '#9c27b0', S: '#ff9800',
};

const PRODUCT_CATEGORY_ORDER: ProductCategory[] = [
  'fertilizer_solid', 'fertilizer_liquid', 'herbicide', 'fungicide', 'insecticide',
];

const BUILDING_CATEGORY_ORDER: BuildingCategory[] = ['animal', 'production', 'silo', 'industrial', 'lab', 'upgrade'];

// â”€â”€ Seeds Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            <Text style={styles.cropName}>{item.name}</Text>
            <Text style={styles.detail}>ðŸŒ± {item.growthDays}d Â· {item.baseYield} {item.unit}/ha</Text>
            <Text style={styles.detail}>ðŸ’° ${item.basePrice}/{item.unit}</Text>
            <Text style={styles.detail}>ðŸ›’ ${item.seedCost.toLocaleString()}/ha</Text>
            <Text style={styles.detail}>ðŸ’§ {'â—'.repeat(item.waterNeed)}{'â—‹'.repeat(5 - item.waterNeed)}</Text>
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

// â”€â”€ Products Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProductsTab() {
  const { money, productInventory, buyProduct } = useGameStore();

  return (
    <ScrollView style={[styles.list, { flex: 1 }]} contentContainerStyle={{ paddingBottom: 20 }}>
      {PRODUCT_CATEGORY_ORDER.map(cat => {
        const items = PRODUCT_TYPES.filter(p => p.category === cat);
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
                      Pack {product.packSize} doses Â· ${product.packCost.toLocaleString()}
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

// â”€â”€ Buildings Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BuildingsTab() {
  const { money, buildings, buyBuilding, purchaseProductionBuilding, productionBuildings, installEquipment } = useGameStore();

  const ownedProductionSpecies = new Set(
    (productionBuildings ?? []).map(pb => pb.animalTypeId)
  );

  const handleBuyBuilding = (buildingId: string) => {
    const bt = BUILDING_TYPES.find(b => b.id === buildingId);
    if (bt?.category === 'production' && bt.animalTypeId) {
      // Species-specific production buildings â†’ production building state
      purchaseProductionBuilding(buildingId);
    } else {
      // All other buildings (including vet/breeding/infrastructure) â†’ generic buildings[]
      buyBuilding(buildingId);
    }
  };

  return (
    <ScrollView style={[styles.list, { flex: 1 }]} contentContainerStyle={{ paddingBottom: 20 }}>
      {BUILDING_CATEGORY_ORDER.map(cat => {
        const items = BUILDING_TYPES.filter(b => b.category === cat);
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
                    <Text style={styles.buildingName}>{building.name}</Text>
                    {building.capacity && (
                      <Text style={styles.buildingCapacity}>
                        {cat === 'animal'
                          ? `ðŸ‘¥ Cap. ${building.capacity}`
                          : `ðŸ“¦ ${(building.capacity / 1000).toFixed(0)}k kg/L`}
                      </Text>
                    )}
                    <Text style={styles.buildingEffect}>{building.effectLabel}</Text>
                    <Text style={styles.buildingMaint}>
                      ðŸ”§ ${building.maintenancePerDay}/day
                    </Text>
                    <View style={styles.buildingFooter}>
                      {ownedCount > 0 && (
                        <Text style={styles.ownedBadge}>âœ“ Ã—{ownedCount}</Text>
                      )}
                      {alreadyOwned ? (
                        <Text style={[styles.buildBtnText, { color: '#4caf50' }]}>Owned</Text>
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
                    <View key={eq.id} style={{ backgroundColor: '#0d1b2a', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                      <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 13 }}>{eq.name}</Text>
                      <Text style={{ color: '#aaa', fontSize: 11, marginVertical: 4 }}>{eq.effectLabel}</Text>
                      <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>
                        For: {bt2?.name ?? fitsOwnedBuilding.buildingTypeId}
                      </Text>
                      {alreadyInstalled ? (
                        <Text style={{ color: '#4caf50', fontSize: 12 }}>âœ“ Installed</Text>
                      ) : slotsFull ? (
                        <Text style={{ color: '#aaa', fontSize: 12 }}>All equipment slots full</Text>
                      ) : (
                        <TouchableOpacity
                          style={{ backgroundColor: canAffordEq ? '#1e3a5f' : '#2a2a4a', borderRadius: 6, padding: 8, alignItems: 'center' }}
                          onPress={() => installEquipment(fitsOwnedBuilding.id, eq.id)}
                          disabled={!canAffordEq}
                        >
                          <Text style={{ color: canAffordEq ? '#90caf9' : '#555', fontSize: 13 }}>
                            Install â€” ${eq.cost.toLocaleString()}
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

// â”€â”€ Machinery Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MachineryTab() {
  const { money, machines, attachments, trailers, buyMachine, buyAttachment, buyTrailer } = useGameStore();
  const [section, setSection] = useState<'tractors' | 'combines' | 'trucks' | 'attachments'>('tractors');

  const tractors    = MACHINE_TYPES.filter(m => m.category === 'tractor');
  const combines    = MACHINE_TYPES.filter(m => m.category === 'harvester');
  const trucks      = MACHINE_TYPES.filter(m => m.category === 'truck');
  const trailerTypes = MACHINE_TYPES.filter(m => m.category === 'trailer');
  const irrigTypes  = MACHINE_TYPES.filter(m => m.category === 'irrigation');

  const ownedCount = (typeId: string) =>
    [...(machines ?? []), ...(trailers ?? [])].filter(m => m.typeId === typeId).length;
  const ownedAttachCount = (typeId: string) =>
    (attachments ?? []).filter((a: { typeId: string }) => a.typeId === typeId).length;

  const SECTION_LABELS = [
    { key: 'tractors', label: 'ðŸšœ Tractors' },
    { key: 'combines', label: 'ðŸŒ¾ Combines' },
    { key: 'trucks',   label: 'ðŸš› Trucks' },
    { key: 'attachments', label: 'âš™ï¸ Attachments' },
  ] as const;

  const renderMachineCard = (m: (typeof MACHINE_TYPES)[0], onBuy: () => void, owned: number) => (
    <View key={m.id} style={mStyles.card}>
      <View style={mStyles.cardHeader}>
        <Text style={mStyles.cardName}>{m.name}</Text>
        {owned > 0 && <Text style={mStyles.ownedPill}>Owned: {owned}</Text>}
      </View>
      <Text style={mStyles.cardDetail}>ðŸ’° ${m.cost.toLocaleString()}</Text>
      <Text style={mStyles.cardDetail}>ðŸ”§ ${m.maintenancePerDay}/day maintenance</Text>
      {m.haPerDay !== undefined && <Text style={mStyles.cardDetail}>âš¡ {m.haPerDay} ha/day</Text>}
      {m.capacityKg !== undefined && (
        <Text style={mStyles.cardDetail}>
          ðŸ“¦ {m.capacityKg === 0 ? 'Needs trailer' : `${m.capacityKg.toLocaleString()} kg`}
        </Text>
      )}
      <TouchableOpacity
        style={[mStyles.buyBtn, money < m.cost && mStyles.buyBtnDisabled]}
        onPress={onBuy}
        disabled={money < m.cost}
      >
        <Text style={mStyles.buyBtnText}>{money < m.cost ? "Can't afford" : 'Buy'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAttachCard = (a: (typeof ATTACHMENT_TYPES)[0]) => (
    <View key={a.id} style={mStyles.card}>
      <View style={mStyles.cardHeader}>
        <Text style={mStyles.cardName}>{a.name}</Text>
        {ownedAttachCount(a.id) > 0 && <Text style={mStyles.ownedPill}>Owned: {ownedAttachCount(a.id)}</Text>}
      </View>
      <Text style={mStyles.cardDetail}>ðŸ’° ${a.cost.toLocaleString()}</Text>
      <Text style={mStyles.cardDetail}>âš¡ {a.haPerDay} ha/day</Text>
      <Text style={mStyles.cardDetail}>ðŸ”§ {a.operation.charAt(0).toUpperCase() + a.operation.slice(1)}</Text>
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
      <View style={{ flex: 1 }}>{listData}</View>
    </View>
  );
}

const mStyles = StyleSheet.create({
  sectionBar:        { flexGrow: 0, paddingHorizontal: S.md, paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: '#333' },
  sectionBtn:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: R.xl, marginRight: S.sm, backgroundColor: C.bg },
  sectionBtnActive:  { backgroundColor: '#2e7d32' },
  sectionBtnText:    { color: '#aaa', fontSize: F.size.sm },
  sectionBtnTextActive: { color: C.white, fontWeight: 'bold' },
  sectionHeader:     { color: C.text, fontSize: F.size.lg, fontWeight: 'bold', marginTop: S.lg, marginBottom: S.sm, paddingHorizontal: S.md },
  card:              { backgroundColor: C.bgCard, borderRadius: 10, margin: S.sm, padding: S.md },
  cardHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardName:          { color: C.white, fontWeight: 'bold', fontSize: F.size.lg },
  ownedPill:         { backgroundColor: '#1b5e20', borderRadius: R.md, paddingHorizontal: S.sm, paddingVertical: 2, color: '#81c784', fontSize: 11 },
  cardDetail:        { color: '#aaa', fontSize: F.size.sm, marginBottom: 3 },
  buyBtn:            { backgroundColor: '#2e7d32', borderRadius: R.md, padding: 10, alignItems: 'center', marginTop: S.sm },
  buyBtnDisabled:    { backgroundColor: '#333' },
  buyBtnText:        { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
});

// â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function TiendaScreen() {
  const [activeTab, setActiveTab] = useState<ShopTab>('seeds');

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Shop</Text>

      <SubTabBar
        tabs={[
          { id: 'seeds',     label: 'ðŸŒ¾ Seeds' },
          { id: 'products',  label: 'ðŸ§ª Products' },
          { id: 'buildings', label: 'ðŸ—ï¸ Buildings' },
          { id: 'machinery', label: 'ðŸšœ Machinery' },
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
  seedCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, margin: 6, flex: 1, borderLeftWidth: 3, borderLeftColor: '#333' },
  cardSelected: { borderWidth: 2, borderColor: C.text },
  tierBadge: { alignSelf: 'flex-start', borderRadius: R.xs, paddingHorizontal: 6, paddingVertical: 2, marginBottom: S.xs },
  tierText: { color: C.white, fontSize: 11, fontWeight: 'bold' },
  cropName: { color: C.text, fontWeight: 'bold', fontSize: F.size.lg, marginBottom: S.xs },
  detail: { color: '#aaa', fontSize: 11, marginBottom: 1 },
  plantPanel: { backgroundColor: '#0f3460', padding: S.md, borderTopWidth: 1, borderTopColor: '#333' },
  plantTitle: { color: C.text, fontWeight: 'bold', marginBottom: S.sm, fontSize: F.size.md },
  noParcel: { color: C.textMuted },
  parcelBtn: { backgroundColor: '#2e7d32', borderRadius: R.md, padding: 10, marginRight: S.sm, alignItems: 'center', minWidth: 80 },
  btnDisabled: { backgroundColor: '#333' },
  parcelBtnText: { color: C.white, fontSize: F.size.md, fontWeight: 'bold' },
  parcelBtnCost: { color: '#a5d6a7', fontSize: 11 },

  // Products
  categorySection: { marginBottom: S.lg },
  categoryTitle: { color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold', paddingHorizontal: S.sm, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  productCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginHorizontal: 0, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  productInfo: { flex: 1, marginRight: S.md },
  productName: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  productEffect: { color: '#81c784', fontSize: 11, marginTop: 2 },
  productPack: { color: C.textFaint, fontSize: 11, marginTop: 3 },
  productRight: { alignItems: 'center', gap: 6 },
  ownedCount: { color: '#4caf50', fontSize: 11, fontWeight: 'bold' },
  buyBtn: { backgroundColor: '#1565c0', borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 7 },
  buyBtnDisabled: { backgroundColor: '#333' },
  buyBtnText: { color: C.white, fontSize: F.size.sm, fontWeight: 'bold' },

  // Buildings
  buildingGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  buildingCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, margin: 5, width: '47%' },
  buildingName: { color: C.text, fontWeight: 'bold', fontSize: F.size.md, marginBottom: S.xs },
  buildingCapacity: { color: '#64b5f6', fontSize: 11, marginBottom: 2 },
  buildingEffect: { color: '#aaa', fontSize: 11, marginBottom: S.xs },
  buildingMaint: { color: '#ef9a9a', fontSize: F.size.xs, marginBottom: 6 },
  buildingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ownedBadge: { color: '#81c784', fontSize: 11, fontWeight: 'bold' },
  buildBtn: { backgroundColor: '#2e7d32', borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: 5 },
  buildBtnDisabled: { backgroundColor: '#333' },
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
