import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore, HenilBatch, OwnedAttachment, IncubationBatch } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import ProductionBuildingsSection from '../ops/ProductionBuildingsSection';
import { milkGradeMultiplier, shouldInspect, inspectorFine } from '../../engine/productionBuildings';

function HenilAndBuildingsSection() {
  const {
    henilQueue, addToHenil, day, inventory, buildings,
    slurryLevel, slurryCapacity, spreadSlurry, attachments,
    silageLevel, silageCapacity, fillSilagePit,
    biogasMode, setBiogasMode,
    incubationQueue, hatcheryCapacity, queueEggsForIncubation,
    animalInventory,
    milkGrades, animalWelfareScores, productionBuildings,
  } = useGameStore();

  const hasHenil = (buildings ?? []).includes('bld_henil');
  const grassInStock = inventory['grass'] ?? 0;
  const activeBatches = (henilQueue ?? []).filter((b: HenilBatch) => b.readyDay >= day);
  const canStartBatch = hasHenil && grassInStock > 0 && activeBatches.length < 2;

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
          {/* Henil (Hay Drying Barn) */}
          {hasHenil && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🌿 Henil</Text>
              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>
                Wet grass → hay · 3-day drying · 62.5% yield
              </Text>

              {activeBatches.length === 0 && (
                <Text style={{ color: C.textFaint, fontSize: 12, marginBottom: 8 }}>No active batches.</Text>
              )}
              {activeBatches.map((batch: HenilBatch) => {
                const daysLeft = batch.readyDay - day;
                const hayYield = Math.floor(batch.wetGrassKg * 0.625);
                return (
                  <View key={batch.batchId} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.bgCard }}>
                    <Text style={{ color: '#ccc', fontSize: 12 }}>
                      {batch.wetGrassKg.toLocaleString()} kg grass
                    </Text>
                    <Text style={{ color: C.green, fontSize: 12 }}>
                      → {hayYield.toLocaleString()} kg hay
                    </Text>
                    <Text style={{ color: daysLeft <= 1 ? C.green : C.textMuted, fontSize: 12 }}>
                      {daysLeft === 0 ? 'Ready!' : `${daysLeft}d left`}
                    </Text>
                  </View>
                );
              })}

              <TouchableOpacity
                style={{
                  marginTop: 10,
                  backgroundColor: canStartBatch ? C.greenDark : C.bg,
                  borderRadius: 6, padding: 10, alignItems: 'center',
                  opacity: canStartBatch ? 1 : 0.5,
                }}
                onPress={canStartBatch ? addToHenil : undefined}
                disabled={!canStartBatch}
              >
                <Text style={{ color: C.white, fontWeight: 'bold' }}>
                  {activeBatches.length >= 2 ? 'Queue Full (2/2)' : grassInStock <= 0 ? 'No Grass in Stock' : `Start Batch (${Math.min(Math.floor(grassInStock), 700)} kg grass)`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {!hasHenil && (
            <View style={[styles.sectionCard, { opacity: 0.6 }]}>
              <Text style={styles.sectionTitle}>🌿 Henil</Text>
              <Text style={{ color: C.textFaint, fontSize: 12 }}>Build a Henil to convert grass into hay for your animals.</Text>
            </View>
          )}
          <AnimalQualitySection
            milkGrades={milkGrades ?? {}}
            animalWelfareScores={animalWelfareScores ?? {}}
            productionBuildings={productionBuildings ?? []}
          />
          <IncubationSection
            incubationQueue={incubationQueue ?? []}
            hatcheryCapacity={hatcheryCapacity ?? 0}
            queueEggsForIncubation={queueEggsForIncubation}
            eggsInStock={animalInventory?.['eggs'] ?? 0}
            currentDay={day}
          />
          <SilageSection
            silageLevel={silageLevel ?? 0}
            silageCapacity={silageCapacity ?? 0}
            fillSilagePit={fillSilagePit}
            grassInStock={Math.floor(grassInStock)}
          />
          <SlurrySection
            slurryLevel={slurryLevel ?? 0}
            slurryCapacity={slurryCapacity ?? 0}
            spreadSlurry={spreadSlurry}
            hasSlurryTanker={(attachments ?? []).some((a: OwnedAttachment) =>
              a.typeId === 'att_slurry_tanker_s' || a.typeId === 'att_slurry_tanker_l'
            )}
          />
          {(buildings ?? []).includes('bld_biogas_upgrader') && (
            <BiogasToggle
              biogasMode={biogasMode ?? 'income'}
              setBiogasMode={setBiogasMode}
            />
          )}
          <ProductionBuildingsSection />
    </ScrollView>
  );
}

// ── Animal Quality Section ────────────────────────────────────────────────────
function AnimalQualitySection({
  milkGrades,
  animalWelfareScores,
  productionBuildings,
}: {
  milkGrades: Record<string, 'A' | 'B' | 'C'>;
  animalWelfareScores: Record<string, number>;
  productionBuildings: { animalTypeId: string; hygiene: number }[];
}) {
  if (productionBuildings.length === 0) return null;

  const DAIRY_LABELS: Record<string, string> = {
    vaca: 'Cows 🐄',
    cabra: 'Goats 🐐',
    bufalo: 'Buffalo 🐃',
  };
  const SPECIES_LABELS: Record<string, string> = {
    vaca: 'Cow', cabra: 'Goat', bufalo: 'Buffalo',
    oveja: 'Sheep', cerdo: 'Pig', conejo: 'Rabbit',
    gallina: 'Chicken', pato: 'Duck', codorniz: 'Quail',
    abeja: 'Bees',
  };

  const dairyEntries = Object.entries(milkGrades);
  const welfareEntries = Object.entries(animalWelfareScores).filter(
    ([typeId]) => productionBuildings.some(pb => pb.animalTypeId === typeId)
  );

  if (dairyEntries.length === 0 && welfareEntries.length === 0) return null;

  return (
    <View style={{ backgroundColor: '#1c1c1c', borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>📊 Animal Quality</Text>

      {/* Milk grades */}
      {dairyEntries.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Milk Grade</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {dairyEntries.map(([typeId, grade]) => {
              const badgeColor = grade === 'A' ? C.green : grade === 'B' ? '#ffa726' : '#f44336';
              return (
                <View
                  key={typeId}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <Text style={{ color: '#ccc', fontSize: 11, marginRight: 4 }}>
                    {DAIRY_LABELS[typeId] ?? typeId}
                  </Text>
                  <View style={{ backgroundColor: badgeColor, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: C.white, fontSize: 11, fontWeight: 'bold' }}>
                      Grade {grade} ×{milkGradeMultiplier(grade).toFixed(2)}
                    </Text>
                  </View>
                  {(() => {
                    const pb = productionBuildings.find(b => b.animalTypeId === typeId);
                    if (!pb || !shouldInspect(pb.hygiene)) return null;
                    const fine = inspectorFine(pb.hygiene);
                    return fine > 0 ? (
                      <Text style={{ color: '#ef5350', fontSize: 10, marginLeft: 4 }}>⚠ Inspection risk ·${fine.toLocaleString()} fine</Text>
                    ) : null;
                  })()}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Welfare scores */}
      {welfareEntries.length > 0 && (
        <View>
          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Welfare Score</Text>
          {welfareEntries.map(([typeId, score]) => {
            const barColor = score >= 80 ? C.green : score >= 60 ? '#ffa726' : '#f44336';
            const label = SPECIES_LABELS[typeId] ?? typeId;
            return (
              <View key={typeId} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: '#ccc', fontSize: 11, width: 64 }}>{label}</Text>
                <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 6, marginHorizontal: 6 }}>
                  <View style={{ width: `${Math.round(score)}%`, backgroundColor: barColor, borderRadius: 4, height: 6 }} />
                </View>
                <Text style={{ color: '#aaa', fontSize: 11, width: 30, textAlign: 'right' }}>{Math.round(score)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Incubation Section ───────────────────────────────────────────────────────
const POULTRY_HATCH_CONFIG = [
  { typeId: 'gallina',  label: 'Chicken', icon: '🐓', days: 21 },
  { typeId: 'pato',     label: 'Duck',    icon: '🦆', days: 28 },
  { typeId: 'codorniz', label: 'Quail',   icon: '🪶', days: 17 },
] as const;

function IncubationSection({
  incubationQueue,
  hatcheryCapacity,
  queueEggsForIncubation,
  eggsInStock,
  currentDay,
}: {
  incubationQueue: IncubationBatch[];
  hatcheryCapacity: number;
  queueEggsForIncubation: (typeId: string, quantity: number) => void;
  eggsInStock: number;
  currentDay: number;
}) {
  if (hatcheryCapacity <= 0) return null;

  const eggsInQueue = incubationQueue.reduce((sum, b) => sum + b.eggCount, 0);
  const space = hatcheryCapacity - eggsInQueue;
  const fillPct = Math.min(1, eggsInQueue / hatcheryCapacity);
  const barColor = fillPct >= 0.9 ? '#e65100' : fillPct >= 0.5 ? '#f57c00' : '#ffa726';

  return (
    <View style={{ backgroundColor: C.bg, borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 13 }}>🥚 Hatchery</Text>

      {/* Capacity bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 8 }}>
        <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 8, marginRight: 8 }}>
          <View style={{ width: `${Math.round(fillPct * 100)}%`, backgroundColor: barColor, borderRadius: 4, height: 8 }} />
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>
          {eggsInQueue} / {hatcheryCapacity} eggs
        </Text>
      </View>

      {/* Add-eggs rows */}
      {POULTRY_HATCH_CONFIG.map(({ typeId, label, icon, days }) => {
        const canAdd = eggsInStock > 0 && space > 0;
        const toAdd = Math.min(eggsInStock, space);
        return (
          <View key={typeId} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#ddd', fontSize: 12 }}>{icon} {label} <Text style={{ color: C.textMuted }}>({days}d)</Text></Text>
            {canAdd ? (
              <TouchableOpacity
                style={{ backgroundColor: '#37474f', borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5 }}
                onPress={() => queueEggsForIncubation(typeId, toAdd)}
              >
                <Text style={{ color: C.white, fontSize: 11 }}>+ {toAdd} eggs</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#555', fontSize: 11 }}>
                {eggsInStock <= 0 ? 'No eggs' : 'Hatchery full'}
              </Text>
            )}
          </View>
        );
      })}

      {/* Active batches */}
      {incubationQueue.length > 0 && (
        <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 8 }}>
          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Incubating:</Text>
          {incubationQueue.map(batch => {
            const cfg = POULTRY_HATCH_CONFIG.find(c => c.typeId === batch.typeId);
            const daysLeft = batch.readyDay - currentDay;
            return (
              <Text key={batch.batchId} style={{ color: '#ccc', fontSize: 11, marginBottom: 2 }}>
                {cfg?.icon ?? '🥚'} {batch.eggCount} {cfg?.label ?? batch.typeId} eggs — {daysLeft > 0 ? `hatches in ${daysLeft}d` : 'Ready!'}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Silage Section ────────────────────────────────────────────────────────────
function SilageSection({
  silageLevel,
  silageCapacity,
  fillSilagePit,
  grassInStock,
}: {
  silageLevel: number;
  silageCapacity: number;
  fillSilagePit: (kg: number) => void;
  grassInStock: number;
}) {
  if (silageCapacity <= 0) return null;
  const fillPct = Math.min(1, silageLevel / silageCapacity);
  const barColor = fillPct >= 0.9 ? C.green : fillPct >= 0.5 ? C.green : '#ff9800';
  const space = silageCapacity - silageLevel;
  const canFill = grassInStock > 0 && space > 0;
  return (
    <View style={{ backgroundColor: C.bgCard, borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 13 }}>🌿 Silage Pit</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 8, marginRight: 8 }}>
          <View style={{ width: `${Math.round(fillPct * 100)}%`, backgroundColor: barColor, borderRadius: 4, height: 8 }} />
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>
          {silageLevel.toLocaleString()} / {silageCapacity.toLocaleString()} kg
        </Text>
      </View>
      {canFill && (
        <TouchableOpacity
          style={{ backgroundColor: C.greenDark, borderRadius: 6, padding: 8, marginTop: 8, alignItems: 'center' }}
          onPress={() => fillSilagePit(Math.floor(Math.min(grassInStock, space)))}
        >
          <Text style={{ color: C.white, fontSize: 12 }}>
            Fill with Grass ({Math.floor(Math.min(grassInStock, space))} kg available)
          </Text>
        </TouchableOpacity>
      )}
      {!canFill && space > 0 && (
        <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>No grass in stock to fill pit</Text>
      )}
      {space <= 0 && (
        <Text style={{ color: C.green, fontSize: 11, marginTop: 6 }}>Pit full — spread or wait for winter feed draw</Text>
      )}
    </View>
  );
}

// ── Biogas Toggle ─────────────────────────────────────────────────────────────
function BiogasToggle({
  biogasMode,
  setBiogasMode,
}: {
  biogasMode: 'income' | 'fuel';
  setBiogasMode: (mode: 'income' | 'fuel') => void;
}) {
  return (
    <View style={{ backgroundColor: C.bg, borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 13 }}>⚡ Biogas Upgrader</Text>
        <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>
          {biogasMode === 'income' ? 'Selling to grid · $0.80/animal/day' : 'On-farm fuel · 0.3 L/animal/day'}
        </Text>
      </View>
      <TouchableOpacity
        style={{ backgroundColor: biogasMode === 'income' ? '#1565c0' : C.greenDark, borderRadius: 6, padding: 8, minWidth: 70, alignItems: 'center' }}
        onPress={() => setBiogasMode(biogasMode === 'income' ? 'fuel' : 'income')}
      >
        <Text style={{ color: C.white, fontSize: 11, fontWeight: 'bold' }}>
          {biogasMode === 'income' ? '💰 Income' : '⛽ Fuel'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Slurry Section ────────────────────────────────────────────────────────────
function SlurrySection({
  slurryLevel,
  slurryCapacity,
  spreadSlurry,
  hasSlurryTanker,
}: {
  slurryLevel: number;
  slurryCapacity: number;
  spreadSlurry: () => void;
  hasSlurryTanker: boolean;
}) {
  if (slurryCapacity <= 0) return null;
  const fillPct = Math.min(1, slurryLevel / slurryCapacity);
  const barColor = fillPct >= 0.9 ? '#f44336' : fillPct >= 0.7 ? '#ff9800' : C.green;
  return (
    <View style={{ backgroundColor: C.bg, borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 13 }}>Slurry Tank</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 8, marginRight: 8 }}>
          <View style={{ width: `${Math.round(fillPct * 100)}%`, backgroundColor: barColor, borderRadius: 4, height: 8 }} />
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>
          {slurryLevel.toLocaleString()} / {slurryCapacity.toLocaleString()} L
        </Text>
      </View>
      {hasSlurryTanker && slurryLevel > 0 && (
        <TouchableOpacity
          style={{ backgroundColor: C.greenDark, borderRadius: 6, padding: 8, marginTop: 8, alignItems: 'center' }}
          onPress={spreadSlurry}
        >
          <Text style={{ color: C.white, fontSize: 12 }}>Spread on Fields (+1 fertility all owned parcels)</Text>
        </TouchableOpacity>
      )}
      {!hasSlurryTanker && slurryLevel > 0 && (
        <Text style={{ color: '#ff9800', fontSize: 11, marginTop: 6 }}>Buy a Slurry Tanker attachment to spread slurry</Text>
      )}
    </View>
  );
}

function HenilSection() {
  return <HenilAndBuildingsSection />;
}

const styles = StyleSheet.create({
  sectionCard:  { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  sectionTitle: { color: C.text, fontSize: F.size.md, fontWeight: 'bold', marginBottom: S.sm },
});

export default HenilAndBuildingsSection;
export { HenilSection };
