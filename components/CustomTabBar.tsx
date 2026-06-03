import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/useGameStore';
import { getSeason } from '../engine/climate';
import { SEASON_THEME, C, F, S } from '../constants/theme';

const SCREEN_W = Dimensions.get('window').width;

const TAB_META: Record<string, { icon: string; label: string }> = {
  farm:   { icon: '🌾', label: 'Farm' },
  ops:    { icon: '⚙️', label: 'Ops' },
  market: { icon: '📊', label: 'Market' },
  office: { icon: '🏢', label: 'Office' },
  legado: { icon: '🏆', label: 'Legacy' },
};

const HIDDEN_ROUTES = new Set([
  '_agua','_animales','_calendario','_clima','_maquinaria',
  '_procesado','_subasta','_tienda','_tierras','_trabajadores',
]);

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const advanceDay = useGameStore(s => s.advanceDay);
  const { day, parcels, loans, contracts } = useGameStore();
  const season = getSeason(day);
  const theme = SEASON_THEME[season];

  const cropsReady = parcels.filter(p => {
    if (!p.owned || !p.plantedCrop) return false;
    const ct = (require('../data/cropTypes').CROP_TYPES as any[]).find(
      (c: any) => c.id === p.plantedCrop!.cropId
    );
    return ct && day >= p.plantedCrop.plantedDay + ct.growthDays;
  }).length;

  const urgentLoans = loans.filter(
    l => !l.paid && !l.defaulted && l.payoffDay - day <= 7 && l.payoffDay >= day
  ).length;
  const urgentContracts = contracts.filter(
    c => !c.completed && !c.failed && c.deadlineDay - day <= 7 && c.deadlineDay >= day
  ).length;

  const badges: Record<string, number> = {
    farm:   cropsReady,
    office: urgentLoans + urgentContracts,
  };

  const visibleRoutes = state.routes.filter(r => !HIDDEN_ROUTES.has(r.name)).slice(0, 4);
  const leftRoutes  = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2, 4);

  function renderTab(route: typeof state.routes[0]) {
    const globalIndex = state.routes.findIndex(r => r.key === route.key);
    const isFocused = state.index === globalIndex;
    const badge = badges[route.name] ?? 0;
    const meta = TAB_META[route.name] ?? { icon: '●', label: route.name };

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={onPress}
        style={styles.tab}
      >
        {isFocused && (
          <View style={[styles.activeBar, { backgroundColor: theme.accent }]} />
        )}
        <Text style={[styles.tabIcon, { opacity: isFocused ? 1 : 0.45 }]}>
          {meta.icon}
        </Text>
        <Text style={[styles.tabLabel, { color: isFocused ? theme.accent : C.textFaint }]}>
          {meta.label}
        </Text>
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const onAdvance = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { /* noop */ }
    advanceDay();
  };

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.tabBar, borderTopColor: C.border }]}>
      {leftRoutes.map(r => renderTab(r))}
      <TouchableOpacity style={styles.centerButton} onPress={onAdvance} activeOpacity={0.8}>
        <View style={[styles.centerCircle, { backgroundColor: theme.accent }]}>
          <Text style={styles.centerIcon}>▶</Text>
        </View>
        <Text style={[styles.centerLabel, { color: theme.accent }]}>Advance</Text>
      </TouchableOpacity>
      {rightRoutes.map(r => renderTab(r))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 68,
    borderTopWidth: 1,
    paddingBottom: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 62,
    paddingBottom: 2,
    paddingTop: 4,
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
    letterSpacing: 0.3,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: '15%',
    backgroundColor: '#ef4444',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  centerButton: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  centerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    marginTop: -18,
  },
  centerIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  centerLabel: {
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
    letterSpacing: 0.3,
  },
});
