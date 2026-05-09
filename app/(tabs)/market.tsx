import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import SubastaScreen from './subasta';
import ShopSection from '../../components/market/ShopSection';
import MarketPricesSection from '../../components/market/MarketPricesSection';
import EconomyStatsSection from '../../components/market/EconomyStatsSection';
import SellingChannelsSection from '../../components/market/SellingChannelsSection';
import ContractsSection from '../../components/market/ContractsSection';
import SubTabBar from '../../components/SubTabBar';
import { C } from '../../constants/theme';

type MarketTab = 'prices' | 'economy' | 'auction' | 'shop' | 'contracts' | 'selling';

const TABS: { id: MarketTab; label: string }[] = [
  { id: 'prices',    label: '📊 Prices' },
  { id: 'economy',   label: '📈 Economy' },
  { id: 'auction',   label: '🔨 Auction' },
  { id: 'shop',      label: '🛒 Shop' },
  { id: 'contracts', label: '📋 Contracts' },
  { id: 'selling',   label: '💰 Selling' },
];

export default function MarketScreen() {
  const [tab, setTab] = useState<MarketTab>('prices');

  return (
    <View style={styles.container}>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as MarketTab)} />
      {tab === 'prices'    && <MarketPricesSection />}
      {tab === 'economy'   && <EconomyStatsSection />}
      {tab === 'auction'   && <SubastaScreen />}
      {tab === 'shop'      && <ShopSection />}
      {tab === 'contracts' && <ContractsSection />}
      {tab === 'selling'   && <SellingChannelsSection />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
});
