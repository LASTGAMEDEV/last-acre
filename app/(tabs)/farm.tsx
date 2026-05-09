import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import TierrasScreen from './tierras';
import AnimalesScreen from './animales';
import AguaScreen from './agua';
import CalendarioScreen from './calendario';
import ClimaScreen from './clima';
import HenilAndBuildingsSection from '../../components/farm/HenilAndBuildingsSection';
import SubTabBar from '../../components/SubTabBar';
import { C } from '../../constants/theme';

type FarmTab = 'fields' | 'animals' | 'henil' | 'water' | 'calendar' | 'weather';

const TABS: { id: FarmTab; label: string }[] = [
  { id: 'fields',    label: '🌾 Fields' },
  { id: 'animals',   label: '🐄 Animals' },
  { id: 'henil',     label: '🌿 Henil' },
  { id: 'water',     label: '💧 Water' },
  { id: 'calendar',  label: '📅 Calendar' },
  { id: 'weather',   label: '🌤️ Weather' },
];

export default function FarmScreen() {
  const [tab, setTab] = useState<FarmTab>('fields');

  return (
    <View style={styles.container}>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as FarmTab)} />
      {tab === 'fields'    && <TierrasScreen />}
      {tab === 'animals'   && <AnimalesScreen />}
      {tab === 'henil'     && <HenilAndBuildingsSection />}
      {tab === 'water'     && <AguaScreen />}
      {tab === 'calendar'  && <CalendarioScreen />}
      {tab === 'weather'   && <ClimaScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
});
