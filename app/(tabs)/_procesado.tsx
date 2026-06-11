import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import HintCard from '../../components/HintCard';
import HelpSheet from '../../components/HelpSheet';
import GuideButton from '../../components/GuideButton';
import {
  PROCESSING_RECIPES, PROCESSED_ITEM_DEFS, ProcessingRecipe,
  qualityLabel, qualityColor,
  PROCESSING_BUILDING_CONFIGS,
} from '../../data/processingTypes';
import { CROP_TYPES } from '../../data/cropTypes';
import { ANIMAL_PRODUCTS } from '../../data/animalProducts';
import { BUILDING_TYPES } from '../../data/buildingTypes';

function calcInputCost(
  recipe: ProcessingRecipe,
  batches: number,
  prices: { cropId: string; price: number }[],
  animalPrices: Record<string, number>,
): number {
  return recipe.inputs.reduce((sum, input) => {
    let unitPrice = 0;
    if (input.source === 'crop') {
      const crop = CROP_TYPES.find(c => c.id === input.itemId);
      unitPrice = prices.find(p => p.cropId === input.itemId)?.price ?? crop?.basePrice ?? 0;
    } else if (input.source === 'animal') {
      const product = ANIMAL_PRODUCTS.find(p => p.productType === input.itemId);
      unitPrice = animalPrices[input.itemId] ?? product?.basePrice ?? 0;
    } else if (input.source === 'processed') {
      unitPrice = PROCESSED_ITEM_DEFS.find(d => d.id === input.itemId)?.basePrice ?? 0;
    }
    return sum + input.quantity * batches * unitPrice;
  }, 0);
}

const STAGE_LABELS: Record<number, string> = {
  1: 'Stage 1 — Basic Equipment',
  2: 'Stage 2 — Processing Rooms',
  3: 'Stage 3 — Craft Production',
  4: 'Stage 4 — Premium & Aged',
};

type TabId = 'recipes' | 'batches' | 'inventory';

function inputDisplayName(itemId: string, source: string): string {
  if (source === 'crop') return CROP_TYPES.find(c => c.id === itemId)?.name ?? itemId;
  if (source === 'animal') return ANIMAL_PRODUCTS.find(p => p.productType === itemId)?.name ?? itemId;
  const def = PROCESSED_ITEM_DEFS.find(d => d.id === itemId);
  return def?.name ?? itemId;
}

function inputUnit(itemId: string, source: string): string {
  if (source === 'crop') return CROP_TYPES.find(c => c.id === itemId)?.unit ?? '';
  if (source === 'animal') return ANIMAL_PRODUCTS.find(p => p.productType === itemId)?.unit ?? '';
  return PROCESSED_ITEM_DEFS.find(d => d.id === itemId)?.unit ?? '';
}

function inputStock(
  recipe: ProcessingRecipe,
  inventory: Record<string, number>,
  animalInventory: Record<string, number>,
  processedInventory: { itemId: string; quantity: number }[]
): number {
  let max = Infinity;
  for (const input of recipe.inputs) {
    let stock = 0;
    if (input.source === 'crop') stock = inventory[input.itemId] ?? 0;
    else if (input.source === 'animal') stock = animalInventory[input.itemId] ?? 0;
    else if (input.source === 'processed') {
      stock = processedInventory.filter(i => i.itemId === input.itemId).reduce((s, i) => s + i.quantity, 0);
    }
    max = Math.min(max, Math.floor(stock / input.quantity));
  }
  return max === Infinity ? 0 : max;
}

export default function ProcesadoScreen() {
  const {
    inventory, animalInventory, processedInventory, activeBatches, day,
    processProduct, sellProcessed, processingBuildings, workers, money,
    buyProcessingBuilding, upgradeProcessingBuilding,
    assignWorkerToProcessingBuilding, unassignWorkerFromProcessingBuilding,
    installColdStorage, prices, animalPrices,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<TabId>('recipes');
  const [batchCounts, setBatchCounts] = useState<Record<string, number>>({});
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null);

  function getBatchCount(recipeId: string) { return batchCounts[recipeId] ?? 1; }

  const pendingBatches = (activeBatches ?? []).filter(b => b.completionDay > day);
  const readyBatches = (activeBatches ?? []).filter(b => b.completionDay <= day);

  const totalInventoryValue = (processedInventory ?? []).reduce((s, item) => {
    const def = PROCESSED_ITEM_DEFS.find(d => d.id === item.itemId);
    if (!def) return s;
    const mult = 0.5 + (item.quality / 100);
    return s + item.quantity * def.basePrice * mult;
  }, 0);

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
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Processing</Text>
      </View>
      <Text style={styles.screenSubtitle}>Transform raw goods into finished products</Text>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['recipes', 'batches', 'inventory'] as TabId[]).map(id => {
          const label = id === 'recipes' ? `📋 Recipes` : id === 'batches' ? `⏳ Batches${pendingBatches.length > 0 ? ` (${pendingBatches.length})` : ''}` : `📦 Stock${(processedInventory ?? []).length > 0 ? ` ($${Math.round(totalInventoryValue).toLocaleString()})` : ''}`;
          return (
            <TouchableOpacity key={id} style={[styles.tabBtn, activeTab === id && styles.tabBtnActive]} onPress={() => setActiveTab(id)}>
              <Text style={[styles.tabBtnText, activeTab === id && styles.tabBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── RECIPES TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'recipes' && (
        <>
          {(processedInventory ?? []).length === 0 && (
            <HintCard id="hint_processing" title="Process crops for higher margins" body="Raw crops sell at base price, but processed goods sell for 2–5× more. Build a processing building, assign a worker, and queue a recipe." />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 }}>
            <GuideButton entryId="system_processing" compact />
            <HelpSheet title="Processing" body="Processing takes in-game days. Each building needs a worker. Higher building tiers unlock more recipes and raise quality ceilings. Stage 4 products age and improve over time." entryId="system_processing" />
            <Text style={{ color: C.textFaint, fontSize: 11, marginLeft: 6 }}>How does processing work?</Text>
          </View>

          {[1, 2, 3, 4].map(stage => {
            const stageBuildings = PROCESSING_BUILDING_CONFIGS.filter(c => c.stage === stage);
            if (stageBuildings.length === 0) return null;
            return (
              <View key={stage} style={styles.stageSection}>
                <Text style={styles.stageLabel}>{STAGE_LABELS[stage]}</Text>
                {stageBuildings.map(config => {
                  const buildingType = BUILDING_TYPES.find(b => b.id === config.buildingTypeId);
                  const ownedBuilding = (processingBuildings ?? []).find(pb => pb.buildingTypeId === config.buildingTypeId);
                  const isOwned = !!ownedBuilding;
                  const isExpanded = expandedBuilding === config.buildingTypeId;
                  const recipes = PROCESSING_RECIPES.filter(r => r.buildingTypeId === config.buildingTypeId);
                  const canUpgrade = ownedBuilding && ownedBuilding.tier < 3;
                  const upgradeCost = canUpgrade ? (ownedBuilding.tier === 1 ? config.upgradeCostTier2 : config.upgradeCostTier3) : 0;

                  return (
                    <View key={config.buildingTypeId} style={styles.buildingSection}>
                      <TouchableOpacity style={styles.buildingHeader} onPress={() => setExpandedBuilding(isExpanded ? null : config.buildingTypeId)}>
                        <Text style={styles.buildingIcon}>🏭</Text>
                        <View style={styles.buildingInfo}>
                          <Text style={styles.buildingName}>{config.name}</Text>
                          {!isOwned && buildingType && (
                            <Text style={styles.buildingLocked}>🔒 Build — ${buildingType.cost.toLocaleString()}</Text>
                          )}
                          {isOwned && (
                            <Text style={styles.buildingTier}>Tier {ownedBuilding.tier} {ownedBuilding.hasColdStorage ? '❄️' : ''} · {ownedBuilding.assignedWorkerIds.length} worker{ownedBuilding.assignedWorkerIds.length !== 1 ? 's' : ''}</Text>
                          )}
                        </View>
                        <View style={[styles.buildingBadge, isOwned ? styles.badgeOwned : styles.badgeLocked]}>
                          <Text style={styles.badgeText}>{isOwned ? 'Owned' : 'Not built'}</Text>
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.buildingDetails}>
                          {!isOwned && buildingType && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => buyProcessingBuilding(config.buildingTypeId)} disabled={money < buildingType.cost}>
                              <Text style={styles.actionBtnText}>Buy Building — ${buildingType.cost.toLocaleString()}</Text>
                            </TouchableOpacity>
                          )}
                          {isOwned && canUpgrade && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => upgradeProcessingBuilding(ownedBuilding.id)} disabled={money < upgradeCost}>
                              <Text style={styles.actionBtnText}>Upgrade to Tier {ownedBuilding.tier + 1} — ${upgradeCost.toLocaleString()}</Text>
                            </TouchableOpacity>
                          )}
                          {isOwned && !ownedBuilding.hasColdStorage && (
                            <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => installColdStorage(ownedBuilding.id)} disabled={money < 8000}>
                              <Text style={styles.actionBtnSecondaryText}>Install Cold Storage — $8,000</Text>
                            </TouchableOpacity>
                          )}
                          {isOwned && (
                            <View style={styles.workerSection}>
                              <Text style={styles.workerLabel}>Assigned Workers ({config.role.replace(/_/g, ' ')})</Text>
                              {ownedBuilding.assignedWorkerIds.map(wid => {
                                const w = (workers ?? []).find(x => x.id === wid);
                                return (
                                  <View key={wid} style={styles.workerRow}>
                                    <Text style={styles.workerName}>👤 {w?.name ?? wid} (Tier {w?.tier ?? 1})</Text>
                                    <TouchableOpacity onPress={() => unassignWorkerFromProcessingBuilding(ownedBuilding.id, wid)}>
                                      <Text style={styles.workerRemove}>❌</Text>
                                    </TouchableOpacity>
                                  </View>
                                );
                              })}
                              {(workers ?? []).filter(w => !ownedBuilding.assignedWorkerIds.includes(w.id)).length > 0 && (
                                <View style={styles.workerAssignRow}>
                                  {(workers ?? []).filter(w => !ownedBuilding.assignedWorkerIds.includes(w.id)).map(w => (
                                    <TouchableOpacity key={w.id} style={styles.workerAssignBtn} onPress={() => assignWorkerToProcessingBuilding(ownedBuilding.id, w.id)}>
                                      <Text style={styles.workerAssignText}>+ {w.name}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}
                            </View>
                          )}

                          {recipes.map(recipe => {
                            const b = getBatchCount(recipe.id);
                            const max = isOwned ? inputStock(recipe, inventory, animalInventory, processedInventory ?? []) : 0;
                            const canQueue = isOwned && b > 0 && max >= b && ownedBuilding.tier >= recipe.minBuildingTier && ownedBuilding.assignedWorkerIds.length > 0 && !ownedBuilding.activeBatchId;
                            const def = PROCESSED_ITEM_DEFS.find(d => d.id === recipe.outputItemId);
                            const tierMult = ownedBuilding ? { 1: 1, 2: 2, 3: 4 }[ownedBuilding.tier] ?? 1 : 1;
                            const outputValue = def ? Math.round(recipe.baseOutputQuantity * b * tierMult * def.basePrice * 0.8) : 0;
                            const inputCost = Math.round(calcInputCost(recipe, b, prices ?? [], animalPrices ?? {}));
                            const profit = outputValue - inputCost;
                            const profitColor = profit > 0 ? '#4caf50' : profit < 0 ? '#ef5350' : '#888';
                            const tierLocked = isOwned && ownedBuilding.tier < recipe.minBuildingTier;

                            return (
                              <View key={recipe.id} style={[styles.recipeCard, !isOwned && styles.recipeCardLocked]}>
                                <View style={styles.recipeHeader}>
                                  <Text style={styles.recipeIcon}>{recipe.icon}</Text>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.recipeName}>{recipe.name}</Text>
                                    <Text style={styles.recipeTime}>⏱ {recipe.processingDays}d · {recipe.electricityKwhPerDay} kWh/day</Text>
                                  </View>
                                  {tierLocked && <Text style={styles.tierLock}>🔒 Tier {recipe.minBuildingTier}</Text>}
                                </View>

                                <View style={styles.inputsRow}>
                                  {recipe.inputs.map((input, idx) => (
                                    <View key={idx} style={styles.inputPill}>
                                      <Text style={styles.inputPillText}>{input.quantity * b} {inputUnit(input.itemId, input.source)} {inputDisplayName(input.itemId, input.source)}</Text>
                                    </View>
                                  ))}
                                  <Text style={styles.flowArrow}>→</Text>
                                  <View style={styles.outputPill}>
                                    <Text style={styles.outputPillText}>{recipe.baseOutputQuantity * b * tierMult} {def?.unit ?? ''} {def?.name ?? recipe.outputItemId}</Text>
                                    <Text style={styles.outputValue}>~${outputValue.toLocaleString()}</Text>
                                  </View>
                                </View>
                                {inputCost > 0 && (
                                  <View style={styles.profitRow}>
                                    <Text style={styles.profitLabel}>Cost ~${inputCost.toLocaleString()}</Text>
                                    <Text style={[styles.profitValue, { color: profitColor }]}>
                                      {profit >= 0 ? '+' : ''}${profit.toLocaleString()} margin
                                    </Text>
                                  </View>
                                )}
                                {isOwned && max > 0 && max < 3 && (
                                  <Text style={styles.stockWarn}>⚠ Only {max} batch{max !== 1 ? 'es' : ''} of input available</Text>
                                )}

                                <View style={styles.batchRow}>
                                  <TouchableOpacity style={styles.batchBtn} onPress={() => setBatchCounts(p => ({ ...p, [recipe.id]: Math.max(1, b - 1) }))} disabled={!isOwned}>
                                    <Text style={styles.batchBtnText}>−</Text>
                                  </TouchableOpacity>
                                  <Text style={styles.batchCount}>{b} batch{b !== 1 ? 'es' : ''}</Text>
                                  <TouchableOpacity style={styles.batchBtn} onPress={() => setBatchCounts(p => ({ ...p, [recipe.id]: Math.min(max, b + 1) }))} disabled={!isOwned || b >= max}>
                                    <Text style={styles.batchBtnText}>+</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity style={[styles.queueBtn, !canQueue && styles.queueBtnDisabled]} onPress={() => { processProduct(recipe.id, b); setBatchCounts(p => ({ ...p, [recipe.id]: 1 })); }} disabled={!canQueue}>
                                    <Text style={styles.queueBtnText}>
                                      {!isOwned ? '🔒' : tierLocked ? `Tier ${recipe.minBuildingTier}` : ownedBuilding.assignedWorkerIds.length === 0 ? 'No worker' : ownedBuilding.activeBatchId ? 'Busy' : max <= 0 ? 'No stock' : `Queue${b > 1 ? ` ×${b}` : ''}`}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
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
                  <Text style={styles.sectionLabel}>✅ Ready to collect — advance a day to receive</Text>
                  {readyBatches.map(batch => {
                    const recipe = PROCESSING_RECIPES.find(r => r.id === batch.recipeId);
                    const def = PROCESSED_ITEM_DEFS.find(d => d.id === batch.outputItemId);
                    return (
                      <View key={batch.id} style={[styles.batchCard, styles.batchCardReady]}>
                        <Text style={styles.batchTitle}>{recipe?.icon ?? '📦'} {recipe?.name ?? batch.outputItemId}</Text>
                        <Text style={styles.batchDetail}>{batch.outputQuantity} {def?.unit ?? ''} · <Text style={{ color: qualityColor(batch.quality) }}>{qualityLabel(batch.quality)} ({batch.quality})</Text></Text>
                        <Text style={styles.batchReady}>Ready</Text>
                      </View>
                    );
                  })}
                </>
              )}
              {pendingBatches.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: S.md }]}>⏳ In progress</Text>
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
              <Text style={styles.sectionLabel}>📦 Processed stock — ${Math.round(totalInventoryValue).toLocaleString()} total value</Text>
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
  screenSubtitle: { color: C.textMuted, fontSize: F.size.xs, paddingHorizontal: S.md, paddingBottom: S.xs },

  tabBar: { flexDirection: 'row', marginHorizontal: S.md, marginBottom: S.sm, backgroundColor: C.bgCard, borderRadius: R.md, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: R.sm },
  tabBtnActive: { backgroundColor: C.bgDeep },
  tabBtnText: { color: C.textMuted, fontSize: 11, fontWeight: 'bold' },
  tabBtnTextActive: { color: C.text },

  stageSection: { marginTop: S.sm, paddingHorizontal: S.md },
  stageLabel: { color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold', marginBottom: S.sm, marginTop: S.md },

  buildingSection: { marginBottom: S.sm },
  buildingHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, gap: 10 },
  buildingIcon: { fontSize: 24 },
  buildingInfo: { flex: 1 },
  buildingName: { color: C.text, fontWeight: 'bold', fontSize: 15 },
  buildingLocked: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  buildingTier: { color: C.textDim, fontSize: 11, marginTop: 2 },
  buildingBadge: { borderRadius: R.md, paddingHorizontal: S.sm, paddingVertical: 3 },
  badgeOwned: { backgroundColor: C.bgElevated },
  badgeLocked: { backgroundColor: C.bgCard },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: C.textMuted },

  buildingDetails: { backgroundColor: C.bgDeep, borderRadius: 10, padding: S.md, marginTop: 4 },
  actionBtn: { backgroundColor: C.amber, borderRadius: R.md, padding: S.sm, alignItems: 'center', marginBottom: S.sm },
  actionBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  actionBtnSecondary: { backgroundColor: C.bgElevated, borderRadius: R.md, padding: S.sm, alignItems: 'center', marginBottom: S.sm },
  actionBtnSecondaryText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },

  workerSection: { marginTop: S.sm, marginBottom: S.sm },
  workerLabel: { color: C.textMuted, fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  workerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  workerName: { color: C.text, fontSize: 12 },
  workerRemove: { fontSize: 12, color: C.red },
  workerAssignRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  workerAssignBtn: { backgroundColor: C.bgElevated, borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 4 },
  workerAssignText: { color: C.textDim, fontSize: 11 },

  recipeCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginBottom: S.sm, borderWidth: 1, borderColor: C.divider },
  recipeCardLocked: { opacity: 0.5 },
  recipeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  recipeIcon: { fontSize: 22, marginTop: 2 },
  recipeName: { color: C.text, fontWeight: 'bold', fontSize: F.size.lg },
  recipeTime: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  tierLock: { color: C.red, fontSize: 11, fontWeight: 'bold' },

  inputsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', backgroundColor: C.bgDeep, borderRadius: R.md, padding: 10, marginBottom: 10, gap: 6 },
  inputPill: { backgroundColor: C.bgCard, borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 3 },
  inputPillText: { color: C.textMuted, fontSize: 11 },
  flowArrow: { color: C.amber, fontSize: 16, fontWeight: 'bold' },
  outputPill: { backgroundColor: C.bgElevated, borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 3 },
  outputPillText: { color: C.textDim, fontSize: 11, fontWeight: 'bold' },
  outputValue: { color: C.amber, fontSize: 11, marginTop: 2 },
  profitRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, backgroundColor: C.bgDeep, borderRadius: R.xs, paddingHorizontal: 8, paddingVertical: 3 },
  profitLabel: { color: C.textFaint, fontSize: 10 },
  profitValue: { fontSize: 10, fontWeight: 'bold' },
  stockWarn:   { color: '#f59e0b', fontSize: 10, marginTop: 3 },

  batchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  batchBtn: { backgroundColor: C.divider, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6 },
  batchBtnText: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  batchCount: { color: C.text, fontSize: F.size.md, minWidth: 60, textAlign: 'center' },
  queueBtn: { flex: 1, backgroundColor: C.amber, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  queueBtnDisabled: { backgroundColor: C.bgElevated },
  queueBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },

  section: { marginTop: S.sm, paddingHorizontal: S.md },
  sectionLabel: { color: C.textMuted, fontSize: F.size.sm, marginBottom: S.sm },
  emptyText: { color: C.textMuted, fontSize: F.size.sm, textAlign: 'center', paddingVertical: 32 },

  batchCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginBottom: S.sm, borderWidth: 1, borderColor: C.divider },
  batchCardReady: { borderColor: C.greenDark },
  batchRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  batchTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  batchDays: { color: C.textMuted, fontSize: 11 },
  batchDetail: { color: C.textMuted, fontSize: 12, marginBottom: 6 },
  batchReady: { color: C.textDim, fontWeight: 'bold', fontSize: 12 },
  progressBar: { height: 4, backgroundColor: C.divider, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: C.amber, borderRadius: 2 },

  inventoryCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginBottom: S.sm, borderWidth: 1, borderColor: C.divider },
  inventoryHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  inventoryName: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  inventoryQty: { color: C.white, fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  qualityBadge: { alignItems: 'flex-end' },
  qualityText: { fontSize: 12, fontWeight: 'bold' },
  qualityScore: { color: C.textMuted, fontSize: 11 },
  inventoryMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  expiryText: { color: C.textMuted, fontSize: 11 },
  expiryWarning: { color: C.red },
  inventoryPrice: { color: C.textMuted, fontSize: 11 },
  sellBtn: { backgroundColor: C.greenDark, borderRadius: R.sm, padding: 8, alignItems: 'center' },
  sellBtnText: { color: C.white, fontSize: 12, fontWeight: 'bold' },
});
