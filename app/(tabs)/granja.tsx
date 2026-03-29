import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import TierrasScreen from './tierras';
import AnimalesScreen from './animales';
import MaquinariaScreen from './maquinaria';
import TrabajadoresScreen from './trabajadores';

type FarmTab = 'fields' | 'animals' | 'machinery' | 'workers';

const TABS: { id: FarmTab; label: string }[] = [
  { id: 'fields',    label: '🌾 Fields' },
  { id: 'animals',   label: '🐄 Animals' },
  { id: 'machinery', label: '🚜 Machinery' },
  { id: 'workers',   label: '👨‍🌾 Workers' },
];

export default function GranjaScreen() {
  const [tab, setTab] = useState<FarmTab>('fields');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'fields'    && <TierrasScreen />}
      {tab === 'animals'   && <AnimalesScreen />}
      {tab === 'machinery' && <MaquinariaScreen />}
      {tab === 'workers'   && <TrabajadoresScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0a1628' },
  tabBar:           { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 6, backgroundColor: '#0a1628' },
  tabBtn:           { flex: 1, backgroundColor: '#16213e', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  tabBtnActive:     { backgroundColor: '#0f3460' },
  tabBtnText:       { color: '#888', fontSize: 10, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#e8d5a3' },
});
