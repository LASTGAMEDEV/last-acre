import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { getGuideEntry, GUIDE_ENTRIES } from '../data/guideEntries';
import { CROP_TYPES } from '../data/cropTypes';
import { buildGuideContext, getEraSection, getFarmStatePanel } from '../engine/guideContext';
import { useGameStore } from '../store/useGameStore';
import { C, F, R, S, MIN_TOUCH } from '../constants/theme';
import Card from './ui/Card';
import Badge, { BadgeVariant } from './ui/Badge';

interface GuideButtonProps {
  entryId: string;
  compact?: boolean;
  style?: ViewStyle;
}

interface GuideLongPressProps {
  entryId: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

const TONE_TO_BADGE: Record<string, BadgeVariant> = {
  good: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
};

function useGuideContext() {
  const store = useGameStore();
  return useMemo(() => {
    const activeLoans = (store.loans ?? []).filter(loan => !loan.paid);
    const activeContracts = (store.contracts ?? []).filter(contract => !contract.completed && !contract.failed);
    const readyCropCount = (store.parcels ?? []).filter(parcel => {
      if (!parcel.owned || !parcel.plantedCrop) return false;
      const cropType = CROP_TYPES.find(crop => crop.id === parcel.plantedCrop!.cropId);
      return !!cropType && store.day >= parcel.plantedCrop.plantedDay + cropType.growthDays;
    }).length;
    const lowAnimalWelfareCount = Object.values(store.animalWelfareScores ?? {}).filter(score => score < 55).length;
    const brokenMachineCount = (store.machineRepairs ?? []).filter(repair => repair.readyDay === null || repair.readyDay >= store.day).length;
    const expiringStorageBatchCount = (store.inventoryBatches ?? []).filter(batch =>
      batch.infested || batch.quality === 'low' || batch.quality === 'damaged' || batch.quality === 'condemned'
    ).length;

    return buildGuideContext({
      day: store.day,
      money: store.money,
      inventory: store.inventory,
      buildings: store.buildings,
      ownedCropSeedIds: (store.seedVault ?? []).map(seed => seed.cropId),
      ownedAnimalTypeIds: [...new Set((store.animals ?? []).map(animal => animal.typeId))],
      loansTotalOwed: activeLoans.reduce((sum, loan) => sum + loan.totalOwed, 0),
      urgentLoanCount: activeLoans.filter(loan => loan.payoffDay - store.day <= 7 && loan.payoffDay >= store.day).length,
      activeContractCount: activeContracts.length,
      urgentContractCount: activeContracts.filter(contract => contract.deadlineDay - store.day <= 7 && contract.deadlineDay >= store.day).length,
      readyCropCount,
      lowAnimalWelfareCount,
      brokenMachineCount,
      expiringStorageBatchCount,
      selectedParcelSoil: null,
    });
  }, [store]);
}

function GuideVisualPanel({ entry }: { entry: NonNullable<ReturnType<typeof getGuideEntry>> }) {
  const visual = entry.visual;
  if (!visual) return null;

  if (visual.kind === 'before_after') {
    return (
      <Card variant="info">
        <Text style={styles.sectionTitle}>{visual.title}</Text>
        <View style={styles.beforeAfterRow}>
          <View style={styles.beforeAfterPanel}>
            <Text style={styles.visualLabel}>Before</Text>
            <Text style={styles.visualText}>{visual.before}</Text>
          </View>
          <View style={styles.beforeAfterPanel}>
            <Text style={styles.visualLabel}>After</Text>
            <Text style={styles.visualText}>{visual.after}</Text>
          </View>
        </View>
      </Card>
    );
  }

  if (visual.kind === 'illustration') {
    return (
      <Card variant="info">
        <Text style={styles.sectionTitle}>{visual.title}</Text>
        <View style={styles.illustrationBox}>
          {(visual.nodes ?? [entry.title]).slice(0, 6).map(node => (
            <View key={node} style={styles.visualChip}>
              <Text style={styles.visualChipText}>{node}</Text>
            </View>
          ))}
        </View>
      </Card>
    );
  }

  return (
    <Card variant="info">
      <Text style={styles.sectionTitle}>{visual.title}</Text>
      <View style={styles.diagramRow}>
        {(visual.nodes ?? []).slice(0, 6).map((node, index, nodes) => (
          <React.Fragment key={node}>
            <View style={styles.diagramNode}>
              <Text style={styles.diagramText}>{node}</Text>
            </View>
            {index < nodes.length - 1 && <Text style={styles.diagramArrow}>-&gt;</Text>}
          </React.Fragment>
        ))}
      </View>
    </Card>
  );
}

function GuideModal({ entryId, visible, onClose }: { entryId: string; visible: boolean; onClose: () => void }) {
  const context = useGuideContext();
  const entry = getGuideEntry(entryId) ?? GUIDE_ENTRIES[0];
  const eraSection = entry ? getEraSection(entry, context) : null;
  const farmPanel = entry ? getFarmStatePanel(entry, context) : null;

  if (!entry) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{entry.title}</Text>
              <Badge label={`${context.calendarYear}`} variant="purple" />
            </View>
            <Text style={styles.summary}>{entry.summary}</Text>

            <GuideVisualPanel entry={entry} />

            <Card variant="default">
              <Text style={styles.sectionTitle}>Why it matters</Text>
              <Text style={styles.body}>{entry.whyItMatters}</Text>
            </Card>

            <Card variant="default">
              <Text style={styles.sectionTitle}>How to use it</Text>
              {entry.howToUse.slice(0, 4).map(item => (
                <Text key={item} style={styles.bullet}>• {item}</Text>
              ))}
            </Card>

            {eraSection && (
              <Card variant="info">
                <Text style={styles.sectionTitle}>{eraSection.title}</Text>
                <Text style={styles.body}>{eraSection.body}</Text>
              </Card>
            )}

            {farmPanel && (
              <Card variant="default">
                <Text style={styles.sectionTitle}>{farmPanel.title}</Text>
                {farmPanel.rows.slice(0, 5).map(row => (
                  <View key={row.label} style={styles.farmRow}>
                    <Text style={styles.farmLabel}>{row.label}</Text>
                    <Badge label={row.value} variant={TONE_TO_BADGE[row.tone ?? 'info'] ?? 'neutral'} />
                  </View>
                ))}
                {farmPanel.nextActions.slice(0, 2).map(action => (
                  <Text key={action} style={styles.nextAction}>• {action}</Text>
                ))}
              </Card>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Back to farm</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function GuideButton({ entryId, compact = false, style }: GuideButtonProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[compact ? styles.compactBtn : styles.btn, style]}
        onPress={() => setVisible(true)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Open guide entry"
      >
        <Text style={compact ? styles.compactText : styles.btnText}>i</Text>
      </TouchableOpacity>
      <GuideModal entryId={entryId} visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

export function GuideLongPress({ entryId, children, style }: GuideLongPressProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity style={style} activeOpacity={0.85} onLongPress={() => setVisible(true)} delayLongPress={350}>
        {children}
      </TouchableOpacity>
      <GuideModal entryId={entryId} visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: R.pill,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBtn: {
    width: 28,
    height: 28,
    borderRadius: R.pill,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: C.amberSoft, fontSize: F.size.lg, fontWeight: F.weight.heavy },
  compactText: { color: C.amberSoft, fontSize: F.size.sm, fontWeight: F.weight.heavy },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' },
  sheet: {
    maxHeight: '82%',
    backgroundColor: C.bg,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: S.lg,
  },
  handle: { width: 44, height: 4, backgroundColor: C.border, borderRadius: R.pill, alignSelf: 'center', marginBottom: S.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: S.md },
  title: { flex: 1, color: C.text, fontSize: F.size.title, fontWeight: F.weight.heavy },
  summary: { color: C.textDim, fontSize: F.size.body, lineHeight: 21, marginTop: S.sm, marginBottom: S.md },
  sectionTitle: { color: C.text, fontSize: F.size.lg, fontWeight: F.weight.heavy, marginBottom: S.sm },
  body: { color: C.textDim, fontSize: F.size.body, lineHeight: 21 },
  bullet: { color: C.textDim, fontSize: F.size.body, lineHeight: 22, marginBottom: 4 },
  diagramRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: S.xs },
  diagramNode: { backgroundColor: C.bgElevated, borderRadius: R.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.sm, paddingVertical: S.xs },
  diagramText: { color: C.text, fontSize: F.size.sm, fontWeight: F.weight.bold },
  diagramArrow: { color: C.amberSoft, fontSize: F.size.sm, fontWeight: F.weight.bold },
  illustrationBox: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  visualChip: { backgroundColor: C.bgElevated, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.md, paddingVertical: S.xs },
  visualChipText: { color: C.textDim, fontSize: F.size.sm, fontWeight: F.weight.bold },
  beforeAfterRow: { flexDirection: 'row', gap: S.sm },
  beforeAfterPanel: { flex: 1, backgroundColor: C.bgElevated, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.sm },
  visualLabel: { color: C.amberSoft, fontSize: F.size.xs, fontWeight: F.weight.heavy, textTransform: 'uppercase', marginBottom: 4 },
  visualText: { color: C.textDim, fontSize: F.size.sm, lineHeight: 18 },
  farmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md, marginBottom: S.sm },
  farmLabel: { flex: 1, color: C.textDim, fontSize: F.size.sm },
  nextAction: { color: C.amberSoft, fontSize: F.size.sm, lineHeight: 20, marginTop: S.xs },
  closeBtn: { backgroundColor: C.amberDark, borderRadius: R.md, padding: S.md, alignItems: 'center', marginTop: S.sm, marginBottom: S.lg },
  closeText: { color: C.white, fontSize: F.size.body, fontWeight: F.weight.bold },
});
