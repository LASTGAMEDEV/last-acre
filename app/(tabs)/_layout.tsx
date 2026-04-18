import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { getSeason } from '../../engine/climate';
import { SEASON_THEME, C } from '../../constants/theme';
import { startSeasonMusic, stopSeasonMusic } from '../../engine/sounds';
import { CROP_TYPES } from '../../data/cropTypes';
import DaySummaryModal from '../../components/DaySummaryModal';
import TutorialModal from '../../components/TutorialModal';
import YearEndModal from '../../components/YearEndModal';
import BankruptModal from '../../components/BankruptModal';
import GameHUD from '../../components/GameHUD';
import EventBanner from '../../components/EventBanner';
import MilestonePopup from '../../components/MilestonePopup';
import FirstMission from '../../components/FirstMission';

export default function TabLayout() {
  const { day, parcels, loans, contracts, seasonGoals, musicEnabled, soundEnabled } = useGameStore();
  const season = getSeason(day);

  // Start/stop season music when season or music settings change
  useEffect(() => {
    if (soundEnabled && musicEnabled) {
      startSeasonMusic(season as any);
    } else {
      stopSeasonMusic();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, soundEnabled, musicEnabled]);

  // Badge counts
  const cropsReady = parcels.filter(p => {
    if (!p.owned || !p.plantedCrop) return false;
    const ct = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
    return ct && day >= p.plantedCrop.plantedDay + ct.growthDays;
  }).length;

  const urgentLoans = loans.filter(l => !l.paid && !l.defaulted && l.payoffDay - day <= 7 && l.payoffDay >= day).length;
  const urgentContracts = contracts.filter(c => !c.completed && !c.failed && c.deadlineDay - day <= 7 && c.deadlineDay >= day).length;
  const urgentOffice = urgentLoans + urgentContracts;

  const farmBadge = cropsReady > 0 ? cropsReady : undefined;
  const officeBadge = urgentOffice > 0 ? urgentOffice : undefined;
  const theme = SEASON_THEME[season];

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
        <Tabs.Screen name="granja"   options={{ title: 'Farm',       tabBarLabel: '🌾 Farm',       tabBarBadge: farmBadge }} />
        <Tabs.Screen name="mercado"  options={{ title: 'Market',     tabBarLabel: '💰 Market' }} />
        <Tabs.Screen name="fabrica"  options={{ title: 'Processing', tabBarLabel: '🏭 Processing' }} />
        <Tabs.Screen name="gestion"  options={{ title: 'Office',     tabBarLabel: '📋 Office',     tabBarBadge: officeBadge }} />
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
        <Tabs.Screen name="agua"         options={{ href: null }} />
      </Tabs>

      <DaySummaryModal />
      <TutorialModal />
      <YearEndModal />
      <BankruptModal />
    </View>
  );
}

