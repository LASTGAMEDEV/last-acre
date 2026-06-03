import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { CROP_TYPES, CropType, CropTier } from '../data/cropTypes';
import { BUILDING_TYPES, BUILDING_CATEGORY_LABELS, BuildingCategory } from '../data/buildingTypes';
import { ANIMAL_TYPES } from '../data/animalTypes';
import { C } from '../constants/theme';

// ── Tier config ────────────────────────────────────────────────────────────────
const TIER_COLORS: Record<CropTier, string> = {
  D: '#78909c',
  C: C.green,
  B: '#42a5f5',
  A: '#ab47bc',
  S: '#ffd700',
};

const SEASON_ICONS: Record<string, string> = {
  spring: '🌱',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
};

type EncycTab = 'crops' | 'buildings' | 'animals' | 'mechanics';
type TierFilter = 'All' | CropTier;

const ENCYCLOTABS: { id: EncycTab; label: string }[] = [
  { id: 'crops',     label: '🌾 Crops' },
  { id: 'buildings', label: '🏗️ Buildings' },
  { id: 'animals',   label: '🐄 Animals' },
  { id: 'mechanics', label: '⚙️ Mechanics' },
];

const TIER_FILTERS: TierFilter[] = ['All', 'D', 'C', 'B', 'A', 'S'];

// ── Crops Section ──────────────────────────────────────────────────────────────
function CropsSection() {
  const [tierFilter, setTierFilter] = useState<TierFilter>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...CROP_TYPES]
    .filter(c => tierFilter === 'All' || c.tier === tierFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ScrollView contentContainerStyle={{ padding: 10, gap: 6 }} showsVerticalScrollIndicator={false}>
      {/* Tier filter row */}
      <View style={enc.filterRow}>
        {TIER_FILTERS.map(t => (
          <TouchableOpacity
            key={t}
            style={[enc.filterBtn, tierFilter === t && { backgroundColor: t === 'All' ? '#0f3460' : TIER_COLORS[t as CropTier] + '44', borderColor: t === 'All' ? '#e8d5a3' : TIER_COLORS[t as CropTier] }]}
            onPress={() => setTierFilter(t)}
          >
            <Text style={[enc.filterBtnText, tierFilter === t && { color: t === 'All' ? '#e8d5a3' : TIER_COLORS[t as CropTier] }]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sorted.map(crop => {
        const expanded = expandedId === crop.id;
        return (
          <TouchableOpacity
            key={crop.id}
            style={enc.card}
            onPress={() => setExpandedId(expanded ? null : crop.id)}
            activeOpacity={0.8}
          >
            {/* Header row */}
            <View style={enc.cropHeader}>
              <View style={[enc.tierBadge, { backgroundColor: TIER_COLORS[crop.tier] + '33', borderColor: TIER_COLORS[crop.tier] }]}>
                <Text style={[enc.tierText, { color: TIER_COLORS[crop.tier] }]}>{crop.tier}</Text>
              </View>
              <Text style={enc.cropName}>{crop.name}</Text>
              <View style={enc.seasonIcons}>
                {crop.seasons.map(s => (
                  <Text key={s} style={enc.seasonIcon}>{SEASON_ICONS[s]}</Text>
                ))}
              </View>
            </View>

            {/* Stats row */}
            <View style={enc.statsRow}>
              <View style={enc.stat}>
                <Text style={enc.statLabel}>Price</Text>
                <Text style={enc.statValue}>${crop.basePrice}/{crop.unit}</Text>
              </View>
              <View style={enc.stat}>
                <Text style={enc.statLabel}>Days</Text>
                <Text style={enc.statValue}>{crop.growthDays}d</Text>
              </View>
              <View style={enc.stat}>
                <Text style={enc.statLabel}>Yield</Text>
                <Text style={enc.statValue}>{crop.baseYield}{crop.unit}</Text>
              </View>
            </View>

            {/* Expanded details */}
            {expanded && (
              <View style={enc.expandedBox}>
                <View style={enc.detailRow}>
                  <Text style={enc.detailLabel}>Peak Season</Text>
                  <Text style={enc.detailValue}>{SEASON_ICONS[crop.peakSeason]} {crop.peakSeason}</Text>
                </View>
                <View style={enc.detailRow}>
                  <Text style={enc.detailLabel}>Seed Cost</Text>
                  <Text style={enc.detailValue}>${crop.seedCost.toLocaleString()}/ha</Text>
                </View>
                <View style={enc.detailRow}>
                  <Text style={enc.detailLabel}>Water Need</Text>
                  <Text style={enc.detailValue}>{'💧'.repeat(crop.waterNeed)}</Text>
                </View>
                <View style={enc.detailRow}>
                  <Text style={enc.detailLabel}>Fertility Drain</Text>
                  <Text style={[enc.detailValue, { color: crop.fertilityDrain === 0 ? C.green : crop.fertilityDrain >= 2 ? '#ef9a9a' : '#ccc' }]}>
                    {crop.fertilityDrain === 0 ? '✅ Restores soil' : `-${crop.fertilityDrain} pts`}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Buildings Section ──────────────────────────────────────────────────────────
function BuildingsSection() {
  const categories = Object.keys(BUILDING_CATEGORY_LABELS) as BuildingCategory[];

  return (
    <ScrollView contentContainerStyle={{ padding: 10, gap: 10 }} showsVerticalScrollIndicator={false}>
      {categories.map(cat => {
        const buildings = BUILDING_TYPES.filter(b => b.category === cat);
        return (
          <View key={cat}>
            <Text style={enc.groupHeader}>{BUILDING_CATEGORY_LABELS[cat]}</Text>
            {buildings.map(b => (
              <View key={b.id} style={[enc.card, { marginBottom: 6 }]}>
                <View style={enc.bldHeader}>
                  <Text style={enc.bldName}>{b.name}</Text>
                  <Text style={enc.bldCost}>${b.cost.toLocaleString()}</Text>
                </View>
                <View style={enc.bldMeta}>
                  <Text style={enc.bldMaint}>
                    {b.maintenancePerDay < 0 ? `+$${Math.abs(b.maintenancePerDay)}/d` : `$${b.maintenancePerDay}/d maint.`}
                  </Text>
                </View>
                <Text style={enc.bldEffect}>{b.effectLabel}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Animals Section ────────────────────────────────────────────────────────────
function AnimalsSection() {
  const sorted = [...ANIMAL_TYPES].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ScrollView contentContainerStyle={{ padding: 10, gap: 6 }} showsVerticalScrollIndicator={false}>
      {sorted.map(animal => (
        <View key={animal.id} style={enc.card}>
          <View style={enc.animalHeader}>
            <Text style={enc.animalName}>{animal.name}</Text>
            <Text style={enc.animalCost}>${animal.buyCost.toLocaleString()}</Text>
          </View>
          <View style={enc.statsRow}>
            <View style={enc.stat}>
              <Text style={enc.statLabel}>Production</Text>
              <Text style={enc.statValue}>
                {animal.productionType
                  ? `${animal.productionType} ×${animal.productionRate}/d`
                  : 'sell only'}
              </Text>
            </View>
            <View style={enc.stat}>
              <Text style={enc.statLabel}>Maturity</Text>
              <Text style={enc.statValue}>{animal.maturityDays}d</Text>
            </View>
            <View style={enc.stat}>
              <Text style={enc.statLabel}>Max Sell</Text>
              <Text style={enc.statValue}>${animal.maxSellPrice.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Mechanics Section ──────────────────────────────────────────────────────────
const MECHANICS = [
  {
    icon: '🔄',
    title: 'Crop Rotation',
    body: 'Planting a different crop on the same plot after harvest grants +15% yield on the new crop. Avoid repeating the same crop back-to-back to keep your soil productive.',
  },
  {
    icon: '🪨',
    title: 'Soil Types',
    body: 'Each plot has a soil type: Sandy, Loamy, Clay, or Chalky. Some crops thrive in specific soils (e.g. root crops prefer loamy, drought crops like sandy). Check soil affinity before planting.',
  },
  {
    icon: '📅',
    title: 'Seasons',
    body: 'The year is divided into 4 seasons of 90 days each — Spring, Summer, Autumn, Winter. Each crop can only be planted in its listed seasons. Greenhouses bypass this restriction.',
  },
  {
    icon: '📉',
    title: 'Sell Pressure',
    body: 'Large one-time sales temporarily depress market prices for that commodity. Selling in smaller batches or waiting for prices to recover maximises total revenue.',
  },
  {
    icon: '⭐',
    title: 'Prestige',
    body: 'Complete a full in-game year (360 days) to earn a Prestige level. Each Prestige level grants a permanent +5% revenue bonus that carries over into your next run.',
  },
  {
    icon: '🏭',
    title: 'Rivals',
    body: 'NPC rival farms buy and sell land, hire workers, and periodically flood the market with cheap goods. Watch their wealth in the Dashboard — if a rival is surging, expect price drops soon.',
  },
];

// ── Search Index ───────────────────────────────────────────────────────────────
type SearchCategory = 'crop' | 'building' | 'animal' | 'mechanic';

interface SearchResult {
  id: string;
  category: SearchCategory;
  name: string;
  description: string;
  badge: string;
}

function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = [];
  for (const c of CROP_TYPES) {
    results.push({ id: `crop_${c.id}`, category: 'crop', name: c.name, description: `Tier ${c.tier} · $${c.basePrice}/${c.unit} · ${c.growthDays} days · seasons: ${c.seasons.join(', ')}`, badge: '🌾' });
  }
  for (const b of BUILDING_TYPES) {
    results.push({ id: `bld_${b.id}`, category: 'building', name: b.name, description: b.effectLabel, badge: '🏠' });
  }
  for (const a of ANIMAL_TYPES) {
    results.push({ id: `animal_${a.id}`, category: 'animal', name: a.name, description: `${a.enclosureType} enclosure · matures in ${a.maturityDays} days`, badge: '🐄' });
  }
  for (const m of MECHANICS) {
    results.push({ id: `mech_${m.title.replace(/\s+/g, '_')}`, category: 'mechanic', name: m.title, description: m.body, badge: '📖' });
  }
  return results;
}

const SEARCH_INDEX: SearchResult[] = buildSearchIndex();

function MechanicsSection() {
  return (
    <ScrollView contentContainerStyle={{ padding: 10, gap: 10 }} showsVerticalScrollIndicator={false}>
      {MECHANICS.map(m => (
        <View key={m.title} style={enc.mechCard}>
          <View style={enc.mechHeaderRow}>
            <Text style={enc.mechIcon}>{m.icon}</Text>
            <Text style={enc.mechTitle}>{m.title}</Text>
          </View>
          <Text style={enc.mechBody}>{m.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Main Encyclopedia ──────────────────────────────────────────────────────────
export default function Encyclopedia() {
  const [tab, setTab] = useState<EncycTab>('crops');
  const [searchQuery, setSearchQuery] = useState('');
  const trimmed = searchQuery.trim().toLowerCase();
  const isSearching = trimmed.length > 0;
  const filteredResults = isSearching
    ? SEARCH_INDEX.filter(item => item.name.toLowerCase().includes(trimmed) || item.description.toLowerCase().includes(trimmed))
    : [];

  return (
    <View style={enc.container}>
      {/* Search bar */}
      <View style={enc.searchRow}>
        <TextInput
          style={enc.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search crops, buildings, animals…"
          placeholderTextColor="#444"
          returnKeyType="search"
          clearButtonMode="never"
        />
        {isSearching && (
          <TouchableOpacity style={enc.searchClear} onPress={() => setSearchQuery('')}>
            <Text style={enc.searchClearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Inner tab bar — hidden while searching */}
      {!isSearching && <View style={enc.tabBar}>
        {ENCYCLOTABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[enc.tabBtn, tab === t.id && enc.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[enc.tabBtnText, tab === t.id && enc.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>}

      {tab === 'crops'     && !isSearching && <CropsSection />}
      {tab === 'buildings' && !isSearching && <BuildingsSection />}
      {tab === 'animals'   && !isSearching && <AnimalsSection />}
      {tab === 'mechanics' && !isSearching && <MechanicsSection />}

      {/* Search results */}
      {isSearching && (
        <ScrollView contentContainerStyle={{ padding: 10, gap: 6 }} showsVerticalScrollIndicator={false}>
          {filteredResults.length === 0 ? (
            <View style={enc.searchEmpty}>
              <Text style={enc.searchEmptyText}>No results for &quot;{searchQuery.trim()}&quot;</Text>
            </View>
          ) : (
            filteredResults.map(item => (
              <View key={item.id} style={enc.searchResultCard}>
                <View style={enc.searchResultHeader}>
                  <Text style={enc.searchResultBadge}>{item.badge}</Text>
                  <Text style={enc.searchResultCategory}>{item.category.toUpperCase()}</Text>
                  <Text style={enc.searchResultName}>{item.name}</Text>
                </View>
                <Text style={enc.searchResultDesc} numberOfLines={2}>{item.description}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const enc = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#1a1a2e' },

  // Tab bar
  tabBar:           { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 4, backgroundColor: '#1a1a2e' },
  tabBtn:           { flex: 1, backgroundColor: '#16213e', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  tabBtnActive:     { backgroundColor: '#0f3460' },
  tabBtnText:       { color: '#888', fontSize: 9, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#e8d5a3' },

  // Filter row
  filterRow:        { flexDirection: 'row', gap: 4, marginBottom: 4 },
  filterBtn:        { flex: 1, backgroundColor: '#16213e', borderRadius: 6, paddingVertical: 5, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  filterBtnText:    { color: '#888', fontSize: 10, fontWeight: 'bold' },

  // Card
  card:             { backgroundColor: '#16213e', borderRadius: 10, padding: 10 },

  // Crop header
  cropHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tierBadge:        { borderRadius: 4, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  tierText:         { fontSize: 10, fontWeight: 'bold' },
  cropName:         { color: '#e8d5a3', fontSize: 13, fontWeight: 'bold', flex: 1 },
  seasonIcons:      { flexDirection: 'row', gap: 2 },
  seasonIcon:       { fontSize: 10 },

  // Stats row
  statsRow:         { flexDirection: 'row', gap: 4 },
  stat:             { flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 6, alignItems: 'center' },
  statLabel:        { color: '#555', fontSize: 9, marginBottom: 2 },
  statValue:        { color: '#ccc', fontSize: 11, fontWeight: 'bold' },

  // Expanded details
  expandedBox:      { marginTop: 8, borderTopWidth: 1, borderTopColor: '#1e1e3a', paddingTop: 8, gap: 4 },
  detailRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel:      { color: '#888', fontSize: 11 },
  detailValue:      { color: '#ccc', fontSize: 11 },

  // Group header
  groupHeader:      { color: '#e8d5a3', fontSize: 12, fontWeight: 'bold', marginBottom: 6, marginTop: 4 },

  // Building card
  bldHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bldName:          { color: '#e8d5a3', fontSize: 12, fontWeight: 'bold', flex: 1 },
  bldCost:          { color: C.green, fontSize: 12, fontWeight: 'bold' },
  bldMeta:          { marginBottom: 3 },
  bldMaint:         { color: '#888', fontSize: 10 },
  bldEffect:        { color: '#ccc', fontSize: 11, lineHeight: 15 },

  // Animal card
  animalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  animalName:       { color: '#e8d5a3', fontSize: 13, fontWeight: 'bold' },
  animalCost:       { color: C.green, fontSize: 12, fontWeight: 'bold' },

  // Mechanics
  mechCard:         { backgroundColor: '#16213e', borderRadius: 10, padding: 12, gap: 6 },
  mechHeaderRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mechIcon:         { fontSize: 20 },
  mechTitle:        { color: '#e8d5a3', fontSize: 13, fontWeight: 'bold' },
  mechBody:         { color: '#ccc', fontSize: 12, lineHeight: 18 },
  searchRow:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#1a1a2e', gap: 6 },
  searchInput:          { flex: 1, backgroundColor: '#16213e', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', color: '#e8d5a3', fontSize: 12, paddingHorizontal: 10, paddingVertical: 6 },
  searchClear:          { backgroundColor: '#16213e', borderRadius: 8, padding: 6, alignItems: 'center', justifyContent: 'center' },
  searchClearText:      { color: '#888', fontSize: 14, fontWeight: 'bold' },
  searchEmpty:          { paddingVertical: 40, alignItems: 'center' },
  searchEmptyText:      { color: '#555', fontSize: 13 },
  searchResultCard:     { backgroundColor: '#16213e', borderRadius: 10, padding: 10, gap: 4 },
  searchResultHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  searchResultBadge:    { fontSize: 14 },
  searchResultCategory: { color: '#555', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  searchResultName:     { color: '#e8d5a3', fontSize: 12, fontWeight: 'bold', flex: 1 },
  searchResultDesc:     { color: '#888', fontSize: 11, lineHeight: 15 },
});
