import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaquinariaScreen from './_maquinaria';
import TrabajadoresScreen from './_trabajadores';
import ProcesadoScreen from './_procesado';
import ElectricitySection from '../../components/ops/ElectricitySection';
import SeedLabScreen from '../../components/ops/SeedLabScreen';
import CompostScreen from '../../components/ops/CompostScreen';
import SubTabBar from '../../components/SubTabBar';
import { C, F, R, S } from '../../constants/theme';

type OpsTab = 'machinery' | 'workers' | 'processing' | 'compost' | 'power' | 'seedlab';

const TABS: { id: OpsTab; label: string }[] = [
  { id: 'machinery',  label: '🚜 Machinery' },
  { id: 'workers',    label: '👷 Workers' },
  { id: 'processing', label: '🏭 Processing' },
  { id: 'compost',    label: '🍂 Compost' },
  { id: 'power',      label: '⚡ Power' },
  { id: 'seedlab',    label: '🌱 Seed Lab' },
];

export default function OpsScreen() {
  const [tab, setTab] = useState<OpsTab>('machinery');

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Operations</Text>
      </View>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as OpsTab)} />
      {tab === 'machinery'  && <MaquinariaScreen />}
      {tab === 'workers'    && <TrabajadoresScreen />}
      {tab === 'processing' && <ProcesadoScreen />}
      {tab === 'compost'    && <CompostScreen />}
      {tab === 'power'      && <ElectricitySection />}
      {tab === 'seedlab'    && <SeedLabScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
});
