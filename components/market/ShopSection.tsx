import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import TiendaScreen from '../../app/(tabs)/tienda';
import SeedMarketSection from './SeedMarketSection';
import { C, S } from '../../constants/theme';

export default function ShopSection() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <TiendaScreen />
      </View>
      <View style={styles.divider} />
      <View style={styles.section}>
        <SeedMarketSection />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  section: { paddingVertical: S.sm },
  divider: { height: 1, backgroundColor: C.divider, marginHorizontal: S.md },
});
