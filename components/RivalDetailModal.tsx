import React, { useEffect, useRef } from 'react';
import {
  Animated, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { NPC_FARM_GROUP, RIVAL_GROUP_NAME } from '../data/npcFarmGroups';
import { CROP_TYPES } from '../data/cropTypes';
import { NPC_FARM_DEFINITIONS } from '../data/npcFarms';
import { C } from '../constants/theme';

interface Props {
  group: 'rivalA' | 'rivalB' | null;
  onClose: () => void;
}

export default function RivalDetailModal({ group, onClose }: Props) {
  const { npcFarms = [], mapFields = [], rivalNews = [], day } = useGameStore();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(500)).current;

  const visible = group !== null;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!group) return null;

  function dismiss() {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardY, { toValue: 500, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      cardY.setValue(500);
      onClose();
    });
  }

  // Farms in this group
  const groupFarms = npcFarms.filter(f => NPC_FARM_GROUP[f.id] === group);
  const startingWealthTotal = NPC_FARM_DEFINITIONS
    .filter(d => NPC_FARM_GROUP[d.id] === group)
    .reduce((s, d) => s + d.startingWealth, 0);
  const currentWealthTotal = groupFarms.reduce((s, f) => s + f.wealth, 0);
  const wealthGrowthPct = startingWealthTotal > 0
    ? Math.round(((currentWealthTotal - startingWealthTotal) / startingWealthTotal) * 100)
    : 0;

  // Land
  const groupFields = mapFields.filter((f: any) => f.owner === group);
  const totalHa = groupFields.reduce((s: number, f: any) => s + (f.approximateHa ?? 0), 0);

  // Specializations (unique across all farms in group)
  const allCropIds = Array.from(new Set(groupFarms.flatMap(f => f.specialization)));

  // Tier (highest tier in group)
  const maxTier = Math.max(1, ...groupFarms.map(f => f.tier)) as 1 | 2 | 3;
  const tierLabel = maxTier === 3 ? 'Dominant' : maxTier === 2 ? 'Established' : 'Small';
  const tierColor = maxTier === 3 ? '#ef5350' : maxTier === 2 ? '#ffb74d' : C.green;

  // Next dump
  const nextDumpIn = groupFarms.length > 0
    ? Math.max(0, Math.min(...groupFarms.map(f => f.nextSellDay - day)))
    : 0;

  // Recent news for this group
  const groupFarmNames = groupFarms.map(f => f.name);
  const groupNews = rivalNews.filter((n: any) =>
    groupFarmNames.some(name => (n.detail ?? '').includes(name) || (n.title ?? '').includes(name))
  ).slice(0, 8);

  const groupName = RIVAL_GROUP_NAME[group];
  const screenH = Dimensions.get('window').height;

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]}>
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={dismiss} />

      <Animated.View style={[styles.card, { maxHeight: screenH * 0.75, transform: [{ translateY: cardY }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.groupName}>{groupName}</Text>
            <Text style={styles.groupSub}>{groupFarms.length} farm{groupFarms.length !== 1 ? 's' : ''} · {groupFields.length} field{groupFields.length !== 1 ? 's' : ''} · ~{Math.round(totalHa)}ha</Text>
          </View>
          <View style={[styles.tierBadge, { backgroundColor: tierColor + '22', borderColor: tierColor }]}>
            <Text style={[styles.tierText, { color: tierColor }]}>{tierLabel}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Wealth */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Combined Wealth</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current</Text>
              <Text style={[styles.statValue, { color: '#e8d5a3' }]}>${Math.round(currentWealthTotal).toLocaleString()}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>vs. starting</Text>
              <Text style={[styles.statValue, { color: wealthGrowthPct >= 0 ? C.green : '#ef5350' }]}>
                {wealthGrowthPct >= 0 ? '+' : ''}{wealthGrowthPct}%
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Next market dump</Text>
              <Text style={[styles.statValue, { color: nextDumpIn <= 3 ? '#ef5350' : '#ccc' }]}>
                {nextDumpIn === 0 ? 'Today' : `in ${nextDumpIn}d`}
              </Text>
            </View>
          </View>

          {/* Specializations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌾 Crops they sell</Text>
            <View style={styles.chipRow}>
              {allCropIds.map(cropId => {
                const crop = CROP_TYPES.find(c => c.id === cropId);
                return (
                  <View key={cropId} style={styles.chip}>
                    <Text style={styles.chipText}>{crop?.name ?? cropId}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Individual farms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏭 Member farms</Text>
            {groupFarms.map(farm => (
              <View key={farm.id} style={styles.farmRow}>
                <View style={[styles.tierDot, { backgroundColor: farm.tier === 3 ? '#ef5350' : farm.tier === 2 ? '#ffb74d' : C.green }]} />
                <Text style={styles.farmName}>{farm.name}</Text>
                <Text style={styles.farmWealth}>${Math.round(farm.wealth).toLocaleString()}</Text>
                <Text style={styles.farmSell}>sells in {Math.max(0, farm.nextSellDay - day)}d</Text>
              </View>
            ))}
          </View>

          {/* Recent news */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📡 Recent activity</Text>
            {groupNews.length === 0 ? (
              <Text style={styles.emptyText}>No activity recorded yet.</Text>
            ) : groupNews.map((item: any) => (
              <View key={item.id} style={styles.newsRow}>
                <Text style={styles.newsIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.newsTitle}>{item.title}</Text>
                  {item.detail ? <Text style={styles.newsDetail}>{item.detail}</Text> : null}
                </View>
                <Text style={styles.newsDay}>d{item.day}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.closeBtn} onPress={dismiss}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    zIndex: 200,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  card: {
    backgroundColor: '#080e1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#1c3050',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  groupName: { color: '#e8d5a3', fontSize: 17, fontWeight: 'bold' },
  groupSub: { color: '#666', fontSize: 11, marginTop: 2 },
  tierBadge: {
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tierText: { fontSize: 11, fontWeight: 'bold' },
  section: {
    backgroundColor: '#0f1a2e',
    borderRadius: 10, padding: 12, marginBottom: 10,
  },
  sectionTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 12, marginBottom: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  statLabel: { color: '#666', fontSize: 12 },
  statValue: { fontSize: 12, fontWeight: 'bold' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#0f3460', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: '#ccc', fontSize: 11 },
  farmRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e2a3a',
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  farmName: { flex: 1, color: '#ccc', fontSize: 12 },
  farmWealth: { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold', marginRight: 8 },
  farmSell: { color: '#666', fontSize: 10 },
  emptyText: { color: '#444', fontSize: 11, fontStyle: 'italic' },
  newsRow: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e2a3a',
  },
  newsIcon: { fontSize: 14 },
  newsTitle: { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold' },
  newsDetail: { color: '#666', fontSize: 10, marginTop: 2 },
  newsDay: { color: '#444', fontSize: 10 },
  closeBtn: {
    marginTop: 12, backgroundColor: '#16213e',
    borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  closeBtnText: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
});
