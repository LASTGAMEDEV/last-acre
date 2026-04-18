import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import TierrasScreen from './tierras';
import AnimalesScreen from './animales';
import MaquinariaScreen from './maquinaria';
import TrabajadoresScreen from './trabajadores';
import AguaScreen from './agua';
import { useGameStore, SeedEntry, SeedGenes, HybridJob } from '../../store/useGameStore';
import { CROP_TYPES } from '../../data/cropTypes';
import HelpSheet from '../../components/HelpSheet';
import SubTabBar from '../../components/SubTabBar';
import { C, S, F, R } from '../../constants/theme';

type FarmTab = 'fields' | 'animals' | 'machinery' | 'workers' | 'seedlab' | 'water';

const TABS: { id: FarmTab; label: string }[] = [
  { id: 'fields',    label: '🌾 Fields' },
  { id: 'animals',   label: '🐄 Animals' },
  { id: 'machinery', label: '🚜 Machinery' },
  { id: 'workers',   label: '👨‍🌾 Workers' },
  { id: 'seedlab',   label: '🌱 Seed Lab' },
  { id: 'water',     label: '💧 Water' },
];

function geneGrade(v: number): string {
  if (v >= 1.4) return 'S';
  if (v >= 1.2) return 'A';
  if (v >= 1.0) return 'B';
  if (v >= 0.8) return 'C';
  return 'D';
}

function GeneChips({ genes }: { genes: SeedGenes }) {
  const items = [
    { key: 'yield',   label: 'Yld', color: '#81c784' },
    { key: 'drought', label: 'Drt', color: '#64b5f6' },
    { key: 'growth',  label: 'Grw', color: '#ce93d8' },
    { key: 'quality', label: 'Qlt', color: '#ffcc80' },
  ] as const;
  return (
    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
      {items.map(item => {
        const g = geneGrade(genes[item.key]);
        return (
          <Text key={item.key} style={{ color: item.color, fontSize: 10, backgroundColor: item.color + '22', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
            {item.label} {g}
          </Text>
        );
      })}
    </View>
  );
}

function SeedLabScreen() {
  const {
    buildings, money, day, seedVault, hybridJobs,
    startHybridization,
  } = useGameStore();

  const labLevel = buildings.includes('bld_seed_lab_3') ? 3
    : buildings.includes('bld_seed_lab_2') ? 2
    : buildings.includes('bld_seed_lab_1') ? 1
    : 0;
  const maxSlots = labLevel;
  const durationDays = labLevel === 3 ? 7 : labLevel === 2 ? 10 : 14;

  const [selCrop, setSelCrop] = useState<string>(CROP_TYPES[0].id);
  const [selParentA, setSelParentA] = useState<string | null>(null);
  const [selParentB, setSelParentB] = useState<string | null>(null);

  const cropSeeds = seedVault.filter(s => s.cropId === selCrop);
  const validParents = selParentA && selParentB && selParentA !== selParentB;
  const parentA = selParentA ? seedVault.find(s => s.id === selParentA) : undefined;
  const parentB = selParentB ? seedVault.find(s => s.id === selParentB) : undefined;

  const generation = parentA && parentB ? Math.max(parentA.generation, parentB.generation) + 1 : 1;
  const cost = Math.min(200 * generation, 2000);

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ padding: 12, paddingTop: 16 }}>
        <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 17, marginBottom: 4 }}>🌱 Seed Lab</Text>
      </View>

      {/* Lab status */}
      {labLevel === 0 ? (
        <View style={slStyles.lockedCard}>
          <Text style={slStyles.lockedTitle}>🏗️ Seed Lab not built</Text>
          <Text style={slStyles.lockedSub}>Purchase in the Store → Buildings to unlock hybridization.</Text>
        </View>
      ) : (
        <Text style={slStyles.statusBadge}>
          ✅ Seed Lab Lv{labLevel} · {hybridJobs.length}/{maxSlots} slots · {durationDays}d cycles
        </Text>
      )}

      {/* New hybridization form */}
      {labLevel > 0 && hybridJobs.length < maxSlots && (
        <View style={slStyles.card}>
          <Text style={slStyles.cardTitle}>🧪 New Hybridization</Text>

          {/* Crop picker */}
          <Text style={slStyles.label}>Crop</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {CROP_TYPES.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[slStyles.cropChip, selCrop === c.id && slStyles.cropChipActive]}
                onPress={() => { setSelCrop(c.id); setSelParentA(null); setSelParentB(null); }}
              >
                <Text style={[slStyles.cropChipText, selCrop === c.id && slStyles.cropChipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {cropSeeds.length < 2 ? (
            <Text style={slStyles.emptyText}>Need at least 2 seed batches for this crop to hybridize.</Text>
          ) : (
            <>
              <Text style={slStyles.label}>Parent A</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {cropSeeds.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[slStyles.seedChip, selParentA === s.id && slStyles.seedChipActive]}
                    onPress={() => setSelParentA(selParentA === s.id ? null : s.id)}
                  >
                    <Text style={slStyles.seedChipGen}>Gen {s.generation}</Text>
                    <GeneChips genes={s.genes} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={slStyles.label}>Parent B</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {cropSeeds.filter(s => s.id !== selParentA).map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[slStyles.seedChip, selParentB === s.id && slStyles.seedChipActive]}
                    onPress={() => setSelParentB(selParentB === s.id ? null : s.id)}
                  >
                    <Text style={slStyles.seedChipGen}>Gen {s.generation}</Text>
                    <GeneChips genes={s.genes} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {validParents && parentA && parentB && (() => {
                const clamp = (v: number) => Math.min(1.5, Math.max(0.5, v));
                const pred: SeedGenes = {
                  yield:   clamp((parentA.genes.yield   + parentB.genes.yield)   / 2),
                  drought: clamp((parentA.genes.drought + parentB.genes.drought) / 2),
                  growth:  clamp((parentA.genes.growth  + parentB.genes.growth)  / 2),
                  quality: clamp((parentA.genes.quality + parentB.genes.quality) / 2),
                };
                return (
                  <View style={slStyles.prediction}>
                    <Text style={slStyles.predLabel}>Predicted offspring (avg):</Text>
                    <GeneChips genes={pred} />
                    <Text style={slStyles.predSub}>Ready in {durationDays} days · Cost ${cost.toLocaleString()}</Text>
                  </View>
                );
              })()}

              <TouchableOpacity
                style={[slStyles.hybBtn, (!validParents || money < cost) && slStyles.hybBtnDisabled]}
                disabled={!validParents || money < cost}
                onPress={() => {
                  if (selParentA && selParentB) {
                    startHybridization(selCrop, selParentA, selParentB);
                    setSelParentA(null);
                    setSelParentB(null);
                  }
                }}
              >
                <Text style={slStyles.hybBtnText}>
                  {money < cost ? `Need $${cost.toLocaleString()}` : `Start Hybridization — $${cost.toLocaleString()}`}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Active jobs */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 12, marginTop: 8, marginBottom: 4 }}>
        <Text style={[slStyles.sectionLabel, { marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>Active Jobs ({hybridJobs.length}/{maxSlots})</Text>
        <HelpSheet
          title="Seed Lab"
          body="The Seed Lab lets you hybridize two seed batches to breed offspring with combined genes. Higher-generation seeds have better yield, drought resistance, and quality. Requires a Seed Lab building."
          buttonSize={12}
        />
      </View>
      <View style={slStyles.card}>
        {hybridJobs.length === 0 ? (
          <Text style={slStyles.emptyText}>No active jobs.</Text>
        ) : (
          hybridJobs.map(job => {
            const cropDef = CROP_TYPES.find(c => c.id === job.cropId);
            const total = job.readyDay - job.startDay;
            const elapsed = day - job.startDay;
            const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
            const daysLeft = job.readyDay - day;
            return (
              <View key={job.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={slStyles.jobName}>{cropDef?.name ?? job.cropId} Hybrid</Text>
                  <Text style={slStyles.jobDays}>{daysLeft}d left</Text>
                </View>
                <View style={slStyles.progressBg}>
                  <View style={[slStyles.progressFill, { width: `${pct}%` as any }]} />
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Seed Vault */}
      <Text style={slStyles.sectionLabel}>Seed Vault ({seedVault.length})</Text>
      <View style={[slStyles.card, { marginBottom: 32 }]}>
        {seedVault.length === 0 ? (
          <Text style={slStyles.emptyText}>No seeds yet. Complete a hybridization job to get started.</Text>
        ) : (
          seedVault.map(s => {
            const cropDef = CROP_TYPES.find(c => c.id === s.cropId);
            return (
              <View key={s.id} style={slStyles.vaultRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={slStyles.vaultName}>{cropDef?.name ?? s.cropId}</Text>
                    <View style={slStyles.genBadge}>
                      <Text style={slStyles.genBadgeText}>Gen {s.generation}</Text>
                    </View>
                  </View>
                  <GeneChips genes={s.genes} />
                </View>
                <Text style={slStyles.vaultQty}>{s.quantity}x</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const slStyles = StyleSheet.create({
  lockedCard:         { margin: S.md, backgroundColor: C.bgCard, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' },
  lockedTitle:        { color: C.text, fontWeight: 'bold', fontSize: F.size.md, marginBottom: S.xs },
  lockedSub:          { color: C.textMuted, fontSize: 11 },
  statusBadge:        { color: '#66bb6a', fontSize: 11, fontWeight: 'bold', marginHorizontal: S.md, marginBottom: S.sm },
  card:               { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginHorizontal: S.md, marginBottom: 10 },
  cardTitle:          { color: C.text, fontWeight: 'bold', fontSize: F.size.md, marginBottom: 10 },
  sectionLabel:       { color: C.textMuted, fontSize: 11, fontWeight: 'bold', marginHorizontal: S.md, marginTop: S.sm, marginBottom: S.xs, textTransform: 'uppercase', letterSpacing: 1 },
  label:              { color: C.textMuted, fontSize: 11, marginBottom: S.xs },
  emptyText:          { color: '#555', fontSize: 11 },
  cropChip:           { backgroundColor: '#0a1628', borderRadius: 14, paddingHorizontal: S.md, paddingVertical: 5, marginRight: 6 },
  cropChipActive:     { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  cropChipText:       { color: C.textMuted, fontSize: 11 },
  cropChipTextActive: { color: C.text, fontWeight: 'bold' },
  seedChip:           { backgroundColor: '#0a1628', borderRadius: R.md, padding: S.sm, marginRight: 6, minWidth: 80 },
  seedChipActive:     { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  seedChipGen:        { color: C.textMuted, fontSize: F.size.xs, marginBottom: S.xs },
  prediction:         { backgroundColor: '#0a1628', borderRadius: R.md, padding: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#66bb6a' },
  predLabel:          { color: '#66bb6a', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  predSub:            { color: C.textMuted, fontSize: F.size.xs, marginTop: 6 },
  hybBtn:             { backgroundColor: '#1b5e20', borderRadius: R.md, padding: 10, alignItems: 'center' },
  hybBtnDisabled:     { backgroundColor: '#333' },
  hybBtnText:         { color: C.white, fontWeight: 'bold', fontSize: F.size.sm },
  progressBg:         { height: 6, backgroundColor: '#0a1628', borderRadius: 3, marginTop: 6 },
  progressFill:       { height: 6, backgroundColor: '#66bb6a', borderRadius: 3 },
  jobName:            { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  jobDays:            { color: '#66bb6a', fontSize: 11, fontWeight: 'bold' },
  vaultRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider },
  vaultName:          { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  genBadge:           { backgroundColor: '#ffd70033', borderRadius: R.xs, paddingHorizontal: 6, paddingVertical: 2 },
  genBadgeText:       { color: '#ffd700', fontSize: F.size.xs, fontWeight: 'bold' },
  vaultQty:           { color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold' },
});

export default function GranjaScreen() {
  const [tab, setTab] = useState<FarmTab>('fields');

  return (
    <View style={styles.container}>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as FarmTab)} />

      {tab === 'fields'    && <TierrasScreen />}
      {tab === 'animals'   && <AnimalesScreen />}
      {tab === 'machinery' && <MaquinariaScreen />}
      {tab === 'workers'   && <TrabajadoresScreen />}
      {tab === 'seedlab'   && <SeedLabScreen />}
      {tab === 'water'     && <AguaScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
});
