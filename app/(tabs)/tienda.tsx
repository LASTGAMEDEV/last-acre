import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import { CROP_TYPES, CropTier } from '../../data/cropTypes';
import { PRODUCT_TYPES, CATEGORY_LABELS, ProductCategory } from '../../data/productTypes';
import { BUILDING_TYPES, BUILDING_CATEGORY_LABELS, BuildingCategory } from '../../data/buildingTypes';

type ShopTab = 'seeds' | 'products' | 'buildings';

const TIER_COLORS: Record<CropTier, string> = {
  D: '#9e9e9e', C: '#4caf50', B: '#2196f3', A: '#9c27b0', S: '#ff9800',
};

const PRODUCT_CATEGORY_ORDER: ProductCategory[] = [
  'fertilizer_solid', 'fertilizer_liquid', 'herbicide', 'fungicide', 'insecticide',
];

const BUILDING_CATEGORY_ORDER: BuildingCategory[] = ['animal', 'silo', 'industrial'];

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
            <Text style={styles.cropName}>{item.name}</Text>
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
                    onPress={() => { plantCrop(p.id, selectedCrop, p.hectares, false); setSelectedCrop(null); }}
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
  const { money, buildings, buyBuilding } = useGameStore();

  return (
    <ScrollView style={[styles.list, { flex: 1 }]} contentContainerStyle={{ paddingBottom: 20 }}>
      {BUILDING_CATEGORY_ORDER.map(cat => {
        const items = BUILDING_TYPES.filter(b => b.category === cat);
        return (
          <View key={cat} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{BUILDING_CATEGORY_LABELS[cat]}</Text>
            <View style={styles.buildingGrid}>
              {items.map(building => {
                const ownedCount = buildings.filter(id => id === building.id).length;
                const canAfford = money >= building.cost;
                return (
                  <View key={building.id} style={styles.buildingCard}>
                    <Text style={styles.buildingName}>{building.name}</Text>
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
                      <TouchableOpacity
                        style={[styles.buildBtn, !canAfford && styles.buildBtnDisabled]}
                        onPress={() => buyBuilding(building.id)}
                        disabled={!canAfford}
                      >
                        <Text style={styles.buildBtnText}>
                          ${building.cost.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function TiendaScreen() {
  const [activeTab, setActiveTab] = useState<ShopTab>('seeds');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Shop" />

      {/* Sub-tab bar */}
      <View style={styles.tabBar}>
        {([
          { id: 'seeds',     label: '🌾 Seeds' },
          { id: 'products',  label: '🧪 Products' },
          { id: 'buildings', label: '🏗️ Buildings' },
        ] as { id: ShopTab; label: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'seeds'     && <SeedsTab />}
      {activeTab === 'products'  && <ProductsTab />}
      {activeTab === 'buildings' && <BuildingsTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingHorizontal: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#e8d5a3' },

  // Sub-tab bar
  tabBar: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, backgroundColor: '#0d1117', borderRadius: 10, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#0f3460' },
  tabBtnText: { color: '#555', fontSize: 12, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#e8d5a3' },

  list: { paddingHorizontal: 8 },

  // Seeds
  seedCard: { backgroundColor: '#16213e', borderRadius: 10, padding: 12, margin: 6, flex: 1, borderLeftWidth: 3, borderLeftColor: '#333' },
  cardSelected: { borderWidth: 2, borderColor: '#e8d5a3' },
  tierBadge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  tierText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cropName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  detail: { color: '#aaa', fontSize: 11, marginBottom: 1 },
  plantPanel: { backgroundColor: '#0f3460', padding: 12, borderTopWidth: 1, borderTopColor: '#333' },
  plantTitle: { color: '#e8d5a3', fontWeight: 'bold', marginBottom: 8, fontSize: 13 },
  noParcel: { color: '#888' },
  parcelBtn: { backgroundColor: '#2e7d32', borderRadius: 8, padding: 10, marginRight: 8, alignItems: 'center', minWidth: 80 },
  btnDisabled: { backgroundColor: '#333' },
  parcelBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  parcelBtnCost: { color: '#a5d6a7', fontSize: 11 },

  // Products
  categorySection: { marginBottom: 16 },
  categoryTitle: { color: '#888', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 8, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  productCard: { backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginHorizontal: 0, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  productInfo: { flex: 1, marginRight: 12 },
  productName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  productEffect: { color: '#81c784', fontSize: 11, marginTop: 2 },
  productPack: { color: '#666', fontSize: 11, marginTop: 3 },
  productRight: { alignItems: 'center', gap: 6 },
  ownedCount: { color: '#4caf50', fontSize: 11, fontWeight: 'bold' },
  buyBtn: { backgroundColor: '#1565c0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  buyBtnDisabled: { backgroundColor: '#333' },
  buyBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // Buildings
  buildingGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  buildingCard: { backgroundColor: '#16213e', borderRadius: 10, padding: 12, margin: 5, width: '47%' },
  buildingName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  buildingCapacity: { color: '#64b5f6', fontSize: 11, marginBottom: 2 },
  buildingEffect: { color: '#aaa', fontSize: 11, marginBottom: 4 },
  buildingMaint: { color: '#ef9a9a', fontSize: 10, marginBottom: 6 },
  buildingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ownedBadge: { color: '#81c784', fontSize: 11, fontWeight: 'bold' },
  buildBtn: { backgroundColor: '#2e7d32', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  buildBtnDisabled: { backgroundColor: '#333' },
  buildBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});
