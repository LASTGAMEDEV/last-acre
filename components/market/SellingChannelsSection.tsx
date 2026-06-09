import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import {
  calcShopVisitors,
  VEG_BOX_TIERS,
  isOnlineEligible,
} from '../../engine/sellingChannels';
import { getSeason } from '../../engine/climate';
import { PROCESSED_ITEM_DEFS } from '../../data/processingTypes';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIER_NAMES = ['Not Built', 'Roadside Stall', 'Farm Shop', 'Visitor Centre'];
const UPGRADE_COSTS = [0, 15000, 45000, 120000];

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Stepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SellingChannelsSection() {
  const {
    legacyReputation: reputation,
    farmShop,
    onlineShopActive,
    onlineShopAllocations,
    farmCafeOpen,
    farmCafeWorkerIds,
    vegBoxSubscribers,
    restaurantContracts,
    workers,
    inventory,
    processedInventory,
    money,
    day,
    buyFarmShopUpgrade,
    setShopHours,
    assignShopWorker,
    unassignShopWorker,
    toggleOnlineShop,
    setOnlineAllocation,
    toggleFarmCafe,
    assignCafeWorker,
    unassignCafeWorker,
  } = useGameStore();

  const [showAllWorkers, setShowAllWorkers] = useState(false);

  const rep = reputation ?? 0;
  const season = getSeason(day);
  const todayDow = day % 7;
  const todayVisitors =
    farmShop.tier >= 1
      ? calcShopVisitors(farmShop.tier, season, todayDow, rep, farmShop.openHours)
      : 0;

  const shopTier = farmShop.tier ?? 0;
  const nextTierCost = UPGRADE_COSTS[shopTier + 1] ?? null;
  const canAffordUpgrade = nextTierCost !== null && money >= nextTierCost;

  const unassignedWorkers = (workers ?? []).filter(
    w =>
      !farmShop.assignedWorkerIds.includes(w.id) &&
      !farmCafeWorkerIds.includes(w.id),
  );

  const assignedShopWorkers = (workers ?? []).filter(w =>
    farmShop.assignedWorkerIds.includes(w.id),
  );

  const assignedCafeWorkers = (workers ?? []).filter(w =>
    farmCafeWorkerIds.includes(w.id),
  );

  // Online shop inventory: processed items that are online-eligible
  const onlineProductMap: Record<string, number> = {};
  for (const item of processedInventory ?? []) {
    if (isOnlineEligible(item.itemId)) {
      onlineProductMap[item.itemId] = (onlineProductMap[item.itemId] ?? 0) + item.quantity;
    }
  }
  // Also check raw inventory for online-eligible items (fallback)
  for (const [itemId, qty] of Object.entries(inventory ?? {})) {
    if (isOnlineEligible(itemId) && qty > 0) {
      onlineProductMap[itemId] = (onlineProductMap[itemId] ?? 0) + qty;
    }
  }
  const onlineProductIds = Object.keys(onlineProductMap).sort();

  const weeklyVegRevenue = (vegBoxSubscribers ?? []).reduce((sum, sub) => {
    const tierInfo = VEG_BOX_TIERS[sub.tier];
    return sum + (sub.count ?? 0) * (tierInfo?.weeklyFee ?? 0);
  }, 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Farm Shop Card ── */}
      <Card>
        <SectionTitle>🏪 Farm Shop — {TIER_NAMES[shopTier]}</SectionTitle>

        {nextTierCost !== null && (
          <TouchableOpacity
            style={[
              styles.upgradeBtn,
              !canAffordUpgrade && styles.upgradeBtnDisabled,
            ]}
            onPress={buyFarmShopUpgrade}
            disabled={!canAffordUpgrade}
          >
            <Text style={styles.upgradeBtnText}>
              Upgrade to {TIER_NAMES[shopTier + 1]} — ${nextTierCost.toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.subLabel}>Opening Days</Text>
        <View style={styles.daysRow}>
          {DAY_LABELS.map((label, idx) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.dayBtn,
                farmShop.openDays[idx] && styles.dayBtnActive,
              ]}
              onPress={() => {
                const newDays = [...farmShop.openDays];
                newDays[idx] = !newDays[idx];
                setShopHours(newDays, farmShop.openHours);
              }}
            >
              <Text
                style={[
                  styles.dayBtnText,
                  farmShop.openDays[idx] && styles.dayBtnTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.subLabel}>Hours per Day</Text>
        <Stepper
          value={farmShop.openHours}
          onChange={h => setShopHours(farmShop.openDays, h)}
          min={1}
          max={12}
        />

        <Text style={styles.subLabel}>Assigned Workers</Text>
        {assignedShopWorkers.length === 0 && (
          <Text style={styles.emptyText}>No workers assigned</Text>
        )}
        {assignedShopWorkers.map(w => (
          <View key={w.id} style={styles.workerRow}>
            <Text style={styles.workerName}>
              {w.name} ({w.role.replace(/_/g, ' ')})
            </Text>
            <TouchableOpacity
              style={styles.unassignBtn}
              onPress={() => unassignShopWorker(w.id)}
            >
              <Text style={styles.unassignBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}

        {unassignedWorkers.length > 0 && (
          <View style={{ marginTop: S.sm }}>
            <TouchableOpacity
              style={styles.assignToggle}
              onPress={() => setShowAllWorkers(s => !s)}
            >
              <Text style={styles.assignToggleText}>
                {showAllWorkers ? 'Hide available workers' : 'Assign worker…'}
              </Text>
            </TouchableOpacity>
            {showAllWorkers &&
              unassignedWorkers.map(w => (
                <TouchableOpacity
                  key={w.id}
                  style={styles.assignRow}
                  onPress={() => assignShopWorker(w.id)}
                >
                  <Text style={styles.assignRowText}>
                    + {w.name} ({w.role.replace(/_/g, ' ')})
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {shopTier >= 1 && (
          <View style={styles.visitorBox}>
            <Text style={styles.visitorText}>
              Today’s expected visitors: {todayVisitors}
            </Text>
          </View>
        )}
      </Card>

      {/* ── Online Shop Card ── */}
      {shopTier >= 2 && (
        <Card>
          <View style={styles.cardHeader}>
            <SectionTitle>🌐 Online Shop</SectionTitle>
            <Switch
              value={onlineShopActive}
              onValueChange={toggleOnlineShop}
              trackColor={{ false: '#333', true: C.greenDark }}
              thumbColor={onlineShopActive ? C.green : '#888'}
            />
          </View>

          {onlineShopActive && (
            <>
              <Text style={styles.subLabel}>Product Allocations</Text>
              {onlineProductIds.length === 0 && (
                <Text style={styles.emptyText}>
                  No online-eligible products in stock
                </Text>
              )}
              {onlineProductIds.map(pid => {
                const def = PROCESSED_ITEM_DEFS.find(d => d.id === pid);
                const inStock = onlineProductMap[pid] ?? 0;
                const allocated = onlineShopAllocations[pid] ?? 0;
                return (
                  <View key={pid} style={styles.allocRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.allocName}>
                        {def?.name ?? pid}
                      </Text>
                      <Text style={styles.allocStock}>
                        In stock: {inStock}
                      </Text>
                    </View>
                    <Stepper
                      value={allocated}
                      onChange={v => setOnlineAllocation(pid, v)}
                      min={0}
                      max={inStock}
                    />
                  </View>
                );
              })}
            </>
          )}
        </Card>
      )}

      {/* ── Farm Café Card ── */}
      {shopTier >= 3 && (
        <Card>
          <View style={styles.cardHeader}>
            <SectionTitle>☕ Farm Café</SectionTitle>
            <Switch
              value={farmCafeOpen}
              onValueChange={toggleFarmCafe}
              trackColor={{ false: '#333', true: C.greenDark }}
              thumbColor={farmCafeOpen ? C.green : '#888'}
            />
          </View>

          {farmCafeOpen && (
            <>
              <Text style={styles.subLabel}>Assigned Workers</Text>
              {assignedCafeWorkers.length === 0 && (
                <Text style={styles.emptyText}>No workers assigned</Text>
              )}
              {assignedCafeWorkers.map(w => (
                <View key={w.id} style={styles.workerRow}>
                  <Text style={styles.workerName}>
                    {w.name} ({w.role.replace(/_/g, ' ')})
                  </Text>
                  <TouchableOpacity
                    style={styles.unassignBtn}
                    onPress={() => unassignCafeWorker(w.id)}
                  >
                    <Text style={styles.unassignBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {unassignedWorkers.length > 0 && (
                <View style={{ marginTop: S.sm }}>
                  {unassignedWorkers.map(w => (
                    <TouchableOpacity
                      key={`cafe-${w.id}`}
                      style={styles.assignRow}
                      onPress={() => assignCafeWorker(w.id)}
                    >
                      <Text style={styles.assignRowText}>
                        + {w.name} ({w.role.replace(/_/g, ' ')})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </Card>
      )}

      {/* ── Veg Box Card ── */}
      <Card>
        <SectionTitle>📦 Veg Box Subscribers</SectionTitle>
        {(vegBoxSubscribers ?? []).length === 0 && (
          <Text style={styles.emptyText}>No subscribers yet</Text>
        )}
        {(vegBoxSubscribers ?? []).map(sub => {
          const tierInfo = VEG_BOX_TIERS[sub.tier];
          return (
            <View key={sub.tier} style={styles.subRow}>
              <Text style={styles.subTier}>
                {sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)}
              </Text>
              <Text style={styles.subCount}>
                {sub.count} subscribers
              </Text>
              <Text style={styles.subFee}>
                ${tierInfo?.weeklyFee ?? 0}/wk
              </Text>
            </View>
          );
        })}
        {weeklyVegRevenue > 0 && (
          <Text style={styles.revenueText}>
            Weekly revenue estimate: ${weeklyVegRevenue.toLocaleString()}
          </Text>
        )}
      </Card>

      {/* ── Restaurant Contracts ── */}
      {(restaurantContracts ?? []).length > 0 && (
        <Card>
          <SectionTitle>🍽️ Restaurant Contracts</SectionTitle>
          {(restaurantContracts ?? []).map(rc => (
            <View key={rc.id} style={styles.contractRow}>
              <Text style={styles.contractName}>{rc.buyerName}</Text>
              <Text style={styles.contractDetail}>
                {rc.quantityPerCycle} units every {rc.cycleDays} days @ ${rc.pricePerUnit}/unit
              </Text>
              <Text style={styles.contractDetail}>
                Min quality: {rc.minQuality} · Next delivery: day {rc.nextDeliveryDay}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <View style={{ height: S.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  card: {
    backgroundColor: C.bgCard,
    borderRadius: R.md,
    padding: S.md,
    marginHorizontal: S.md,
    marginBottom: S.sm,
  },
  sectionTitle: {
    color: C.text,
    fontWeight: 'bold',
    fontSize: F.size.lg,
    marginBottom: S.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Upgrade
  upgradeBtn: {
    backgroundColor: C.greenDark,
    borderRadius: R.md,
    padding: S.sm,
    alignItems: 'center',
    marginBottom: S.sm,
  },
  upgradeBtnDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  upgradeBtnText: {
    color: C.white,
    fontWeight: 'bold',
    fontSize: F.size.md,
  },

  // Days
  subLabel: {
    color: C.textMuted,
    fontSize: F.size.sm,
    fontWeight: 'bold',
    marginTop: S.sm,
    marginBottom: S.xs,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: S.xs,
  },
  dayBtn: {
    flex: 1,
    marginHorizontal: 2,
    backgroundColor: C.bgDeep,
    borderRadius: R.sm,
    paddingVertical: S.sm,
    alignItems: 'center',
  },
  dayBtnActive: {
    backgroundColor: C.greenDark,
  },
  dayBtnText: {
    color: C.textMuted,
    fontSize: F.size.xs,
    fontWeight: 'bold',
  },
  dayBtnTextActive: {
    color: C.white,
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  stepperBtn: {
    backgroundColor: C.bgDeep,
    borderRadius: R.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    minWidth: 40,
    alignItems: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperBtnText: {
    color: C.text,
    fontSize: F.size.xl,
    fontWeight: 'bold',
  },
  stepperValue: {
    color: C.text,
    fontSize: F.size.lg,
    fontWeight: 'bold',
    minWidth: 32,
    textAlign: 'center',
  },

  // Workers
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bgDeep,
    borderRadius: R.sm,
    padding: S.sm,
    marginBottom: S.xs,
  },
  workerName: {
    color: C.text,
    fontSize: F.size.md,
  },
  unassignBtn: {
    backgroundColor: '#4a1515',
    borderRadius: R.sm,
    paddingHorizontal: S.sm,
    paddingVertical: 4,
  },
  unassignBtnText: {
    color: '#ef9a9a',
    fontSize: F.size.sm,
    fontWeight: 'bold',
  },
  assignToggle: {
    backgroundColor: C.bgDeep,
    borderRadius: R.sm,
    padding: S.sm,
    alignItems: 'center',
  },
  assignToggleText: {
    color: C.textDim,
    fontSize: F.size.sm,
    fontWeight: 'bold',
  },
  assignRow: {
    backgroundColor: C.bgDeep,
    borderRadius: R.sm,
    padding: S.sm,
    marginTop: S.xs,
  },
  assignRowText: {
    color: C.textDim,
    fontSize: F.size.md,
  },

  // Visitors
  visitorBox: {
    marginTop: S.sm,
    backgroundColor: C.bgDeep,
    borderRadius: R.sm,
    padding: S.sm,
  },
  visitorText: {
    color: C.textDim,
    fontSize: F.size.md,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Allocations
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgDeep,
    borderRadius: R.sm,
    padding: S.sm,
    marginBottom: S.xs,
  },
  allocName: {
    color: C.text,
    fontSize: F.size.md,
    fontWeight: 'bold',
  },
  allocStock: {
    color: C.textMuted,
    fontSize: F.size.sm,
  },

  // Veg box
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bgDeep,
    borderRadius: R.sm,
    padding: S.sm,
    marginBottom: S.xs,
  },
  subTier: {
    color: C.text,
    fontSize: F.size.md,
    fontWeight: 'bold',
    flex: 1,
  },
  subCount: {
    color: C.textMuted,
    fontSize: F.size.sm,
    flex: 1,
    textAlign: 'center',
  },
  subFee: {
    color: C.textDim,
    fontSize: F.size.sm,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  revenueText: {
    color: C.green,
    fontSize: F.size.md,
    fontWeight: 'bold',
    marginTop: S.sm,
    textAlign: 'right',
  },

  // Contracts
  contractRow: {
    backgroundColor: C.bgDeep,
    borderRadius: R.sm,
    padding: S.sm,
    marginBottom: S.xs,
  },
  contractName: {
    color: C.text,
    fontSize: F.size.md,
    fontWeight: 'bold',
  },
  contractDetail: {
    color: C.textMuted,
    fontSize: F.size.sm,
    marginTop: 2,
  },

  emptyText: {
    color: C.textFaint,
    fontSize: F.size.sm,
    fontStyle: 'italic',
  },
});
