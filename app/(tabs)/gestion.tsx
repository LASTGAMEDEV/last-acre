import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import OficinaScreen from './oficina';
import CalendarioScreen from './calendario';

type OfficeTab = 'office' | 'calendar';

const TABS: { id: OfficeTab; label: string }[] = [
  { id: 'office',   label: '📋 Office' },
  { id: 'calendar', label: '📅 Calendar' },
];

export default function GestionScreen() {
  const [tab, setTab] = useState<OfficeTab>('office');

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

      {tab === 'office'   && <OficinaScreen />}
      {tab === 'calendar' && <CalendarioScreen />}
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
