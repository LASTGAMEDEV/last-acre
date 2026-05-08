import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import HintCard from '../../components/HintCard';
import HelpSheet from '../../components/HelpSheet';
import {
  PROCESSING_RECIPES, PROCESSED_ITEM_DEFS, ProcessingRecipe,
  qualityLabel, qualityColor,
} from '../../data/processingTypes';
import { CROP_TYPES } from '../../data/cropTypes';
import { ANIMAL_PRODUCTS } from '../../data/animalProducts';
import { BUILDING_TYPES } from '../../data/buildingTypes';

const BUILDING_GROUPS: { buildingId: string; label: string; icon: string }[] = [
  { buildingId: 'bld_molino',      label: 'Flour Mill',             icon: '⚙️' },
  { buildingId: 'bld_prensa',      label: 'Oil Press',              icon: '🛢️' },
  { buildingId: 'bld_lacteo',      label: 'Dairy Plant',            icon: '🥛' },
  { buildingId: 'bld_procesadora', label: 'Agricultural Processor', icon: '🏭' },
  { buildingId: 'bld_bodega',      label: 'Winery',                 icon: '🍷' },
];

type TabId = 'recipes' | 'batches' | 'inventory';

export default function ProcesadoScreen() {
  const {
    buildings, inventory, animalInventory, processedInventory, activeBatches, day,
    processProduct, sellProcessed,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<TabId>('recipes');
  const [batchCounts, setBatchCounts] = useState<Record<string, number>>({});

  function getBatchCount(recipeId: string) { return batchCounts[recipeId] ?? 1; }

  function maxBatches(recipe: ProcessingRecipe): number {
    const stock = recipe.input.source === 'crop'
      ? (inventory[recipe.input.itemId] ?? 0)
      : (animalInventory[recipe.input.itemId] ?? 0);
    return Math.floor(stock / recipe.input.amount);
  }

  function inputName(recipe: ProcessingRecipe): string {
    if (recipe.input.source === 'crop') return CROP_TYPES.find(c => c.id === recipe.input.itemId)?.name ?? recipe.input.itemId;
    return ANIMAL_PRODUCTS.find(p => p.productType === recipe.input.itemId)?.name ?? recipe.input.itemId;
  }

  function inputUnit(recipe: ProcessingRecipe): string {
    if (recipe.input.source === 'crop') return CROP_TYPES.find(c => c.id === recipe.input.itemId)?.unit ?? '';
    return ANIMAL_PRODUCTS.find(p => p.productType === recipe.input.itemId)?.unit ?? '';
  }

  function inputStock(recipe: ProcessingRecipe): number {
    return recipe.input.source === 'crop'
      ? (inventory[recipe.input.itemId] ?? 0)
      : (animalInventory[recipe.input.itemId] ?? 0);
  }

  const pendingBatches = (activeBatches ?? []).filter(b => b.completionDay > day);
  const readyBatches = (activeBatches ?? []).filter(b => b.completionDay <= day);

  const totalInventoryValue = (processedInventory ?? []).reduce((s, item) => {
    const def = PROCESSED_ITEM_DEFS.find(d => d.id === item.itemId);
    if (!def) return s;
    const qualityMult = 0.5 + (item.quality / 100);
    return s + item.quantity * def.basePrice * qualityMult;
  }, 0);

  // Group processed inventory by itemId, showing best-quality batch first
  const groupedInventory = PROCESSED_ITEM_DEFS.map(def => {
    const items = (processedInventory ?? []).filter(i => i.itemId === def.id);
    if (items.length === 0) return null;
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const avgQuality = items.reduce((s, i) => s + i.quality * i.quantity, 0) / totalQty;
    const nearestExpiry = Math.min(...items.map(i => i.expiryDay));
    return { def, items, totalQty, avgQuality, nearestExpiry };
  }).filter(Boolean) as NonNullable<ReturnType<typeof PROCESSED_ITEM_DEFS.map>[number]>[];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Processing</Text>
      <Text style={styles.screenSubtitle}>Transform raw goods into finished products</Text>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {([['recipes', '📋 Recipes'], ['batches', `⏳ Batches${pendingBatches.length > 0 ? ` (${pendingBatches.length})` : ''}`], ['inventory', `📦 Stock${(processedInventory ?? []).length > 0 ? ` ($${Math.round(totalInventoryValue).toLocaleString()})` : ''}`]] as [TabId, string][]).map(([id, label]) => (
          <TouchableOpacity key={id} style={[styles.tabBtn, activeTab === id && styles.tabBtnActive]} onPress={() => setActiveTab(id)}>
            <Text style={[styles.tabBtnText, activeTab === id && styles.tabBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── RECIPES TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'recipes' && (
        <>
          {Object.values(inventory).some(v => v > 0) && (processedInventory ?? []).length === 0 && (
            <HintCard id="hint_processing" title="Process crops for higher margins" body="Raw crops sell at base price, but processed goods (flour, oil, cheese) sell for 2–5× more. Select a recipe and tap Queue to start a batch." />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 }}>
            <HelpSheet title="Processing" body="Processing takes in-game days to complete. Inputs are consumed immediately when you queue a batch. Finished goods appear in Stock when complete. Each item has a shelf life — sell before it expires." />
            <Text style={{ color: '#555', fontSize: 11, marginLeft: 6 }}>How does processing work?</Text>
          </View>

          {BUILDING_GROUPS.map(group => {
            const owned = buildings.includes(group.buildingId);
            const buildingType = BUILDING_TYPES.find(b => b.id === group.buildingId);
            const groupRecipes = PROCESSING_RECIPES.filter(r => r.requiredBuilding === group.buildingId);

            return (
              <View key={group.buildingId} style={styles.section}>
                <View style={styles.buildingHeader}>
                  <Text style={styles.buildingIcon}>{group.icon}</Text>
                  <View style={styles.buildingInfo}>
                    <Text style={styles.buildingName}>{group.label}</Text>
                    {!owned && buildingType && (
                      <Text style={styles.buildingLocked}>🔒 Build in Shop — ${buildingType.cost.toLocaleString()}</Text>
                    )}
                  </View>
                  <View style={[styles.buildingBadge, owned ? styles.badgeOwned : styles.badgeLocked]}>
                    <Text style={styles.badgeText}>{owned ? 'Active' : 'Not built'}</Text>
                  </View>
                </View>

                {groupRecipes.map(recipe => {
                  const b = getBatchCount(recipe.id);
                  const max = maxBatches(recipe);
                  const canQueue = owned && b > 0 && max >= b;
                  const stock = inputStock(recipe);
                  const unit = inputUnit(recipe);
                  const name = inputName(recipe);
                  const def = PROCESSED_ITEM_DEFS.find(d => d.id === recipe.outputItemId);
                  const outputValue = def ? Math.round(recipe.baseOutputQuantity * b * def.basePrice * 0.8) : 0;

                  return (
                    <View key={recipe.id} style={[styles.recipeCard, !owned && styles.recipeCardLocked]}>
                      <View style={styles.recipeHeader}>
                        <Text style={styles.recipeIcon}>{recipe.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recipeName}>{recipe.name}</Text>
                          <Text style={styles.recipeTime}>⏱ {recipe.processingDays} day{recipe.processingDays !== 1 ? 's' : ''} · {recipe.input.amount * b} {unit} → {recipe.baseOutputQuantity * b} {def?.unit ?? ''}</Text>
                        </View>
                      </View>

                      <View style={styles.recipeFlow}>
                        <View style={styles.flowItem}>
                          <Text style={styles.flowLabel}>Input</Text>
                          <Text style={styles.flowValue}>{recipe.input.amount * b} {unit}</Text>
                          <Text style={styles.flowName}>{name}</Text>
                          <Text style={styles.flowStock}>Stock: {Math.floor(stock)} {unit}</Text>
                        </View>
                        <Text style={styles.flowArrow}>→</Text>
                        <View style={styles.flowItem}>
                          <Text style={styles.flowLabel}>Output</Text>
                          <Text style={styles.flowValue}>{recipe.baseOutputQuantity * b} {def?.unit ?? ''}</Text>
                          <Text style={styles.flowName}>{recipe.name}</Text>
                          <Text style={[styles.flowStock, { color: '#81c784' }]}>~${outputValue.toLocaleString()}</Text>
                        </View>
                      </View>

                      <View style={styles.batchRow}>
                        <TouchableOpacity style={styles.batchBtn} onPress={() => setBatchCounts(p => ({ ...p, [recipe.id]: Math.max(1, b - 1) }))} disabled={!owned}>
                          <Text style={styles.batchBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.batchCount}>{b} batch{b !== 1 ? 'es' : ''}</Text>
                        <TouchableOpacity style={styles.batchBtn} onPress={() => setBatchCounts(p => ({ ...p, [recipe.id]: Math.min(max, b + 1) }))} disabled={!owned || b >= max}>
                          <Text style={styles.batchBtnText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.batchBtn, styles.maxBtn]} onPress={() => setBatchCounts(p => ({ ...p, [recipe.id]: Math.max(1, max) }))} disabled={!owned || max <= 0}>
                          <Text style={styles.batchBtnText}>Max</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.queueBtn, !canQueue && styles.queueBtnDisabled]}
                          onPress={() => { processProduct(recipe.id, b); setBatchCounts(p => ({ ...p, [recipe.id]: 1 })); }}
                          disabled={!canQueue}
                        >
                          <Text style={styles.queueBtnText}>
                            {!owned ? '🔒' : max <= 0 ? 'No stock' : `Queue${b > 1 ? ` ×${b}` : ''}`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </>
      )}

      {/* ── BATCHES TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'batches' && (
        <View style={styles.section}>
          {(activeBatches ?? []).length === 0 ? (
            <Text style={styles.emptyText}>No active batches. Queue a recipe to start processing.</Text>
          ) : (
            <>
              {readyBatches.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Ready to collect — advance a day to receive</Text>
                  {readyBatches.map(batch => {
                    const recipe = PROCESSING_RECIPES.find(r => r.id === batch.recipeId);
                    const def = PROCESSED_ITEM_DEFS.find(d => d.id === batch.outputItemId);
                    return (
                      <View key={batch.id} style={[styles.batchCard, styles.batchCardReady]}>
                        <Text style={styles.batchTitle}>{recipe?.icon ?? '📦'} {recipe?.name ?? batch.outputItemId}</Text>
                        <Text style={styles.batchDetail}>{batch.outputQuantity} {def?.unit ?? ''} · <Text style={{ color: qualityColor(batch.quality) }}>{qualityLabel(batch.quality)} ({batch.quality})</Text></Text>
                        <Text style={styles.batchReady}>✅ Ready</Text>
                      </View>
                    );
                  })}
                </>
              )}
              {pendingBatches.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: S.md }]}>In progress</Text>
                  {pendingBatches.map(batch => {
                    const recipe = PROCESSING_RECIPES.find(r => r.id === batch.recipeId);
                    const def = PROCESSED_ITEM_DEFS.find(d => d.id === batch.outputItemId);
                    const daysLeft = batch.completionDay - day;
                    return (
                      <View key={batch.id} style={styles.batchCard}>
                        <View style={styles.batchRow2}>
                          <Text style={styles.batchTitle}>{recipe?.icon ?? '📦'} {recipe?.name ?? batch.outputItemId}</Text>
                          <Text style={styles.batchDays}>Day {batch.completionDay} ({daysLeft}d left)</Text>
                        </View>
                        <Text style={styles.batchDetail}>{batch.outputQuantity} {def?.unit ?? ''} · <Text style={{ color: qualityColor(batch.quality) }}>{qualityLabel(batch.quality)} ({batch.quality})</Text></Text>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${Math.round(((batch.completionDay - batch.startDay - daysLeft) / (batch.completionDay - batch.startDay)) * 100)}%` as any }]} />
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </>
          )}
        </View>
      )}

      {/* ── INVENTORY TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <View style={styles.section}>
          {(groupedInventory as any[]).length === 0 ? (
            <Text style={styles.emptyText}>No processed goods in stock. Complete a batch to see them here.</Text>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Processed stock — ${Math.round(totalInventoryValue).toLocaleString()} total value</Text>
              {(groupedInventory as any[]).map(({ def, totalQty, avgQuality, nearestExpiry }: any) => {
                const expiryDaysLeft = nearestExpiry - day;
                const expiryWarning = expiryDaysLeft <= def.shelfLifeDays * 0.25;
                const qualityMult = 0.5 + (avgQuality / 100);
                const sellRevenue = Math.round(totalQty * def.basePrice * qualityMult);

                return (
                  <View key={def.id} style={styles.inventoryCard}>
                    <View style={styles.inventoryHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inventoryName}>{def.name}</Text>
                        <Text style={styles.inventoryQty}>{Math.round(totalQty).toLocaleString()} {def.unit}</Text>
                      </View>
                      <View style={styles.qualityBadge}>
                        <Text style={[styles.qualityText, { color: qualityColor(Math.round(avgQuality)) }]}>{qualityLabel(Math.round(avgQuality))}</Text>
                        <Text style={styles.qualityScore}>{Math.round(avgQuality)}</Text>
                      </View>
                    </View>

                    <View style={styles.inventoryMeta}>
                      <Text style={[styles.expiryText, expiryWarning && styles.expiryWarning]}>
                        {expiryWarning ? '⚠️ ' : ''}Expires in {expiryDaysLeft}d
                      </Text>
                      <Text style={styles.inventoryPrice}>${def.basePrice}/{def.unit} base</Text>
                    </View>

                    <TouchableOpacity style={styles.sellBtn} onPress={() => sellProcessed(def.id, totalQty)}>
                      <Text style={styles.sellBtnText}>Sell all — ${sellRevenue.toLocaleString()}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 100 },
  screenTitle: { color: C.text, fontSize: F.size.xl, fontWeight: F.weight.bold, paddingHorizontal: S.md, paddingTop: S.sm, paddingBottom: S.xs },
  screenSubtitle: { color: C.textMuted, fontSize: F.size.xs, paddingHorizontal: S.md, paddingBottom: S.xs },

  tabBar: { flexDirection: 'row', marginHorizontal: S.md, marginBottom: S.sm, backgroundColor: C.bgCard, borderRadius: R.md, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: R.sm },
  tabBtnActive: { backgroundColor: C.bgDeep },
  tabBtnText: { color: C.textMuted, fontSize: 11, fontWeight: 'bold' },
  tabBtnTextActive: { color: C.text },

  section: { marginTop: S.sm, paddingHorizontal: S.md },
  sectionLabel: { color: C.textMuted, fontSize: F.size.sm, marginBottom: S.sm },
  emptyText: { color: C.textMuted, fontSize: F.size.sm, textAlign: 'center', paddingVertical: 32 },

  buildingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: S.sm, gap: 10 },
  buildingIcon: { fontSize: 24 },
  buildingInfo: { flex: 1 },
  buildingName: { color: C.text, fontWeight: 'bold', fontSize: 15 },
  buildingLocked: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  buildingBadge: { borderRadius: R.md, paddingHorizontal: S.sm, paddingVertical: 3 },
  badgeOwned: { backgroundColor: '#1b3a1b' },
  badgeLocked: { backgroundColor: '#2a2a2a' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#aaa' },

  recipeCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginBottom: S.sm, borderWidth: 1, borderColor: C.divider },
  recipeCardLocked: { opacity: 0.5 },
  recipeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  recipeIcon: { fontSize: 22, marginTop: 2 },
  recipeName: { color: C.text, fontWeight: 'bold', fontSize: F.size.lg },
  recipeTime: { color: C.textMuted, fontSize: 11, marginTop: 2 },

  recipeFlow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bgDeep, borderRadius: R.md, padding: 10, marginBottom: 10 },
  flowItem: { flex: 1 },
  flowLabel: { color: '#555', fontSize: F.size.xs, marginBottom: 2 },
  flowValue: { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
  flowName: { color: C.textMuted, fontSize: 11 },
  flowStock: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  flowArrow: { color: '#c8860a', fontSize: 20, fontWeight: 'bold', paddingHorizontal: S.sm },

  batchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  batchBtn: { backgroundColor: C.divider, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6 },
  maxBtn: { backgroundColor: '#2a2a4a' },
  batchBtnText: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  batchCount: { color: C.text, fontSize: F.size.md, minWidth: 60, textAlign: 'center' },
  queueBtn: { flex: 1, backgroundColor: '#c8860a', borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  queueBtnDisabled: { backgroundColor: '#333' },
  queueBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },

  batchCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginBottom: S.sm, borderWidth: 1, borderColor: C.divider },
  batchCardReady: { borderColor: '#2e7d32' },
  batchRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  batchTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  batchDays: { color: C.textMuted, fontSize: 11 },
  batchDetail: { color: C.textMuted, fontSize: 12, marginBottom: 6 },
  batchReady: { color: '#81c784', fontWeight: 'bold', fontSize: 12 },
  progressBar: { height: 4, backgroundColor: C.divider, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#c8860a', borderRadius: 2 },

  inventoryCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginBottom: S.sm, borderWidth: 1, borderColor: C.divider },
  inventoryHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  inventoryName: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  inventoryQty: { color: C.white, fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  qualityBadge: { alignItems: 'flex-end' },
  qualityText: { fontSize: 12, fontWeight: 'bold' },
  qualityScore: { color: C.textMuted, fontSize: 11 },
  inventoryMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  expiryText: { color: C.textMuted, fontSize: 11 },
  expiryWarning: { color: '#ff7043' },
  inventoryPrice: { color: C.textMuted, fontSize: 11 },
  sellBtn: { backgroundColor: '#2e7d32', borderRadius: R.sm, padding: 8, alignItems: 'center' },
  sellBtnText: { color: C.white, fontSize: 12, fontWeight: 'bold' },
});
