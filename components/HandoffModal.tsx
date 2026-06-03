import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { gameDayToCalendarYear } from '../engine/calendarUtils';
import { farmerAge } from '../engine/dynasty';
import { useGameStore } from '../store/useGameStore';
import { C, F, R, S } from '../constants/theme';

export default function HandoffModal() {
  const { dynasty, day, performHandoff } = useGameStore();

  if (!dynasty.pendingHandoff || !dynasty.pendingHandoffCause) return null;

  const calYear = gameDayToCalendarYear(day);
  const farmer = dynasty.currentFarmer;
  const age = farmerAge(farmer, calYear);
  const cause = dynasty.pendingHandoffCause;
  const generation = dynasty.ancestors.length + 1;

  const title =
    cause === 'death'
      ? `${farmer.firstName} Has Passed Away`
      : cause === 'health_decline'
        ? `${farmer.firstName} Must Step Down`
        : `${farmer.firstName} Is Retiring`;

  const body =
    cause === 'death'
      ? `After ${age} years of life, ${farmer.firstName} ${farmer.familyName} has passed away in ${calYear}. A new generation must take the helm.`
      : cause === 'health_decline'
        ? `At age ${age}, ${farmer.firstName}'s health has declined too far to continue running the farm alone. A new generation must step up.`
        : `${farmer.firstName} has decided to pass the farm to the next generation. A new chapter begins.`;

  const buttonLabel =
    cause === 'death'
      ? 'Begin the Next Generation'
      : cause === 'health_decline'
        ? 'Begin Handoff'
        : 'Hand Over the Farm';

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.year}>{calYear}</Text>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.divider} />
          <Text style={styles.body}>{body}</Text>
          {cause !== 'death' && (
            <Text style={styles.mentorNote}>
              {farmer.firstName} will stay on as a mentor for a few years.
            </Text>
          )}
          <View style={styles.legacyRow}>
            <Text style={styles.legacyLabel}>Generation {generation}</Text>
            <Text style={styles.legacyValue}>Legacy Score: {dynasty.legacyScore.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.btn} onPress={performHandoff}>
            <Text style={styles.btnText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: S.lg,
  },
  card: {
    backgroundColor: '#0d1117',
    borderRadius: R.xl,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: '#c8860a44',
  },
  year: {
    color: '#c8860a',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 2,
  },
  title: {
    color: C.text,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
  },
  divider: {
    height: 1,
    backgroundColor: '#c8860a44',
    marginVertical: 16,
  },
  body: {
    color: C.textMuted,
    fontSize: F.size.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  mentorNote: {
    color: C.greenSoft,
    fontSize: F.size.sm,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  legacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e2a3a',
  },
  legacyLabel: { color: C.textFaint, fontSize: F.size.sm },
  legacyValue: { color: '#c8860a', fontSize: F.size.sm, fontWeight: 'bold' },
  btn: {
    backgroundColor: '#c8860a',
    borderRadius: R.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: F.size.lg },
});
