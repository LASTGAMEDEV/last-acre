import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';

function fmt(n: number) {
  return `€${Math.round(n).toLocaleString()}`;
}

export default function AutoSellSection() {
  const { prices, autoSell, setAutoSell, inventory } = useGameStore();
  const [autoSellMinPrice, setAutoSellMinPrice] = useState<Record<string, string>>({});
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);

  const rules = autoSell ?? {};
  const enabledCount = CROP_TYPES.filter(c => rules[c.id]?.enabled).length;

  // Compute "would sell today" — crops with enabled rules and stock meeting price threshold
  const wouldSellToday = CROP_TYPES.filter(crop => {
    const rule = rules[crop.id];
    if (!rule?.enabled) return false;
    const stock = inventory[crop.id] ?? 0;
    if (stock <= 0) return false;
    const currentPrice = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
    return currentPrice >= rule.minPrice;
  });
  const sellValueToday = wouldSellToday.reduce((sum, crop) => {
    const stock = inventory[crop.id] ?? 0;
    const currentPrice = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
    return sum + stock * currentPrice;
  }, 0);

  const visibleCrops = showOnlyEnabled
    ? CROP_TYPES.filter(c => rules[c.id]?.enabled)
    : CROP_TYPES;

  return (
    <ScrollView style={as.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

      {/* Header summary */}
      <View style={as.summaryCard}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={as.statBox}>
            <Text style={as.statLabel}>RULES ACTIVE</Text>
            <Text style={[as.statVal, { color: enabledCount > 0 ? C.green : C.textMuted }]}>{enabledCount}</Text>
          </View>
          <View style={as.statBox}>
            <Text style={as.statLabel}>SELL TODAY</Text>
            <Text style={[as.statVal, { color: wouldSellToday.length > 0 ? C.green : C.textMuted }]}>
              {wouldSellToday.length} crops
            </Text>
          </View>
          <View style={as.statBox}>
            <Text style={as.statLabel}>TODAY'S VALUE</Text>
            <Text style={[as.statVal, { color: sellValueToday > 0 ? C.green : C.textMuted }]}>
              {sellValueToday > 0 ? fmt(sellValueToday) : '—'}
            </Text>
          </View>
        </View>
        {enabledCount > 0 && (
          <Text style={as.desc}>
            {wouldSellToday.length > 0
              ? `${wouldSellToday.map(c => c.name).join(', ')} will auto-sell today`
              : 'No enabled crops meet their minimum price today'}
          </Text>
        )}
      </View>

      {/* Filter toggle */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: S.md, marginBottom: S.sm }}>
        <TouchableOpacity
          style={[as.filterChip, !showOnlyEnabled && as.filterChipActive]}
          onPress={() => setShowOnlyEnabled(false)}
        >
          <Text style={[as.filterChipText, !showOnlyEnabled && { color: '#90caf9' }]}>All crops</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[as.filterChip, showOnlyEnabled && as.filterChipActive]}
          onPress={() => setShowOnlyEnabled(true)}
        >
          <Text style={[as.filterChipText, showOnlyEnabled && { color: '#90caf9' }]}>
            Enabled only ({enabledCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Per-crop rows */}
      {visibleCrops.map(crop => {
        const rule = rules[crop.id];
        const currentPrice = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
        const stock = Math.round(inventory[crop.id] ?? 0);
        const inputVal = autoSellMinPrice[crop.id] ?? String(rule?.minPrice ?? Math.round(crop.basePrice));
        const minPrice = parseFloat(inputVal) || crop.basePrice;
        const priceAboveMin = currentPrice >= minPrice;
        const wouldTrigger = (rule?.enabled ?? false) && stock > 0 && priceAboveMin;

        return (
          <View key={crop.id} style={[as.row, wouldTrigger && as.rowTriggering]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={as.cropName}>{crop.name}</Text>
                {wouldTrigger && <Text style={as.triggerBadge}>→ selling</Text>}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
                <Text style={[as.sub, { color: priceAboveMin && rule?.enabled ? C.green : C.textMuted }]}>
                  Now: €{currentPrice.toFixed(2)}/{crop.unit}
                </Text>
                {stock > 0 && (
                  <Text style={as.sub}>{stock.toLocaleString()} {crop.unit} in stock</Text>
                )}
                {stock === 0 && rule?.enabled && (
                  <Text style={[as.sub, { color: C.textFaint }]}>no stock</Text>
                )}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={as.inputWrapper}>
                <Text style={as.inputPrefix}>min €</Text>
                <TextInput
                  style={as.input}
                  value={inputVal}
                  onChangeText={v => setAutoSellMinPrice(prev => ({ ...prev, [crop.id]: v }))}
                  keyboardType="numeric"
                  placeholderTextColor="#444"
                />
              </View>
              <TouchableOpacity
                style={[as.toggle, rule?.enabled && as.toggleOn]}
                onPress={() => {
                  setAutoSell(crop.id, { enabled: !(rule?.enabled ?? false), minPrice });
                }}
              >
                <Text style={as.toggleText}>{rule?.enabled ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {visibleCrops.length === 0 && (
        <Text style={as.empty}>No rules enabled. Enable auto-sell on crops above.</Text>
      )}
    </ScrollView>
  );
}

const as = StyleSheet.create({
  scroll: { flex: 1 },

  summaryCard: { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, margin: S.md, marginBottom: S.sm, gap: 8 },
  statBox:  { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, alignItems: 'center' },
  statLabel:{ color: C.textFaint, fontSize: 8, fontWeight: '600', letterSpacing: 0.5 },
  statVal:  { color: C.text, fontSize: F.size.md, fontWeight: 'bold', marginTop: 2 },
  desc:     { color: C.textMuted, fontSize: F.size.xs },

  filterChip:       { backgroundColor: C.bgDeep, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#334' },
  filterChipActive: { backgroundColor: '#0f3460', borderColor: '#1a5fa0' },
  filterChipText:   { color: C.textMuted, fontSize: 10 },

  row:          { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: R.sm, padding: 10, marginHorizontal: S.md, marginBottom: 6 },
  rowTriggering:{ backgroundColor: '#0a1e0a', borderWidth: 1, borderColor: C.green + '33' },
  cropName:     { color: C.text, fontWeight: 'bold', fontSize: F.size.sm },
  triggerBadge: { backgroundColor: '#0a2a0a', borderRadius: R.xs, paddingHorizontal: 5, paddingVertical: 1 },
  sub:          { color: C.textMuted, fontSize: 10 },

  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgDeep, borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 4 },
  inputPrefix:  { color: C.textFaint, fontSize: 10, marginRight: 2 },
  input:        { color: C.white, fontSize: F.size.sm, width: 48, textAlign: 'center' },
  toggle:       { backgroundColor: '#333', borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 6 },
  toggleOn:     { backgroundColor: C.greenDark },
  toggleText:   { color: C.white, fontWeight: 'bold', fontSize: F.size.sm },

  empty: { color: C.textFaint, textAlign: 'center', padding: 20, fontSize: F.size.sm },
});
