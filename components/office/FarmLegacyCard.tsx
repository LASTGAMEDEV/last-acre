import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import { ANIMAL_TYPES } from '../../data/animalTypes';

type FarmStyle = 'crop_focus' | 'livestock' | 'market_trader' | 'balanced';

type MilestoneState = {
  day: number;
  harvests: number;
  parcelCount: number;
  animalCount: number;
  completedContracts: number;
  salesCount: number;
  cropRev90: number;
  animalRev90: number;
  processedRev90: number;
  netWorth: number;
};

type Milestone = {
  label: string;
  desc: string;
  bonus: string;
  check: (s: MilestoneState) => boolean;
};

const PATH_CONFIG: Record<FarmStyle, {
  icon: string;
  name: string;
  color: string;
  milestones: Milestone[];
}> = {
  crop_focus: {
    icon: '🌾',
    name: 'Crop Specialist',
    color: '#7cb342',
    milestones: [
      {
        label: 'Seedling Farmer',
        desc: 'First steps into crop cultivation',
        bonus: '+$1,500 seed fund at start',
        check: () => true,
      },
      {
        label: 'Field Veteran',
        desc: '5+ harvests across 3+ owned plots',
        bonus: '+10% crop yield',
        check: s => s.harvests >= 5 && s.parcelCount >= 3,
      },
      {
        label: 'Crop Specialist',
        desc: '15+ harvests and $10k+ crop revenue (90d)',
        bonus: '+15% yield · +5% crop prices',
        check: s => s.harvests >= 15 && s.cropRev90 >= 10000,
      },
      {
        label: 'Agricultural Master',
        desc: '30+ harvests and $30k+ crop revenue (90d)',
        bonus: '+20% yield · priority contracts',
        check: s => s.harvests >= 30 && s.cropRev90 >= 30000,
      },
    ],
  },
  livestock: {
    icon: '🐄',
    name: 'Livestock Rancher',
    color: '#a1887f',
    milestones: [
      {
        label: 'Starter Herd',
        desc: 'First animals on the property',
        bonus: '4 free hens at game start',
        check: () => true,
      },
      {
        label: 'Animal Keeper',
        desc: '5+ animals on the farm',
        bonus: '+10% animal production rate',
        check: s => s.animalCount >= 5,
      },
      {
        label: 'Livestock Rancher',
        desc: '15+ animals, animal revenue leads',
        bonus: '+15% production · +10% welfare',
        check: s => s.animalCount >= 15 && s.animalRev90 > s.cropRev90,
      },
      {
        label: 'Ranch Master',
        desc: '25+ animals and $40k+ animal revenue (90d)',
        bonus: '+20% production · show bonuses',
        check: s => s.animalCount >= 25 && s.animalRev90 >= 40000,
      },
    ],
  },
  market_trader: {
    icon: '📈',
    name: 'Market Trader',
    color: '#ffa726',
    milestones: [
      {
        label: 'Apprentice Trader',
        desc: 'Entering the market with extra capital',
        bonus: '+$2,500 cash at start',
        check: () => true,
      },
      {
        label: 'Savvy Merchant',
        desc: '10+ sales and $5k+ combined revenue (90d)',
        bonus: 'Enhanced market price visibility',
        check: s => s.salesCount >= 10 && s.cropRev90 + s.animalRev90 >= 5000,
      },
      {
        label: 'Market Expert',
        desc: '25+ sales and 2+ contracts completed',
        bonus: '+8% sale prices across all goods',
        check: s => s.salesCount >= 25 && s.completedContracts >= 2,
      },
      {
        label: 'Trade Baron',
        desc: '50+ sales and 5+ contracts completed',
        bonus: '+12% prices · VIP buyer access',
        check: s => s.salesCount >= 50 && s.completedContracts >= 5,
      },
    ],
  },
  balanced: {
    icon: '⚖️',
    name: 'Mixed Farm',
    color: '#64b5f6',
    milestones: [
      {
        label: 'Diversified Farmer',
        desc: 'Building multiple income streams',
        bonus: 'Stable balanced start',
        check: () => true,
      },
      {
        label: 'All-Rounder',
        desc: 'Crops, animals & processing all active ($1k+ each, 90d)',
        bonus: '+5% revenue across all streams',
        check: s => s.cropRev90 > 1000 && s.animalRev90 > 1000 && s.processedRev90 > 1000,
      },
      {
        label: 'Balanced Operator',
        desc: 'All three income streams above $5k (90d)',
        bonus: '+8% revenue across all streams',
        check: s => s.cropRev90 >= 5000 && s.animalRev90 >= 5000 && s.processedRev90 >= 5000,
      },
      {
        label: 'Farm Tycoon',
        desc: 'All streams $15k+ (90d), net worth $100k+',
        bonus: '+10% revenue · legacy title',
        check: s => s.netWorth >= 100000 && s.cropRev90 >= 15000 && s.animalRev90 >= 15000 && s.processedRev90 >= 15000,
      },
    ],
  },
};

export default function FarmLegacyCard() {
  const {
    day, farmStyle, parcels, animals, contracts, salesLog,
    personalRecords, inventory, prices, savings, money, loans,
  } = useGameStore();

  const [expanded, setExpanded] = useState(false);

  const style = (farmStyle ?? 'balanced') as FarmStyle;
  const path = PATH_CONFIG[style] ?? PATH_CONFIG.balanced;

  const ownedParcels = parcels.filter(p => p.owned);
  const completedContracts = (contracts ?? []).filter(c => c.completed).length;
  const salesCount = (salesLog ?? []).filter(s => s.amount > 0).length;
  const cropRev90 = (salesLog ?? []).filter(s => s.day >= day - 90 && s.category === 'crops').reduce((a, s) => a + s.amount, 0);
  const animalRev90 = (salesLog ?? []).filter(s => s.day >= day - 90 && s.category === 'animals').reduce((a, s) => a + s.amount, 0);
  const processedRev90 = (salesLog ?? []).filter(s => s.day >= day - 90 && s.category === 'processed').reduce((a, s) => a + s.amount, 0);

  const inventoryValue = CROP_TYPES.reduce((sum, crop) => {
    const qty = (inventory as Record<string, number>)[crop.id] ?? 0;
    const price = (prices ?? []).find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
    return sum + qty * price;
  }, 0);
  const animalValue = (animals ?? []).reduce((sum, a) => {
    const type = ANIMAL_TYPES.find(t => t.id === a.typeId);
    return sum + (type?.buyCost ?? 0) * 0.6;
  }, 0);
  const totalDebt = (loans ?? []).filter(l => !l.paid && !l.defaulted).reduce((s, l) => s + l.totalOwed, 0);
  const netWorth = money + (savings?.balance ?? 0) + inventoryValue + animalValue - totalDebt;

  const ms: MilestoneState = {
    day,
    harvests: personalRecords?.totalHarvests ?? 0,
    parcelCount: ownedParcels.length,
    animalCount: (animals ?? []).length,
    completedContracts,
    salesCount,
    cropRev90,
    animalRev90,
    processedRev90,
    netWorth,
  };

  const unlocked = path.milestones.map(m => m.check(ms));
  const currentTierIndex = unlocked.lastIndexOf(true);
  const nextTierIndex = currentTierIndex < path.milestones.length - 1 ? currentTierIndex + 1 : -1;
  const currentTier = path.milestones[currentTierIndex];
  const nextTier = nextTierIndex >= 0 ? path.milestones[nextTierIndex] : null;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded(v => !v)} style={[card.wrap, { borderColor: path.color + '44' }]}>
      {/* Header row */}
      <View style={card.header}>
        <Text style={[card.pathIcon]}>{path.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[card.pathName, { color: path.color }]}>{path.name} Path</Text>
          <Text style={card.tierLabel}>{currentTier?.label ?? '—'}</Text>
        </View>
        <View style={[card.tierBadge, { backgroundColor: path.color + '22', borderColor: path.color + '66' }]}>
          <Text style={[card.tierBadgeText, { color: path.color }]}>Tier {currentTierIndex + 1}/4</Text>
        </View>
        <Text style={card.chevron}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {/* Milestone track */}
      <View style={card.track}>
        {path.milestones.map((m, i) => {
          const done = unlocked[i];
          const isCurrent = i === currentTierIndex;
          const isNext = i === nextTierIndex;
          return (
            <View key={i} style={card.trackItem}>
              <View style={[
                card.dot,
                done ? { backgroundColor: path.color } : { backgroundColor: '#1e2d1a', borderColor: '#333', borderWidth: 1 },
                isCurrent && { shadowColor: path.color, shadowOpacity: 0.8, shadowRadius: 4, elevation: 4 },
              ]} />
              {i < path.milestones.length - 1 && (
                <View style={[card.connector, { backgroundColor: done && unlocked[i + 1] ? path.color : '#2a2a2a' }]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Active bonus */}
      {currentTier && (
        <View style={[card.bonusRow, { backgroundColor: path.color + '15' }]}>
          <Text style={card.bonusIcon}>✨</Text>
          <Text style={[card.bonusText, { color: path.color }]}>{currentTier.bonus}</Text>
          {currentTierIndex > 0 && (
            <View style={[card.activeBadge, { backgroundColor: path.color + '30', borderColor: path.color + '66' }]}>
              <Text style={[card.activeBadgeText, { color: path.color }]}>ACTIVE</Text>
            </View>
          )}
        </View>
      )}

      {/* Expanded milestone list */}
      {expanded && (
        <View style={card.milestoneList}>
          {path.milestones.map((m, i) => {
            const done = unlocked[i];
            const isNext = i === nextTierIndex;
            return (
              <View key={i} style={[card.milestoneRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#1a1a1a' }]}>
                <Text style={[card.milestoneDot, { color: done ? path.color : '#444' }]}>{done ? '●' : isNext ? '◌' : '○'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[card.milestoneLabel, { color: done ? C.text : isNext ? '#aaa' : '#555' }]}>{m.label}</Text>
                  <Text style={[card.milestoneDesc, { color: done ? '#666' : isNext ? '#555' : '#333' }]}>{m.desc}</Text>
                  <Text style={[card.milestoneBonus, { color: done ? path.color : isNext ? '#666' : '#333' }]}>{m.bonus}</Text>
                </View>
                {done && <Text style={{ color: path.color, fontSize: 14 }}>✓</Text>}
                {isNext && <Text style={{ color: '#555', fontSize: 10 }}>NEXT</Text>}
              </View>
            );
          })}
        </View>
      )}

      {/* Next goal hint */}
      {!expanded && nextTier && (
        <Text style={card.nextHint}>Next: {nextTier.label} — {nextTier.desc}</Text>
      )}
      {!expanded && !nextTier && (
        <Text style={[card.nextHint, { color: path.color }]}>Max tier reached — fully specialized!</Text>
      )}
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: C.bgCard,
    borderRadius: R.md,
    padding: S.md,
    borderWidth: 1,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  pathIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
  pathName: {
    fontSize: F.size.xs,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tierLabel: {
    color: C.text,
    fontSize: F.size.sm,
    fontWeight: 'bold',
    marginTop: 1,
  },
  tierBadge: {
    borderRadius: R.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierBadgeText: {
    fontSize: F.size.xs,
    fontWeight: 'bold',
  },
  chevron: {
    color: '#555',
    fontSize: 10,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  trackItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  connector: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    borderRadius: R.sm,
    paddingHorizontal: S.sm,
    paddingVertical: 5,
  },
  bonusIcon: {
    fontSize: 13,
  },
  bonusText: {
    fontSize: F.size.xs,
    fontWeight: 'bold',
    flex: 1,
  },
  activeBadge: {
    borderRadius: R.pill,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  nextHint: {
    color: '#555',
    fontSize: F.size.xs,
    fontStyle: 'italic',
  },
  milestoneList: {
    gap: 0,
    marginTop: 4,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.sm,
    paddingVertical: 8,
  },
  milestoneDot: {
    fontSize: 14,
    lineHeight: 18,
    width: 16,
  },
  milestoneLabel: {
    fontSize: F.size.sm,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  milestoneDesc: {
    fontSize: F.size.xs,
    lineHeight: 15,
  },
  milestoneBonus: {
    fontSize: F.size.xs,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
