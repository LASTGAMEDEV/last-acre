import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { getSeason } from '../../engine/climate';
import { SEASON_THEME, C } from '../../constants/theme';
import DaySummaryModal from '../../components/DaySummaryModal';
import TutorialModal from '../../components/TutorialModal';
import YearEndModal from '../../components/YearEndModal';
import BankruptModal from '../../components/BankruptModal';
import GameHUD from '../../components/GameHUD';
import EventBanner from '../../components/EventBanner';
import MilestonePopup from '../../components/MilestonePopup';
import FirstMission from '../../components/FirstMission';

export default function TabLayout() {
  const { day, advanceDay, advanceDays } = useGameStore();
  const season = getSeason(day);
  const theme = SEASON_THEME[season];

  // Subtle pulse on the Advance button
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900,  useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.00, duration: 900,  useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Persistent status bar */}
      <GameHUD />
      <FirstMission />
      <EventBanner />
      <MilestonePopup />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.accent + '33' },
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: C.faint,
          tabBarLabelStyle: { fontSize: 10 },
        }}
      >
        {/* ── 5 visible combined tabs ── */}
        <Tabs.Screen name="granja"   options={{ title: 'Farm',       tabBarLabel: '🌾 Farm' }} />
        <Tabs.Screen name="mercado"  options={{ title: 'Market',     tabBarLabel: '💰 Market' }} />
        <Tabs.Screen name="fabrica"  options={{ title: 'Processing', tabBarLabel: '🏭 Processing' }} />
        <Tabs.Screen name="gestion"  options={{ title: 'Office',     tabBarLabel: '📋 Office' }} />
        <Tabs.Screen name="clima"    options={{ title: 'Weather',    tabBarLabel: '☀️ Weather' }} />

        {/* ── Hidden legacy screens (content accessed via combined tabs) ── */}
        <Tabs.Screen name="tierras"      options={{ href: null }} />
        <Tabs.Screen name="animales"     options={{ href: null }} />
        <Tabs.Screen name="maquinaria"   options={{ href: null }} />
        <Tabs.Screen name="trabajadores" options={{ href: null }} />
        <Tabs.Screen name="economia"     options={{ href: null }} />
        <Tabs.Screen name="subasta"      options={{ href: null }} />
        <Tabs.Screen name="tienda"       options={{ href: null }} />
        <Tabs.Screen name="procesado"    options={{ href: null }} />
        <Tabs.Screen name="seguros"      options={{ href: null }} />
        <Tabs.Screen name="oficina"      options={{ href: null }} />
        <Tabs.Screen name="calendario"   options={{ href: null }} />
        <Tabs.Screen name="logros"       options={{ href: null }} />
      </Tabs>

      {/* Floating Advance Day button group */}
      <Animated.View style={[styles.advanceBtnWrap, { transform: [{ scale: pulse }] }]}>
        <TouchableOpacity
          style={[styles.advanceBtn, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
          onPress={advanceDay}
        >
          <Text style={styles.advanceDay}>Day {day}</Text>
          <Text style={styles.advanceLabel}>▶ Advance</Text>
        </TouchableOpacity>
        <View style={styles.skipRow}>
          {([5, 10, 30] as const).map(n => (
            <TouchableOpacity
              key={n}
              style={[styles.skipBtn, { borderColor: theme.accent }]}
              onPress={() => advanceDays(n)}
            >
              <Text style={[styles.skipLabel, { color: theme.accent }]}>+{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <DaySummaryModal />
      <TutorialModal />
      <YearEndModal />
      <BankruptModal />
    </View>
  );
}

const styles = StyleSheet.create({
  advanceBtnWrap: {
    position: 'absolute',
    top: 90,
    right: 14,
  },
  advanceBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  advanceDay:   { color: '#fff', fontSize: 11, opacity: 0.85 },
  advanceLabel: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  skipRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginTop: 5 },
  skipBtn: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 3, alignItems: 'center' },
  skipLabel: { fontSize: 11, fontWeight: 'bold' },
});
