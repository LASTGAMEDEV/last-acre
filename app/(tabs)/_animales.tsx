import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AnimalShowModal from '../../components/AnimalShowModal';
import HintCard from '../../components/HintCard';
import DispatchModal from '../../components/DispatchModal';
import { useGameStore , DeliveryCargo, LIVESTOCK_TRAILER_IDS } from '../../store/useGameStore';

import { C, S, F, R } from '../../constants/theme';
import SubTabBar from '../../components/SubTabBar';
import { ANIMAL_TYPES } from '../../data/animalTypes';
import { BUILDING_TYPES } from '../../data/buildingTypes';
import { ANIMAL_PRODUCTS } from '../../data/animalProducts';
import { sellValue, isMature, canBreed, TRAIT_ICONS, TRAIT_DESC, AnimalGenes, OwnedAnimal, getLactationState, lactationDaysRemaining, dryDaysRemaining, LACTATION_PARAMS, getSeasonMultiplier, GRAIN_CROP_IDS, getBreedDisplayName } from '../../engine/animals';
import ApiaryManagementCard from '../../components/animals/ApiaryManagementCard';
import NutritionTab from '../../components/animals/NutritionTab';
import { computeHiveHealth, getLinkedParcelCount, getColmenaCapacity } from '../../engine/pollination';
import { BREED_TYPES } from '../../data/breedTypes';
import { ENCLOSURE_BUILDINGS } from '../../constants/enclosures';
import HelpSheet from '../../components/HelpSheet';
import GuideButton from '../../components/GuideButton';

function QuarantineBadge({ animal, day }: { animal: OwnedAnimal; day: number }) {
  if (!animal.quarantineUntilDay || animal.quarantineUntilDay <= day) return null;
  const remaining = animal.quarantineUntilDay - day;
  return (
    <Text style={{ color: C.amber, fontSize: 10 }}>
      🔒 In quarantine — {remaining} day{remaining !== 1 ? 's' : ''} remaining
    </Text>
  );
}

function IsolationBadge({ animal }: { animal: OwnedAnimal }) {
  if (!animal.inIsolation) return null;
  return (
    <Text style={{ color: C.blue, fontSize: 10 }}>🏥 In sick bay (isolated)</Text>
  );
}

function OptimalWeightBadge({ animal }: { animal: OwnedAnimal }) {
  if (!animal.optimalWeightReached) return null;
  return (
    <Text style={{ color: C.green, fontSize: 10, fontWeight: 'bold' }}>⚖ Optimal weight — +5% sale bonus</Text>
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
    case 'S': return C.amber;
    case 'A': return C.purple;
    case 'B': return C.blue;
    case 'C': return C.green;
    case 'D':
    default:  return C.textMuted;
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
    money, animals, animalInventory, day, buildings, activeFair, parcels,
    cullAnimal, sellAnimal, collectAnimalProduction, sellAnimalProduct, breedAnimal,
    treatAnimal, collectAllProduction,
    breedingPairs, setBreedingPair, clearBreedingPair,
    animalPrices, upgradeAnimalGene,
    showWindowOpen, showResults,
    workers, grainMissedDays, hayMissedDays, feedAnimals, inventory, animalsManuallyFed,
    trailers, deliveryJobs,
    designateAsSire, removeFromSirePen, sirePenAnimalIds,
  } = useGameStore();
  const hasAnimalWorker = (workers ?? []).some(
    (w: any) => w.role === 'livestock_hand' || w.role === 'veterinarian'
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
  type AnimalTab = 'herd' | 'nutrition' | 'results';
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
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Animals</Text>
      </View>

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

      <SubTabBar
        tabs={[
          { id: 'herd',     label: 'My Herd' },
          { id: 'nutrition', label: '🥗 Nutrition' },
          { id: 'results',  label: `Show Results${(showResults ?? []).length ? ` (${(showResults ?? []).length})` : ''}` },
        ]}
        active={animalTab}
        onSelect={id => setAnimalTab(id as AnimalTab)}
      />

      {animalTab === 'nutrition' && <NutritionTab />}

      {animalTab === 'results' && (
        <ScrollView>
          {(showResults ?? []).length === 0 && (
            <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 40 }}>No show results yet.</Text>
          )}
          {(showResults ?? []).map((r: any) => (
            <View key={r.id} style={{ backgroundColor: C.bgCard, borderRadius: R.md, padding: S.lg, margin: S.md }}>
              <Text style={{ color: C.text, fontWeight: F.weight.bold }}>{r.seasonLabel}</Text>
              <Text style={{ color: C.textMuted }}>Placement: #{r.placement} · Score: {r.playerScore}</Text>
              {r.prize > 0 && <Text style={{ color: C.green }}>+${r.prize.toLocaleString()} prize</Text>}
            </View>
          ))}
        </ScrollView>
      )}

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
            <Text style={{ color: C.textMuted, fontSize: 11 }}>🌾 Grain</Text>
            <Text style={{ color: grainStock < 5 ? C.red : C.textDim, fontWeight: 'bold' }}>
              {Math.floor(grainStock).toLocaleString()} kg
            </Text>
            {grainMissedDays > 0 && (
              <Text style={{ color: C.amber, fontSize: 10 }}>⚠ {grainMissedDays}/7 days underfed</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textMuted, fontSize: 11 }}>🌿 Hay</Text>
            <Text style={{ color: hayStock < 10 ? C.red : C.textDim, fontWeight: 'bold' }}>
              {Math.floor(hayStock).toLocaleString()} kg
            </Text>
            {hayMissedDays > 0 && (
              <Text style={{ color: C.amber, fontSize: 10 }}>⚠ {hayMissedDays}/7 days underfed</Text>
            )}
          </View>
        </View>
        {!hasAnimalWorker && (
          <TouchableOpacity
            style={{ backgroundColor: animalsManuallyFed ? C.greenDark : C.bgElevated, borderRadius: 6, padding: 10, alignItems: 'center', opacity: animalsManuallyFed ? 0.7 : 1 }}
            onPress={feedAnimals}
            disabled={animalsManuallyFed}
          >
            <Text style={{ color: C.white, fontWeight: 'bold' }}>{animalsManuallyFed ? '✓ Fed for today' : 'Feed Animals Today'}</Text>
            <Text style={{ color: C.textDim, fontSize: 11 }}>Hire an animal keeper to automate this</Text>
          </TouchableOpacity>
        )}
        {hasAnimalWorker && (
          <Text style={{ color: C.green, fontSize: 11 }}>✓ Animal worker feeds automatically</Text>
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
                  <Text style={[styles.inventoryPrice, { color: pctChange >= 0 ? C.green : C.red }]}>
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

      {/* Apiary Management */}
      {(() => {
        const colmenaBuildings = buildings.filter(b => b.startsWith('bld_colmena'));
        if (colmenaBuildings.length === 0) return null;
        return (
          <View style={{ backgroundColor: C.bgCard, borderRadius: 10, marginHorizontal: 8, marginBottom: 8, padding: 12 }}>
            <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>🐝 Apiary Management</Text>
            {colmenaBuildings.map(colmenaId => {
              const bt = BUILDING_TYPES.find(b => b.id === colmenaId);
              const linkedCount = getLinkedParcelCount(colmenaId, parcels);
              const capacity = getColmenaCapacity(colmenaId);
              const health = computeHiveHealth(colmenaId, parcels, day);
              const healthPct = Math.round(health * 100);
              const healthColor = healthPct >= 80 ? C.green : healthPct >= 50 ? C.amber : C.red;
              const linkedNames = parcels.filter(p => p.linkedColmenaId === colmenaId).map(p => p.name);
              return (
                <View key={colmenaId} style={{ marginBottom: 8, padding: 8, backgroundColor: C.bgElevated, borderRadius: 8 }}>
                  <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 12 }}>{bt?.name ?? colmenaId}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ flex: 1, height: 4, backgroundColor: C.bgDeep, borderRadius: 2 }}>
                      <View style={{ width: `${healthPct}%` as any, height: 4, borderRadius: 2, backgroundColor: healthColor }} />
                    </View>
                    <Text style={{ color: healthColor, fontSize: 11, marginLeft: 6 }}>Health {healthPct}%</Text>
                  </View>
                  <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 4 }}>
                    Linked: {linkedCount}/{capacity} {linkedNames.length > 0 ? `(${linkedNames.join(', ')})` : '(none)'}
                  </Text>
                  {linkedCount === 0 && (
                    <Text style={{ color: C.amber, fontSize: 10, marginTop: 2 }}>⚠️ Unlinked — risk of swarming</Text>
                  )}
                </View>
              );
            })}
          </View>
        );
      })()}

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
          <View style={{ backgroundColor: C.bgElevated, borderRadius: 8, marginHorizontal: 8, marginBottom: 6, padding: 10 }}>
            <Text style={{ color: C.amber, fontWeight: 'bold', fontSize: 12 }}>
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
          const sexColor = isFemale ? C.purple : C.blue;
          const isOld = age > type.maxPriceAge;
          const treatCost = Math.max(50, Math.round(type.maxSellPrice * 0.05));
          return (
            <View style={[styles.card, item.sick && styles.cardSick]}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.animalName}>{type.name}</Text>
                <Text style={[styles.sexBadge, { color: sexColor }]}>{sexIcon}</Text>
              </View>
              <Text style={{ color: C.green, fontSize: 11, marginBottom: 2 }}>
                {getBreedDisplayName(item, BREED_TYPES)}
              </Text>
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
                        <Text style={{ color: C.textMuted, fontSize: 10 }}>
                          🥛 Lactating — {daysLeft}d remaining
                        </Text>
                        <View style={{ height: 4, backgroundColor: C.bgElevated, borderRadius: 2, marginTop: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: C.green, width: `${pct}%` as any }} />
                        </View>
                      </View>
                    );
                  } else {
                    const daysLeft = dryDaysRemaining(item, item.typeId, day);
                    return (
                      <View style={{ marginTop: 4 }}>
                        <Text style={{ color: C.amber, fontSize: 10 }}>
                          🌾 Dry period — {daysLeft > 0 ? `${daysLeft}d left` : 'ready to breed'}
                        </Text>
                        <View style={{ height: 4, backgroundColor: C.bgElevated, borderRadius: 2, marginTop: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: C.amber, width: `${Math.round((1 - daysLeft / params.dryDays) * 100)}%` as any }} />
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
                  const color = mod > 1.0 ? C.green : C.red;
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
                        <GuideButton entryId="system_animals_welfare" compact />
                        <HelpSheet
                          title="Gene Grade"
                          body="Each gene is scored D (weak) to S (exceptional). The overall grade is the average of all four genes. Higher grades mean more production, disease resistance, faster growth, or better sell price. Breed selectively to improve grades over generations."
                          buttonSize={12}
                          entryId="system_animal_genetics"
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
                            <Text style={{ color: C.textFaint, fontSize: 11, marginTop: 4 }}>No males available.</Text>
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
                        const gp = item.grandparentIds;

                        if (!item.parentIds) {
                          return <Text style={{ color: C.textFaint, fontSize: 11, marginTop: 4 }}>Unknown lineage.</Text>;
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
                  style={[styles.sellBtn, { backgroundColor: C.bgElevated }]}
                  onPress={() => handleLiveAnimalSell(item.id, item.typeId)}
                >
                  <Text style={styles.btnText}>🐄 Sell Live</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{ backgroundColor: C.red, padding: 6, borderRadius: 6, marginTop: 4 }}
                onPress={() => {
                  Alert.alert(
                    'Cull Animal?',
                    `Send ${type.name} to processing? This cannot be undone.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Cull', style: 'destructive', onPress: () => cullAnimal(item.id) },
                    ]
                  );
                }}
              >
                <Text style={{ color: C.white, fontSize: 11, textAlign: 'center' }}>🔪 Cull for Meat</Text>
              </TouchableOpacity>
              {item.sex === 'male' && (buildings ?? []).includes('bld_sire_pen') && (() => {
                const isSire = (sirePenAnimalIds ?? []).includes(item.id);
                return (
                  <TouchableOpacity
                    style={{ backgroundColor: isSire ? C.purple : C.greenDark, borderRadius: 6, padding: 6, marginTop: 4 }}
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

      {/* Buy animals — auction only */}
      <View style={{ margin: 12, padding: 14, backgroundColor: C.bgCard, borderRadius: 10, borderWidth: 1, borderColor: C.border }}>
        <Text style={{ color: C.green, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>
          🏷️ Buy Animals at Auction
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 12, lineHeight: 18 }}>
          Animals can only be purchased at auction. Go to the{' '}
          <Text style={{ color: C.green, fontWeight: '600' }}>Subasta</Text>
          {' '}tab to bid on livestock — new lots appear every 7 days with real breed information.
        </Text>
      </View>
      </>}

      {/* Apiary Management */}
      {animalTab === 'herd' && <ApiaryManagementCard />}

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
  banner:          { backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 14, paddingVertical: S.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerText:      { color: C.amber, fontSize: F.size.sm, flex: 1 },
  bannerCta:       { color: C.amberSoft, fontSize: F.size.sm, fontWeight: 'bold' },
  emptyResults:    { color: C.textFaint, textAlign: 'center', marginTop: 40, fontSize: F.size.md },
  resultCard:      { margin: 10, backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md },
  resultHeader:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.xs },
  resultSeason:    { color: C.textMuted, fontSize: 11 },
  resultPlacement: { fontSize: F.size.md, fontWeight: 'bold' },
  resultAnimal:    { color: C.text, fontSize: F.size.md, marginBottom: 2 },
  resultScore:     { color: C.textMuted, fontSize: 11 },
  resultNpc:       { color: C.textFaint, fontSize: F.size.xs, marginTop: 1 },
  resultPrize:     { color: C.green, fontSize: F.size.sm, fontWeight: 'bold', marginTop: S.xs },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  sectionLabel: { color: C.textMuted, fontSize: F.size.md, paddingHorizontal: S.lg, marginTop: 6, marginBottom: S.xs },
  list: { paddingHorizontal: S.sm },
  empty: { color: C.textFaint, padding: S.lg },

  inventorySection: { paddingHorizontal: S.sm, marginBottom: S.xs },
  inventoryRow: { flexDirection: 'row', flexWrap: 'wrap' },
  inventoryCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: 10, margin: S.xs, minWidth: 120 },
  inventoryName: { color: C.text, fontWeight: 'bold', fontSize: F.size.md, marginBottom: 2 },
  inventoryQty: { color: C.white, fontSize: 15, fontWeight: 'bold' },
  inventoryPrice: { color: C.textMuted, fontSize: 11, marginTop: 2, marginBottom: S.xs },
  sellProductBtn: { backgroundColor: C.greenDark, borderRadius: R.sm, padding: 6, alignItems: 'center' },
  sellProductBtnText: { color: C.white, fontSize: 11, fontWeight: 'bold' },

  card: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginRight: 10, width: 140 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sexBadge: { fontSize: F.size.xl, fontWeight: 'bold' },
  animalName: { color: C.text, fontWeight: 'bold', fontSize: F.size.lg },
  detail: { color: C.textMuted, fontSize: F.size.sm, marginTop: 2 },
  collectBtn: { backgroundColor: C.blue, borderRadius: R.sm, padding: 5, marginTop: 6 },
  breedBtn: { backgroundColor: C.purple, borderRadius: R.sm, padding: 5, marginTop: S.xs },
  breedBtnDisabled: { backgroundColor: C.bgElevated },
  sellBtn: { backgroundColor: C.redDark, borderRadius: R.sm, padding: 5, marginTop: S.xs },
  btnText: { color: C.white, fontSize: 11, textAlign: 'center' },
  buyCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, margin: 6, flex: 1 },
  buyCardDisabled: { opacity: 0.4 },
  buyCardFair: { borderWidth: 1, borderColor: C.amber },
  capacityText: { color: C.textMuted, fontSize: 11, marginTop: S.xs },
  capacityFull: { color: C.red },
  sexBtnRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  sexBtnM: { flex: 1, backgroundColor: C.blue, borderRadius: R.sm, padding: 5, alignItems: 'center' },
  sexBtnF: { flex: 1, backgroundColor: C.purple, borderRadius: R.sm, padding: 5, alignItems: 'center' },
  sexBtnLabel: { color: C.white, fontSize: F.size.lg, fontWeight: 'bold' },
  sexBtnPrice: { color: C.textDim, fontSize: F.size.xs, marginTop: 1 },
  priceFairSm: { color: C.textDim, fontWeight: 'bold', fontSize: 11 },

  cardSick: { borderWidth: 1, borderColor: C.red },
  geneRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: S.xs },
  geneText: { fontSize: F.size.xs, fontWeight: 'bold' },
  traitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: S.xs },
  traitBadge: { backgroundColor: C.bgDeep, borderRadius: R.sm, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: C.purple },
  traitText: { color: C.textDim, fontSize: 9, fontWeight: 'bold' },
  sickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.xs },
  sickText: { color: C.red, fontSize: F.size.sm, fontWeight: 'bold' },
  treatBtn: { backgroundColor: C.redDark, borderRadius: R.sm, padding: 5 },
  batchCollectBtn: { backgroundColor: C.blue, borderRadius: R.md, marginHorizontal: S.sm, marginBottom: 6, padding: 10, alignItems: 'center' },
  batchCollectText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  fairBanner: { backgroundColor: C.bgElevated, borderRadius: 10, marginHorizontal: S.sm, marginBottom: S.sm, padding: 10, borderLeftWidth: 3, borderLeftColor: C.amber },
  fairTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.lg },
  fairSub: { color: C.amber, fontSize: F.size.sm, marginTop: 2 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  priceOriginal: { color: C.textFaint, fontSize: 11, textDecorationLine: 'line-through' },
  priceFair: { color: C.textDim, fontWeight: 'bold', fontSize: F.size.md },
});

const genStyles = StyleSheet.create({
  toggleBtn:      { paddingVertical: S.xs, alignSelf: 'flex-start' },
  toggleBtnText:  { color: C.blue, fontSize: 11 },
  panel:          { backgroundColor: C.bgDeep, borderRadius: R.md, padding: 10, marginTop: 6 },
  panelHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm },
  panelTitle:     { color: C.text, fontWeight: 'bold', fontSize: F.size.sm },
  gradeBadge:     { borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: 3, borderWidth: 1 },
  gradeBadgeText: { fontSize: 11, fontWeight: 'bold' },
});

const bpStyles = StyleSheet.create({
  maleChip:         { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.sm, marginRight: 6, alignItems: 'center', minWidth: 60 },
  maleChipSelected: { backgroundColor: C.bgDeep, borderWidth: 1, borderColor: C.blue },
  maleName:         { color: C.textMuted, fontSize: F.size.xs },
  maleGrade:        { fontSize: F.size.sm, fontWeight: 'bold', marginTop: 2 },
  prediction:       { backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, marginTop: S.sm, borderLeftWidth: 3, borderLeftColor: C.amber },
  predLabel:        { color: C.amber, fontSize: F.size.xs, fontWeight: 'bold' },
  predChip:         { fontSize: 11, fontWeight: 'bold' },
});

const upgradeStyles = StyleSheet.create({
  row:                { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  upgradeBtn:         { backgroundColor: C.bgElevated, borderRadius: R.sm, paddingHorizontal: 7, paddingVertical: S.xs, marginLeft: 6, alignItems: 'center', minWidth: 48 },
  upgradeBtnDisabled: { backgroundColor: C.bgDeep, opacity: 0.5 },
  upgradeBtnText:     { color: C.green, fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
});

const ltStyles = StyleSheet.create({
  tree:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  col:         { gap: 4 },
  chip:        { backgroundColor: C.bgCard, borderRadius: R.sm, padding: 6, alignItems: 'center', minWidth: 52 },
  chipSelf:    { backgroundColor: C.bgDeep, borderWidth: 1, borderColor: C.blue },
  chipLabel:   { color: C.textMuted, fontSize: 9 },
  chipGrade:   { fontSize: F.size.sm, fontWeight: 'bold', marginTop: 1 },
  chipUnknown: { color: C.textFaint, fontSize: 9 },
});
