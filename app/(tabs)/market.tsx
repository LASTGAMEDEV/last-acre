import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SubastaScreen from './_subasta';
import ShopSection from '../../components/market/ShopSection';
import MarketPricesSection from '../../components/market/MarketPricesSection';
import EconomyStatsSection from '../../components/market/EconomyStatsSection';
import SellingChannelsSection from '../../components/market/SellingChannelsSection';
import ContractsSection from '../../components/market/ContractsSection';
import MarketNewsSection from '../../components/market/MarketNewsSection';
import SubTabBar from '../../components/SubTabBar';
import { C, F, S } from '../../constants/theme';

type MarketTab = 'prices' | 'news' | 'economy' | 'auction' | 'shop' | 'contracts' | 'selling';

const TABS: { id: MarketTab; label: string }[] = [
  { id: 'prices',    label: '📊 Prices' },
  { id: 'news',      label: '📰 News' },
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
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Market</Text>
      </View>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as MarketTab)} />
      {tab === 'prices'    && <MarketPricesSection />}
      {tab === 'news'      && <MarketNewsSection />}
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
