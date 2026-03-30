import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import { ANIMAL_TYPES } from '../../data/animalTypes';
import { BUILDING_TYPES } from '../../data/buildingTypes';
import { ANIMAL_PRODUCTS } from '../../data/animalProducts';
import { sellValue, isMature, canBreed, TRAIT_ICONS, TRAIT_DESC, AnimalGenes } from '../../engine/animals';
import { ENCLOSURE_BUILDINGS } from '../../constants/enclosures';

function geneGrade(v: number): string {
  if (v >= 1.4) return 'S';
  if (v >= 1.2) return 'A';
  if (v >= 1.0) return 'B';
  if (v >= 0.8) return 'C';
  if (v >= 0.6) return 'D';
  return 'F';
}

function gradeColor(g: string): string {
  switch (g) {
    case 'S': return '#ffd700';
    case 'A': return '#81c784';
    case 'B': return '#64b5f6';
    case 'C': return '#aaa';
    case 'D': return '#ef9a9a';
    default:  return '#e53935';
  }
}

function GeneBar({ label, value }: { label: string; value: number }) {
  const grade = geneGrade(value);
  const color = gradeColor(grade);
  const pct = Math.round(((value - 0.5) / 1.0) * 100); // 0.5→0%, 1.5→100%
  return (
    <View style={gbStyles.row}>
      <Text style={gbStyles.label}>{label}</Text>
      <View style={gbStyles.barBg}>
        <View style={[gbStyles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[gbStyles.grade, { color }]}>{grade} ({value.toFixed(2)})</Text>
    </View>
  );
}

const gbStyles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label:  { color: '#888', fontSize: 10, width: 70 },
  barBg:  { flex: 1, height: 5, backgroundColor: '#1a1a2e', borderRadius: 3, marginHorizontal: 6 },
  barFill:{ height: 5, borderRadius: 3 },
  grade:  { fontSize: 10, width: 52, textAlign: 'right', fontWeight: 'bold' },
});

function getEnclosureCapacity(buildings: string[], enclosureType: string): number {
  const ids = ENCLOSURE_BUILDINGS[enclosureType] ?? [];
  return buildings.reduce((s, bId) => {
    if (!ids.includes(bId)) return s;
    const t = BUILDING_TYPES.find(bt => bt.id === bId);
    return s + (t?.capacity ?? 0);
  }, 0);
}

export default function AnimalesScreen() {
  const {
    money, animals, animalInventory, day, buildings, activeFair,
    buyAnimal, sellAnimal, collectAnimalProduction, sellAnimalProduct, breedAnimal,
    treatAnimal, collectAllProduction,
  } = useGameStore();
  const fairMult = activeFair ? (1 - activeFair.discount) : 1.0;
  const [expandedAnimalId, setExpandedAnimalId] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Animals" />

      {/* Farm Fair banner */}
      {activeFair && (
        <View style={styles.fairBanner}>
          <Text style={styles.fairTitle}>🎪 Farm Fair — {activeFair.daysRemaining}d left</Text>
          <Text style={styles.fairSub}>All animals {Math.round(activeFair.discount * 100)}% off!</Text>
        </View>
      )}

      {/* Animal product inventory */}
      {Object.keys(animalInventory).length > 0 && (
        <View style={styles.inventorySection}>
          <Text style={styles.sectionLabel}>Stored products</Text>
          <View style={styles.inventoryRow}>
            {ANIMAL_PRODUCTS.map(product => {
              const qty = Math.round(animalInventory[product.productType] ?? 0);
              if (qty <= 0) return null;
              const revenue = Math.round(qty * product.basePrice * 0.85);
              return (
                <View key={product.productType} style={styles.inventoryCard}>
                  <Text style={styles.inventoryName}>{product.name}</Text>
                  <Text style={styles.inventoryQty}>
                    {qty.toLocaleString()} {product.unit}
                  </Text>
                  <Text style={styles.inventoryPrice}>${product.basePrice}/{product.unit}</Text>
                  <TouchableOpacity
                    style={styles.sellProductBtn}
                    onPress={() => sellAnimalProduct(product.productType, qty)}
                  >
                    <Text style={styles.sellProductBtnText}>
                      Sell ${revenue.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Batch collect */}
      {animals.some(a => {
        const type = ANIMAL_TYPES.find(t => t.id === a.typeId);
        return type?.productionType && !a.sick;
      }) && (
        <TouchableOpacity style={styles.batchCollectBtn} onPress={collectAllProduction}>
          <Text style={styles.batchCollectText}>🧺 Collect All Production</Text>
        </TouchableOpacity>
      )}

      {/* Owned animals */}
      <Text style={styles.sectionLabel}>My animals ({animals.length})</Text>
      <FlatList
        data={animals}
        keyExtractor={a => a.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.list}
        renderItem={({ item }) => {
          const type = ANIMAL_TYPES.find(t => t.id === item.typeId)!;
          const mature = isMature(item, type, day);
          const value = sellValue(item, type, day);
          const age = day - item.bornDay;
          const breedReady = canBreed(item, type, day);
          const breedCooldown = type.breedingDays > 0
            ? Math.max(0, (item.lastBreedDay + type.breedingDays) - day)
            : 0;
          const enclosureCapacity = getEnclosureCapacity(buildings, type.enclosureType);
          const enclosureCount = animals.filter(a => a.typeId === item.typeId).length;
          const enclosureFull = enclosureCount >= enclosureCapacity;
          const hasMate = item.sex === 'female' && animals.some(a =>
            a.id !== item.id && a.typeId === item.typeId && a.sex === 'male' && isMature(a, type, day)
          );
          const isFemale = item.sex === 'female';
          const sexIcon = isFemale ? '♀' : '♂';
          const sexColor = isFemale ? '#f06292' : '#64b5f6';
          const isOld = age > type.maxPriceAge;
          const treatCost = Math.max(50, Math.round(type.maxSellPrice * 0.05));
          return (
            <View style={[styles.card, item.sick && styles.cardSick]}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.animalName}>{type.name}</Text>
                <Text style={[styles.sexBadge, { color: sexColor }]}>{sexIcon}</Text>
              </View>
              <Text style={styles.detail}>
                Age: {age}d {mature ? (isOld ? '👴 Old' : '✅') : '🌱'}
              </Text>
              {(item.traits ?? []).length > 0 && (
                <View style={styles.traitRow}>
                  {(item.traits ?? []).map(trait => (
                    <View key={trait} style={styles.traitBadge}>
                      <Text style={styles.traitText} numberOfLines={1}>{TRAIT_ICONS[trait]} {TRAIT_DESC[trait]}</Text>
                    </View>
                  ))}
                </View>
              )}
              {/* Expandable genetics panel */}
              <TouchableOpacity onPress={() => setExpandedAnimalId(expandedAnimalId === item.id ? null : item.id)} style={genStyles.toggleBtn}>
                <Text style={genStyles.toggleBtnText}>{expandedAnimalId === item.id ? '▲ Hide Genetics' : '▼ Genetics'}</Text>
              </TouchableOpacity>

              {expandedAnimalId === item.id && (() => {
                const g = item.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
                const avgGrade = geneGrade((g.production + g.hardiness + g.growth + g.value) / 4);
                const avgColor = gradeColor(avgGrade);
                return (
                  <View style={genStyles.panel}>
                    <View style={genStyles.panelHeader}>
                      <Text style={genStyles.panelTitle}>🧬 Genes</Text>
                      <View style={[genStyles.gradeBadge, { backgroundColor: avgColor + '33', borderColor: avgColor }]}>
                        <Text style={[genStyles.gradeBadgeText, { color: avgColor }]}>{avgGrade} Grade</Text>
                      </View>
                    </View>
                    <GeneBar label="🥚 Production" value={g.production} />
                    <GeneBar label="💪 Hardiness"  value={g.hardiness} />
                    <GeneBar label="⚡ Growth"     value={g.growth} />
                    <GeneBar label="💰 Value"      value={g.value} />
                  </View>
                );
              })()}
              {item.sick && (
                <View style={styles.sickRow}>
                  <Text style={styles.sickText}>🤒 Sick</Text>
                  <TouchableOpacity
                    style={[styles.treatBtn, money < treatCost && styles.breedBtnDisabled]}
                    onPress={() => treatAnimal(item.id)}
                    disabled={money < treatCost}
                  >
                    <Text style={styles.btnText}>Treat ${treatCost}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!item.sick && type.productionType && (
                <TouchableOpacity style={styles.collectBtn} onPress={() => collectAnimalProduction(item.id)}>
                  <Text style={styles.btnText}>Collect</Text>
                </TouchableOpacity>
              )}
              {isFemale && type.breedingDays > 0 && (
                <TouchableOpacity
                  style={[styles.breedBtn, (!breedReady || enclosureFull || !hasMate) && styles.breedBtnDisabled]}
                  onPress={() => breedAnimal(item.id)}
                  disabled={!breedReady || enclosureFull || !hasMate}
                >
                  <Text style={styles.btnText}>
                    {enclosureFull ? 'Full' : !hasMate ? '♂ needed' : breedReady ? '🐣 Breed' : `${breedCooldown}d`}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.sellBtn} onPress={() => sellAnimal(item.id)}>
                <Text style={styles.btnText}>Sell ${Math.round(value).toLocaleString()}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>You have no animals yet.</Text>}
      />

      {/* Buy animals */}
      <Text style={styles.sectionLabel}>Buy animals</Text>
      <FlatList
        data={ANIMAL_TYPES}
        keyExtractor={t => t.id}
        numColumns={2}
        style={styles.list}
        renderItem={({ item }) => {
          const capacity = getEnclosureCapacity(buildings, item.enclosureType);
          // Species isolation: find what species currently occupies this enclosure type
          const enclosureOccupant = animals.find(a => {
            const at = ANIMAL_TYPES.find(t => t.id === a.typeId);
            return at?.enclosureType === item.enclosureType;
          });
          const occupantType = enclosureOccupant
            ? ANIMAL_TYPES.find(t => t.id === enclosureOccupant.typeId)
            : null;
          const blockedBySpecies = !!occupantType && occupantType.id !== item.id;
          const occupied = animals.filter(a => a.typeId === item.id).length;
          const noRoom = capacity === 0 || occupied >= capacity || blockedBySpecies;
          const femaleCost = Math.round(item.buyCost * fairMult);
          const maleCost = Math.round(item.buyCost * fairMult * 0.7);
          // Bees are always female (hive)
          const isBee = item.id === 'abeja';
          return (
            <View style={[styles.buyCard, activeFair ? styles.buyCardFair : null]}>
              <Text style={styles.animalName}>{item.name}</Text>
              {item.productionType && <Text style={styles.detail}>📦 {item.productionType}</Text>}
              <Text style={[styles.capacityText, noRoom && styles.capacityFull]}>
                {capacity === 0
                  ? '🏗️ No enclosure'
                  : blockedBySpecies
                    ? `🚫 ${occupantType!.name}s here`
                    : `${occupied}/${capacity} housed`}
              </Text>
              <View style={styles.sexBtnRow}>
                {!isBee && (
                  <TouchableOpacity
                    style={[styles.sexBtnM, (noRoom || money < maleCost) && styles.buyCardDisabled]}
                    onPress={() => buyAnimal(item.id, 'male')}
                    disabled={noRoom || money < maleCost}
                  >
                    <Text style={styles.sexBtnLabel}>♂</Text>
                    {activeFair ? (
                      <View style={styles.priceRow}>
                        <Text style={styles.priceOriginal}>${Math.round(item.buyCost * 0.7).toLocaleString()}</Text>
                        <Text style={styles.priceFairSm}>${maleCost.toLocaleString()}</Text>
                      </View>
                    ) : (
                      <Text style={styles.sexBtnPrice}>${maleCost.toLocaleString()}</Text>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.sexBtnF, (noRoom || money < femaleCost) && styles.buyCardDisabled, isBee && { flex: 1 }]}
                  onPress={() => buyAnimal(item.id, 'female')}
                  disabled={noRoom || money < femaleCost}
                >
                  <Text style={styles.sexBtnLabel}>{isBee ? '🐝' : '♀'}</Text>
                  {activeFair ? (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceOriginal}>${item.buyCost.toLocaleString()}</Text>
                      <Text style={styles.priceFairSm}>${femaleCost.toLocaleString()}</Text>
                    </View>
                  ) : (
                    <Text style={styles.sexBtnPrice}>${femaleCost.toLocaleString()}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  sectionLabel: { color: '#888', fontSize: 13, paddingHorizontal: 16, marginTop: 6, marginBottom: 4 },
  list: { paddingHorizontal: 8 },
  empty: { color: '#555', padding: 16 },

  inventorySection: { paddingHorizontal: 8, marginBottom: 4 },
  inventoryRow: { flexDirection: 'row', flexWrap: 'wrap' },
  inventoryCard: { backgroundColor: '#0f3460', borderRadius: 10, padding: 10, margin: 4, minWidth: 120 },
  inventoryName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  inventoryQty: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  inventoryPrice: { color: '#888', fontSize: 11, marginTop: 2, marginBottom: 4 },
  sellProductBtn: { backgroundColor: '#2e7d32', borderRadius: 6, padding: 6, alignItems: 'center' },
  sellProductBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  card: { backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginRight: 10, width: 140 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sexBadge: { fontSize: 16, fontWeight: 'bold' },
  animalName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14 },
  detail: { color: '#aaa', fontSize: 12, marginTop: 2 },
  collectBtn: { backgroundColor: '#1565c0', borderRadius: 6, padding: 5, marginTop: 6 },
  breedBtn: { backgroundColor: '#6a1b9a', borderRadius: 6, padding: 5, marginTop: 4 },
  breedBtnDisabled: { backgroundColor: '#333' },
  sellBtn: { backgroundColor: '#b71c1c', borderRadius: 6, padding: 5, marginTop: 4 },
  btnText: { color: '#fff', fontSize: 11, textAlign: 'center' },
  buyCard: { backgroundColor: '#16213e', borderRadius: 10, padding: 12, margin: 6, flex: 1 },
  buyCardDisabled: { opacity: 0.4 },
  buyCardFair: { borderWidth: 1, borderColor: '#c8860a' },
  capacityText: { color: '#888', fontSize: 11, marginTop: 4 },
  capacityFull: { color: '#ef9a9a' },
  sexBtnRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  sexBtnM: { flex: 1, backgroundColor: '#1565c0', borderRadius: 6, padding: 5, alignItems: 'center' },
  sexBtnF: { flex: 1, backgroundColor: '#880e4f', borderRadius: 6, padding: 5, alignItems: 'center' },
  sexBtnLabel: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  sexBtnPrice: { color: '#ddd', fontSize: 10, marginTop: 1 },
  priceFairSm: { color: '#81c784', fontWeight: 'bold', fontSize: 11 },

  cardSick: { borderWidth: 1, borderColor: '#f44336' },
  geneRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  geneText: { fontSize: 10, fontWeight: 'bold' },
  traitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  traitBadge: { backgroundColor: '#1a1050', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: '#7c4dff' },
  traitText: { color: '#b39ddb', fontSize: 9, fontWeight: 'bold' },
  sickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sickText: { color: '#f44336', fontSize: 12, fontWeight: 'bold' },
  treatBtn: { backgroundColor: '#b71c1c', borderRadius: 6, padding: 5 },
  batchCollectBtn: { backgroundColor: '#1565c0', borderRadius: 8, marginHorizontal: 8, marginBottom: 6, padding: 10, alignItems: 'center' },
  batchCollectText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  fairBanner: { backgroundColor: '#3a2a00', borderRadius: 10, marginHorizontal: 8, marginBottom: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#c8860a' },
  fairTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14 },
  fairSub: { color: '#c8860a', fontSize: 12, marginTop: 2 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  priceOriginal: { color: '#666', fontSize: 11, textDecorationLine: 'line-through' },
  priceFair: { color: '#81c784', fontWeight: 'bold', fontSize: 13 },
});

const genStyles = StyleSheet.create({
  toggleBtn:      { paddingVertical: 4, alignSelf: 'flex-start' },
  toggleBtnText:  { color: '#4fc3f7', fontSize: 11 },
  panel:          { backgroundColor: '#0a1628', borderRadius: 8, padding: 10, marginTop: 6 },
  panelHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  panelTitle:     { color: '#e8d5a3', fontWeight: 'bold', fontSize: 12 },
  gradeBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  gradeBadgeText: { fontSize: 11, fontWeight: 'bold' },
});
