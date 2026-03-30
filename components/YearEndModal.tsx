import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { MILESTONES } from '../data/milestones';

function getGrade(totalRevenue: number, milestonesCount: number): { letter: string; color: string; label: string } {
  if (totalRevenue >= 500_000 && milestonesCount >= 15) return { letter: 'S', color: '#ff9800', label: 'Legendary Farmer' };
  if (totalRevenue >= 200_000 && milestonesCount >= 10) return { letter: 'A', color: '#9c27b0', label: 'Elite Farmer' };
  if (totalRevenue >= 75_000  && milestonesCount >= 5)  return { letter: 'B', color: '#2196f3', label: 'Established Farmer' };
  if (totalRevenue >= 20_000)                           return { letter: 'C', color: '#4caf50', label: 'Growing Farmer' };
  return { letter: 'D', color: '#9e9e9e', label: 'Rookie Farmer' };
}

export default function YearEndModal() {
  const {
    day, yearEndShown, markYearEndShown, resetGame, startNewSeason,
    money, savings, timeDeposits,
    parcels, animals, machines, buildings,
    completedMilestones, contracts, loanHistory,
    totalRevenue, harvestedCropIds, prestige,
  } = useGameStore();

  if (day < 365 || yearEndShown) return null;

  const ownedParcels = parcels.filter(p => p.owned);
  const ownedHa = ownedParcels.reduce((s, p) => s + p.hectares, 0);
  const avgFertility = ownedParcels.length
    ? ownedParcels.reduce((s, p) => s + p.fertility, 0) / ownedParcels.length
    : 0;
  const tdBalance = timeDeposits.reduce((s, d) => s + d.amount, 0);
  const netWorth = money + savings.balance + tdBalance;
  const completedContracts = contracts.filter(c => c.completed).length;
  const loansOnTime = loanHistory.filter(l => l.paidOnTime).length;
  const done = new Set(completedMilestones);
  const grade = getGrade(totalRevenue, completedMilestones.length);

  const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.box}>

            {/* Header */}
            <Text style={styles.fireworks}>🎉🌾🎉</Text>
            <Text style={styles.title}>Year 1 Complete!</Text>
            <Text style={styles.subtitle}>365 days on the farm</Text>

            {/* Grade */}
            <View style={[styles.gradeBox, { borderColor: grade.color }]}>
              <Text style={[styles.gradeLetter, { color: grade.color }]}>{grade.letter}</Text>
              <Text style={[styles.gradeLabel, { color: grade.color }]}>{grade.label}</Text>
            </View>

            {/* Financials */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💰 Finances</Text>
              <Row label="Total Revenue" value={`$${fmt(totalRevenue)}`} highlight />
              <Row label="Net Worth"     value={`$${fmt(netWorth)}`} />
              <Row label="Cash on Hand"  value={`$${fmt(money)}`} />
              <Row label="In Savings"    value={`$${fmt(savings.balance + tdBalance)}`} />
            </View>

            {/* Farm */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌾 Your Farm</Text>
              <Row label="Land Owned"      value={`${ownedHa.toFixed(1)} ha · ${ownedParcels.length} parcels`} />
              <Row label="Avg Fertility"   value={`${avgFertility.toFixed(1)} / 25`} />
              <Row label="Crops Grown"     value={`${harvestedCropIds.length} types`} />
              <Row label="Livestock"       value={`${animals.length} animals`} />
              <Row label="Machines"        value={`${machines.length} owned`} />
              <Row label="Buildings"       value={`${buildings.length} built`} />
            </View>

            {/* Business */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Business</Text>
              <Row label="Contracts Completed" value={String(completedContracts)} />
              <Row label="Loans Repaid On Time" value={`${loansOnTime} / ${loanHistory.length}`} />
            </View>

            {/* Milestones */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Goals ({completedMilestones.length}/{MILESTONES.length})</Text>
              <View style={styles.milestoneGrid}>
                {MILESTONES.map(m => (
                  <View key={m.id} style={[styles.chip, done.has(m.id) ? styles.chipDone : styles.chipMissed]}>
                    <Text style={styles.chipIcon}>{m.icon}</Text>
                    <Text style={[styles.chipText, !done.has(m.id) && styles.chipTextMissed]} numberOfLines={1}>
                      {m.title}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Buttons */}
            <TouchableOpacity style={styles.continueBtn} onPress={markYearEndShown}>
              <Text style={styles.continueBtnText}>🌱 Continue Farming</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.prestigeBtn} onPress={startNewSeason}>
              <Text style={styles.prestigeBtnTitle}>⭐ New Season — Prestige {(prestige ?? 0) + 1}</Text>
              <Text style={styles.prestigeBtnSub}>Keep farm, reset year · +{((prestige ?? 0) + 1) * 5}% on all sales (permanent)</Text>
              <Text style={styles.prestigeBtnHint}>Your buildings, machines, animals & money carry over. Day resets to 1.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.newGameBtn} onPress={resetGame}>
              <Text style={styles.newGameBtnText}>🔄 New Game</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  box: { backgroundColor: '#16213e', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#c8860a' },

  fireworks: { textAlign: 'center', fontSize: 32, marginBottom: 8 },
  title: { color: '#e8d5a3', fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 20 },

  gradeBox: { alignSelf: 'center', borderWidth: 2, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 12, marginBottom: 20, alignItems: 'center' },
  gradeLetter: { fontSize: 48, fontWeight: 'bold', lineHeight: 52 },
  gradeLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },

  section: { marginBottom: 16 },
  sectionTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13, marginBottom: 8 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  rowLabel: { color: '#888', fontSize: 13 },
  rowValue: { color: '#ccc', fontSize: 13, fontWeight: 'bold' },
  rowValueHighlight: { color: '#81c784', fontSize: 15 },

  milestoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, gap: 4, maxWidth: '48%' },
  chipDone: { backgroundColor: '#1b3a1b' },
  chipMissed: { backgroundColor: '#1a1a2e', opacity: 0.4 },
  chipIcon: { fontSize: 12 },
  chipText: { color: '#81c784', fontSize: 11, fontWeight: 'bold', flexShrink: 1 },
  chipTextMissed: { color: '#555' },

  continueBtn: { backgroundColor: '#c8860a', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  continueBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  prestigeBtn: { backgroundColor: '#1a1050', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#7c4dff' },
  prestigeBtnTitle: { color: '#b39ddb', fontWeight: 'bold', fontSize: 15 },
  prestigeBtnSub: { color: '#7c4dff', fontSize: 12, marginTop: 2 },
  prestigeBtnHint: { color: '#7c7c9a', fontSize: 11, marginTop: 4, textAlign: 'center' },
  newGameBtn: { backgroundColor: '#1e1e3a', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 10 },
  newGameBtnText: { color: '#888', fontWeight: 'bold', fontSize: 14 },
});
