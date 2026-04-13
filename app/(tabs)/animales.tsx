import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AnimalShowModal from '../../components/AnimalShowModal';
import HintCard from '../../components/HintCard';
import DispatchModal from '../../components/DispatchModal';
import { useGameStore } from '../../store/useGameStore';
import { DeliveryCargo, LIVESTOCK_TRAILER_IDS, ProductionBuildingState } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { ANIMAL_TYPES } from '../../data/animalTypes';
import { BUILDING_TYPES } from '../../data/buildingTypes';
import { ANIMAL_PRODUCTS } from '../../data/animalProducts';
import { sellValue, isMature, canBreed, TRAIT_ICONS, TRAIT_DESC, AnimalGenes, OwnedAnimal, getLactationState, lactationDaysRemaining, dryDaysRemaining, LACTATION_PARAMS, getSeasonMultiplier, GRAIN_CROP_IDS } from '../../engine/animals';
import { ENCLOSURE_BUILDINGS } from '../../constants/enclosures';
import HelpSheet from '../../components/HelpSheet';
import { DAIRY_SPECIES } from '../../engine/productionBuildings';

function WelfareBadge({ score }: { score: number | undefined }) {
  if (score === undefined) return null;
  const color = score >= 80 ? '#4caf50' : score >= 60 ? '#ff9800' : '#ef5350';
  const label = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Poor';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color, fontSize: 11, fontWeight: 'bold' }}>Welfare {score} — {label}</Text>
    </View>
  );
}

function BuildingStatusLine({
  animalTypeId,
  productionBuildings,
}: {
  animalTypeId: string;
  productionBuildings: ProductionBuildingState[];
}) {
  const pb = productionBuildings.find(b => b.animalTypeId === animalTypeId);
  if (!pb) {
    return (
      <Text style={{ color: '#ff9800', fontSize: 11 }}>
        🏗 No production building — contractor covering (12% fee)
      </Text>
    );
  }
  const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
  const manned = pb.assignedWorkerIds.length > 0;
  const certEmoji = pb.certificationTier === 'organic' ? '🌿' : pb.certificationTier === 'certified' ? '✅' : '';
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: '#81c784', fontSize: 11 }}>
        🏛 {bt?.name ?? pb.buildingTypeId} {certEmoji}
        {!manned ? ' ⚠ Unmanned' : ''}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: '#aaa', fontSize: 11 }}>Hygiene</Text>
        <View style={{ flex: 1, height: 4, backgroundColor: '#333', borderRadius: 2, maxWidth: 80 }}>
          <View style={{
            width: `${pb.hygiene}%` as any,
            height: 4,
            borderRadius: 2,
            backgroundColor: pb.hygiene >= 60 ? '#4caf50' : pb.hygiene >= 40 ? '#ff9800' : '#ef5350',
          }} />
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>{Math.round(pb.hygiene)}%</Text>
      </View>
    </View>
  );
}

function MilkGradeBadge({ animalTypeId, milkGrades }: { animalTypeId: string; milkGrades: Record<string, 'A' | 'B' | 'C'> }) {
  if (!DAIRY_SPECIES.has(animalTypeId)) return null;
  const grade = milkGrades[animalTypeId] ?? 'B';
  const color = grade === 'A' ? '#4caf50' : grade === 'B' ? '#ff9800' : '#ef5350';
  return (
    <Text style={{ color, fontSize: 11, fontWeight: 'bold' }}>
      Milk Grade {grade}{grade === 'C' ? ' ⚠ city/export blocked' : ''}
    </Text>
  );
}

function QuarantineBadge({ animal, day }: { animal: OwnedAnimal; day: number }) {
  if (!animal.quarantineUntilDay || animal.quarantineUntilDay <= day) return null;
  const remaining = animal.quarantineUntilDay - day;
  return (
    <Text style={{ color: '#ff9800', fontSize: 10 }}>
      🔒 In quarantine — {remaining} day{remaining !== 1 ? 's' : ''} remaining
    </Text>
  );
}

function IsolationBadge({ animal }: { animal: OwnedAnimal }) {
  if (!animal.inIsolation) return null;
  return (
    <Text style={{ color: '#29b6f6', fontSize: 10 }}>🏥 In sick bay (isolated)</Text>
  );
}

function OptimalWeightBadge({ animal }: { animal: OwnedAnimal }) {
  if (!animal.optimalWeightReached) return null;
  return (
    <Text style={{ color: '#66bb6a', fontSize: 10, fontWeight: 'bold' }}>⚖ Optimal weight — +5% sale bonus</Text>
  );
}

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
  row:    { flexDirection: 'row', alignItems: 'center', marginBottom: S.xs },
  label:  { color: C.textMuted, fontSize: F.size.xs, width: 70 },
  barBg:  { flex: 1, height: 5, backgroundColor: C.bg, borderRadius: 3, marginHorizontal: 6 },
  barFill:{ height: 5, borderRadius: 3 },
  grade:  { fontSize: F.size.xs, width: 52, textAlign: 'right', fontWeight: 'bold' },
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
    breedingPairs, setBreedingPair, clearBreedingPair,
    animalPrices, upgradeAnimalGene,
    showWindowOpen, showResults,
    workers, grainMissedDays, hayMissedDays, feedAnimals, inventory, animalsManuallyFed,
    trailers, deliveryJobs,
    productionBuildings, animalWelfareScores, milkGrades,
    designateAsSire, removeFromSirePen, sirePenAnimalIds,
  } = useGameStore();
  const fairMult = activeFair ? (1 - activeFair.discount) : 1.0;
  const hasAnimalWorker = (workers ?? []).some(
    (w: any) => w.typeId === 'animal_keeper' || w.typeId === 'zootechnician'
  );
  const grainStock = GRAIN_CROP_IDS.reduce(
    (sum: number, id: string) => sum + (inventory[id] ?? 0), 0
  );
  const hayStock = animalInventory['hay'] ?? 0;
  const hasFeedAnimals = animals.some(
    a => ANIMAL_TYPES.find(t => t.id === a.typeId)?.feedType != null
  );
  const [expandedAnimalId, setExpandedAnimalId] = useState<string | null>(null);
  const [showModalVisible, setShowModalVisible] = useState(false);
  type AnimalTab = 'herd' | 'results';
  const [animalTab, setAnimalTab] = useState<AnimalTab>('herd');
  const [liveDispatchVisible, setLiveDispatchVisible] = useState(false);
  const [liveDispatchCargo, setLiveDispatchCargo] = useState<DeliveryCargo[]>([]);

  const hasLivestockTrailer = (trailers ?? []).some((tr: any) => {
    const busy = (deliveryJobs ?? []).some((j: any) => j.trailerId === tr.id);
    return LIVESTOCK_TRAILER_IDS.includes(tr.typeId) && !busy && tr.hitchedTo !== null;
  });

  const handleLiveAnimalSell = (animalId: string, animalTypeId: string) => {
    if (!hasLivestockTrailer) {
      Alert.alert(
        'Livestock Trailer Required',
        'You need a livestock trailer hitched to a truck to sell live animals. Without one, you can only cull for meat.',
        [{ text: 'OK' }]
      );
      return;
    }
    setLiveDispatchCargo([{ itemId: animalId, quantity: 1, category: 'animal' }]);
    setLiveDispatchVisible(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Animals</Text>

      {animals.length === 0 && (
        <HintCard id="hint_animals" title="Start your livestock" body="Animals produce eggs, milk, honey, wool, and meat every day. Buy a chicken coop from the Shop first, then purchase hens from this screen." />
      )}

      {/* County Show banner */}
      {showWindowOpen && (
        <TouchableOpacity
          style={showStyles.banner}
          onPress={() => setShowModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={showStyles.bannerText}>🏆 County Show entries open — deadline in {90 - ((day - 1) % 90)} days</Text>
          <Text style={showStyles.bannerCta}>Enter Show →</Text>
        </TouchableOpacity>
      )}

      {/* Herd / Results tab bar */}
      <View style={showStyles.tabBar}>
        {(['herd', 'results'] as AnimalTab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[showStyles.tabBtn, animalTab === t && showStyles.tabBtnActive]}
            onPress={() => setAnimalTab(t)}
          >
            <Text style={[showStyles.tabText, animalTab === t && showStyles.tabTextActive]}>
              {t === 'herd' ? 'My Herd' : `Show Results${(showResults ?? []).length ? ` (${(showResults ?? []).length})` : ''}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {animalTab === 'herd' && <>
      {/* Farm Fair banner */}
      {activeFair && (
        <View style={styles.fairBanner}>
          <Text style={styles.fairTitle}>🎪 Farm Fair — {activeFair.daysRemaining}d left</Text>
          <Text style={styles.fairSub}>All animals {Math.round(activeFair.discount * 100)}% off!</Text>
        </View>
      )}

      {/* Feed Stock */}
      {hasFeedAnimals && <View style={{ backgroundColor: C.bgCard, borderRadius: 10, marginHorizontal: 8, marginBottom: 8, padding: 12 }}>
        <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>Feed Stock</Text>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#aaa', fontSize: 11 }}>🌾 Grain</Text>
            <Text style={{ color: grainStock < 5 ? '#ef5350' : '#81c784', fontWeight: 'bold' }}>
              {Math.floor(grainStock).toLocaleString()} kg
            </Text>
            {grainMissedDays > 0 && (
              <Text style={{ color: '#ff9800', fontSize: 10 }}>⚠ {grainMissedDays}/7 days underfed</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#aaa', fontSize: 11 }}>🌿 Hay</Text>
            <Text style={{ color: hayStock < 10 ? '#ef5350' : '#81c784', fontWeight: 'bold' }}>
              {Math.floor(hayStock).toLocaleString()} kg
            </Text>
            {hayMissedDays > 0 && (
              <Text style={{ color: '#ff9800', fontSize: 10 }}>⚠ {hayMissedDays}/7 days underfed</Text>
            )}
          </View>
        </View>
        {!hasAnimalWorker && (
          <TouchableOpacity
            style={{ backgroundColor: animalsManuallyFed ? '#2e7d32' : '#1b5e20', borderRadius: 6, padding: 10, alignItems: 'center', opacity: animalsManuallyFed ? 0.7 : 1 }}
            onPress={feedAnimals}
            disabled={animalsManuallyFed}
          >
            <Text style={{ color: C.white, fontWeight: 'bold' }}>{animalsManuallyFed ? '✓ Fed for today' : 'Feed Animals Today'}</Text>
            <Text style={{ color: '#a5d6a7', fontSize: 11 }}>Hire an animal keeper to automate this</Text>
          </TouchableOpacity>
        )}
        {hasAnimalWorker && (
          <Text style={{ color: '#66bb6a', fontSize: 11 }}>✓ Animal worker feeds automatically</Text>
        )}
      </View>}

      {/* Animal product inventory */}
      {Object.keys(animalInventory).length > 0 && (
        <View style={styles.inventorySection}>
          <Text style={styles.sectionLabel}>Stored products</Text>
          <View style={styles.inventoryRow}>
            {ANIMAL_PRODUCTS.map(product => {
              const qty = Math.round(animalInventory[product.productType] ?? 0);
              if (qty <= 0) return null;
              const livePrice = (animalPrices ?? {})[product.productType] ?? product.basePrice;
              const pctChange = ((livePrice - product.basePrice) / product.basePrice) * 100;
              const revenue = Math.round(qty * livePrice * 0.85);
              return (
                <View key={product.productType} style={styles.inventoryCard}>
                  <Text style={styles.inventoryName}>{product.name}</Text>
                  <Text style={styles.inventoryQty}>
                    {qty.toLocaleString()} {product.unit}
                  </Text>
                  <Text style={[styles.inventoryPrice, { color: pctChange >= 0 ? '#66bb6a' : '#ef5350' }]}>
                    ${livePrice.toFixed(2)}/{product.unit} {pctChange >= 0 ? '▲' : '▼'}{Math.abs(pctChange).toFixed(1)}%
                  </Text>
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
      {(() => {
        const inQ = (animals ?? []).filter((a: OwnedAnimal) => a.quarantineUntilDay && a.quarantineUntilDay > day);
        if (inQ.length === 0) return null;
        const minR = Math.min(...inQ.map((a: OwnedAnimal) => a.quarantineUntilDay! - day));
        return (
          <View style={{ backgroundColor: '#3e2723', borderRadius: 8, marginHorizontal: 8, marginBottom: 6, padding: 10 }}>
            <Text style={{ color: '#ff9800', fontWeight: 'bold', fontSize: 12 }}>
              🔒 {inQ.length} animal{inQ.length !== 1 ? 's' : ''} in quarantine — {minR} day{minR !== 1 ? 's' : ''} remaining (soonest)
            </Text>
          </View>
        );
      })()}
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
              {/* Lactation bar (dairy animals only) */}
              {(item.typeId === 'vaca' || item.typeId === 'cabra' || item.typeId === 'bufalo') && (() => {
                  const params = LACTATION_PARAMS[item.typeId];
                  if (!params) return null;
                  const lactState = getLactationState(item, item.typeId, day);
                  if (lactState === 'lactating') {
                    const daysLeft = lactationDaysRemaining(item, item.typeId, day);
                    const pct = Math.round((1 - daysLeft / params.lactatingDays) * 100);
                    return (
                      <View style={{ marginTop: 4 }}>
                        <Text style={{ color: '#aaa', fontSize: 10 }}>
                          🥛 Lactating — {daysLeft}d remaining
                        </Text>
                        <View style={{ height: 4, backgroundColor: '#1a2a1a', borderRadius: 2, marginTop: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: '#66bb6a', width: `${pct}%` as any }} />
                        </View>
                      </View>
                    );
                  } else {
                    const daysLeft = dryDaysRemaining(item, item.typeId, day);
                    return (
                      <View style={{ marginTop: 4 }}>
                        <Text style={{ color: '#ff9800', fontSize: 10 }}>
                          🌾 Dry period — {daysLeft > 0 ? `${daysLeft}d left` : 'ready to breed'}
                        </Text>
                        <View style={{ height: 4, backgroundColor: '#1a2a1a', borderRadius: 2, marginTop: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: '#ff9800', width: `${Math.round((1 - daysLeft / params.dryDays) * 100)}%` as any }} />
                        </View>
                      </View>
                    );
                  }
                })()}
              {/* Seasonal multiplier */}
              {(() => {
                  const mod = getSeasonMultiplier(item.typeId, day);
                  if (mod === 1.0) return null;
                  const label = mod > 1.0
                    ? `+${Math.round((mod - 1) * 100)}% seasonal bonus`
                    : `-${Math.round((1 - mod) * 100)}% seasonal penalty`;
                  const color = mod > 1.0 ? '#66bb6a' : '#ef5350';
                  return <Text style={{ color, fontSize: 10, marginTop: 2 }}>🌤 {label}</Text>;
                })()}
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={genStyles.panelTitle}>🧬 Genes</Text>
                        <HelpSheet
                          title="Gene Grade"
                          body="Each gene is scored D (weak) to S (exceptional). The overall grade is the average of all four genes. Higher grades mean more production, disease resistance, faster growth, or better sell price. Breed selectively to improve grades over generations."
                          buttonSize={12}
                        />
                      </View>
                      <View style={[genStyles.gradeBadge, { backgroundColor: avgColor + '33', borderColor: avgColor }]}>
                        <Text style={[genStyles.gradeBadgeText, { color: avgColor }]}>{avgGrade} Grade</Text>
                      </View>
                    </View>
                    {(['production', 'hardiness', 'growth', 'value'] as (keyof AnimalGenes)[]).map(gKey => {
                      const GENE_LABELS: Record<keyof AnimalGenes, string> = { production: '🥚 Production', hardiness: '💪 Hardiness', growth: '⚡ Growth', value: '💰 Value' };
                      const val = g[gKey];
                      const upgradeCost = Math.round(800 * val * val);
                      const atMax = val >= 1.5;
                      const canAfford = money >= upgradeCost;
                      return (
                        <View key={gKey} style={upgradeStyles.row}>
                          <View style={{ flex: 1 }}>
                            <GeneBar label={GENE_LABELS[gKey]} value={val} />
                          </View>
                          <TouchableOpacity
                            style={[upgradeStyles.upgradeBtn, (atMax || !canAfford) && upgradeStyles.upgradeBtnDisabled]}
                            onPress={() => upgradeAnimalGene(item.id, gKey)}
                            disabled={atMax || !canAfford}
                          >
                            <Text style={upgradeStyles.upgradeBtnText}>
                              {atMax ? 'MAX' : `+0.05\n$${upgradeCost}`}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    {item.sex === 'female' && (() => {
                      const matureMales = animals.filter(
                        (a: OwnedAnimal) => a.id !== item.id && a.typeId === item.typeId && a.sex === 'male' && isMature(a, type, day)
                      );
                      const preferredId = breedingPairs[item.id];
                      return (
                        <View style={{ marginTop: 10 }}>
                          <Text style={genStyles.panelTitle}>🧬 Breeding Pair</Text>
                          {matureMales.length === 0 ? (
                            <Text style={{ color: '#555', fontSize: 11, marginTop: 4 }}>No males available.</Text>
                          ) : (
                            <>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                                {matureMales.map(male => {
                                  const mg = male.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
                                  const avgG = geneGrade((mg.production + mg.hardiness + mg.growth + mg.value) / 4);
                                  const isSelected = preferredId === male.id;
                                  return (
                                    <TouchableOpacity
                                      key={male.id}
                                      style={[bpStyles.maleChip, isSelected && bpStyles.maleChipSelected]}
                                      onPress={() => isSelected ? clearBreedingPair(item.id) : setBreedingPair(item.id, male.id)}
                                    >
                                      <Text style={bpStyles.maleName}>♂ {male.id.slice(-4)}</Text>
                                      <Text style={[bpStyles.maleGrade, { color: gradeColor(avgG) }]}>{avgG}</Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                              {preferredId && (() => {
                                const pm = matureMales.find(m => m.id === preferredId);
                                if (!pm) return null;
                                const pg = pm.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
                                const fg = item.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
                                const pred = {
                                  production: (pg.production + fg.production) / 2,
                                  hardiness:  (pg.hardiness  + fg.hardiness)  / 2,
                                  growth:     (pg.growth     + fg.growth)     / 2,
                                  value:      (pg.value      + fg.value)      / 2,
                                };
                                return (
                                  <View style={bpStyles.prediction}>
                                    <Text style={bpStyles.predLabel}>Offspring prediction:</Text>
                                    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                      {(['production','hardiness','growth','value'] as (keyof AnimalGenes)[]).map(k => {
                                        const g = geneGrade(pred[k]);
                                        return (
                                          <Text key={k} style={[bpStyles.predChip, { color: gradeColor(g) }]}>
                                            {k[0].toUpperCase()} {g}
                                          </Text>
                                        );
                                      })}
                                    </View>
                                  </View>
                                );
                              })()}
                            </>
                          )}
                        </View>
                      );
                    })()}
                    {/* Lineage tree */}
                    <View style={{ marginTop: 10 }}>
                      <Text style={genStyles.panelTitle}>🌳 Lineage</Text>
                      {(() => {
                        const findAnimal = (id: string) => animals.find((a: OwnedAnimal) => a.id === id);
                        const mother = item.parentIds ? findAnimal(item.parentIds[0]) : undefined;
                        const father = item.parentIds ? findAnimal(item.parentIds[1]) : undefined;
                        const gp = item.grandparentIds;

                        if (!item.parentIds) {
                          return <Text style={{ color: '#555', fontSize: 11, marginTop: 4 }}>Unknown lineage.</Text>;
                        }

                        const AncestorChip = ({ label, animalId }: { label: string; animalId?: string }) => {
                          const a = animalId ? findAnimal(animalId) : undefined;
                          if (!a) return (
                            <View style={ltStyles.chip}>
                              <Text style={ltStyles.chipLabel}>{label}</Text>
                              <Text style={ltStyles.chipUnknown}>?</Text>
                            </View>
                          );
                          const ag = a.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
                          const avg = (ag.production + ag.hardiness + ag.growth + ag.value) / 4;
                          const grade = geneGrade(avg);
                          return (
                            <View style={ltStyles.chip}>
                              <Text style={ltStyles.chipLabel}>{label} {a.sex === 'female' ? '♀' : '♂'}</Text>
                              <Text style={[ltStyles.chipGrade, { color: gradeColor(grade) }]}>{grade}</Text>
                            </View>
                          );
                        };

                        return (
                          <View style={ltStyles.tree}>
                            {/* Grandparents column */}
                            {gp && (
                              <View style={ltStyles.col}>
                                <AncestorChip label="GM" animalId={gp[0]} />
                                <AncestorChip label="GF" animalId={gp[1]} />
                                <AncestorChip label="GM" animalId={gp[2]} />
                                <AncestorChip label="GF" animalId={gp[3]} />
                              </View>
                            )}
                            {/* Parents column */}
                            <View style={ltStyles.col}>
                              <AncestorChip label="Mom" animalId={item.parentIds?.[0]} />
                              <AncestorChip label="Dad" animalId={item.parentIds?.[1]} />
                            </View>
                            {/* Self */}
                            <View style={[ltStyles.chip, ltStyles.chipSelf]}>
                              <Text style={ltStyles.chipLabel}>{item.sex === 'female' ? '♀' : '♂'} Self</Text>
                              <Text style={[ltStyles.chipGrade, { color: gradeColor(geneGrade((g.production + g.hardiness + g.growth + g.value) / 4)) }]}>
                                {geneGrade((g.production + g.hardiness + g.growth + g.value) / 4)}
                              </Text>
                            </View>
                          </View>
                        );
                      })()}
                    </View>
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
              <QuarantineBadge animal={item} day={day} />
              <IsolationBadge animal={item} />
              <OptimalWeightBadge animal={item} />
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
              {mature && (
                <TouchableOpacity
                  style={[styles.sellBtn, { backgroundColor: '#1a3a20' }]}
                  onPress={() => handleLiveAnimalSell(item.id, item.typeId)}
                >
                  <Text style={styles.btnText}>🐄 Sell Live</Text>
                </TouchableOpacity>
              )}
              {item.sex === 'male' && (buildings ?? []).includes('bld_sire_pen') && (() => {
                const isSire = (sirePenAnimalIds ?? []).includes(item.id);
                return (
                  <TouchableOpacity
                    style={{ backgroundColor: isSire ? '#4a148c' : '#1b5e20', borderRadius: 6, padding: 6, marginTop: 4 }}
                    onPress={() =>
                      isSire
                        ? removeFromSirePen(item.id)
                        : designateAsSire(item.id)
                    }
                  >
                    <Text style={{ color: C.white, fontSize: 11 }}>
                      {isSire ? '♂ Remove from Sire Pen' : '♂ Designate as Sire'}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
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
              <WelfareBadge score={animalWelfareScores?.[item.id]} />
              <BuildingStatusLine animalTypeId={item.id} productionBuildings={productionBuildings ?? []} />
              <MilkGradeBadge animalTypeId={item.id} milkGrades={milkGrades ?? {}} />
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
      </>}

      {animalTab === 'results' && (
        <ScrollView style={{ flex: 1 }}>
          {(showResults ?? []).length === 0 ? (
            <Text style={showStyles.emptyResults}>No show results yet. Enter the next County Show!</Text>
          ) : (
            [...(showResults ?? [])].reverse().map(result => {
              const placementLabel = result.placement === 1 ? '🥇 1st' : result.placement === 2 ? '🥈 2nd' : result.placement === 3 ? '🥉 3rd' : 'No placement';
              const placementColor = result.placement === 1 ? '#ffd700' : result.placement === 2 ? '#c0c0c0' : result.placement === 3 ? '#cd7f32' : '#555';
              const animalType = ANIMAL_TYPES.find(t => t.id === result.animalTypeId);
              return (
                <View key={result.id} style={showStyles.resultCard}>
                  <View style={showStyles.resultHeader}>
                    <Text style={showStyles.resultSeason}>{result.seasonLabel}</Text>
                    <Text style={[showStyles.resultPlacement, { color: placementColor }]}>{placementLabel}</Text>
                  </View>
                  <Text style={showStyles.resultAnimal}>{animalType?.name ?? result.animalTypeId}</Text>
                  <Text style={showStyles.resultScore}>Your score: {result.playerScore.toFixed(3)}</Text>
                  <Text style={showStyles.resultNpc}>NPC scores: {result.npcScores.map(s => s.toFixed(2)).join(' · ')}</Text>
                  {result.prize > 0 && (
                    <Text style={showStyles.resultPrize}>Prize: +${result.prize.toLocaleString()}</Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <AnimalShowModal visible={showModalVisible} onClose={() => setShowModalVisible(false)} />
      <DispatchModal
        visible={liveDispatchVisible}
        cargo={liveDispatchCargo}
        marketId="city"
        onClose={() => setLiveDispatchVisible(false)}
        onContractor={() => setLiveDispatchVisible(false)}
      />
    </View>
  );
}

const showStyles = StyleSheet.create({
  banner:          { backgroundColor: '#3a2800', borderBottomWidth: 1, borderBottomColor: '#7a5c00', paddingHorizontal: 14, paddingVertical: S.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerText:      { color: '#ffd700', fontSize: F.size.sm, flex: 1 },
  bannerCta:       { color: '#ffb74d', fontSize: F.size.sm, fontWeight: 'bold' },
  tabBar:          { flexDirection: 'row', backgroundColor: '#0f1e0f', borderBottomWidth: 1, borderBottomColor: '#1e3a1e' },
  tabBtn:          { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive:    { borderBottomWidth: 2, borderBottomColor: '#ffd700' },
  tabText:         { color: '#555', fontSize: F.size.md },
  tabTextActive:   { color: '#ffd700', fontWeight: 'bold' },
  emptyResults:    { color: '#555', textAlign: 'center', marginTop: 40, fontSize: F.size.md },
  resultCard:      { margin: 10, backgroundColor: '#1a2a1a', borderRadius: R.md, padding: S.md },
  resultHeader:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.xs },
  resultSeason:    { color: C.textMuted, fontSize: 11 },
  resultPlacement: { fontSize: F.size.md, fontWeight: 'bold' },
  resultAnimal:    { color: C.text, fontSize: F.size.md, marginBottom: 2 },
  resultScore:     { color: '#aaa', fontSize: 11 },
  resultNpc:       { color: '#555', fontSize: F.size.xs, marginTop: 1 },
  resultPrize:     { color: '#4caf50', fontSize: F.size.sm, fontWeight: 'bold', marginTop: S.xs },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  sectionLabel: { color: C.textMuted, fontSize: F.size.md, paddingHorizontal: S.lg, marginTop: 6, marginBottom: S.xs },
  list: { paddingHorizontal: S.sm },
  empty: { color: '#555', padding: S.lg },

  inventorySection: { paddingHorizontal: S.sm, marginBottom: S.xs },
  inventoryRow: { flexDirection: 'row', flexWrap: 'wrap' },
  inventoryCard: { backgroundColor: '#0f3460', borderRadius: 10, padding: 10, margin: S.xs, minWidth: 120 },
  inventoryName: { color: C.text, fontWeight: 'bold', fontSize: F.size.md, marginBottom: 2 },
  inventoryQty: { color: C.white, fontSize: 15, fontWeight: 'bold' },
  inventoryPrice: { color: C.textMuted, fontSize: 11, marginTop: 2, marginBottom: S.xs },
  sellProductBtn: { backgroundColor: '#2e7d32', borderRadius: R.sm, padding: 6, alignItems: 'center' },
  sellProductBtnText: { color: C.white, fontSize: 11, fontWeight: 'bold' },

  card: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginRight: 10, width: 140 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sexBadge: { fontSize: F.size.xl, fontWeight: 'bold' },
  animalName: { color: C.text, fontWeight: 'bold', fontSize: F.size.lg },
  detail: { color: '#aaa', fontSize: F.size.sm, marginTop: 2 },
  collectBtn: { backgroundColor: '#1565c0', borderRadius: R.sm, padding: 5, marginTop: 6 },
  breedBtn: { backgroundColor: '#6a1b9a', borderRadius: R.sm, padding: 5, marginTop: S.xs },
  breedBtnDisabled: { backgroundColor: '#333' },
  sellBtn: { backgroundColor: '#b71c1c', borderRadius: R.sm, padding: 5, marginTop: S.xs },
  btnText: { color: C.white, fontSize: 11, textAlign: 'center' },
  buyCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, margin: 6, flex: 1 },
  buyCardDisabled: { opacity: 0.4 },
  buyCardFair: { borderWidth: 1, borderColor: '#c8860a' },
  capacityText: { color: C.textMuted, fontSize: 11, marginTop: S.xs },
  capacityFull: { color: '#ef9a9a' },
  sexBtnRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  sexBtnM: { flex: 1, backgroundColor: '#1565c0', borderRadius: R.sm, padding: 5, alignItems: 'center' },
  sexBtnF: { flex: 1, backgroundColor: '#880e4f', borderRadius: R.sm, padding: 5, alignItems: 'center' },
  sexBtnLabel: { color: C.white, fontSize: F.size.lg, fontWeight: 'bold' },
  sexBtnPrice: { color: '#ddd', fontSize: F.size.xs, marginTop: 1 },
  priceFairSm: { color: '#81c784', fontWeight: 'bold', fontSize: 11 },

  cardSick: { borderWidth: 1, borderColor: '#f44336' },
  geneRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: S.xs },
  geneText: { fontSize: F.size.xs, fontWeight: 'bold' },
  traitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: S.xs },
  traitBadge: { backgroundColor: '#1a1050', borderRadius: R.sm, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: '#7c4dff' },
  traitText: { color: '#b39ddb', fontSize: 9, fontWeight: 'bold' },
  sickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.xs },
  sickText: { color: '#f44336', fontSize: F.size.sm, fontWeight: 'bold' },
  treatBtn: { backgroundColor: '#b71c1c', borderRadius: R.sm, padding: 5 },
  batchCollectBtn: { backgroundColor: '#1565c0', borderRadius: R.md, marginHorizontal: S.sm, marginBottom: 6, padding: 10, alignItems: 'center' },
  batchCollectText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  fairBanner: { backgroundColor: '#3a2a00', borderRadius: 10, marginHorizontal: S.sm, marginBottom: S.sm, padding: 10, borderLeftWidth: 3, borderLeftColor: '#c8860a' },
  fairTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.lg },
  fairSub: { color: '#c8860a', fontSize: F.size.sm, marginTop: 2 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  priceOriginal: { color: C.textFaint, fontSize: 11, textDecorationLine: 'line-through' },
  priceFair: { color: '#81c784', fontWeight: 'bold', fontSize: F.size.md },
  screenTitle: {
    color: C.text,
    fontSize: F.size.xl,
    fontWeight: F.weight.bold,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
});

const genStyles = StyleSheet.create({
  toggleBtn:      { paddingVertical: S.xs, alignSelf: 'flex-start' },
  toggleBtnText:  { color: '#4fc3f7', fontSize: 11 },
  panel:          { backgroundColor: '#0a1628', borderRadius: R.md, padding: 10, marginTop: 6 },
  panelHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm },
  panelTitle:     { color: C.text, fontWeight: 'bold', fontSize: F.size.sm },
  gradeBadge:     { borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: 3, borderWidth: 1 },
  gradeBadgeText: { fontSize: 11, fontWeight: 'bold' },
});

const bpStyles = StyleSheet.create({
  maleChip:         { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.sm, marginRight: 6, alignItems: 'center', minWidth: 60 },
  maleChipSelected: { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  maleName:         { color: '#aaa', fontSize: F.size.xs },
  maleGrade:        { fontSize: F.size.sm, fontWeight: 'bold', marginTop: 2 },
  prediction:       { backgroundColor: '#0a1628', borderRadius: R.sm, padding: S.sm, marginTop: S.sm, borderLeftWidth: 3, borderLeftColor: '#ffd700' },
  predLabel:        { color: '#ffd700', fontSize: F.size.xs, fontWeight: 'bold' },
  predChip:         { fontSize: 11, fontWeight: 'bold' },
});

const upgradeStyles = StyleSheet.create({
  row:                { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  upgradeBtn:         { backgroundColor: '#1a3a1a', borderRadius: R.sm, paddingHorizontal: 7, paddingVertical: S.xs, marginLeft: 6, alignItems: 'center', minWidth: 48 },
  upgradeBtnDisabled: { backgroundColor: '#1a1a1a', opacity: 0.5 },
  upgradeBtnText:     { color: '#66bb6a', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
});

const ltStyles = StyleSheet.create({
  tree:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  col:         { gap: 4 },
  chip:        { backgroundColor: C.bgCard, borderRadius: R.sm, padding: 6, alignItems: 'center', minWidth: 52 },
  chipSelf:    { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  chipLabel:   { color: C.textMuted, fontSize: 9 },
  chipGrade:   { fontSize: F.size.sm, fontWeight: 'bold', marginTop: 1 },
  chipUnknown: { color: '#444', fontSize: 9 },
});
