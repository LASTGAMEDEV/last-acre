import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import { PROCESSING_RECIPES, PROCESSED_PRODUCTS, ProcessingRecipe } from '../../data/processingTypes';
import { CROP_TYPES } from '../../data/cropTypes';
import { ANIMAL_PRODUCTS } from '../../data/animalProducts';
import { BUILDING_TYPES } from '../../data/buildingTypes';
import HelpSheet from '../../components/HelpSheet';

const BUILDING_GROUPS: { buildingId: string; label: string; icon: string }[] = [
  { buildingId: 'bld_molino',      label: 'Flour Mill',             icon: '⚙️' },
  { buildingId: 'bld_prensa',      label: 'Oil Press',              icon: '🛢️' },
  { buildingId: 'bld_lacteo',      label: 'Dairy Plant',            icon: '🥛' },
  { buildingId: 'bld_procesadora', label: 'Agricultural Processor', icon: '🏭' },
];

export default function ProcesadoScreen() {
  const {
    buildings, inventory, animalInventory, processedInventory,
    processProduct, sellProcessed,
  } = useGameStore();

  const [batches, setBatches] = useState<Record<string, number>>({});

  function getBatches(recipeId: string) {
    return batches[recipeId] ?? 1;
  }

  function maxBatches(recipe: ProcessingRecipe): number {
    const stock = recipe.input.source === 'crop'
      ? (inventory[recipe.input.itemId] ?? 0)
      : (animalInventory[recipe.input.itemId] ?? 0);
    return Math.floor(stock / recipe.input.amount);
  }

  function getInputName(recipe: ProcessingRecipe): string {
    if (recipe.input.source === 'crop') {
      return CROP_TYPES.find(c => c.id === recipe.input.itemId)?.name ?? recipe.input.itemId;
    }
    return ANIMAL_PRODUCTS.find(p => p.productType === recipe.input.itemId)?.name ?? recipe.input.itemId;
  }

  function getInputStock(recipe: ProcessingRecipe): number {
    return recipe.input.source === 'crop'
      ? (inventory[recipe.input.itemId] ?? 0)
      : (animalInventory[recipe.input.itemId] ?? 0);
  }

  function getInputUnit(recipe: ProcessingRecipe): string {
    if (recipe.input.source === 'crop') {
      return CROP_TYPES.find(c => c.id === recipe.input.itemId)?.unit ?? '';
    }
    return ANIMAL_PRODUCTS.find(p => p.productType === recipe.input.itemId)?.unit ?? '';
  }

  const totalProcessedValue = Object.entries(processedInventory).reduce((s, [id, qty]) => {
    const p = PROCESSED_PRODUCTS.find(pr => pr.id === id);
    return s + (p ? p.basePrice * qty : 0);
  }, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader title="Processing" subtitle="Transform raw materials into higher-value products" />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 }}>
        <HelpSheet
          title="Processing"
          body="Processing raw crops into products (flour, oil, cheese, etc.) increases their sell value by 50–200%. It takes time and requires the right building, but produces goods that are immune to crop market fluctuations."
        />
        <Text style={{ color: '#555', fontSize: 11, marginLeft: 6 }}>What is processing?</Text>
      </View>

      {/* Processed inventory */}
      {Object.keys(processedInventory).some(k => (processedInventory[k] ?? 0) > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Processed products — ${Math.round(totalProcessedValue).toLocaleString()} in stock</Text>
          <View style={styles.inventoryGrid}>
            {PROCESSED_PRODUCTS.map(product => {
              const qty = Math.round(processedInventory[product.id] ?? 0);
              if (qty <= 0) return null;
              const revenue = Math.round(qty * product.basePrice);
              return (
                <View key={product.id} style={styles.inventoryCard}>
                  <Text style={styles.inventoryName}>{product.name}</Text>
                  <Text style={styles.inventoryQty}>{qty.toLocaleString()} {product.unit}</Text>
                  <Text style={styles.inventoryPrice}>${product.basePrice}/{product.unit}</Text>
                  <TouchableOpacity
                    style={styles.sellBtn}
                    onPress={() => sellProcessed(product.id, qty)}
                  >
                    <Text style={styles.sellBtnText}>Sell ${revenue.toLocaleString()}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Recipe groups */}
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
                  <Text style={styles.buildingLocked}>
                    🔒 Build in Shop — ${buildingType.cost.toLocaleString()}
                  </Text>
                )}
              </View>
              <View style={[styles.buildingBadge, owned ? styles.badgeOwned : styles.badgeLocked]}>
                <Text style={styles.badgeText}>{owned ? 'Active' : 'Not built'}</Text>
              </View>
            </View>

            {groupRecipes.map(recipe => {
              const b = getBatches(recipe.id);
              const max = maxBatches(recipe);
              const canProcess = owned && b > 0 && max >= b;
              const inputStock = getInputStock(recipe);
              const inputUnit = getInputUnit(recipe);
              const inputName = getInputName(recipe);
              const outputProduct = PROCESSED_PRODUCTS.find(p => p.id === recipe.outputProductId)!;
              const inputCost = recipe.input.amount * b;
              const outputUnits = recipe.outputAmount * b;
              const outputValue = Math.round(outputUnits * outputProduct.basePrice);

              return (
                <View key={recipe.id} style={[styles.recipeCard, !owned && styles.recipeCardLocked]}>
                  <View style={styles.recipeHeader}>
                    <Text style={styles.recipeIcon}>{recipe.icon}</Text>
                    <Text style={styles.recipeName}>{recipe.name}</Text>
                  </View>

                  <View style={styles.recipeFlow}>
                    <View style={styles.flowItem}>
                      <Text style={styles.flowLabel}>Input</Text>
                      <Text style={styles.flowValue}>
                        {recipe.input.amount * b} {inputUnit} {inputName}
                      </Text>
                      <Text style={styles.flowStock}>
                        Stock: {Math.floor(inputStock)} {inputUnit}
                      </Text>
                    </View>
                    <Text style={styles.flowArrow}>→</Text>
                    <View style={styles.flowItem}>
                      <Text style={styles.flowLabel}>Output</Text>
                      <Text style={styles.flowValue}>
                        {outputUnits} {outputProduct.unit} {outputProduct.name}
                      </Text>
                      <Text style={[styles.flowStock, { color: '#81c784' }]}>
                        ${outputValue.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.batchRow}>
                    <TouchableOpacity
                      style={styles.batchBtn}
                      onPress={() => setBatches(prev => ({ ...prev, [recipe.id]: Math.max(1, b - 1) }))}
                      disabled={!owned}
                    >
                      <Text style={styles.batchBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.batchCount}>{b} batch{b !== 1 ? 'es' : ''}</Text>
                    <TouchableOpacity
                      style={styles.batchBtn}
                      onPress={() => setBatches(prev => ({ ...prev, [recipe.id]: Math.min(max, b + 1) }))}
                      disabled={!owned || b >= max}
                    >
                      <Text style={styles.batchBtnText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.batchBtn, styles.maxBtn]}
                      onPress={() => setBatches(prev => ({ ...prev, [recipe.id]: Math.max(1, max) }))}
                      disabled={!owned || max <= 0}
                    >
                      <Text style={styles.batchBtnText}>Max</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.processBtn, !canProcess && styles.processBtnDisabled]}
                      onPress={() => {
                        processProduct(recipe.id, b);
                        setBatches(prev => ({ ...prev, [recipe.id]: 1 }));
                      }}
                      disabled={!canProcess}
                    >
                      <Text style={styles.processBtnText}>
                        {!owned ? '🔒' : max <= 0 ? 'No material' : `Process ${b > 1 ? `×${b}` : ''}`}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {owned && max > 0 && (
                    <Text style={styles.maxInfo}>
                      Up to {max} batch{max !== 1 ? 'es' : ''} available ({inputCost} / {Math.floor(inputStock)} {inputUnit})
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { paddingBottom: 100 },
  subtitle: { color: '#888', fontSize: 12, marginTop: 2 },

  section: { marginTop: 12, paddingHorizontal: 12 },
  sectionLabel: { color: '#888', fontSize: 13, marginBottom: 8 },

  inventoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inventoryCard: { backgroundColor: '#0f3460', borderRadius: 10, padding: 10, minWidth: 130, flex: 1 },
  inventoryName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  inventoryQty: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  inventoryPrice: { color: '#888', fontSize: 11, marginTop: 2, marginBottom: 6 },
  sellBtn: { backgroundColor: '#2e7d32', borderRadius: 6, padding: 6, alignItems: 'center' },
  sellBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  buildingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  buildingIcon: { fontSize: 24 },
  buildingInfo: { flex: 1 },
  buildingName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 15 },
  buildingLocked: { color: '#888', fontSize: 11, marginTop: 2 },
  buildingBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOwned: { backgroundColor: '#1b3a1b' },
  badgeLocked: { backgroundColor: '#2a2a2a' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#aaa' },

  recipeCard: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e1e3a',
  },
  recipeCardLocked: { opacity: 0.5 },
  recipeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  recipeIcon: { fontSize: 20 },
  recipeName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14 },

  recipeFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f1f3d',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  flowItem: { flex: 1 },
  flowLabel: { color: '#555', fontSize: 10, marginBottom: 3 },
  flowValue: { color: '#e8d5a3', fontSize: 13, fontWeight: 'bold' },
  flowStock: { color: '#888', fontSize: 11, marginTop: 2 },
  flowArrow: { color: '#c8860a', fontSize: 20, fontWeight: 'bold', paddingHorizontal: 8 },

  batchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  batchBtn: { backgroundColor: '#1e1e3a', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  maxBtn: { backgroundColor: '#2a2a4a' },
  batchBtnText: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  batchCount: { color: '#e8d5a3', fontSize: 13, minWidth: 60, textAlign: 'center' },
  processBtn: { flex: 1, backgroundColor: '#c8860a', borderRadius: 8, padding: 8, alignItems: 'center' },
  processBtnDisabled: { backgroundColor: '#333' },
  processBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  maxInfo: { color: '#555', fontSize: 11, marginTop: 6 },
});
