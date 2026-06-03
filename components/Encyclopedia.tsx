import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { GUIDE_CATEGORY_LABELS, GUIDE_CATEGORY_ORDER, GUIDE_ENTRIES, searchGuideEntries } from '../data/guideEntries';
import { buildGuideContext, getEraSection, getFarmStatePanel } from '../engine/guideContext';
import { useGameStore } from '../store/useGameStore';
import type { GuideCategory, GuideEntry, GuideVisualRef } from '../types/guide';
import { C, F, R, S } from '../constants/theme';
import Card from './ui/Card';
import Badge, { BadgeVariant } from './ui/Badge';

const ALL_CATEGORIES = 'all';
type CategoryFilter = GuideCategory | typeof ALL_CATEGORIES;

const TONE_TO_BADGE: Record<string, BadgeVariant> = {
  good: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
};

function VisualExplainer({ visual }: { visual?: GuideVisualRef }) {
  if (!visual) return null;

  if (visual.kind === 'before_after') {
    return (
      <Card variant="info" style={styles.visualCard}>
        <Text style={styles.visualTitle}>{visual.title}</Text>
        <View style={styles.beforeAfterRow}>
          <View style={styles.beforeAfterBox}>
            <Text style={styles.beforeAfterLabel}>Before</Text>
            <Text style={styles.beforeAfterText}>{visual.before}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={styles.beforeAfterBox}>
            <Text style={styles.beforeAfterLabel}>After</Text>
            <Text style={styles.beforeAfterText}>{visual.after}</Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="info" style={styles.visualCard}>
      <Text style={styles.visualTitle}>{visual.title}</Text>
      <View style={styles.diagramRow}>
        {(visual.nodes ?? []).map((node, index) => (
          <React.Fragment key={node}>
            <View style={styles.diagramNode}>
              <Text style={styles.diagramText}>{node}</Text>
            </View>
            {index < (visual.nodes?.length ?? 0) - 1 && <Text style={styles.diagramArrow}>→</Text>}
          </React.Fragment>
        ))}
      </View>
    </Card>
  );
}

function EntryPreview({ entry, selected, onPress }: { entry: GuideEntry; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Card variant={selected ? 'info' : 'default'} style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryTitle}>{entry.title}</Text>
          <Badge label={GUIDE_CATEGORY_LABELS[entry.category]} variant={selected ? 'info' : 'neutral'} />
        </View>
        <Text style={styles.entrySummary}>{entry.summary}</Text>
        <View style={styles.tagRow}>
          {entry.tags.slice(0, 4).map(tag => (
            <Text key={tag} style={styles.tag}>#{tag}</Text>
          ))}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function EntryDetail({
  entry,
  entriesById,
  onSelectEntry,
}: {
  entry: GuideEntry;
  entriesById: Map<string, GuideEntry>;
  onSelectEntry: (id: string) => void;
}) {
  const store = useGameStore();
  const context = buildGuideContext({
    day: store.day,
    money: store.money,
    inventory: store.inventory,
    buildings: store.buildings,
    ownedCropSeedIds: (store.seedVault ?? []).map(seed => seed.cropId),
    ownedAnimalTypeIds: [...new Set((store.animals ?? []).map(animal => animal.typeId))],
    loansTotalOwed: (store.loans ?? []).filter(loan => !loan.paid).reduce((sum, loan) => sum + loan.totalOwed, 0),
    activeContractCount: (store.contracts ?? []).filter(contract => !contract.completed && !contract.failed).length,
    selectedParcelSoil: null,
  });

  const eraSection = getEraSection(entry, context);
  const farmPanel = getFarmStatePanel(entry, context);

  return (
    <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
      <Card variant="elevated">
        <View style={styles.detailTitleRow}>
          <Text style={styles.detailTitle}>{entry.title}</Text>
          <Badge label={`${context.calendarYear}`} variant="purple" />
        </View>
        <Text style={styles.detailSummary}>{entry.summary}</Text>
      </Card>

      <VisualExplainer visual={entry.visual} />

      <GuideSection title="Why It Matters" body={entry.whyItMatters} />
      <GuideList title="How To Use It" items={entry.howToUse} />
      <GuideList title="Mistakes To Avoid" items={entry.mistakesToAvoid} tone="warning" />

      {eraSection && (
        <Card variant="info">
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{eraSection.title}</Text>
            <Badge label={context.eraLabel} variant="info" />
          </View>
          <Text style={styles.sectionBody}>{eraSection.body}</Text>
        </Card>
      )}

      {farmPanel && (
        <Card variant="default">
          <Text style={styles.sectionTitle}>{farmPanel.title}</Text>
          <View style={styles.farmRows}>
            {farmPanel.rows.map(row => (
              <View key={row.label} style={styles.farmRow}>
                <Text style={styles.farmLabel}>{row.label}</Text>
                <Badge label={row.value} variant={TONE_TO_BADGE[row.tone ?? 'info'] ?? 'neutral'} />
              </View>
            ))}
          </View>
          {farmPanel.nextActions.length > 0 && (
            <View style={styles.nextActions}>
              <Text style={styles.nextTitle}>Next sensible action</Text>
              {farmPanel.nextActions.map(action => (
                <Text key={action} style={styles.bullet}>• {action}</Text>
              ))}
            </View>
          )}
        </Card>
      )}

      {entry.relatedEntryIds.length > 0 && (
        <Card variant="default">
          <Text style={styles.sectionTitle}>Related Entries</Text>
          <View style={styles.relatedGrid}>
            {entry.relatedEntryIds.map(id => {
              const related = entriesById.get(id);
              if (!related) return null;
              return (
                <TouchableOpacity key={id} style={styles.relatedBtn} onPress={() => onSelectEntry(id)}>
                  <Text style={styles.relatedText}>{related.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

function GuideSection({ title, body }: { title: string; body: string }) {
  return (
    <Card variant="default">
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </Card>
  );
}

function GuideList({ title, items, tone = 'default' }: { title: string; items: string[]; tone?: 'default' | 'warning' }) {
  return (
    <Card variant={tone === 'warning' ? 'warning' : 'default'}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map(item => (
        <Text key={item} style={styles.bullet}>• {item}</Text>
      ))}
    </Card>
  );
}

export default function Encyclopedia() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>(ALL_CATEGORIES);
  const [selectedId, setSelectedId] = useState<string>(GUIDE_ENTRIES[0]?.id ?? '');
  const { width } = useWindowDimensions();
  const compact = width < 760;

  const entriesById = useMemo(() => new Map(GUIDE_ENTRIES.map(entry => [entry.id, entry])), []);
  const filtered = useMemo(
    () => searchGuideEntries(query, category === ALL_CATEGORIES ? undefined : category),
    [query, category],
  );
  const selected = entriesById.get(selectedId) ?? filtered[0] ?? GUIDE_ENTRIES[0];

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.sidebar, compact && styles.sidebarCompact]}>
        <Text style={styles.title}>Guide</Text>
        <Text style={styles.subtitle}>Search the farm, then jump back into work with a next action.</Text>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search crops, soil, contracts..."
          placeholderTextColor={C.textFaint}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.categoryChip, category === ALL_CATEGORIES && styles.categoryChipActive]}
            onPress={() => setCategory(ALL_CATEGORIES)}
          >
            <Text style={[styles.categoryText, category === ALL_CATEGORIES && styles.categoryTextActive]}>All</Text>
          </TouchableOpacity>
          {GUIDE_CATEGORY_ORDER.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{GUIDE_CATEGORY_LABELS[cat]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView style={styles.entriesList} showsVerticalScrollIndicator={false}>
          {filtered.map(entry => (
            <EntryPreview
              key={entry.id}
              entry={entry}
              selected={entry.id === selected?.id}
              onPress={() => setSelectedId(entry.id)}
            />
          ))}
          {filtered.length === 0 && (
            <Card variant="warning">
              <Text style={styles.sectionTitle}>No guide entries found</Text>
              <Text style={styles.sectionBody}>Try a broader term like soil, money, animals, contracts, or yield.</Text>
            </Card>
          )}
        </ScrollView>
      </View>

      <View style={[styles.detailPane, compact && styles.detailPaneCompact]}>
        {selected && <EntryDetail entry={selected} entriesById={entriesById} onSelectEntry={setSelectedId} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: C.bg },
  containerCompact: { flexDirection: 'column' },
  sidebar: { width: '44%', minWidth: 280, borderRightWidth: 1, borderRightColor: C.divider, padding: S.md },
  sidebarCompact: { width: '100%', minWidth: 0, maxHeight: 330, borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: C.divider },
  detailPane: { flex: 1 },
  detailPaneCompact: { minHeight: 360 },
  title: { color: C.text, fontSize: F.size.title, fontWeight: F.weight.heavy },
  subtitle: { color: C.textDim, fontSize: F.size.sm, lineHeight: 18, marginTop: 4, marginBottom: S.md },
  search: {
    backgroundColor: C.bgInput,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    marginBottom: S.sm,
  },
  categoryScroll: { maxHeight: 42, marginBottom: S.sm },
  categoryChip: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.pill,
    paddingHorizontal: S.md,
    paddingVertical: 6,
    marginRight: S.sm,
  },
  categoryChipActive: { backgroundColor: C.amberDark, borderColor: C.amberSoft },
  categoryText: { color: C.textDim, fontSize: F.size.sm, fontWeight: F.weight.bold },
  categoryTextActive: { color: C.white },
  entriesList: { flex: 1 },
  entryCard: { marginBottom: S.sm },
  entryHeader: { gap: S.xs, marginBottom: S.xs },
  entryTitle: { color: C.text, fontSize: F.size.lg, fontWeight: F.weight.heavy },
  entrySummary: { color: C.textDim, fontSize: F.size.sm, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: S.sm },
  tag: { color: C.textFaint, fontSize: F.size.xs },
  detailScroll: { flex: 1 },
  detailContent: { padding: S.md, paddingBottom: S.xxl },
  detailTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: S.md, alignItems: 'flex-start' },
  detailTitle: { color: C.text, fontSize: F.size.title, fontWeight: F.weight.heavy, flex: 1 },
  detailSummary: { color: C.textDim, fontSize: F.size.body, lineHeight: 21, marginTop: S.sm },
  visualCard: { overflow: 'hidden' },
  visualTitle: { color: C.text, fontSize: F.size.md, fontWeight: F.weight.bold, marginBottom: S.sm },
  diagramRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  diagramNode: { backgroundColor: C.bgInput, borderColor: C.border, borderWidth: 1, borderRadius: R.md, paddingHorizontal: S.sm, paddingVertical: 7 },
  diagramText: { color: C.text, fontSize: F.size.sm, fontWeight: F.weight.bold },
  diagramArrow: { color: C.amberSoft, fontSize: F.size.lg, fontWeight: F.weight.bold },
  beforeAfterRow: { flexDirection: 'row', alignItems: 'stretch', gap: S.sm },
  beforeAfterBox: { flex: 1, backgroundColor: C.bgInput, borderRadius: R.md, padding: S.sm, borderWidth: 1, borderColor: C.border },
  beforeAfterLabel: { color: C.textMuted, fontSize: F.size.xs, fontWeight: F.weight.bold, marginBottom: 4 },
  beforeAfterText: { color: C.text, fontSize: F.size.sm, lineHeight: 18 },
  arrow: { color: C.amberSoft, alignSelf: 'center', fontSize: F.size.xl },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: S.md, alignItems: 'flex-start' },
  sectionTitle: { color: C.text, fontSize: F.size.lg, fontWeight: F.weight.heavy, marginBottom: S.sm },
  sectionBody: { color: C.textDim, fontSize: F.size.body, lineHeight: 21 },
  bullet: { color: C.textDim, fontSize: F.size.body, lineHeight: 22, marginBottom: 4 },
  farmRows: { gap: S.sm },
  farmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md },
  farmLabel: { color: C.textDim, fontSize: F.size.sm, flex: 1 },
  nextActions: { marginTop: S.md, borderTopWidth: 1, borderTopColor: C.divider, paddingTop: S.md },
  nextTitle: { color: C.amberSoft, fontSize: F.size.sm, fontWeight: F.weight.bold, marginBottom: S.xs },
  relatedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  relatedBtn: { backgroundColor: C.bgInput, borderColor: C.border, borderWidth: 1, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm },
  relatedText: { color: C.text, fontSize: F.size.sm, fontWeight: F.weight.bold },
});
