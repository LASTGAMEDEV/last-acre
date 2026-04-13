import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import EconomiaScreen from './economia';
import SubastaScreen from './subasta';
import TiendaScreen from './tienda';
import SubTabBar from '../../components/SubTabBar';
import { C } from '../../constants/theme';

type MarketTab = 'economy' | 'auction' | 'store';

const TABS: { id: MarketTab; label: string }[] = [
  { id: 'economy', label: '📈 Economy' },
  { id: 'auction', label: '🔨 Auction' },
  { id: 'store',   label: '🛒 Store' },
];

export default function MercadoScreen() {
  const [tab, setTab] = useState<MarketTab>('economy');

  return (
    <View style={styles.container}>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as MarketTab)} />

      {tab === 'economy' && <EconomiaScreen />}
      {tab === 'auction' && <SubastaScreen />}
      {tab === 'store'   && <TiendaScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
});
