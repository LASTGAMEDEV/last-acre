// app/(tabs)/legado.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import SubTabBar from '../../components/SubTabBar';
import CaracterSection from '../../components/legado/CaracterSection';
import ArbolSection from '../../components/legado/ArbolSection';
import FamiliaSection from '../../components/legado/FamiliaSection';
import CronicaSection from '../../components/legado/CronicaSection';
import { C } from '../../constants/theme';

type LegadoTab = 'caracter' | 'arbol' | 'familia' | 'cronica';

const TABS: { id: LegadoTab; label: string }[] = [
  { id: 'caracter', label: '👤 Carácter' },
  { id: 'arbol',    label: '🌳 Árbol' },
  { id: 'familia',  label: '👨‍👩‍👧 Familia' },
  { id: 'cronica',  label: '📜 Crónica' },
];

export default function LegadoScreen() {
  const [tab, setTab] = useState<LegadoTab>('caracter');

  return (
    <View style={styles.container}>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as LegadoTab)} />
      {tab === 'caracter' && <CaracterSection />}
      {tab === 'arbol'    && <ArbolSection />}
      {tab === 'familia'  && <FamiliaSection />}
      {tab === 'cronica'  && <CronicaSection />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
});
