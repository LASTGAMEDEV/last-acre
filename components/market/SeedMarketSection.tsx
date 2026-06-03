import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { CROP_TYPES } from '../../data/cropTypes';
import { GUIDE_ENTRY_IDS } from '../../data/guideEntries';
import { C, S, F, R } from '../../constants/theme';
import GuideButton from '../GuideButton';

function SeedMarketSection() {
  const { seedVault, money, sellSeedBatch, buyMarketSeed } = useGameStore();

  const sellableEntries = [...(seedVault ?? [])].sort((a, b) => b.generation - a.generation);

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
      <View style={smk.section}>
        <View style={smk.titleRow}>
          <Text style={smk.title}>Buy Standard Seeds</Text>
          <GuideButton entryId="system_crop_seasons" compact />
        </View>
        <Text style={smk.sub}>5 seeds per purchase - Gen 1 - 1.0 genes</Text>
        {CROP_TYPES.map(crop => {
          const cost = Math.round((crop.seedCost ?? 50) * 1.5 + 25) * 5;
          const canAfford = money >= cost;
          return (
            <View key={crop.id} style={smk.shopRow}>
              <View style={smk.seedNameRow}>
                <Text style={smk.shopCrop}>{crop.name}</Text>
                <GuideButton entryId={GUIDE_ENTRY_IDS.crop(crop.id)} compact />
              </View>
              <TouchableOpacity
                style={[smk.buyBtn, !canAfford && smk.buyBtnDisabled]}
                onPress={() => buyMarketSeed(crop.id)}
                disabled={!canAfford}
              >
                <Text style={smk.buyBtnText}>${cost.toLocaleString()}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={smk.section}>
        <View style={smk.titleRow}>
          <Text style={smk.title}>Sell Seed Vault</Text>
          <GuideButton entryId="system_market_prices" compact />
        </View>
        {sellableEntries.length === 0 && <Text style={smk.empty}>No seeds in vault.</Text>}
        {sellableEntries.map(entry => {
          const crop = CROP_TYPES.find(c => c.id === entry.cropId);
          const avgGene = (entry.genes.yield + entry.genes.drought + entry.genes.growth + entry.genes.quality) / 4;
          const pricePerSeed = Math.round(30 * avgGene * Math.max(1, entry.generation));
          const revenue = pricePerSeed * entry.quantity;
          return (
            <View key={entry.id} style={smk.vaultRow}>
              <View style={{ flex: 1 }}>
                <View style={smk.seedNameRow}>
                  <Text style={smk.vaultName}>{crop?.name ?? entry.cropId} - Gen {entry.generation}</Text>
                  {crop && <GuideButton entryId={GUIDE_ENTRY_IDS.crop(crop.id)} compact />}
                </View>
                <Text style={smk.vaultGenes}>
                  Y{entry.genes.yield.toFixed(2)} D{entry.genes.drought.toFixed(2)} G{entry.genes.growth.toFixed(2)} Q{entry.genes.quality.toFixed(2)}
                </Text>
                <Text style={smk.vaultQty}>{entry.quantity} seeds - day {entry.createdDay}</Text>
              </View>
              <TouchableOpacity style={smk.sellBtn} onPress={() => sellSeedBatch(entry.id)}>
                <Text style={smk.sellBtnText}>Sell</Text>
                <Text style={smk.sellBtnSub}>${revenue.toLocaleString()}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const smk = StyleSheet.create({
  section: { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: S.sm, marginBottom: 6 },
  title: { flex: 1, color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
  sub: { color: '#555', fontSize: 11, marginBottom: S.sm },
  empty: { color: '#444', fontSize: F.size.sm, textAlign: 'center', paddingVertical: S.sm },
  shopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.divider },
  seedNameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.sm, marginRight: S.sm },
  shopCrop: { flex: 1, color: '#ccc', fontSize: F.size.sm },
  buyBtn: { backgroundColor: '#0f3460', borderRadius: 7, paddingHorizontal: S.md, paddingVertical: 6 },
  buyBtnDisabled: { backgroundColor: C.bg, opacity: 0.5 },
  buyBtnText: { color: '#64b5f6', fontSize: 11, fontWeight: 'bold' },
  vaultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider, gap: 8 },
  vaultName: { flex: 1, color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  vaultGenes: { color: C.textMuted, fontSize: F.size.xs, marginTop: 1 },
  vaultQty: { color: '#555', fontSize: F.size.xs, marginTop: 1 },
  sellBtn: { backgroundColor: C.bgCard, borderRadius: 7, paddingHorizontal: 10, paddingVertical: S.sm, alignItems: 'center' },
  sellBtnText: { color: C.green, fontSize: 11, fontWeight: 'bold' },
  sellBtnSub: { color: C.green, fontSize: F.size.xs },
});

export default SeedMarketSection;
