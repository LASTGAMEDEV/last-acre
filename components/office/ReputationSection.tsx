import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useGameStore, FuturesPosition } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES, CropType } from '../../data/cropTypes';
import { PROCESSED_ITEM_DEFS } from '../../data/processingTypes';
import { getTierEffects } from '../../features/reputation/reputationEngine';
import type { ReputationTier } from '../../features/reputation/reputationTypes';

const TIER_COLOR: Record<ReputationTier, string> = {
  legendary: '#ffd700',
  renowned:  '#ce93d8',
  respected: '#64b5f6',
  local:     '#81c784',
  unknown:   '#888888',
};

const TIER_ICON: Record<ReputationTier, string> = {
  legendary: '👑',
  renowned:  '⭐',
  respected: '🌟',
  local:     '🌿',
  unknown:   '🌱',
};

const FACTOR_META: { key: keyof import('../../features/reputation/reputationTypes').ReputationFactors; label: string; icon: string; tip: string }[] = [
  { key: 'animalWelfare',         label: 'Animal Welfare',         icon: '🐄', tip: 'Avg animal health score' },
  { key: 'environmentalPractice', label: 'Environmental',          icon: '🌿', tip: 'Organic fraction + hedgerows + composting' },
  { key: 'communityStanding',     label: 'Community Standing',     icon: '🤝', tip: 'Events, sponsorships, neighbor help' },
  { key: 'productQuality',        label: 'Product Quality',        icon: '🏅', tip: 'Avg stored batch quality' },
  { key: 'financialReliability',  label: 'Financial Reliability',  icon: '🏦', tip: 'Debt ratio + loan history' },
  { key: 'historicalConduct',     label: 'Historical Conduct',     icon: '📜', tip: 'Crisis survival + long track record' },
];

function FactorBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={rs.factorTrack}>
      <View style={[rs.factorFill, { width: `${Math.min(100, value)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function ReputationSection() {
  const {
    reputation, legacyReputation, prices, futures, prestige,
    openFuture, awardHistory, productAwardBonuses,
  } = useGameStore();

  const [selectedCrop, setSelectedCrop] = React.useState('');
  const [futureQty, setFutureQty] = React.useState('');
  const [futureTerm, setFutureTerm] = React.useState(30);

  const openFutures = (futures ?? []).filter((f: any) => !f.settled);

  // Phase 3 reputation
  const score  = reputation?.score ?? 0;
  const tier   = reputation?.tier  ?? 'unknown';
  const factors = reputation?.factors;
  const tierColor = TIER_COLOR[tier];
  const tierIcon  = TIER_ICON[tier];
  const effects   = getTierEffects(tier);

  // Legacy reputation (shows for older stats continuity)
  const legRep = legacyReputation ?? 50;

  return (
    <ScrollView contentContainerStyle={rs.container} showsVerticalScrollIndicator={false}>

      {/* ── Phase 3 Reputation ───────────────────────────────────── */}
      <Text style={rs.sectionHeader}>⭐ Reputation</Text>
      <View style={rs.card}>
        <View style={rs.tierRow}>
          <Text style={[rs.tierIcon]}>{tierIcon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[rs.tierName, { color: tierColor }]}>{tier.toUpperCase()}</Text>
            <Text style={rs.scoreLine}>Score: <Text style={{ color: tierColor, fontWeight: 'bold' }}>{Math.round(score)}</Text> / 100</Text>
          </View>
          <View style={rs.tierBadge}>
            <Text style={[rs.tierBadgeText, { color: tierColor }]}>
              {tier === 'legendary' ? 'Next: max'
               : tier === 'renowned'   ? 'Next: 80'
               : tier === 'respected'  ? 'Next: 60'
               : tier === 'local'      ? 'Next: 40'
               : 'Next: 20'}
            </Text>
          </View>
        </View>
        <View style={rs.scoreBarTrack}>
          <View style={[rs.scoreBarFill, { width: `${score}%` as any, backgroundColor: tierColor }]} />
          {['local','respected','renowned','legendary'].map((t, i) => (
            <View key={t} style={[rs.scoreTick, { left: `${[20,40,60,80][i]}%` as any }]} />
          ))}
        </View>
      </View>

      {/* ── Tier Effects ─────────────────────────────────────────── */}
      <Text style={rs.sectionHeader}>🎯 Tier Perks</Text>
      <View style={rs.card}>
        <View style={rs.effectsGrid}>
          <EffectChip icon="🔨" label="Auction" value={`×${effects.auctionPriceMultiplier.toFixed(2)}`} on={effects.auctionPriceMultiplier > 1} />
          <EffectChip icon="🏦" label="Loan rate" value={effects.loanInterestMultiplier < 1 ? `−${Math.round((1 - effects.loanInterestMultiplier) * 100)}%` : 'standard'} on={effects.loanInterestMultiplier < 1} />
          <EffectChip icon="🌿" label="Organic +" value={`×${effects.organicPremiumMultiplier.toFixed(2)}`} on={effects.organicPremiumMultiplier > 1} />
          <EffectChip icon="📝" label="CSA waitlist" value={effects.csaAutoWaitlist ? 'auto' : 'manual'} on={effects.csaAutoWaitlist} />
          <EffectChip icon="👷" label="Workers" value={effects.workersApplyProactively ? 'approach you' : 'post ads'} on={effects.workersApplyProactively} />
          <EffectChip icon="🏡" label="Land sellers" value={effects.landSellersApproach ? 'approach you' : 'find yourself'} on={effects.landSellersApproach} />
        </View>
      </View>

      {/* ── Factor Breakdown ─────────────────────────────────────── */}
      {factors && (
        <>
          <Text style={rs.sectionHeader}>📊 Factor Breakdown</Text>
          <View style={rs.card}>
            {FACTOR_META.map(({ key, label, icon, tip }) => {
              const val = factors[key];
              const col = val >= 70 ? '#81c784' : val >= 40 ? '#ffb74d' : '#ef5350';
              return (
                <View key={key} style={rs.factorRow}>
                  <Text style={rs.factorIcon}>{icon}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={rs.factorLabelRow}>
                      <Text style={rs.factorLabel}>{label}</Text>
                      <Text style={[rs.factorValue, { color: col }]}>{Math.round(val)}</Text>
                    </View>
                    <FactorBar value={val} color={col} />
                    <Text style={rs.factorTip}>{tip}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Prestige ─────────────────────────────────────────────── */}
      {(prestige ?? 0) > 0 && (
        <>
          <Text style={rs.sectionHeader}>⚡ Prestige</Text>
          <View style={[rs.card, { borderColor: '#ffb74d', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ color: '#ffb74d', fontSize: 32, fontWeight: 'bold' }}>{prestige}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: 'bold' }}>Level {prestige} Farmer</Text>
                <Text style={{ color: C.textMuted, fontSize: 11 }}>+{(prestige ?? 0) * 5}% revenue on all sales</Text>
                <Text style={{ color: '#555', fontSize: 10, marginTop: 2 }}>Earned by completing full years</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* ── Awards ───────────────────────────────────────────────── */}
      <Text style={rs.sectionHeader}>🏆 Awards</Text>
      <View style={rs.card}>
        {(awardHistory ?? []).length === 0 ? (
          <Text style={rs.emptyText}>No awards yet — win farm shows to earn awards and price bonuses</Text>
        ) : (
          <>
            {(awardHistory ?? []).map((award: any, idx: number) => {
              const def = PROCESSED_ITEM_DEFS.find(d => d.id === award.productId);
              return (
                <View key={idx} style={rs.awardRow}>
                  <Text style={rs.awardBadge}>
                    {award.award === 'gold' ? '🥇' : award.award === 'silver' ? '🥈' : '🥉'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={rs.awardText}>{def?.name ?? award.productId} — {award.showName}</Text>
                    <Text style={rs.awardDay}>Day {award.day}</Text>
                  </View>
                </View>
              );
            })}
            {Object.keys(productAwardBonuses ?? {}).length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold', marginBottom: 4 }}>Product Bonuses</Text>
                {Object.entries(productAwardBonuses).map(([pid, bonus]: [string, any]) => {
                  const def = PROCESSED_ITEM_DEFS.find(d => d.id === pid);
                  return (
                    <Text key={pid} style={rs.bonusText}>{def?.name ?? pid}: +{bonus}% price</Text>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>

      {/* ── Futures ──────────────────────────────────────────────── */}
      <Text style={rs.sectionHeader}>📈 Futures Contracts</Text>
      <View style={rs.card}>
        <Text style={rs.hint}>Lock in today&apos;s price for future delivery. Auto-settles at delivery day.</Text>
        <View style={rs.futureForm}>
          <Text style={rs.formLabel}>Crop</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {CROP_TYPES.map((c: CropType) => {
              const price = prices.find((p: any) => p.cropId === c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[rs.chip, selectedCrop === c.id && rs.chipActive]}
                  onPress={() => setSelectedCrop(c.id)}
                >
                  <Text style={[rs.chipText, selectedCrop === c.id && { color: C.white }]}>
                    {c.name} ${price?.price.toFixed(2) ?? '—'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={rs.formLabel}>Quantity (units)</Text>
          <TextInput
            style={rs.input}
            keyboardType="numeric"
            placeholder="e.g. 10000"
            placeholderTextColor="#555"
            value={futureQty}
            onChangeText={setFutureQty}
          />
          <Text style={rs.formLabel}>Delivery in</Text>
          <View style={rs.termRow}>
            {[30, 60, 90].map(t => (
              <TouchableOpacity
                key={t}
                style={[rs.termChip, futureTerm === t && rs.termChipActive]}
                onPress={() => setFutureTerm(t)}
              >
                <Text style={[rs.chipText, futureTerm === t && { color: C.white }]}>{t}d</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[rs.btn, (!selectedCrop || !futureQty) && rs.btnDisabled]}
            disabled={!selectedCrop || !futureQty}
            onPress={() => {
              const qty = parseInt(futureQty);
              if (!selectedCrop || isNaN(qty) || qty <= 0) return;
              openFuture(selectedCrop, qty, futureTerm);
              setFutureQty('');
            }}
          >
            <Text style={rs.btnText}>Open Future</Text>
          </TouchableOpacity>
        </View>
        {openFutures.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={rs.formLabel}>Active positions</Text>
            {openFutures.map((f: FuturesPosition) => {
              const crop = CROP_TYPES.find((c: CropType) => c.id === f.cropId);
              return (
                <View key={f.id} style={rs.futureRow}>
                  <Text style={rs.futureCrop}>{crop?.name ?? f.cropId}</Text>
                  <Text style={rs.futureDetail}>
                    {f.quantity.toLocaleString()} {crop?.unit} @ ${f.lockPrice.toFixed(2)} · day {f.deliveryDay}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

    </ScrollView>
  );
}

function EffectChip({ icon, label, value, on }: { icon: string; label: string; value: string; on: boolean }) {
  return (
    <View style={[rs.effectChip, on && rs.effectChipOn]}>
      <Text style={rs.effectIcon}>{icon}</Text>
      <Text style={rs.effectLabel}>{label}</Text>
      <Text style={[rs.effectValue, on && { color: '#81c784' }]}>{value}</Text>
    </View>
  );
}

const rs = StyleSheet.create({
  container:      { padding: S.md, gap: S.sm, paddingBottom: 40 },
  sectionHeader:  { color: C.textMuted, fontSize: F.size.xs, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: S.md, marginBottom: 2 },
  card:           { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: S.xs },
  emptyText:      { color: C.textMuted, fontSize: F.size.sm },
  hint:           { color: C.textMuted, fontSize: F.size.sm, marginBottom: 4 },

  // Tier header
  tierRow:        { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.sm },
  tierIcon:       { fontSize: 36 },
  tierName:       { fontSize: F.size.xl, fontWeight: 'bold', letterSpacing: 1 },
  scoreLine:      { color: C.textMuted, fontSize: F.size.sm, marginTop: 2 },
  tierBadge:      { backgroundColor: C.bgDeep, borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 4 },
  tierBadgeText:  { fontSize: F.size.sm, fontWeight: 'bold' },
  scoreBarTrack:  { height: 8, backgroundColor: C.bgDeep, borderRadius: 4, overflow: 'hidden', position: 'relative' },
  scoreBarFill:   { height: 8, borderRadius: 4, position: 'absolute', left: 0, top: 0 },
  scoreTick:      { position: 'absolute', top: 0, width: 1, height: 8, backgroundColor: '#33333388' },

  // Tier effects grid
  effectsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: S.xs },
  effectChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bgDeep, borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 6, minWidth: '30%', flex: 1 },
  effectChipOn:   { borderColor: '#81c78444', borderWidth: 1 },
  effectIcon:     { fontSize: 14 },
  effectLabel:    { color: C.textMuted, fontSize: 10, flex: 1 },
  effectValue:    { color: C.textDim, fontSize: F.size.sm, fontWeight: 'bold' },

  // Factor breakdown
  factorRow:      { flexDirection: 'row', gap: S.sm, paddingVertical: S.xs },
  factorIcon:     { fontSize: 20, width: 28, textAlign: 'center', marginTop: 2 },
  factorLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  factorLabel:    { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  factorValue:    { fontSize: F.size.sm, fontWeight: 'bold' },
  factorTrack:    { height: 5, backgroundColor: C.bgDeep, borderRadius: 3, overflow: 'hidden' },
  factorFill:     { height: 5, borderRadius: 3 },
  factorTip:      { color: C.textFaint, fontSize: 10 },

  // Awards
  awardRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, marginBottom: S.xs },
  awardBadge:     { fontSize: F.size.xl, marginRight: S.sm },
  awardText:      { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
  awardDay:       { color: C.textMuted, fontSize: F.size.sm },
  bonusText:      { color: C.textDim, fontSize: F.size.sm, marginBottom: 2 },

  // Futures form
  futureForm:     { marginTop: 8, gap: 4 },
  formLabel:      { color: C.textMuted, fontSize: 11, fontWeight: 'bold', marginBottom: S.xs },
  input:          { backgroundColor: C.bgDeep, color: C.white, borderRadius: R.md, padding: 10, fontSize: F.size.lg, marginBottom: S.sm },
  chip:           { backgroundColor: C.bgDeep, borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  chipActive:     { backgroundColor: '#1565c0' },
  chipText:       { color: C.textMuted, fontSize: 11 },
  termRow:        { flexDirection: 'row', gap: 8, marginBottom: S.sm },
  termChip:       { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.md, paddingVertical: 6, alignItems: 'center' },
  termChipActive: { backgroundColor: '#1565c0' },
  btn:            { backgroundColor: C.greenDark, borderRadius: R.md, padding: 10, alignItems: 'center' },
  btnDisabled:    { backgroundColor: '#333', opacity: 0.5 },
  btnText:        { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  futureRow:      { backgroundColor: C.bgDeep, borderRadius: R.md, padding: 10, marginBottom: S.xs },
  futureCrop:     { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  futureDetail:   { color: C.textMuted, fontSize: 11, marginTop: 2 },
});

export default ReputationSection;
