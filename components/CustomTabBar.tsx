import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/useGameStore';
import { getSeason } from '../engine/climate';
import { SEASON_THEME, C } from '../constants/theme';

const SCREEN_W = Dimensions.get('window').width;

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const advanceDay = useGameStore(s => s.advanceDay);
  const { day, parcels, loans, contracts } = useGameStore();
  const season = getSeason(day);
  const theme = SEASON_THEME[season];

  // Badges
  const cropsReady = parcels.filter(p => {
    if (!p.owned || !p.plantedCrop) return false;
    const ct = (require('../data/cropTypes').CROP_TYPES as any[]).find((c: any) => c.id === p.plantedCrop!.cropId);
    return ct && day >= p.plantedCrop.plantedDay + ct.growthDays;
  }).length;

  const urgentLoans = loans.filter(l => !l.paid && !l.defaulted && l.payoffDay - day <= 7 && l.payoffDay >= day).length;
  const urgentContracts = contracts.filter(c => !c.completed && !c.failed && c.deadlineDay - day <= 7 && c.deadlineDay >= day).length;
  const officeBadge = urgentLoans + urgentContracts;

  const badges: Record<string, number> = {
    farm: cropsReady,
    office: officeBadge,
  };

  const leftRoutes = state.routes.slice(0, 2);   // farm, ops
  const rightRoutes = state.routes.slice(2);     // market, office

  function renderTab(route: typeof state.routes[0], index: number, isLeft: boolean) {
    const { options } = descriptors[route.key];
    const label = options.tabBarLabel ?? options.title ?? route.name;
    const isFocused = state.index === index;
    const badge = badges[route.name] ?? 0;

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
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={(options as any).tabBarTestID}
        onPress={onPress}
        style={styles.tab}
      >
        <Text style={[styles.tabLabel, isFocused && { color: theme.accent, fontWeight: 'bold' }]}>
          {String(label)}
        </Text>
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        {isFocused && <View style={[styles.activeIndicator, { backgroundColor: theme.accent }]} />}
      </TouchableOpacity>
    );
  }

  const onAdvance = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { /* haptics unavailable */ }
    advanceDay();
  };

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.tabBar, borderTopColor: theme.accent + '33' }]}>
      {leftRoutes.map((route, i) => renderTab(route, i, true))}

      {/* Center Advance button */}
      <TouchableOpacity style={styles.centerButton} onPress={onAdvance} activeOpacity={0.8}>
        <View style={[styles.centerCircle, { backgroundColor: theme.accent }]}>
          <Text style={styles.centerIcon}>▶</Text>
        </View>
      </TouchableOpacity>

      {rightRoutes.map((route, i) => renderTab(route, i + 2, false))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    borderTopWidth: 1,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 10,
    color: C.textMuted,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 2,
    borderRadius: 1,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: '20%',
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
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  centerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  centerIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 2,
  },
});
