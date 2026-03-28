import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore, OwnedWorker } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import { WORKER_TYPES, WorkerType, WorkerRole } from '../../data/workerTypes';

const DEPARTMENTS: { id: string; label: string; icon: string; basicId: WorkerRole; specialistId: WorkerRole }[] = [
  { id: 'fields',      label: 'Fields',      icon: '🌾', basicId: 'field_worker',  specialistId: 'agronomist'     },
  { id: 'animals',     label: 'Animals',     icon: '🐄', basicId: 'animal_keeper', specialistId: 'zootechnician'  },
  { id: 'machinery',   label: 'Machinery',   icon: '⚙️', basicId: 'mechanic',      specialistId: 'engineer'       },
  { id: 'processing',  label: 'Processing',  icon: '🏭', basicId: 'processor',     specialistId: 'supervisor'     },
];

const DEPT_ICONS: Record<string, string> = Object.fromEntries(DEPARTMENTS.map(d => [d.id, d.icon]));

export default function TrabajadoresScreen() {
  const { money, workers, day, hireWorker, fireWorker } = useGameStore();
  const activeWorkers: OwnedWorker[] = workers ?? [];

  const totalDailyWage = activeWorkers.reduce((s, w) => {
    const wt = WORKER_TYPES.find(t => t.id === w.typeId);
    return s + (wt?.dailyWage ?? 0);
  }, 0);

  function countOf(typeId: WorkerRole) {
    return activeWorkers.filter(w => w.typeId === typeId).length;
  }

  function isSpecialistLocked(wt: WorkerType): boolean {
    if (!wt.requiresBasicId) return false;
    return countOf(wt.requiresBasicId) === 0;
  }

  function renderCard(wt: WorkerType) {
    const count = countOf(wt.id);
    const atMax = count >= wt.maxCount;
    const canAfford = money >= wt.dailyWage;
    const locked = wt.tier === 'specialist' && isSpecialistLocked(wt);
    const isSpecialist = wt.tier === 'specialist';

    return (
      <View key={wt.id} style={[styles.card, isSpecialist && styles.cardSpecialist, locked && styles.cardLocked]}>
        <Text style={styles.cardIcon}>{wt.icon}</Text>
        <Text style={[styles.cardName, isSpecialist && styles.cardNameSpecialist]}>{wt.name}</Text>
        <Text style={styles.cardDesc}>{wt.description}</Text>
        <Text style={styles.cardWage}>${wt.dailyWage}/day</Text>
        {locked && (
          <Text style={styles.lockNote}>
            Requires 1 {WORKER_TYPES.find(t => t.id === wt.requiresBasicId)?.name}
          </Text>
        )}
        <View style={styles.cardBottom}>
          <Text style={styles.cardCount}>{count}/{wt.maxCount}</Text>
          <TouchableOpacity
            style={[styles.hireBtn, (atMax || !canAfford || locked) && styles.hireBtnDisabled]}
            onPress={() => hireWorker(wt.id)}
            disabled={atMax || !canAfford || locked}
          >
            <Text style={styles.hireBtnText}>
              {atMax ? 'Max' : locked ? 'Locked' : !canAfford ? 'No funds' : '+ Hire'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const vetType = WORKER_TYPES.find(t => t.id === 'vet')!;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Staff" />

      {totalDailyWage > 0 && (
        <View style={styles.wageBanner}>
          <Text style={styles.wageText}>
            💼 {activeWorkers.length} staff · ${totalDailyWage}/day total wages
          </Text>
        </View>
      )}

      {/* Department sections */}
      {DEPARTMENTS.map(dept => {
        const basicType = WORKER_TYPES.find(t => t.id === dept.basicId)!;
        const specialistType = WORKER_TYPES.find(t => t.id === dept.specialistId)!;
        return (
          <View key={dept.id} style={styles.deptSection}>
            <Text style={styles.deptLabel}>{dept.icon} {dept.label}</Text>
            <View style={styles.cardRow}>
              {renderCard(basicType)}
              {renderCard(specialistType)}
            </View>
          </View>
        );
      })}

      {/* Standalone: Vet */}
      <View style={styles.deptSection}>
        <Text style={styles.deptLabel}>🏥 Veterinary</Text>
        <View style={styles.cardRow}>
          {renderCard(vetType)}
        </View>
      </View>

      {/* Active staff */}
      <Text style={styles.sectionLabel}>Active Staff ({activeWorkers.length})</Text>
      {activeWorkers.length === 0 ? (
        <Text style={styles.empty}>No staff hired yet.</Text>
      ) : (
        <View style={styles.staffList}>
          {activeWorkers.map((worker: OwnedWorker) => {
            const wt = WORKER_TYPES.find(t => t.id === worker.typeId);
            if (!wt) return null;
            const daysEmployed = day - worker.hiredDay;
            const deptIcon = wt.department ? DEPT_ICONS[wt.department] : '🏥';
            return (
              <View key={worker.id} style={styles.staffCard}>
                <Text style={styles.staffIcon}>{wt.icon}</Text>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{deptIcon} {wt.name}</Text>
                  <Text style={styles.staffDays}>Hired {daysEmployed}d ago · ${wt.dailyWage}/day</Text>
                </View>
                <TouchableOpacity style={styles.fireBtn} onPress={() => fireWorker(worker.id)}>
                  <Text style={styles.fireBtnText}>Fire</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#1a1a2e' },
  sectionLabel:      { color: '#888', fontSize: 13, paddingHorizontal: 16, marginTop: 16, marginBottom: 6 },
  empty:             { color: '#555', padding: 16 },

  wageBanner:        { backgroundColor: '#1e2a3a', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 10 },
  wageText:          { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },

  deptSection:       { marginTop: 16, paddingHorizontal: 8 },
  deptLabel:         { color: '#aaa', fontSize: 13, fontWeight: 'bold', marginBottom: 8, paddingHorizontal: 4 },

  cardRow:           { flexDirection: 'row', gap: 8 },
  card:              { flex: 1, backgroundColor: '#16213e', borderRadius: 12, padding: 12 },
  cardSpecialist:    { backgroundColor: '#1a2744', borderWidth: 1, borderColor: '#2d4a8a' },
  cardLocked:        { opacity: 0.55 },
  cardIcon:          { fontSize: 26, marginBottom: 4 },
  cardName:          { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  cardNameSpecialist:{ color: '#7eb8f7' },
  cardDesc:          { color: '#888', fontSize: 11, marginBottom: 4, lineHeight: 15 },
  cardWage:          { color: '#81c784', fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  lockNote:          { color: '#666', fontSize: 10, fontStyle: 'italic', marginBottom: 4 },
  cardBottom:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardCount:         { color: '#666', fontSize: 11 },
  hireBtn:           { backgroundColor: '#1565c0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  hireBtnDisabled:   { backgroundColor: '#333' },
  hireBtnText:       { color: '#fff', fontWeight: 'bold', fontSize: 11 },

  staffList:         { paddingHorizontal: 12 },
  staffCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginBottom: 8 },
  staffIcon:         { fontSize: 22, marginRight: 12 },
  staffInfo:         { flex: 1 },
  staffName:         { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  staffDays:         { color: '#888', fontSize: 11, marginTop: 2 },
  fireBtn:           { backgroundColor: '#b71c1c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  fireBtnText:       { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});
