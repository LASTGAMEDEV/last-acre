import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { ANIMAL_TYPES } from '../data/animalTypes';
import { geneScore, isMature, OwnedAnimal } from '../engine/animals';
import { getSeason } from '../engine/climate';
import { C } from '../constants/theme';

const ENTRY_FEE = 250;
const PRIZE_TABLE = ['$2,500', '$1,000', '$500'];
const SEASON_LABELS: Record<string, string> = {
  spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter',
};

function scorePreview(animal: OwnedAnimal): number {
  const genes = animal.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
  const traitBonus = (animal.traits ?? []).length * 0.05;
  return parseFloat((geneScore(genes) + traitBonus).toFixed(3));
}

function gradeFromScore(score: number): string {
  if (score >= 1.35) return 'S';
  if (score >= 1.15) return 'A';
  if (score >= 0.95) return 'B';
  if (score >= 0.75) return 'C';
  return 'D';
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AnimalShowModal({ visible, onClose }: Props) {
  const { animals, day, money, showEntries, enterAnimalShow, withdrawAnimalShow } = useGameStore();
  const season = getSeason(day);
  const seasonStart = day - ((day - 1) % 90);
  const seasonKey = `${season}_${seasonStart}`;
  const daysLeft = 90 - ((day - 1) % 90);
  const year = Math.ceil(day / 360);

  const eligibleAnimals = animals.filter(animal => {
    const animalType = ANIMAL_TYPES.find(t => t.id === animal.typeId);
    if (!animalType) return false;
    return isMature(animal, animalType, day);
  });

  const isEntered = (animalId: string) =>
    (showEntries ?? []).some(e => e.seasonKey === seasonKey && e.animalId === animalId);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>🏆 County Show — {SEASON_LABELS[season]} Year {year}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.deadline}>Entry closes in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</Text>
          <Text style={s.prizeRow}>Prizes: {PRIZE_TABLE.join(' · ')}</Text>
          <Text style={s.feeNote}>Entry fee: ${ENTRY_FEE} · 50% refunded on withdrawal</Text>

          <Text style={s.sectionLabel}>Eligible Animals ({eligibleAnimals.length})</Text>

          {eligibleAnimals.length === 0 ? (
            <Text style={s.empty}>No mature animals to enter. Buy and raise animals first.</Text>
          ) : (
            <FlatList
              data={eligibleAnimals}
              keyExtractor={item => item.id}
              style={s.list}
              renderItem={({ item }) => {
                const animalType = ANIMAL_TYPES.find(t => t.id === item.typeId);
                const entered = isEntered(item.id);
                const score = scorePreview(item);
                const grade = gradeFromScore(score);
                const gradeColor =
                  grade === 'S' ? '#ffd700' :
                  grade === 'A' ? C.green :
                  grade === 'B' ? '#64b5f6' :
                  grade === 'C' ? '#aaa' : '#ef9a9a';
                return (
                  <View style={[s.animalRow, entered && s.animalRowEntered]}>
                    <View style={s.animalInfo}>
                      <Text style={s.animalName}>
                        {animalType?.name ?? item.typeId} · {item.sex === 'female' ? '♀' : '♂'}
                      </Text>
                      <Text style={s.animalScore}>
                        Score: <Text style={{ color: gradeColor }}>{score.toFixed(3)} ({grade})</Text>
                      </Text>
                      {item.traits && item.traits.length > 0 && (
                        <Text style={s.animalTraits}>Traits: {item.traits.join(', ')}</Text>
                      )}
                    </View>
                    {entered ? (
                      <TouchableOpacity style={s.withdrawBtn} onPress={() => withdrawAnimalShow(item.id)}>
                        <Text style={s.withdrawText}>Withdraw</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[s.enterBtn, money < ENTRY_FEE && s.enterBtnDisabled]}
                        onPress={() => enterAnimalShow(item.id)}
                        disabled={money < ENTRY_FEE}
                      >
                        <Text style={s.enterText}>Enter $250</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet:            { backgroundColor: C.bgDeep, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '85%' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title:            { color: '#ffd700', fontSize: 16, fontWeight: 'bold', flex: 1 },
  closeBtn:         { padding: 4 },
  closeText:        { color: '#888', fontSize: 18 },
  deadline:         { color: '#ffb74d', fontSize: 12, marginBottom: 2 },
  prizeRow:         { color: C.green, fontSize: 12, marginBottom: 2 },
  feeNote:          { color: '#666', fontSize: 11, marginBottom: 12 },
  sectionLabel:     { color: '#aaa', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  empty:            { color: '#555', fontSize: 13, textAlign: 'center', marginVertical: 24 },
  list:             { flexShrink: 1 },
  animalRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: 8, padding: 10, marginBottom: 8 },
  animalRowEntered: { borderWidth: 1, borderColor: '#ffd70066' },
  animalInfo:       { flex: 1 },
  animalName:       { color: '#e8d5a3', fontSize: 13, fontWeight: 'bold' },
  animalScore:      { color: '#aaa', fontSize: 11, marginTop: 2 },
  animalTraits:     { color: '#666', fontSize: 10, marginTop: 1 },
  enterBtn:         { backgroundColor: C.greenDark, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  enterBtnDisabled: { backgroundColor: '#333' },
  enterText:        { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  withdrawBtn:      { backgroundColor: '#4a2000', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  withdrawText:     { color: '#ffb74d', fontSize: 12 },
});
