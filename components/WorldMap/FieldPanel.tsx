import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { MapField } from '../../types/worldMap';
import { LandParcel } from '../../store/useGameStore';
import { CROP_TYPES } from '../../data/cropTypes';
import { NPC_FARM_GROUP, RIVAL_GROUP_NAME } from '../../data/npcFarmGroups';

interface NPCFarmLike {
  id: string;
  wealth: number;
  nextSellDay: number;
}

interface MapFieldLike {
  owner: string;
  approximateHa?: number;
}

interface Props {
  field: MapField | null;
  parcel?: LandParcel;
  day: number;
  money: number;
  npcFarms: NPCFarmLike[];
  mapFields: MapFieldLike[];
  onClose: () => void;
  onBuy: (id: string) => void;
  onScout: (id: string) => void;
  onManage: (parcelId: string) => void;
  onViewRivalProfile: (group: 'rivalA' | 'rivalB') => void;
}

function getStatusText(field: MapField, parcel?: LandParcel, day?: number): string {
  if (field.owner === 'forsale')  return 'Available for purchase';
  if (field.owner === 'unowned')  return 'Not for sale';
  if (field.owner !== 'player')   return field.scouted ? 'Competitor — scouted' : 'Competitor — unknown';
  if (!parcel)                    return 'Unplanted';
  if (!parcel.plantedCrop)        return parcel.tilled ? 'Tilled — ready to plant' : 'Unplanted';
  const crop = CROP_TYPES.find(c => c.id === parcel.plantedCrop!.cropId);
  if (!crop) return 'Growing';
  const readyDay = parcel.plantedCrop!.plantedDay + crop.growthDays;
  if ((day ?? 0) >= readyDay) return `${crop.name} — Ready to Harvest ⚡`;
  return `${crop.name} — ${readyDay - (day ?? 0)}d remaining`;
}

export default function FieldPanel({ field, parcel, day, money, npcFarms, mapFields, onClose, onBuy, onScout, onManage, onViewRivalProfile }: Props) {
  const { width } = useWindowDimensions();
  const translateY = useSharedValue(300);

  React.useEffect(() => {
    translateY.value = withTiming(field ? 0 : 300, { duration: 260 });
  }, [field]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!field) return null;

  const status = getStatusText(field, parcel, day);
  const canAffordBuy = field.owner === 'forsale' && money >= (field.askingPrice ?? 0);
  const canAffordScout = money >= 500;

  // Rival group stats
  const rivalGroup = (field.owner === 'rivalA' || field.owner === 'rivalB') ? field.owner : null;
  const groupFarms = rivalGroup ? npcFarms.filter(f => NPC_FARM_GROUP[f.id] === rivalGroup) : [];
  const groupWealth = groupFarms.reduce((s, f) => s + f.wealth, 0);
  const groupFieldCount = mapFields.filter(f => f.owner === rivalGroup).length;
  const nextDumpIn = groupFarms.length > 0
    ? Math.max(0, Math.min(...groupFarms.map(f => f.nextSellDay - day)))
    : null;

  return (
    <Animated.View style={[styles.panel, { width: Math.min(340, width - 20) }, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.name}>{field.name}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeX}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.lbl}>Owner</Text>
        <Text style={[styles.val, field.owner === 'player' ? styles.green : field.owner === 'forsale' ? styles.amber : styles.red]}>
          {field.owner === 'player' ? 'You' : field.owner === 'forsale' ? 'For Sale' : rivalGroup ? RIVAL_GROUP_NAME[rivalGroup] : 'Unowned'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.lbl}>Size</Text>
        <Text style={styles.val}>~{field.approximateHa} ha</Text>
      </View>
      {field.fertility !== undefined && (
        <View style={styles.row}>
          <Text style={styles.lbl}>Fertility</Text>
          <Text style={styles.val}>{field.fertility}%</Text>
        </View>
      )}
      <View style={styles.row}>
        <Text style={styles.lbl}>Status</Text>
        <Text style={[styles.val, status.includes('Ready') ? styles.amber : styles.val]}>{status}</Text>
      </View>
      {field.owner === 'forsale' && (
        <View style={styles.row}>
          <Text style={styles.lbl}>Asking price</Text>
          <Text style={styles.val}>${field.askingPrice?.toLocaleString()}</Text>
        </View>
      )}

      {/* Rival group stats */}
      {rivalGroup && (
        <>
          <View style={styles.row}>
            <Text style={styles.lbl}>Combined wealth</Text>
            <Text style={styles.val}>${groupWealth >= 1000 ? `${(groupWealth / 1000).toFixed(1)}k` : Math.round(groupWealth).toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.lbl}>Fields owned</Text>
            <Text style={styles.val}>{groupFieldCount}</Text>
          </View>
          {nextDumpIn !== null && (
            <View style={styles.row}>
              <Text style={styles.lbl}>Next market dump</Text>
              <Text style={[styles.val, nextDumpIn <= 3 ? styles.red : styles.val]}>
                {nextDumpIn === 0 ? 'Today' : `in ${nextDumpIn}d`}
              </Text>
            </View>
          )}
        </>
      )}

      <View style={styles.divider}/>

      {field.owner === 'forsale' && (
        <TouchableOpacity
          style={[styles.btn, canAffordBuy ? styles.btnBuy : styles.btnDisabled]}
          onPress={() => canAffordBuy && onBuy(field.id)}
          disabled={!canAffordBuy}
        >
          <Text style={styles.btnText}>{canAffordBuy ? `Buy Field ($${field.askingPrice?.toLocaleString()})` : 'Not enough money'}</Text>
        </TouchableOpacity>
      )}
      {field.owner === 'player' && parcel && (
        <TouchableOpacity style={[styles.btn, styles.btnManage]} onPress={() => onManage(parcel.id)}>
          <Text style={styles.btnText}>
            {parcel.plantedCrop ? (status.includes('Ready') ? '⚡ Harvest Now →' : 'Manage Field →') : 'Plant a Crop →'}
          </Text>
        </TouchableOpacity>
      )}
      {rivalGroup && !field.scouted && (
        <TouchableOpacity
          style={[styles.btn, canAffordScout ? styles.btnScout : styles.btnDisabled]}
          onPress={() => canAffordScout && onScout(field.id)}
          disabled={!canAffordScout}
        >
          <Text style={styles.btnText}>Buy Scout Report ($500)</Text>
        </TouchableOpacity>
      )}
      {rivalGroup && (
        <TouchableOpacity
          style={[styles.btn, styles.btnProfile]}
          onPress={() => onViewRivalProfile(rivalGroup)}
        >
          <Text style={styles.btnText}>View Rival Profile →</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    backgroundColor: 'rgba(4,6,12,0.97)', borderWidth: 1, borderColor: '#1c3050',
    borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.9, shadowRadius: 24, shadowOffset: { width: 0, height: 6 },
    elevation: 20,
  },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  name:     { fontSize: 14, fontWeight: '700', color: '#ddd' },
  closeBtn: { padding: 4 },
  closeX:   { color: '#444', fontSize: 16 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  lbl:      { color: '#505050', fontSize: 11 },
  val:      { color: '#aaa', fontSize: 11 },
  green:    { color: '#62a838' },
  amber:    { color: '#c8a830' },
  red:      { color: '#b84040' },
  divider:  { borderTopWidth: 1, borderTopColor: '#121c28', marginVertical: 8 },
  btn:      { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 6, marginTop: 4, alignItems: 'center' },
  btnText:  { fontSize: 12, fontWeight: '700', color: '#e8d5a3' },
  btnBuy:   { backgroundColor: '#1a1200', borderWidth: 1, borderColor: '#6a4400' },
  btnManage:{ backgroundColor: '#0e2014', borderWidth: 1, borderColor: '#225020' },
  btnScout: { backgroundColor: '#120c22', borderWidth: 1, borderColor: '#301860' },
  btnProfile: { backgroundColor: '#0d1c30', borderWidth: 1, borderColor: '#1e4070' },
  btnDisabled: { backgroundColor: '#181818', borderWidth: 1, borderColor: '#2a2a2a' },
});
