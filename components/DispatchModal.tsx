import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import {
  useGameStore, DeliveryCargo,
  REFRIGERATED_TRAILER_IDS, TANK_TRAILER_IDS, LIVESTOCK_TRAILER_IDS,
  DELIVERY_DURATION, TRUCK_FUEL_LITRES,
} from '../store/useGameStore';
import { MACHINE_TYPES } from '../data/machineTypes';

interface Props {
  visible: boolean;
  cargo: DeliveryCargo[];
  marketId: 'local' | 'city' | 'export';
  onClose: () => void;
  onContractor: () => void;
}

export default function DispatchModal({ visible, cargo, marketId, onClose, onContractor }: Props) {
  const {
    machines, trailers, workers, fuel, fuelPrice, deliveryJobs,
    dispatchDelivery,
  } = useGameStore();

  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const needsRefrigerated = cargo.some(c =>
    ['milk','cheese','butter','cream','eggs','meat','chicken_meat','pork','lamb','beef',
     'buffalo_meat','rabbit_meat','duck_meat','turkey_meat','quail_meat'].includes(c.itemId)
  );
  const needsTank = cargo.some(c => ['milk_bulk','oil','juice'].includes(c.itemId));
  const needsLivestock = cargo.some(c => c.category === 'animal');

  const requiredTrailerIds: string[] | null = needsLivestock
    ? LIVESTOCK_TRAILER_IDS
    : needsTank
    ? TANK_TRAILER_IDS
    : needsRefrigerated
    ? [...REFRIGERATED_TRAILER_IDS, ...TANK_TRAILER_IDS]
    : null;

  const busyTruckIds = new Set((deliveryJobs ?? []).map(j => j.truckId));
  const busyTrailerIds = new Set((deliveryJobs ?? []).map(j => j.trailerId));
  const busyDriverIds = new Set((deliveryJobs ?? []).map(j => j.driverId));

  const availableTrucks = (machines ?? []).filter(m => {
    const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
    return mt?.category === 'truck' && !busyTruckIds.has(m.id);
  });

  const selectedTruck = availableTrucks.find(m => m.id === selectedTruckId);

  const availableTrailers = (trailers ?? []).filter(tr => {
    if (tr.hitchedTo !== selectedTruckId) return false;
    if (requiredTrailerIds && !requiredTrailerIds.includes(tr.typeId)) return false;
    return !busyTrailerIds.has(tr.id);
  });

  // All transport_driver workers sorted by hire day — used to derive a stable "Driver #N" label
  const allDrivers = (workers ?? [])
    .filter(w => w.role === 'transport_driver')
    .sort((a, b) => a.hireDay - b.hireDay);

  const availableDrivers = allDrivers.filter(w => !busyDriverIds.has(w.id));

  const fuelLitres = selectedTruck
    ? (TRUCK_FUEL_LITRES[selectedTruck.typeId]?.[marketId] ?? 60)
    : 0;
  const fuelCostAmount = Math.round(fuelLitres * (fuelPrice ?? 1.20) * 100) / 100;
  const hasEnoughFuel = (fuel ?? 0) >= fuelLitres;

  const canDispatch =
    selectedTruckId !== null &&
    selectedTrailerId !== null &&
    selectedDriverId !== null &&
    hasEnoughFuel;

  const handleDispatch = () => {
    if (!canDispatch || !selectedTruckId || !selectedTrailerId || !selectedDriverId) return;
    dispatchDelivery({
      truckId: selectedTruckId,
      trailerId: selectedTrailerId,
      driverId: selectedDriverId,
      cargo,
      marketId,
      returnOrders: [],
    });
    setSelectedTruckId(null);
    setSelectedTrailerId(null);
    setSelectedDriverId(null);
    onClose();
  };

  const marketLabel = marketId.charAt(0).toUpperCase() + marketId.slice(1);
  const duration = DELIVERY_DURATION[marketId];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <Text style={s.title}>🚛 Dispatch Delivery</Text>
          <Text style={s.subtitle}>{marketLabel} Market · {duration}d round trip</Text>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {/* Cargo */}
            <Text style={s.sectionLabel}>Cargo</Text>
            {cargo.map((c, i) => (
              <Text key={i} style={s.cargoLine}>
                • {c.quantity.toLocaleString()} × {c.itemId}
              </Text>
            ))}

            {/* Truck picker */}
            <Text style={s.sectionLabel}>Truck</Text>
            {availableTrucks.length === 0 ? (
              <Text style={s.unavailable}>No trucks available</Text>
            ) : availableTrucks.map(m => {
              const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[s.optionRow, selectedTruckId === m.id && s.optionSelected]}
                  onPress={() => { setSelectedTruckId(m.id); setSelectedTrailerId(null); }}
                >
                  <Text style={s.optionText}>{mt?.name ?? m.typeId}</Text>
                </TouchableOpacity>
              );
            })}

            {/* Trailer picker */}
            {selectedTruckId && (
              <>
                <Text style={s.sectionLabel}>Trailer</Text>
                {availableTrailers.length === 0 ? (
                  <Text style={s.unavailable}>
                    {requiredTrailerIds
                      ? 'No compatible trailer hitched — use contractor'
                      : 'No trailer hitched to this truck'}
                  </Text>
                ) : availableTrailers.map(tr => {
                  const tt = MACHINE_TYPES.find(t => t.id === tr.typeId);
                  return (
                    <TouchableOpacity
                      key={tr.id}
                      style={[s.optionRow, selectedTrailerId === tr.id && s.optionSelected]}
                      onPress={() => setSelectedTrailerId(tr.id)}
                    >
                      <Text style={s.optionText}>{tt?.name ?? tr.typeId}</Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* Driver picker */}
            <Text style={s.sectionLabel}>Driver</Text>
            {availableDrivers.length === 0 ? (
              <Text style={s.unavailable}>No drivers hired — use contractor</Text>
            ) : availableDrivers.map(w => {
              const driverNum = allDrivers.findIndex(d => d.id === w.id) + 1;
              return (
                <TouchableOpacity
                  key={w.id}
                  style={[s.optionRow, selectedDriverId === w.id && s.optionSelected]}
                  onPress={() => setSelectedDriverId(w.id)}
                >
                  <Text style={s.optionText}>🚛 Driver #{driverNum} (hired day {w.hireDay})</Text>
                </TouchableOpacity>
              );
            })}

            {/* Fuel cost */}
            {selectedTruckId && (
              <View style={s.fuelRow}>
                <Text style={s.fuelLabel}>⛽ Fuel required:</Text>
                <Text style={[s.fuelValue, !hasEnoughFuel && { color: '#ef5350' }]}>
                  {fuelLitres}L · ${fuelCostAmount.toFixed(2)}
                  {!hasEnoughFuel
                    ? ` (need ${fuelLitres - (fuel ?? 0)} more L)`
                    : ''}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={s.actions}>
            <TouchableOpacity
              style={[s.dispatchBtn, !canDispatch && s.dispatchBtnDisabled]}
              onPress={handleDispatch}
              disabled={!canDispatch}
            >
              <Text style={s.dispatchBtnText}>Dispatch</Text>
            </TouchableOpacity>
            {!needsLivestock && (
              <TouchableOpacity style={s.contractorBtn} onPress={onContractor}>
                <Text style={s.contractorBtnText}>
                  Pay Contractor (−12%{needsRefrigerated || needsTank ? ' + 5% spoilage' : ''})
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:             { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:               { backgroundColor: '#0d1117', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 36 },
  title:               { color: '#e8d5a3', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  subtitle:            { color: '#888', fontSize: 12, marginBottom: 12 },
  sectionLabel:        { color: '#aaa', fontSize: 11, fontWeight: 'bold', marginTop: 12, marginBottom: 4, textTransform: 'uppercase' },
  cargoLine:           { color: '#ccc', fontSize: 13, marginBottom: 2 },
  optionRow:           { backgroundColor: '#16213e', borderRadius: 8, padding: 10, marginBottom: 6 },
  optionSelected:      { borderColor: '#4caf50', borderWidth: 1.5 },
  optionText:          { color: '#e0e0e0', fontSize: 13 },
  unavailable:         { color: '#ef5350', fontSize: 12, marginBottom: 6 },
  fuelRow:             { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1a2a1a' },
  fuelLabel:           { color: '#aaa', fontSize: 13 },
  fuelValue:           { color: '#66bb6a', fontSize: 13, fontWeight: 'bold' },
  actions:             { marginTop: 16, gap: 8 },
  dispatchBtn:         { backgroundColor: '#1b5e20', borderRadius: 8, padding: 14, alignItems: 'center' },
  dispatchBtnDisabled: { opacity: 0.4 },
  dispatchBtnText:     { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  contractorBtn:       { backgroundColor: '#1a1a2e', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  contractorBtnText:   { color: '#aaa', fontSize: 13 },
  cancelBtn:           { alignItems: 'center', padding: 8 },
  cancelBtnText:       { color: '#555', fontSize: 13 },
});
