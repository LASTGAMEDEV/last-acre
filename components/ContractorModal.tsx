import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ContractorOperation } from '../engine/machinery';
import { C } from '../constants/theme';

interface ContractorModalProps {
  visible: boolean;
  operation: ContractorOperation;
  parcelCount: number;
  totalHa: number;
  totalCost: number;
  canAfford: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const OPERATION_LABELS: Record<ContractorOperation, string> = {
  till:      'Tilling',
  plant:     'Planting',
  spray:     'Spraying',
  harvest:   'Harvesting',
  irrigate:  'Irrigation',
  transport: 'Transport',
};

const OPERATION_RATES: Record<ContractorOperation, string> = {
  till:      '$180/ha',
  plant:     '$130/ha + seed cost',
  spray:     '$85/ha',
  harvest:   '$280/ha',
  irrigate:  '$300/parcel',
  transport: '12% of sale',
};

export default function ContractorModal({
  visible, operation, parcelCount, totalHa, totalCost, canAfford, onConfirm, onCancel,
}: ContractorModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>Hire Contractor</Text>
          <Text style={s.subtitle}>{OPERATION_LABELS[operation]}</Text>

          <View style={s.row}>
            <Text style={s.label}>Parcels</Text>
            <Text style={s.value}>{parcelCount}</Text>
          </View>
          {operation !== 'transport' && (
            <View style={s.row}>
              <Text style={s.label}>Total hectares</Text>
              <Text style={s.value}>{totalHa} ha</Text>
            </View>
          )}
          <View style={s.row}>
            <Text style={s.label}>Rate</Text>
            <Text style={s.value}>{OPERATION_RATES[operation]}</Text>
          </View>
          <View style={[s.row, s.totalRow]}>
            <Text style={s.totalLabel}>Total cost</Text>
            <Text style={[s.totalValue, !canAfford && s.red]}>${totalCost.toLocaleString()}</Text>
          </View>

          {!canAfford && (
            <Text style={s.warning}>Not enough money</Text>
          )}

          <View style={s.btnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, !canAfford && s.disabled]}
              onPress={onConfirm}
              disabled={!canAfford}
            >
              <Text style={s.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  card:        { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 20, width: 300, borderWidth: 1, borderColor: '#333' },
  title:       { color: '#e8d5a3', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle:    { color: '#aaa', fontSize: 13, marginBottom: 16 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label:       { color: '#aaa', fontSize: 13 },
  value:       { color: '#fff', fontSize: 13 },
  totalRow:    { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10, marginTop: 4 },
  totalLabel:  { color: '#e8d5a3', fontSize: 14, fontWeight: 'bold' },
  totalValue:  { color: C.green, fontSize: 14, fontWeight: 'bold' },
  red:         { color: '#ef5350' },
  warning:     { color: '#ef5350', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  btnRow:      { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn:   { flex: 1, backgroundColor: '#333', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelText:  { color: '#aaa', fontWeight: 'bold' },
  confirmBtn:  { flex: 1, backgroundColor: C.greenDark, borderRadius: 8, padding: 12, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: 'bold' },
  disabled:    { backgroundColor: C.greenDark, opacity: 0.5 },
});
