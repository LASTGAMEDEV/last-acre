import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ProcesadoScreen from './procesado';
import SegurosScreen from './seguros';

type ProcessingTab = 'processing' | 'insurance';

const TABS: { id: ProcessingTab; label: string }[] = [
  { id: 'processing', label: '🏭 Processing' },
  { id: 'insurance',  label: '🛡️ Insurance' },
];

export default function FabricaScreen() {
  const [tab, setTab] = useState<ProcessingTab>('processing');

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

      {tab === 'processing' && <ProcesadoScreen />}
      {tab === 'insurance'  && <SegurosScreen />}
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
