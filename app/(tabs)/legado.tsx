import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import ArbolSection from '../../components/legado/ArbolSection';
import CaracterSection from '../../components/legado/CaracterSection';
import SubTabBar from '../../components/SubTabBar';
import { C, F } from '../../constants/theme';

type LegadoTab = 'caracter' | 'arbol';

const TABS: { id: LegadoTab; label: string }[] = [
  { id: 'caracter', label: 'Caracter' },
  { id: 'arbol', label: 'Arbol' },
];

export default function LegadoScreen() {
  const [tab, setTab] = useState<LegadoTab>('caracter');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Legacy</Text>
      </View>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as LegadoTab)} />
      {tab === 'caracter' && <CaracterSection />}
      {tab === 'arbol' && <ArbolSection />}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  header:      { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: C.bg },
  headerTitle: { color: C.text, fontSize: F.size.title, fontWeight: 'bold' },
});
