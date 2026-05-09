import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MaquinariaScreen from './_maquinaria';
import TrabajadoresScreen from './_trabajadores';
import ProcesadoScreen from './_procesado';
import ElectricitySection from '../../components/ops/ElectricitySection';
import SeedLabScreen from '../../components/ops/SeedLabScreen';
import SubTabBar from '../../components/SubTabBar';
import { C } from '../../constants/theme';

type OpsTab = 'machinery' | 'workers' | 'processing' | 'power' | 'seedlab';

const TABS: { id: OpsTab; label: string }[] = [
  { id: 'machinery',  label: '🚜 Machinery' },
  { id: 'workers',    label: '👷 Workers' },
  { id: 'processing', label: '🏭 Processing' },
  { id: 'power',      label: '⚡ Power' },
  { id: 'seedlab',    label: '🌱 Seed Lab' },
];

export default function OpsScreen() {
  const [tab, setTab] = useState<OpsTab>('machinery');

  return (
    <View style={styles.container}>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as OpsTab)} />
      {tab === 'machinery'  && <MaquinariaScreen />}
      {tab === 'workers'    && <TrabajadoresScreen />}
      {tab === 'processing' && <ProcesadoScreen />}
      {tab === 'power'      && <ElectricitySection />}
      {tab === 'seedlab'    && <SeedLabScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
});
