import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';

export default function AutoSellSection() {
  const { prices, autoSell, setAutoSell } = useGameStore();
  const [autoSellMinPrice, setAutoSellMinPrice] = useState<Record<string, string>>({});

  return (
    <ScrollView style={styles.autoSellScroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.autoSellDesc}>
        Enable auto-sell per crop. Each day, if the market price meets your minimum, all stock is sold automatically.
      </Text>
      {CROP_TYPES.map(crop => {
        const rule = (autoSell ?? {})[crop.id];
        const currentPrice = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
        const inputVal = autoSellMinPrice[crop.id] ?? String(rule?.minPrice ?? Math.round(crop.basePrice));
        return (
          <View key={crop.id} style={styles.autoSellRow}>
            <View style={styles.autoSellLeft}>
              <Text style={styles.autoSellName}>{crop.name}</Text>
              <Text style={styles.autoSellPrice}>Now: ${currentPrice.toFixed(2)}/{crop.unit}</Text>
            </View>
            <TextInput
              style={styles.autoSellInput}
              value={inputVal}
              onChangeText={v => setAutoSellMinPrice(prev => ({ ...prev, [crop.id]: v }))}
              keyboardType="numeric"
              placeholder="Min $"
              placeholderTextColor="#444"
            />
            <TouchableOpacity
              style={[styles.autoSellToggle, rule?.enabled && styles.autoSellToggleOn]}
              onPress={() => {
                const minPrice = parseFloat(inputVal) || crop.basePrice;
                if (rule?.enabled) {
                  setAutoSell(crop.id, { enabled: false, minPrice });
                } else {
                  setAutoSell(crop.id, { enabled: true, minPrice });
                }
              }}
            >
              <Text style={styles.autoSellToggleText}>{rule?.enabled ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  autoSellScroll: { flex: 1, paddingHorizontal: S.md },
  autoSellDesc: { color: C.textMuted, fontSize: F.size.sm, marginBottom: S.md, marginTop: S.xs },
  autoSellRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: 10, padding: 10, marginBottom: 6 },
  autoSellLeft: { flex: 1 },
  autoSellName: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  autoSellPrice: { color: C.textMuted, fontSize: 11, marginTop: 1 },
  autoSellInput: { backgroundColor: '#0a1628', color: C.white, fontSize: F.size.sm, borderRadius: R.sm, padding: 6, width: 72, marginHorizontal: S.sm, textAlign: 'center' },
  autoSellToggle: { backgroundColor: '#333', borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 6 },
  autoSellToggleOn: { backgroundColor: '#1b5e20' },
  autoSellToggleText: { color: C.white, fontWeight: 'bold', fontSize: F.size.sm },
});
