import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';

export default function BankruptModal() {
  const { bankrupt, loans, day, takeBankruptcyLoan, clearBankruptcy, resetGame } = useGameStore();

  if (!bankrupt) return null;

  const totalDebt = loans
    .filter(l => l.defaulted && !l.paid)
    .reduce((s, l) => s + l.totalOwed, 0);

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.icon}>💸</Text>
          <Text style={styles.title}>Farm in Crisis</Text>
          <Text style={styles.sub}>Day {day} — Your farm has run out of funds</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Outstanding debt</Text>
              <Text style={styles.statValue}>${Math.round(totalDebt).toLocaleString()}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Cash on hand</Text>
              <Text style={styles.statValue}>$0</Text>
            </View>
          </View>

          <Text style={styles.message}>
            You have defaulted loans and no recent income. Your farm needs help to survive.
          </Text>

          <TouchableOpacity style={styles.emergencyBtn} onPress={takeBankruptcyLoan}>
            <Text style={styles.emergencyTitle}>🚨 Emergency Loan</Text>
            <Text style={styles.emergencySub}>Receive $2,000 at 20% interest · 60-day term</Text>
            <Text style={styles.emergencySub}>No credit check required</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.continueBtn} onPress={clearBankruptcy}>
            <Text style={styles.continueBtnText}>Continue without loan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.newGameBtn} onPress={resetGame}>
            <Text style={styles.newGameBtnText}>🔄 Start New Farm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#1a0a0a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#f44336' },
  icon: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { color: '#ef9a9a', fontWeight: 'bold', fontSize: 22, textAlign: 'center' },
  sub: { color: '#888', fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: '#2a0a0a', borderRadius: 8, padding: 10, alignItems: 'center' },
  statLabel: { color: '#888', fontSize: 11, marginBottom: 2 },
  statValue: { color: '#ef9a9a', fontWeight: 'bold', fontSize: 16 },
  message: { color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 18, lineHeight: 18 },
  emergencyBtn: { backgroundColor: '#7f1d1d', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#f44336' },
  emergencyTitle: { color: '#ef9a9a', fontWeight: 'bold', fontSize: 15 },
  emergencySub: { color: '#f87171', fontSize: 12, marginTop: 2 },
  continueBtn: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 10, alignItems: 'center', marginBottom: 8 },
  continueBtnText: { color: '#888', fontSize: 13 },
  newGameBtn: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 12, alignItems: 'center' },
  newGameBtnText: { color: '#666', fontWeight: 'bold', fontSize: 14 },
});
