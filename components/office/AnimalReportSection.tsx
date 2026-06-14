import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { ANIMAL_TYPES } from '../../data/animalTypes';
import { ANIMAL_PRODUCTS } from '../../data/animalProducts';
import { isMature, getSeasonMultiplier } from '../../engine/animals';
import { analyzeRation, generateDefaultRation, getRationProductionModifier } from '../../engine/nutrition';

function SectionHeader({ title }: { title: string }) {
  return <Text style={ar.sectionHeader}>{title}</Text>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <View style={ar.card}>{children}</View>;
}
function StatRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={ar.statRow}>
      <Text style={ar.statLabel}>{label}</Text>
      <Text style={[ar.statValue, color ? { color } : {}, bold ? { fontWeight: 'bold' } : {}]}>{value}</Text>
    </View>
  );
}

const PROD_ICON: Record<string, string> = {
  eggs: '🥚', milk: '🥛', wool: '🧶', honey: '🍯', meat: '🥩',
};

function buildProductionFactors(
  rationMod: number, rationTier: string,
  seasonMod: number, avgGeneProd: number,
  sick: number, mature: number, count: number,
): { icon: string; text: string; color: string }[] {
  const factors: { icon: string; text: string; color: string }[] = [];
  const rationPct = Math.round(Math.abs(rationMod - 1) * 100);
  if (rationTier === 'deficient')
    factors.push({ icon: '⚠', text: `Deficient ration − ${rationPct}% output`, color: '#ef5350' });
  else if (rationTier === 'adequate')
    factors.push({ icon: '🌾', text: 'Adequate ration', color: '#f59e0b' });
  else if (rationTier === 'premium')
    factors.push({ icon: '⭐', text: `Premium ration +${rationPct}% output`, color: '#81c784' });

  const seasonPct = Math.round(Math.abs(seasonMod - 1) * 100);
  if (seasonMod < 0.7)
    factors.push({ icon: '❄', text: `Off-season penalty −${seasonPct}%`, color: '#90caf9' });
  else if (seasonMod < 0.95)
    factors.push({ icon: '🍂', text: `Seasonal dip −${seasonPct}%`, color: '#f59e0b' });
  else if (seasonMod > 1.05)
    factors.push({ icon: '☀', text: `Peak season +${seasonPct}% output`, color: '#4caf50' });

  const genePct = Math.round(Math.abs(avgGeneProd - 1) * 100);
  if (avgGeneProd > 1.08)
    factors.push({ icon: '🧬', text: `Strong genetics +${genePct}%`, color: '#ce93d8' });
  else if (avgGeneProd < 0.92)
    factors.push({ icon: '🧬', text: `Weak genetics −${genePct}%`, color: '#888' });

  if (sick > 0)
    factors.push({ icon: '🤒', text: `${sick} sick animal${sick > 1 ? 's' : ''} not producing`, color: '#ef5350' });
  if (mature < count)
    factors.push({ icon: '🐣', text: `${count - mature} still growing`, color: '#90caf9' });

  return factors;
}

export default function AnimalReportSection() {
  const { day, animals, animalPrices, savedRations, inventory, animalInventory, silageLevel, parcels } = useGameStore();

  const allAnimals = animals ?? [];

  // Group by typeId
  const typeMap: Record<string, typeof allAnimals> = {};
  for (const a of allAnimals) {
    if (!typeMap[a.typeId]) typeMap[a.typeId] = [];
    typeMap[a.typeId].push(a);
  }

  const typeEntries = Object.entries(typeMap).sort((a, b) => b[1].length - a[1].length);

  // Totals
  const totalCount = allAnimals.length;
  const totalSick = allAnimals.filter(a => a.sick).length;
  const totalQuarantined = allAnimals.filter(a => a.quarantineUntilDay && a.quarantineUntilDay > day).length;
  const totalIsolated = allAnimals.filter(a => a.inIsolation).length;

  // Daily production estimate across all mature animals
  let dailyProductionValue = 0;
  let dailyFeedCost = 0;
  const feedGrainPricePerKg = 0.20; // approximate
  const feedHayPricePerKg = 0.18;

  const speciesSummaries = typeEntries.map(([typeId, group]) => {
    const animalType = ANIMAL_TYPES.find(t => t.id === typeId);
    if (!animalType) return null;
    const mature = group.filter(a => isMature(a, animalType, day));
    const sick = group.filter(a => a.sick).length;
    const quarantined = group.filter(a => a.quarantineUntilDay && a.quarantineUntilDay > day).length;

    const matureCount = mature.length;

    // Ration modifier (most impactful: ×0.65 deficient → ×1.08 premium)
    const pastureKg = (animalType.enclosureType === 'corral' || animalType.enclosureType === 'caballeriza')
      ? (parcels.some(p => p.owned && !p.plantedCrop) ? 1.0 : 0) : 0;
    const savedRation = savedRations[typeId];
    const ration = savedRation ?? generateDefaultRation(animalType);
    const rationAnalysis = analyzeRation(ration, animalType,
      { ...inventory, ...animalInventory, silage: silageLevel ?? 0 }, pastureKg);
    const rationMod = getRationProductionModifier(rationAnalysis.tier);

    // Seasonal multiplier
    const seasonMod = getSeasonMultiplier(typeId, day);

    // Average gene production multiplier across mature animals
    const avgGeneProd = matureCount > 0
      ? mature.reduce((s, a) => s + (a.genes?.production ?? 1.0), 0) / matureCount
      : 1.0;

    const prodPerDay = animalType.productionType
      ? matureCount * animalType.productionRate * rationMod * seasonMod * avgGeneProd
      : 0;

    const productInfo = ANIMAL_PRODUCTS.find(p => p.productType === animalType.productionType);
    const pricePerUnit = (animalType.productionType && animalPrices)
      ? ((animalPrices as Record<string, number>)[animalType.productionType] ?? productInfo?.basePrice ?? 0)
      : (productInfo?.basePrice ?? 0);

    const dailyValue = prodPerDay * pricePerUnit;

    const feedCostDay = group.length * animalType.feedKgPerDay *
      (animalType.feedType === 'grain' ? feedGrainPricePerKg : animalType.feedType === 'hay' ? feedHayPricePerKg : 0);

    dailyProductionValue += dailyValue;
    dailyFeedCost += feedCostDay;

    return {
      typeId,
      animalType,
      count: group.length,
      mature: matureCount,
      sick,
      quarantined,
      prodPerDay,
      productInfo,
      dailyValue,
      feedCostDay,
      netPerDay: dailyValue - feedCostDay,
      rationTier: rationAnalysis.tier,
      rationMod,
      seasonMod,
      avgGeneProd,
    };
  }).filter(Boolean) as {
    typeId: string; animalType: typeof ANIMAL_TYPES[0]; count: number; mature: number;
    sick: number; quarantined: number; prodPerDay: number;
    productInfo: typeof ANIMAL_PRODUCTS[0] | undefined;
    dailyValue: number; feedCostDay: number; netPerDay: number;
    rationTier: string; rationMod: number; seasonMod: number; avgGeneProd: number;
  }[];

  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const fmtInt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <ScrollView contentContainerStyle={ar.container} showsVerticalScrollIndicator={false}>

      <SectionHeader title="🐾 Herd Overview" />
      <Card>
        <StatRow label="Total animals" value={`${totalCount}`} bold />
        <StatRow label="Healthy" value={`${totalCount - totalSick}`} color="#4caf50" />
        {totalSick > 0 && <StatRow label="⚠ Sick" value={`${totalSick}`} color="#ef5350" />}
        {totalQuarantined > 0 && <StatRow label="🔒 In quarantine" value={`${totalQuarantined}`} color="#f59e0b" />}
        {totalIsolated > 0 && <StatRow label="🏥 In sick bay" value={`${totalIsolated}`} color="#64b5f6" />}
        <View style={ar.divider} />
        <StatRow label="Est. daily production" value={fmtInt(dailyProductionValue)} color="#4caf50" />
        <StatRow label="Daily feed cost" value={`-${fmtInt(dailyFeedCost)}`} color="#ef5350" />
        <StatRow label="Daily net" value={fmtInt(dailyProductionValue - dailyFeedCost)} bold
          color={dailyProductionValue >= dailyFeedCost ? '#4caf50' : '#ef5350'} />
      </Card>

      {/* Welfare Summary Grid */}
      {totalCount > 0 && (() => {
        const healthPct = totalCount > 0 ? Math.round(((totalCount - totalSick) / totalCount) * 100) : 100;
        const healthColor = healthPct >= 90 ? '#4caf50' : healthPct >= 70 ? '#f59e0b' : '#ef5350';
        const healthLabel = healthPct >= 90 ? 'Healthy' : healthPct >= 70 ? 'Some Sick' : 'Outbreak';

        const deficientCount = speciesSummaries.filter(s => s.rationTier === 'deficient').length;
        const feedColor = deficientCount === 0 ? '#4caf50' : deficientCount <= 1 ? '#f59e0b' : '#ef5350';
        const feedLabel = deficientCount === 0 ? 'Fed' : `${deficientCount} Deficient`;

        const totalProdAnimals = speciesSummaries.filter(s => s.animalType.productionType).reduce((s, x) => s + x.count, 0);
        const matureProducers = speciesSummaries.filter(s => s.animalType.productionType).reduce((s, x) => s + x.mature, 0);
        const prodPct = totalProdAnimals > 0 ? Math.round((matureProducers / totalProdAnimals) * 100) : 0;
        const prodColor = prodPct >= 80 ? '#4caf50' : prodPct >= 50 ? '#f59e0b' : '#888';
        const prodLabel = prodPct >= 80 ? 'Producing' : prodPct >= 50 ? 'Mixed' : 'Low';

        const totalMature = speciesSummaries.reduce((s, x) => s + x.mature, 0);
        const breedReadyPct = totalCount > 0 ? Math.round((totalMature / totalCount) * 100) : 0;
        const reprColor = breedReadyPct >= 70 ? '#81c784' : breedReadyPct >= 40 ? '#f59e0b' : '#888';
        const reprLabel = breedReadyPct >= 70 ? 'Mature' : breedReadyPct >= 40 ? 'Growing' : 'Immature';

        const pillars = [
          { icon: '💊', label: 'Health', value: `${healthPct}%`, sub: healthLabel, color: healthColor },
          { icon: '🌾', label: 'Feed', value: deficientCount === 0 ? 'All Fed' : `${deficientCount}×⚠`, sub: feedLabel, color: feedColor },
          { icon: '📦', label: 'Production', value: `${prodPct}%`, sub: prodLabel, color: prodColor },
          { icon: '🐣', label: 'Maturity', value: `${breedReadyPct}%`, sub: reprLabel, color: reprColor },
        ];
        return (
          <>
            <SectionHeader title="🩺 Welfare Summary" />
            <View style={ar.welfareGrid}>
              {pillars.map(p => (
                <View key={p.label} style={[ar.welfarePillar, { borderColor: p.color + '44' }]}>
                  <Text style={ar.welfarePillarIcon}>{p.icon}</Text>
                  <Text style={[ar.welfarePillarValue, { color: p.color }]}>{p.value}</Text>
                  <Text style={ar.welfarePillarLabel}>{p.label}</Text>
                  <Text style={[ar.welfarePillarSub, { color: p.color }]}>{p.sub}</Text>
                </View>
              ))}
            </View>
          </>
        );
      })()}

      {/* Profitability Ranking */}
      {speciesSummaries.filter(s => s.animalType.productionType).length > 0 && (
        <>
          <SectionHeader title="💰 Profitability Ranking" />
          <Card>
            {[...speciesSummaries]
              .filter(s => s.animalType.productionType)
              .sort((a, b) => (b.netPerDay / Math.max(1, b.count)) - (a.netPerDay / Math.max(1, a.count)))
              .map((s, i) => {
                const perAnimalNet = s.count > 0 ? s.netPerDay / s.count : 0;
                const buyCost = s.animalType.buyCost ?? 0;
                const breakEvenDays = perAnimalNet > 0 && buyCost > 0 ? Math.ceil(buyCost / perAnimalNet) : null;
                const netColor = perAnimalNet > 0 ? '#4caf50' : perAnimalNet < -0.5 ? '#ef5350' : '#888';
                return (
                  <View key={s.typeId} style={[ar.rankRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#1a1a2a' }]}>
                    <Text style={ar.rankPos}>{i + 1}</Text>
                    <Text style={ar.rankIcon}>{PROD_ICON[s.animalType.productionType ?? ''] ?? '🐾'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={ar.rankName}>{s.animalType.name}</Text>
                      {breakEvenDays !== null && (
                        <Text style={ar.breakEven}>breaks even in {breakEvenDays}d per animal</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[ar.rankNet, { color: netColor }]}>
                        {perAnimalNet >= 0 ? '+' : ''}{fmt(perAnimalNet)}/day
                      </Text>
                      <Text style={ar.rankTotal}>total {fmtInt(s.netPerDay)}/day</Text>
                    </View>
                  </View>
                );
              })}
          </Card>
        </>
      )}

      {typeEntries.length === 0 ? (
        <>
          <SectionHeader title="No Animals" />
          <Card>
            <Text style={ar.emptyText}>You don't have any animals yet. Buy animals from the Market to start producing eggs, milk, wool, and more.</Text>
          </Card>
        </>
      ) : (
        <>
          <SectionHeader title="📋 By Species" />
          {speciesSummaries.map(s => {
            const { animalType, count, mature, sick, prodPerDay, productInfo, dailyValue, feedCostDay, netPerDay, rationTier, rationMod, seasonMod, avgGeneProd } = s;
            const prodFactors = buildProductionFactors(rationMod, rationTier, seasonMod, avgGeneProd, sick, mature, count);
            const hasProduction = animalType.productionType && prodPerDay > 0;
            const netColor = netPerDay > 0 ? '#4caf50' : netPerDay < -1 ? '#ef5350' : '#888';
            const rationColor = rationTier === 'deficient' ? '#ef5350' : rationTier === 'adequate' ? '#ff9800' : rationTier === 'optimal' ? '#4caf50' : '#2196f3';
            const rationLabel = rationTier === 'deficient' ? '⚠ Deficient' : rationTier === 'adequate' ? 'Adequate' : rationTier === 'optimal' ? '✓ Optimal' : '⭐ Premium';
            return (
              <Card key={s.typeId}>
                <View style={ar.speciesHeader}>
                  <Text style={ar.speciesIcon}>{PROD_ICON[animalType.productionType ?? ''] ?? '🐾'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={ar.speciesName}>{animalType.name}</Text>
                    <Text style={ar.speciesMeta}>
                      {count} total · {mature} mature{sick > 0 ? ` · ${sick} sick` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[ar.netValue, { color: netColor }]}>
                      {netPerDay >= 0 ? '+' : ''}{fmt(netPerDay)}/day
                    </Text>
                    <Text style={ar.netLabel}>net</Text>
                  </View>
                </View>
                {hasProduction && (
                  <View style={ar.productionBlock}>
                    <View style={ar.prodRow}>
                      <Text style={ar.prodLabel}>Daily production</Text>
                      <Text style={ar.prodValue}>{prodPerDay.toFixed(1)} {productInfo?.unit ?? 'u'}</Text>
                    </View>
                    <View style={ar.prodRow}>
                      <Text style={ar.prodLabel}>Est. value</Text>
                      <Text style={[ar.prodValue, { color: '#4caf50' }]}>{fmt(dailyValue)}</Text>
                    </View>
                    <View style={ar.prodRow}>
                      <Text style={ar.prodLabel}>Feed cost</Text>
                      <Text style={[ar.prodValue, { color: '#ef5350' }]}>-{fmt(feedCostDay)}</Text>
                    </View>
                    <View style={[ar.prodRow, { marginTop: 3, paddingTop: 3, borderTopWidth: 1, borderTopColor: '#1a1a2a' }]}>
                      <Text style={ar.prodLabel}>Ration</Text>
                      <Text style={[ar.prodValue, { color: rationColor }]}>{rationLabel} ×{rationMod.toFixed(2)}</Text>
                    </View>
                    {seasonMod !== 1.0 && (
                      <View style={ar.prodRow}>
                        <Text style={ar.prodLabel}>Season</Text>
                        <Text style={[ar.prodValue, { color: seasonMod < 0.5 ? '#ef5350' : seasonMod < 1.0 ? '#ff9800' : '#4caf50' }]}>
                          ×{seasonMod.toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {!hasProduction && animalType.feedKgPerDay > 0 && (
                  <View style={ar.productionBlock}>
                    <View style={ar.prodRow}>
                      <Text style={ar.prodLabel}>Feed cost/day</Text>
                      <Text style={[ar.prodValue, { color: '#ef5350' }]}>-{fmt(feedCostDay)}</Text>
                    </View>
                    <Text style={ar.meatNote}>Sell at maturity for best value</Text>
                  </View>
                )}
                {/* Production explanation factors */}
                {hasProduction && prodFactors.length > 0 && (
                  <View style={ar.factorsBox}>
                    <Text style={ar.factorsTitle}>WHY THIS OUTPUT</Text>
                    {prodFactors.map((f, i) => (
                      <View key={i} style={ar.factorRow}>
                        <Text style={ar.factorIcon}>{f.icon}</Text>
                        <Text style={[ar.factorText, { color: f.color }]}>{f.text}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {hasProduction && prodFactors.length === 0 && (
                  <Text style={ar.allGoodNote}>✓ Running at full capacity — no penalties active</Text>
                )}
                {sick > 0 && (
                  <Text style={ar.sickWarning}>⚠ {sick} animal{sick > 1 ? 's' : ''} sick — treat immediately to avoid production losses</Text>
                )}
                {mature < count && (
                  <Text style={ar.immatureNote}>{count - mature} immature — will start producing in {Math.max(1, Math.round(animalType.maturityDays / 2))}–{animalType.maturityDays} days</Text>
                )}
              </Card>
            );
          })}
        </>
      )}

      {totalSick > 0 && (
        <>
          <SectionHeader title="🏥 Health Alerts" />
          <Card>
            {allAnimals.filter(a => a.sick || (a.quarantineUntilDay && a.quarantineUntilDay > day)).map(a => {
              const at = ANIMAL_TYPES.find(t => t.id === a.typeId);
              const daysSick = a.sicknessDay ? day - a.sicknessDay : 0;
              const inQuarantine = a.quarantineUntilDay && a.quarantineUntilDay > day;
              return (
                <View key={a.id} style={ar.healthAlertRow}>
                  <Text style={ar.healthAlertAnimal}>{at?.name ?? a.typeId}</Text>
                  {a.sick && <Text style={ar.healthAlertStatus}>🤒 Sick {daysSick > 0 ? `(${daysSick}d)` : ''}</Text>}
                  {inQuarantine && <Text style={[ar.healthAlertStatus, { color: '#f59e0b' }]}>🔒 Quarantine ends day {a.quarantineUntilDay}</Text>}
                </View>
              );
            })}
          </Card>
        </>
      )}

    </ScrollView>
  );
}

const ar = StyleSheet.create({
  container:      { padding: S.md, gap: S.sm, paddingBottom: 40 },
  sectionHeader:  { color: C.textMuted, fontSize: F.size.xs, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: S.md, marginBottom: 2 },
  card:           { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 2 },
  statRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  statLabel:      { color: C.textMuted, fontSize: F.size.sm, flex: 1 },
  statValue:      { color: C.text, fontSize: F.size.sm },
  divider:        { height: 1, backgroundColor: C.divider, marginVertical: 4 },
  emptyText:      { color: C.textMuted, fontSize: F.size.sm, textAlign: 'center', paddingVertical: S.sm },
  // Species card
  speciesHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  speciesIcon:    { fontSize: 22 },
  speciesName:    { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
  speciesMeta:    { color: C.textMuted, fontSize: F.size.xs },
  netValue:       { fontSize: F.size.md, fontWeight: 'bold' },
  netLabel:       { color: C.textFaint, fontSize: 9 },
  productionBlock:{ backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, marginTop: 4, gap: 2 },
  prodRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  prodLabel:      { color: C.textMuted, fontSize: F.size.xs },
  prodValue:      { color: C.text, fontSize: F.size.xs, fontWeight: 'bold' },
  meatNote:       { color: C.textMuted, fontSize: 10, marginTop: 2, fontStyle: 'italic' },
  sickWarning:    { color: '#ef5350', fontSize: F.size.xs, marginTop: 4 },
  immatureNote:   { color: C.textMuted, fontSize: F.size.xs, marginTop: 2 },
  // Health alerts
  healthAlertRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.divider },
  healthAlertAnimal: { color: C.text, fontSize: F.size.sm },
  healthAlertStatus: { color: '#ef5350', fontSize: F.size.xs },
  // Welfare summary grid
  welfareGrid:   { flexDirection: 'row', gap: 8 },
  welfarePillar: { flex: 1, backgroundColor: C.bgCard, borderRadius: R.md, padding: S.sm, alignItems: 'center', borderWidth: 1, gap: 2 },
  welfarePillarIcon:  { fontSize: 16 },
  welfarePillarValue: { fontSize: F.size.md, fontWeight: 'bold', marginTop: 2 },
  welfarePillarLabel: { color: C.textFaint, fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  welfarePillarSub:   { fontSize: 9, fontWeight: 'bold' },
  // Profitability ranking
  rankRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  rankPos:   { color: C.textFaint, fontSize: F.size.sm, width: 16, textAlign: 'center' },
  rankIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  rankName:  { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  breakEven: { color: C.textFaint, fontSize: 10, marginTop: 1 },
  rankNet:   { fontSize: F.size.sm, fontWeight: 'bold' },
  rankTotal: { color: C.textFaint, fontSize: 9 },
  // Production factors explanation
  factorsBox:   { backgroundColor: '#0f1a0f', borderRadius: R.sm, padding: S.sm, marginTop: 6, gap: 3 },
  factorsTitle: { color: '#4caf50', fontSize: 8, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  factorRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  factorIcon:   { fontSize: 11, width: 14 },
  factorText:   { fontSize: F.size.xs, flex: 1 },
  allGoodNote:  { color: '#4caf50', fontSize: 10, marginTop: 5, fontStyle: 'italic' },
});
