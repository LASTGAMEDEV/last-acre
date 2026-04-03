import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AnimalShowModal from '../../components/AnimalShowModal';
import { useGameStore } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import { ANIMAL_TYPES } from '../../data/animalTypes';
import { BUILDING_TYPES } from '../../data/buildingTypes';
import { ANIMAL_PRODUCTS } from '../../data/animalProducts';
import { sellValue, isMature, canBreed, TRAIT_ICONS, TRAIT_DESC, AnimalGenes, OwnedAnimal } from '../../engine/animals';
import { ENCLOSURE_BUILDINGS } from '../../constants/enclosures';
import HelpSheet from '../../components/HelpSheet';

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
    breedingPairs, setBreedingPair, clearBreedingPair,
    animalPrices, upgradeAnimalGene,
    showWindowOpen, showResults,
  } = useGameStore();
  const fairMult = activeFair ? (1 - activeFair.discount) : 1.0;
  const [expandedAnimalId, setExpandedAnimalId] = useState<string | null>(null);
  const [showModalVisible, setShowModalVisible] = useState(false);
  type AnimalTab = 'herd' | 'results';
  const [animalTab, setAnimalTab] = useState<AnimalTab>('herd');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Animals" />

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
    </View>
  );
}

const showStyles = StyleSheet.create({
  banner:          { backgroundColor: '#3a2800', borderBottomWidth: 1, borderBottomColor: '#7a5c00', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerText:      { color: '#ffd700', fontSize: 12, flex: 1 },
  bannerCta:       { color: '#ffb74d', fontSize: 12, fontWeight: 'bold' },
  tabBar:          { flexDirection: 'row', backgroundColor: '#0f1e0f', borderBottomWidth: 1, borderBottomColor: '#1e3a1e' },
  tabBtn:          { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive:    { borderBottomWidth: 2, borderBottomColor: '#ffd700' },
  tabText:         { color: '#555', fontSize: 13 },
  tabTextActive:   { color: '#ffd700', fontWeight: 'bold' },
  emptyResults:    { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 13 },
  resultCard:      { margin: 10, backgroundColor: '#1a2a1a', borderRadius: 8, padding: 12 },
  resultHeader:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  resultSeason:    { color: '#888', fontSize: 11 },
  resultPlacement: { fontSize: 13, fontWeight: 'bold' },
  resultAnimal:    { color: '#e8d5a3', fontSize: 13, marginBottom: 2 },
  resultScore:     { color: '#aaa', fontSize: 11 },
  resultNpc:       { color: '#555', fontSize: 10, marginTop: 1 },
  resultPrize:     { color: '#4caf50', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
});

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

const bpStyles = StyleSheet.create({
  maleChip:         { backgroundColor: '#16213e', borderRadius: 8, padding: 8, marginRight: 6, alignItems: 'center', minWidth: 60 },
  maleChipSelected: { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  maleName:         { color: '#aaa', fontSize: 10 },
  maleGrade:        { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  prediction:       { backgroundColor: '#0a1628', borderRadius: 6, padding: 8, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#ffd700' },
  predLabel:        { color: '#ffd700', fontSize: 10, fontWeight: 'bold' },
  predChip:         { fontSize: 11, fontWeight: 'bold' },
});

const upgradeStyles = StyleSheet.create({
  row:                { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  upgradeBtn:         { backgroundColor: '#1a3a1a', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, marginLeft: 6, alignItems: 'center', minWidth: 48 },
  upgradeBtnDisabled: { backgroundColor: '#1a1a1a', opacity: 0.5 },
  upgradeBtnText:     { color: '#66bb6a', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
});

const ltStyles = StyleSheet.create({
  tree:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  col:         { gap: 4 },
  chip:        { backgroundColor: '#16213e', borderRadius: 6, padding: 6, alignItems: 'center', minWidth: 52 },
  chipSelf:    { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  chipLabel:   { color: '#888', fontSize: 9 },
  chipGrade:   { fontSize: 12, fontWeight: 'bold', marginTop: 1 },
  chipUnknown: { color: '#444', fontSize: 9 },
});
