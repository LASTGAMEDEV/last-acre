import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import Svg, { Line, Text as SvgText, Rect, G } from 'react-native-svg';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import HelpSheet from '../../components/HelpSheet';
import SubTabBar from '../../components/SubTabBar';
import RevenueChart, { RevenueChartDataPoint } from '../../components/RevenueChart';
import {
  Buyer,
  RecurringContract,
  BUYER_TIER_CONFIG,
  getBuyerPriceBonus,
  BuyerTier,
} from '../../engine/contracts';

const BUYER_TIER_COLORS: Record<BuyerTier, string> = {
  new:       '#37474f',
  regular:   '#1565c0',
  preferred: '#6a1fa3',
  exclusive: '#b8860b',
};

const SCREEN_W = Dimensions.get('window').width;
const REV_CHART_W = SCREEN_W - 48;
const REV_CHART_H = 120;
const REV_PAD = { top: 8, bottom: 24, left: 44, right: 8 };

type SaleRecord = { day: number; amount: number; category?: string };

function RevenueHistoryChart({ salesLog, currentDay }: { salesLog: SaleRecord[]; currentDay: number }) {
  const DAYS = 30;
  const buckets: Record<number, number> = {};
  for (let i = 0; i < DAYS; i++) {
    buckets[currentDay - DAYS + 1 + i] = 0;
  }
  for (const s of salesLog) {
    if (s.day >= currentDay - DAYS + 1 && s.day <= currentDay) {
      buckets[s.day] = (buckets[s.day] ?? 0) + s.amount;
    }
  }
  const days = Object.keys(buckets).map(Number).sort((a, b) => a - b);
  const values = days.map(d => buckets[d]);
  const maxVal = Math.max(...values, 1);

  const w = REV_CHART_W - REV_PAD.left - REV_PAD.right;
  const h = REV_CHART_H - REV_PAD.top - REV_PAD.bottom;
  const barW = Math.max(2, Math.floor(w / DAYS) - 1);

  const yLabels = [0, maxVal / 2, maxVal];

  return (
    <View>
      <Svg width={REV_CHART_W} height={REV_CHART_H}>
        <Rect x={REV_PAD.left} y={REV_PAD.top} width={w} height={h} fill="#0a1628" rx={4} />
        {yLabels.map((v, i) => {
          const y = REV_PAD.top + h - (v / maxVal) * h;
          return (
            <G key={i}>
              <Line x1={REV_PAD.left} y1={y} x2={REV_PAD.left + w} y2={y} stroke="#1e2a3a" strokeWidth={1} />
              <SvgText x={REV_PAD.left - 4} y={y + 4} fontSize={9} fill="#555" textAnchor="end">
                {v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`}
              </SvgText>
            </G>
          );
        })}
        {days.map((d, i) => {
          const val = values[i];
          if (val <= 0) return null;
          const barH = Math.max(1, (val / maxVal) * h);
          const x = REV_PAD.left + (i / DAYS) * w;
          const y = REV_PAD.top + h - barH;
          return (
            <Rect key={d} x={x} y={y} width={barW} height={barH} fill="#c8860a" rx={1} opacity={0.85} />
          );
        })}
        {[0, Math.floor(DAYS / 2), DAYS - 1].map(idx => (
          <SvgText
            key={idx}
            x={REV_PAD.left + (idx / DAYS) * w + barW / 2}
            y={REV_CHART_H - 4}
            fontSize={9}
            fill="#555"
            textAnchor="middle"
          >
            d{days[idx]}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

type StatsTab = 'stats' | 'futures' | 'orders' | 'supply';

const STATS_TABS: { id: StatsTab; label: string }[] = [
  { id: 'stats',  label: '📈 Stats' },
  { id: 'futures', label: '📉 Futures' },
  { id: 'orders',  label: '📋 Orders' },
  { id: 'supply',  label: '🚚 Supply' },
];

export default function EconomyStatsSection() {
  const [tab, setTab] = useState<StatsTab>('stats');
  const {
    prices,
    inventory,
    day,
    salesLog,
    totalRevenue,
    prestige,
    futures,
    openFuture,
    marketOrders,
    placeMarketOrder,
    cancelMarketOrder,
    buyers,
    recurringContracts,
    reputation,
    signRecurringContract,
    deliverToRecurringContract,
    cancelRecurringContract,
  } = useGameStore();

  // ── Futures state ──
  const [futuresCrop, setFuturesCrop] = useState<string>(CROP_TYPES[0].id);
  const [futuresQty, setFuturesQty] = useState<string>('');
  const [futuresTerm, setFuturesTerm] = useState<30 | 60 | 90>(30);
  const [futuresFlash, setFuturesFlash] = useState(false);
  const futuresFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Orders state ──
  const [orderCrop, setOrderCrop] = useState<string>(CROP_TYPES[0].id);
  const [orderQty, setOrderQty] = useState('');
  const [orderTargetPrice, setOrderTargetPrice] = useState('');
  const [orderTerm, setOrderTerm] = useState<7 | 14 | 30>(7);

  // ── Supply modal state ──
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [signingBuyerId, setSigningBuyerId] = useState<string | null>(null);
  const [signCropId, setSignCropId] = useState<string>('');
  const [signAmount, setSignAmount] = useState<string>('');
  const [signFrequency, setSignFrequency] = useState<7 | 14 | 30>(14);
  const [signDuration, setSignDuration] = useState<number>(1);
  const [deliverModalVisible, setDeliverModalVisible] = useState(false);
  const [deliveringContractId, setDeliveringContractId] = useState<string | null>(null);
  const [deliverAmount, setDeliverAmount] = useState<string>('');

  useEffect(() => {
    return () => {
      if (futuresFlashTimerRef.current) clearTimeout(futuresFlashTimerRef.current);
    };
  }, []);

  // ── Stats computations ──
  const rev7 = salesLog.filter(s => s.day >= day - 7).reduce((a, s) => a + s.amount, 0);
  const rev30 = salesLog.filter(s => s.day >= day - 30).reduce((a, s) => a + s.amount, 0);
  const rev90 = salesLog.filter(s => s.day >= day - 90).reduce((a, s) => a + s.amount, 0);

  const chartData: RevenueChartDataPoint[] = (() => {
    const fromDay = day - 29;
    const byDay: Record<number, number> = {};
    for (const s of salesLog) {
      if (s.day >= fromDay && s.day <= day) {
        byDay[s.day] = (byDay[s.day] ?? 0) + s.amount;
      }
    }
    const result: RevenueChartDataPoint[] = [];
    for (let d = fromDay; d <= day; d++) {
      result.push({ day: d, revenue: byDay[d] ?? 0 });
    }
    return result;
  })();

  const catRevenue = { crops: 0, animals: 0, processed: 0, contracts: 0 };
  for (const s of salesLog) {
    if (s.category === 'crops') catRevenue.crops += s.amount;
    else if (s.category === 'animals') catRevenue.animals += s.amount;
    else if (s.category === 'processed') catRevenue.processed += s.amount;
    else if (s.category === 'contracts') catRevenue.contracts += s.amount;
  }

  const roiRanking = CROP_TYPES
    .map(crop => {
      const p = prices.find(px => px.cropId === crop.id)?.price ?? crop.basePrice;
      const roi = (p * crop.baseYield * 0.85 - crop.seedCost) / crop.growthDays;
      return { crop, roi, price: p };
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  // ── Supply helpers ──
  function isBuyerAvailable(buyer: Buyer): boolean {
    if (day < buyer.unlockedDay) return false;
    if (buyer.requiresReputation && (reputation ?? 0) < buyer.requiresReputation) return false;
    return true;
  }

  function activeBuyerContract(buyerId: string): RecurringContract | undefined {
    return (recurringContracts ?? []).find((c) => c.buyerId === buyerId && c.active);
  }

  return (
    <View style={{ flex: 1 }}>
      <SubTabBar tabs={STATS_TABS} active={tab} onSelect={id => setTab(id as StatsTab)} />
      {tab === 'stats' && (
        <ScrollView style={styles.statsScroll} showsVerticalScrollIndicator={false}>
          {/* Revenue chart */}
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>📈 Revenue — last 30 days</Text>
            <RevenueChart data={chartData} />
          </View>

          <View style={styles.prestigeCard}>
            <Text style={styles.prestigeTitle}>⭐ Prestige {prestige ?? 0}</Text>
            {(prestige ?? 0) > 0
              ? <Text style={styles.prestigeSub}>+{(prestige ?? 0) * 5}% bonus on all sales</Text>
              : <Text style={styles.prestigeSub}>No bonus yet</Text>
            }
            <Text style={styles.prestigeHint}>{'Earn +1 prestige by choosing "New Season" on the Year-End screen (day 365+). Each level permanently boosts all sale revenue by +5%.'}</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>Daily Revenue — Last 30 Days</Text>
            <RevenueHistoryChart salesLog={salesLog} currentDay={day} />
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>Revenue Summary</Text>
            <View style={styles.statsRow}><Text style={styles.statsLabel}>Last 7 days</Text><Text style={styles.statsValue}>${Math.round(rev7).toLocaleString()}</Text></View>
            <View style={styles.statsRow}><Text style={styles.statsLabel}>Last 30 days</Text><Text style={styles.statsValue}>${Math.round(rev30).toLocaleString()}</Text></View>
            <View style={styles.statsRow}><Text style={styles.statsLabel}>Last 90 days</Text><Text style={styles.statsValue}>${Math.round(rev90).toLocaleString()}</Text></View>
            <View style={styles.statsRow}><Text style={styles.statsLabel}>All time</Text><Text style={[styles.statsValue, { color: '#81c784' }]}>${Math.round(totalRevenue).toLocaleString()}</Text></View>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>Revenue by Category</Text>
            {[
              { key: 'crops', label: '🌾 Crops', color: '#66bb6a' },
              { key: 'animals', label: '🐄 Animals', color: '#42a5f5' },
              { key: 'processed', label: '🏭 Processed', color: '#ab47bc' },
              { key: 'contracts', label: '📋 Contracts', color: '#ffa726' },
            ].map(cat => {
              const val = catRevenue[cat.key as keyof typeof catRevenue];
              const pct = totalRevenue > 0 ? (val / totalRevenue) * 100 : 0;
              return (
                <View key={cat.key} style={styles.catRow}>
                  <Text style={styles.catLabel}>{cat.label}</Text>
                  <View style={styles.catBarWrap}>
                    <View style={[styles.catBar, { width: `${pct}%` as any, backgroundColor: cat.color }]} />
                  </View>
                  <Text style={[styles.catValue, { color: cat.color }]}>${Math.round(val).toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>Top Profitability Now</Text>
            {roiRanking.map(({ crop, roi, price: p }, i) => (
              <View key={crop.id} style={styles.statsRow}>
                <Text style={styles.statsLabel}>#{i + 1} {crop.name}</Text>
                <Text style={styles.statsValue}>${roi.toFixed(1)}/d · ${p.toFixed(2)}/{crop.unit}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {tab === 'futures' && (() => {
        const futuresPrice = prices.find(p => p.cropId === futuresCrop);
        const futuresCurrentPrice = futuresPrice?.price ?? CROP_TYPES.find(c => c.id === futuresCrop)!.basePrice;
        const futuresCropDef = CROP_TYPES.find(c => c.id === futuresCrop)!;
        const futuresInStock = inventory[futuresCrop] ?? 0;
        const parsedQty = parseInt(futuresQty, 10);
        const validQty = !isNaN(parsedQty) && parsedQty > 0;
        const estRevenue = validQty ? Math.round(parsedQty * futuresCurrentPrice * 0.85) : 0;
        const deliveryDay = day + futuresTerm;

        const openPositions = (futures ?? []).filter(f => !f.settled);
        const settledPositions = (futures ?? [])
          .filter(f => f.settled)
          .sort((a, b) => b.deliveryDay - a.deliveryDay)
          .slice(0, 10);

        return (
          <ScrollView style={styles.futuresScroll} showsVerticalScrollIndicator={false}>
            {/* ── Crop picker ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Text style={[styles.futuresSectionLabel, { marginBottom: 0 }]}>📉 Futures Trading</Text>
              <HelpSheet
                title="Futures Trading"
                body="A futures contract locks in today's price for a crop you'll deliver later. Useful when prices are high but your harvest isn't ready yet. If you can't deliver the agreed quantity, you pay a penalty."
              />
            </View>
            <Text style={styles.futuresSectionLabel}>Select Crop</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.futuresCropScroll}>
              {CROP_TYPES.map(crop => (
                <TouchableOpacity
                  key={crop.id}
                  style={[styles.futuresCropChip, futuresCrop === crop.id && styles.futuresCropChipActive]}
                  onPress={() => {
                    setFuturesCrop(crop.id);
                    setFuturesQty(String(Math.round(inventory[crop.id] ?? 0)));
                  }}
                >
                  <Text style={[styles.futuresCropChipText, futuresCrop === crop.id && styles.futuresCropChipTextActive]}>
                    {crop.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.futuresCropMeta}>
              ${futuresCurrentPrice.toFixed(2)}/{futuresCropDef.unit} · {Math.round(futuresInStock).toLocaleString()} {futuresCropDef.unit} in stock
            </Text>

            {/* ── Contract form ── */}
            <View style={styles.futuresForm}>
              <View style={styles.futuresFormRow}>
                <Text style={styles.futuresFormLabel}>Quantity ({futuresCropDef.unit})</Text>
                <TextInput
                  style={styles.futuresQtyInput}
                  value={futuresQty}
                  onChangeText={setFuturesQty}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#444"
                />
              </View>

              <Text style={styles.futuresFormLabel}>Delivery term</Text>
              <View style={styles.futuresTermRow}>
                {([30, 60, 90] as (30 | 60 | 90)[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.futuresTermBtn, futuresTerm === t && styles.futuresTermBtnActive]}
                    onPress={() => setFuturesTerm(t)}
                  >
                    <Text style={[styles.futuresTermBtnText, futuresTerm === t && styles.futuresTermBtnTextActive]}>
                      {t}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {validQty && (
                <View style={styles.futuresPreview}>
                  <Text style={styles.futuresPreviewText}>
                    Lock @ ${futuresCurrentPrice.toFixed(2)}/{futuresCropDef.unit} · Deliver by day {deliveryDay} · Est. revenue ${estRevenue.toLocaleString()}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.futuresOpenBtn, (!validQty || futuresInStock <= 0) && styles.futuresOpenBtnDisabled]}
                disabled={!validQty || futuresInStock <= 0}
                onPress={() => {
                  openFuture(futuresCrop, parsedQty, futuresTerm);
                  setFuturesQty(String(Math.round(inventory[futuresCrop] ?? 0)));
                  setFuturesFlash(true);
                  if (futuresFlashTimerRef.current) clearTimeout(futuresFlashTimerRef.current);
                  futuresFlashTimerRef.current = setTimeout(() => setFuturesFlash(false), 2000);
                }}
              >
                <Text style={styles.futuresOpenBtnText}>
                  {futuresInStock <= 0 ? 'No stock' : `Open Contract — lock $${futuresCurrentPrice.toFixed(2)}/${futuresCropDef.unit}`}
                </Text>
              </TouchableOpacity>

              {futuresFlash && (
                <Text style={styles.futuresFlash}>✅ Contract opened!</Text>
              )}
            </View>

            {/* ── Open positions ── */}
            <Text style={styles.futuresSectionLabel}>Open Positions ({openPositions.length})</Text>
            <View style={styles.futuresCard}>
              {openPositions.length === 0 ? (
                <Text style={styles.futuresEmpty}>No open contracts.</Text>
              ) : (
                openPositions.map(pos => {
                  const cropDef = CROP_TYPES.find(c => c.id === pos.cropId);
                  const inStockForPos = inventory[pos.cropId] ?? 0;
                  const isFulfillable = inStockForPos >= pos.quantity;
                  const daysLeft = pos.deliveryDay - day;
                  return (
                    <View key={pos.id} style={styles.futuresPosRow}>
                      <View style={styles.futuresPosLeft}>
                        <Text style={styles.futuresPosName}>{cropDef?.name ?? pos.cropId}</Text>
                        <Text style={styles.futuresPosDetail}>
                          {pos.quantity.toLocaleString()} {cropDef?.unit} @ ${pos.lockPrice.toFixed(2)}
                        </Text>
                        <Text style={[styles.futuresPosStock, isFulfillable ? styles.futuresPosStockOk : styles.futuresPosStockShort]}>
                          {isFulfillable
                            ? `🟢 ${Math.round(inStockForPos).toLocaleString()} in stock`
                            : `⚠️ Short ${(pos.quantity - Math.round(inStockForPos)).toLocaleString()} ${cropDef?.unit}`}
                        </Text>
                      </View>
                      <View style={styles.futuresPosRight}>
                        <Text style={styles.futuresPosDelivery}>
                          {daysLeft <= 0 ? '⚠️ Due today' : `📅 ${daysLeft}d left`}
                        </Text>
                        <Text style={styles.futuresPosDay}>Day {pos.deliveryDay}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* ── Settled history ── */}
            <Text style={styles.futuresSectionLabel}>Settled (last 10)</Text>
            <View style={styles.futuresCardLast}>
              {settledPositions.length === 0 ? (
                <Text style={styles.futuresEmpty}>No settled contracts yet.</Text>
              ) : (
                settledPositions.map(pos => {
                  const cropDef = CROP_TYPES.find(c => c.id === pos.cropId);
                  return (
                    <View key={pos.id} style={styles.futuresPosRow}>
                      <View style={styles.futuresPosLeft}>
                        <Text style={styles.futuresPosName}>{cropDef?.name ?? pos.cropId}</Text>
                        <Text style={styles.futuresPosDetail}>
                          {pos.quantity.toLocaleString()} {cropDef?.unit} @ ${pos.lockPrice.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.futuresPosRight}>
                        <Text style={styles.futuresSettledBadge}>✅ Settled</Text>
                        <Text style={styles.futuresPosDay}>Day {pos.deliveryDay}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        );
      })()}

      {tab === 'orders' && (() => {
        const activeOrders = (marketOrders ?? []).filter(o => o.status === 'active');
        const historyOrders = (marketOrders ?? []).filter(o => o.status !== 'active').slice(-20).reverse();
        const orderCropDef = CROP_TYPES.find(c => c.id === orderCrop)!;
        const orderCropPrice = prices.find(p => p.cropId === orderCrop)?.price ?? orderCropDef.basePrice;
        const orderInStock = inventory[orderCrop] ?? 0;
        const parsedOrderQty = parseInt(orderQty) || 0;
        const parsedOrderPrice = parseFloat(orderTargetPrice) || 0;
        const canPlaceOrder = parsedOrderQty > 0 && parsedOrderPrice > 0 && orderInStock >= parsedOrderQty;
        return (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.ordersSection}>
              <Text style={styles.futuresSectionLabel}>Place Market Order</Text>
              <Text style={styles.ordersSubtitle}>Reserve crop now; auto-sell when price target is met</Text>

              {/* Crop picker */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.orderCropScroll}>
                {CROP_TYPES.filter(c => (inventory[c.id] ?? 0) > 0).map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.orderCropChip, orderCrop === c.id && styles.orderCropChipActive]}
                    onPress={() => setOrderCrop(c.id)}
                  >
                    <Text style={[styles.orderCropChipText, orderCrop === c.id && styles.orderCropChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.ordersFormRow}>
                <View style={styles.ordersFormHalf}>
                  <Text style={styles.ordersFormLabel}>Quantity ({orderCropDef.unit})</Text>
                  <TextInput
                    style={styles.ordersInput}
                    keyboardType="numeric"
                    value={orderQty}
                    onChangeText={setOrderQty}
                    placeholder={`Max ${Math.round(orderInStock)}`}
                    placeholderTextColor="#555"
                  />
                </View>
                <View style={styles.ordersFormHalf}>
                  <Text style={styles.ordersFormLabel}>Target Price (current: ${orderCropPrice.toFixed(2)})</Text>
                  <TextInput
                    style={styles.ordersInput}
                    keyboardType="numeric"
                    value={orderTargetPrice}
                    onChangeText={setOrderTargetPrice}
                    placeholder={`≥ $${orderCropPrice.toFixed(2)}`}
                    placeholderTextColor="#555"
                  />
                </View>
              </View>

              {/* Term selector */}
              <View style={styles.ordersTermRow}>
                {([7, 14, 30] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.ordersTermBtn, orderTerm === t && styles.ordersTermBtnActive]}
                    onPress={() => setOrderTerm(t)}
                  >
                    <Text style={[styles.ordersTermText, orderTerm === t && styles.ordersTermTextActive]}>{t}d</Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.ordersTermHint}>Expires Day {day + orderTerm}</Text>
              </View>

              <TouchableOpacity
                style={[styles.ordersPlaceBtn, !canPlaceOrder && styles.ordersPlaceBtnDisabled]}
                disabled={!canPlaceOrder}
                onPress={() => {
                  placeMarketOrder(orderCrop, parsedOrderQty, parsedOrderPrice, orderTerm);
                  setOrderQty('');
                  setOrderTargetPrice('');
                }}
              >
                <Text style={styles.ordersPlaceBtnText}>
                  {!canPlaceOrder
                    ? parsedOrderQty > orderInStock ? 'Insufficient stock' : 'Enter quantity & price'
                    : `Place Order — sell ${parsedOrderQty.toLocaleString()} ${orderCropDef.unit} @ ≥$${parsedOrderPrice.toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Active orders */}
            <Text style={styles.futuresSectionLabel}>Active Orders ({activeOrders.length})</Text>
            <View style={styles.ordersCard}>
              {activeOrders.length === 0 ? (
                <Text style={styles.futuresEmpty}>No active orders.</Text>
              ) : (
                activeOrders.map(o => {
                  const cropDef = CROP_TYPES.find(c => c.id === o.cropId);
                  const daysLeft = o.expiresDay - day;
                  return (
                    <View key={o.id} style={styles.ordersRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ordersRowName}>{cropDef?.name ?? o.cropId}</Text>
                        <Text style={styles.ordersRowDetail}>
                          {o.quantity.toLocaleString()} {cropDef?.unit} @ ≥${o.targetPrice.toFixed(2)}
                        </Text>
                        <Text style={styles.ordersRowExpiry}>⏳ {daysLeft}d remaining (Day {o.expiresDay})</Text>
                      </View>
                      <TouchableOpacity style={styles.ordersCancelBtn} onPress={() => cancelMarketOrder(o.id)}>
                        <Text style={styles.ordersCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>

            {/* Order history */}
            <Text style={styles.futuresSectionLabel}>History (last 20)</Text>
            <View style={[styles.ordersCard, { marginBottom: 32 }]}>
              {historyOrders.length === 0 ? (
                <Text style={styles.futuresEmpty}>No completed orders yet.</Text>
              ) : (
                historyOrders.map(o => {
                  const cropDef = CROP_TYPES.find(c => c.id === o.cropId);
                  const badgeStyle = o.status === 'executed' ? styles.ordersBadgeGood : o.status === 'expired' ? styles.ordersBadgeWarn : styles.ordersBadgeGray;
                  const badgeText = o.status === 'executed' ? `✅ Filled · +$${(o.executedRevenue ?? 0).toLocaleString()}` : o.status === 'expired' ? '⏰ Expired' : '❌ Cancelled';
                  return (
                    <View key={o.id} style={styles.ordersRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ordersRowName}>{cropDef?.name ?? o.cropId}</Text>
                        <Text style={styles.ordersRowDetail}>{o.quantity.toLocaleString()} {cropDef?.unit} @ ≥${o.targetPrice.toFixed(2)}</Text>
                      </View>
                      <Text style={badgeStyle}>{badgeText}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        );
      })()}

      {tab === 'supply' && (
        <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>

          <Text style={styles.sectionHeader}>Recurring Buyers</Text>
          <Text style={[styles.sectionSubtitle, { marginBottom: S.md }]}>
            Consistent deliveries build streaks and unlock better prices and larger orders.
          </Text>

          {(buyers ?? []).map((buyer) => {
            const available = isBuyerAvailable(buyer);
            const activeContract = activeBuyerContract(buyer.id);
            const tierCfg = BUYER_TIER_CONFIG[buyer.tier];
            const priceBonus = getBuyerPriceBonus(buyer);
            const nextTierEntry = (['new','regular','preferred','exclusive'] as BuyerTier[])
              .find((t) => BUYER_TIER_CONFIG[t].deliveryGate > buyer.totalDeliveries);
            const gateToNext = nextTierEntry
              ? BUYER_TIER_CONFIG[nextTierEntry].deliveryGate - buyer.totalDeliveries
              : 0;

            return (
              <View key={buyer.id} style={[styles.card, !available && { opacity: 0.45 }]}>
                {/* Header */}
                <View style={styles.rowBetween}>
                  <View style={styles.rowInline}>
                    <Text style={styles.buyerEmoji}>{buyer.emoji}</Text>
                    <Text style={styles.cardTitle}>{buyer.name}</Text>
                  </View>
                  <View style={[styles.tierBadge, { backgroundColor: BUYER_TIER_COLORS[buyer.tier] }]}>
                    <Text style={styles.tierBadgeText}>{tierCfg.emoji} {tierCfg.label}</Text>
                  </View>
                </View>

                {/* Accepted crops */}
                <Text style={styles.buyerCropLabel}>
                  Accepts: {buyer.cropIds[0] === 'any' ? 'Any crop' : buyer.cropIds.join(', ')}
                </Text>

                {/* Tier stats */}
                <View style={[styles.rowInline, { gap: S.md, marginTop: S.xs }]}>
                  <Text style={styles.buyerStat}>+{Math.round(priceBonus * 100)}% price</Text>
                  <Text style={styles.buyerStat}>
                    Max {tierCfg.maxOrderKg === Infinity ? 'Unlimited' : `${tierCfg.maxOrderKg} kg`}
                  </Text>
                  {gateToNext > 0 && (
                    <Text style={styles.buyerStat}>{gateToNext} more to upgrade</Text>
                  )}
                </View>

                {/* Streak pips */}
                {buyer.deliveryStreak > 0 && (
                  <View style={[styles.rowInline, { gap: 4, marginTop: S.xs, flexWrap: 'wrap' }]}>
                    {Array.from({ length: Math.min(buyer.deliveryStreak, 15) }).map((_, i) => (
                      <View key={i} style={styles.streakPip} />
                    ))}
                    <Text style={[styles.buyerStat, { marginLeft: 4 }]}>
                      {buyer.deliveryStreak} streak
                    </Text>
                  </View>
                )}

                {/* Lock reason */}
                {!available && (
                  <Text style={styles.lockedReason}>
                    {day < buyer.unlockedDay
                      ? `Unlocks day ${buyer.unlockedDay}`
                      : `Requires ${buyer.requiresReputation} reputation`}
                  </Text>
                )}

                {/* Active contract summary */}
                {activeContract && (
                  <View style={styles.activeContractChip}>
                    <Text style={styles.activeContractText}>
                      📦 {activeContract.cropId} · {activeContract.amountPerDelivery} kg
                      {' '}· Next: day {activeContract.nextDeliveryDay}
                      {activeContract.graceDaysRemaining > 0
                        ? ` (+${activeContract.graceDaysRemaining}d grace)`
                        : ''}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                {available && (
                  <View style={[styles.rowInline, { gap: S.sm, marginTop: S.sm }]}>
                    {!activeContract ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: C.green }]}
                        onPress={() => {
                          setSigningBuyerId(buyer.id);
                          setSignCropId(buyer.cropIds[0] === 'any' ? CROP_TYPES[0].id : buyer.cropIds[0]);
                          setSignModalVisible(true);
                        }}
                      >
                        <Text style={styles.actionBtnText}>Sign Contract</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.actionBtn, { flex: 1, backgroundColor: C.green }]}
                          onPress={() => {
                            setDeliveringContractId(activeContract.id);
                            setDeliverAmount(String(activeContract.amountPerDelivery));
                            setDeliverModalVisible(true);
                          }}
                        >
                          <Text style={styles.actionBtnText}>Deliver</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { flex: 1, backgroundColor: '#5c1a1a' }]}
                          onPress={() => cancelRecurringContract(activeContract.id)}
                        >
                          <Text style={[styles.actionBtnText, { color: '#ef9a9a' }]}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Sign Contract Modal ── */}
      <Modal
        visible={signModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {(() => {
              const buyer = (buyers ?? []).find((b) => b.id === signingBuyerId);
              if (!buyer) return null;
              const tierCfg = BUYER_TIER_CONFIG[buyer.tier];
              const acceptedCrops =
                buyer.cropIds[0] === 'any'
                  ? CROP_TYPES.map((ct) => ct.id)
                  : buyer.cropIds;

              return (
                <>
                  <Text style={styles.modalTitle}>
                    {buyer.emoji} Sign Contract — {buyer.name}
                  </Text>
                  <Text style={styles.modalSub}>
                    {tierCfg.emoji} {tierCfg.label} · +{Math.round(getBuyerPriceBonus(buyer) * 100)}% price bonus
                  </Text>

                  <Text style={styles.formLabel}>Crop</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: S.sm }}>
                    {acceptedCrops.map((id) => (
                      <TouchableOpacity
                        key={id}
                        style={[styles.supplyChip, signCropId === id && styles.supplyChipActive]}
                        onPress={() => setSignCropId(id)}
                      >
                        <Text style={[styles.supplyChipText, signCropId === id && { color: C.white }]}>
                          {CROP_TYPES.find((ct) => ct.id === id)?.name ?? id}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.formLabel}>
                    Amount per delivery (kg)
                    {tierCfg.maxOrderKg !== Infinity ? ` — max ${tierCfg.maxOrderKg}` : ''}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={signAmount}
                    onChangeText={setSignAmount}
                    keyboardType="numeric"
                    placeholder="e.g. 200"
                    placeholderTextColor={C.textFaint}
                  />

                  <Text style={styles.formLabel}>Delivery frequency</Text>
                  <View style={[styles.rowInline, { gap: S.sm, marginBottom: S.sm }]}>
                    {([7, 14, 30] as const).map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={[styles.supplyChip, { flex: 1 }, signFrequency === f && styles.supplyChipActive]}
                        onPress={() => setSignFrequency(f)}
                      >
                        <Text style={[styles.supplyChipText, signFrequency === f && { color: C.white }]}>
                          {f === 7 ? 'Weekly' : f === 14 ? 'Biweekly' : 'Monthly'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.formLabel}>Duration (seasons)</Text>
                  <View style={[styles.rowInline, { gap: S.sm, marginBottom: S.md }]}>
                    {[1, 2, 3, 4].map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.supplyChip, { flex: 1 }, signDuration === d && styles.supplyChipActive]}
                        onPress={() => setSignDuration(d)}
                      >
                        <Text style={[styles.supplyChipText, signDuration === d && { color: C.white }]}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={[styles.rowInline, { gap: S.sm }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: C.green }]}
                      onPress={() => {
                        const amt = Number(signAmount);
                        if (!signCropId || !amt || amt <= 0) return;
                        if (tierCfg.maxOrderKg !== Infinity && amt > tierCfg.maxOrderKg) return;
                        signRecurringContract(
                          signingBuyerId!, signCropId, amt, signFrequency, signDuration,
                        );
                        setSignModalVisible(false);
                        setSignAmount('');
                      }}
                    >
                      <Text style={styles.actionBtnText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: C.bgCard }]}
                      onPress={() => setSignModalVisible(false)}
                    >
                      <Text style={[styles.actionBtnText, { color: C.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Deliver Modal ── */}
      <Modal
        visible={deliverModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeliverModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {(() => {
              const contract = (recurringContracts ?? []).find((c) => c.id === deliveringContractId);
              if (!contract) return null;
              const buyer = (buyers ?? []).find((b) => b.id === contract.buyerId);
              if (!buyer) return null;
              const inStock = inventory[contract.cropId] ?? 0;
              const cropType = CROP_TYPES.find((ct) => ct.id === contract.cropId);
              const basePrice = cropType?.basePrice ?? 1;
              const previewAmt = Math.min(Number(deliverAmount) || 0, inStock);
              const previewRevenue = previewAmt * basePrice * (1 + contract.priceBonus);
              const threshold80 = Math.ceil(contract.amountPerDelivery * 0.8);
              const isOnTime = previewAmt >= threshold80;

              return (
                <>
                  <Text style={styles.modalTitle}>
                    {buyer.emoji} Deliver to {buyer.name}
                  </Text>
                  <Text style={styles.modalSub}>
                    Required: {contract.amountPerDelivery} kg {contract.cropId}
                    {' '}(≥{threshold80} kg counts as on-time)
                  </Text>
                  <Text style={styles.modalSub}>
                    In stock: {inStock.toLocaleString()} kg · +{Math.round(contract.priceBonus * 100)}% bonus
                  </Text>

                  <Text style={styles.formLabel}>Amount to deliver (kg)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={deliverAmount}
                    onChangeText={setDeliverAmount}
                    keyboardType="numeric"
                    placeholder={String(contract.amountPerDelivery)}
                    placeholderTextColor={C.textFaint}
                  />

                  {previewAmt > 0 && (
                    <Text style={[styles.modalSub, { color: isOnTime ? '#81c784' : '#ef9a9a', marginBottom: S.sm }]}>
                      Revenue: ${previewRevenue.toFixed(0)}
                      {isOnTime ? ' ✓ On-time' : ' ⚠️ Below 80% — counts as missed'}
                    </Text>
                  )}

                  <View style={[styles.rowInline, { gap: S.sm }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: C.green }]}
                      onPress={() => {
                        const amt = Number(deliverAmount);
                        if (!amt || amt <= 0) return;
                        deliverToRecurringContract(contract.id, amt);
                        setDeliverModalVisible(false);
                        setDeliverAmount('');
                      }}
                    >
                      <Text style={styles.actionBtnText}>Deliver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: C.bgCard }]}
                      onPress={() => setDeliverModalVisible(false)}
                    >
                      <Text style={[styles.actionBtnText, { color: C.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  statsScroll: { flex: 1, paddingHorizontal: S.md },
  statsCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, marginBottom: S.sm },
  statsCardTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.md, marginBottom: S.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.divider },
  statsLabel: { color: C.textMuted, fontSize: F.size.sm },
  statsValue: { color: '#ccc', fontSize: F.size.sm, fontWeight: 'bold' },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: S.sm },
  catLabel: { color: C.textMuted, fontSize: F.size.sm, width: 90 },
  catBarWrap: { flex: 1, height: 8, backgroundColor: '#0a1628', borderRadius: R.xs, marginHorizontal: S.sm, overflow: 'hidden' },
  catBar: { height: 8, borderRadius: R.xs },
  catValue: { fontSize: F.size.sm, fontWeight: 'bold', width: 80, textAlign: 'right' },
  prestigeCard: { backgroundColor: '#1a1050', borderRadius: 10, padding: S.md, marginBottom: S.sm, borderWidth: 1, borderColor: '#7c4dff', alignItems: 'center' },
  prestigeTitle: { color: '#b39ddb', fontWeight: 'bold', fontSize: 15 },
  prestigeSub: { color: '#7c4dff', fontSize: F.size.sm, marginTop: 2 },
  prestigeHint: { color: '#7c7c9a', fontSize: 11, marginTop: 6, textAlign: 'center' },

  futuresScroll: { flex: 1, paddingHorizontal: S.md },
  futuresSectionLabel: { color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold', marginTop: S.lg, marginBottom: 6 },
  futuresCropScroll:   { marginBottom: S.xs },
  futuresCropChip:     { backgroundColor: C.bgCard, borderRadius: R.xl, paddingHorizontal: S.md, paddingVertical: 6, marginRight: 6 },
  futuresCropChipActive: { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  futuresCropChipText: { color: C.textMuted, fontSize: 11 },
  futuresCropChipTextActive: { color: C.text, fontWeight: 'bold' },
  futuresCropMeta:     { color: C.textMuted, fontSize: 11, marginBottom: 10 },

  futuresForm:         { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.xs },
  futuresFormRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  futuresFormLabel:    { color: C.textMuted, fontSize: F.size.sm, marginBottom: 6 },
  futuresQtyInput:     { backgroundColor: '#0a1628', color: C.white, fontSize: F.size.md, borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 6, width: 100, textAlign: 'right' },
  futuresTermRow:      { flexDirection: 'row', gap: 8, marginBottom: 10 },
  futuresTermBtn:      { flex: 1, backgroundColor: '#0a1628', borderRadius: R.md, paddingVertical: S.sm, alignItems: 'center' },
  futuresTermBtnActive: { backgroundColor: '#1565c0' },
  futuresTermBtnText:  { color: C.textFaint, fontWeight: 'bold', fontSize: F.size.md },
  futuresTermBtnTextActive: { color: C.white },
  futuresPreview:      { backgroundColor: '#0a1628', borderRadius: R.md, padding: S.sm, marginBottom: 10 },
  futuresPreviewText:  { color: '#81c784', fontSize: 11 },
  futuresOpenBtn:      { backgroundColor: '#1b5e20', borderRadius: R.md, padding: 10, alignItems: 'center' },
  futuresOpenBtnDisabled: { backgroundColor: '#333' },
  futuresOpenBtnText:  { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  futuresFlash:        { color: '#81c784', fontSize: F.size.sm, textAlign: 'center', marginTop: S.sm },

  futuresCard:         { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.xs },
  futuresCardLast:    { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.xxl },
  futuresEmpty:        { color: '#555', fontSize: F.size.sm },
  futuresPosRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider },
  futuresPosLeft:      { flex: 1 },
  futuresPosRight:     { alignItems: 'flex-end', justifyContent: 'center' },
  futuresPosName:      { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  futuresPosDetail:    { color: C.textMuted, fontSize: 11, marginTop: 2 },
  futuresPosStock:     { fontSize: 11, marginTop: 3 },
  futuresPosStockOk:   { color: '#66bb6a' },
  futuresPosStockShort:{ color: '#ffa726' },
  futuresPosDelivery:  { color: '#aaa', fontSize: F.size.sm, fontWeight: 'bold' },
  futuresPosDay:       { color: '#555', fontSize: F.size.xs, marginTop: 2 },
  futuresSettledBadge: { color: '#66bb6a', fontSize: F.size.sm, fontWeight: 'bold' },

  // Orders tab
  ordersSection:            { margin: S.md, backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  ordersSubtitle:           { color: C.textFaint, fontSize: 11, marginBottom: 10, marginTop: -6 },
  orderCropScroll:          { marginBottom: 10 },
  orderCropChip:            { backgroundColor: '#0d1b2e', borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, borderWidth: 1, borderColor: '#1e2a3a' },
  orderCropChipActive:      { backgroundColor: '#1565c0', borderColor: '#42a5f5' },
  orderCropChipText:        { color: C.textMuted, fontSize: F.size.sm },
  orderCropChipTextActive:  { color: C.white, fontWeight: 'bold' },
  ordersFormRow:            { flexDirection: 'row', gap: 10, marginBottom: 10 },
  ordersFormHalf:           { flex: 1 },
  ordersFormLabel:          { color: C.textMuted, fontSize: F.size.xs, marginBottom: S.xs },
  ordersInput:              { backgroundColor: '#0d1b2e', borderRadius: R.md, color: C.text, paddingHorizontal: 10, paddingVertical: 7, fontSize: F.size.md, borderWidth: 1, borderColor: '#1e2a3a' },
  ordersTermRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: S.md },
  ordersTermBtn:            { backgroundColor: '#0d1b2e', borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 6, borderWidth: 1, borderColor: '#1e2a3a' },
  ordersTermBtnActive:      { backgroundColor: '#1565c0', borderColor: '#42a5f5' },
  ordersTermText:           { color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold' },
  ordersTermTextActive:     { color: C.white },
  ordersTermHint:           { color: '#555', fontSize: 11, flex: 1, textAlign: 'right' },
  ordersPlaceBtn:           { backgroundColor: '#1565c0', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  ordersPlaceBtnDisabled:   { backgroundColor: '#333' },
  ordersPlaceBtnText:       { color: C.white, fontWeight: 'bold', fontSize: F.size.sm },
  ordersCard:               { marginHorizontal: S.md, backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.sm },
  ordersRow:                { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: '#1e2a3a' },
  ordersRowName:            { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  ordersRowDetail:          { color: C.textMuted, fontSize: 11, marginTop: 1 },
  ordersRowExpiry:          { color: '#ffa726', fontSize: F.size.xs, marginTop: 2 },
  ordersCancelBtn:          { backgroundColor: '#b71c1c', borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 6 },
  ordersCancelText:         { color: C.white, fontSize: 11, fontWeight: 'bold' },
  ordersBadgeGood:          { color: '#66bb6a', fontSize: 11, fontWeight: 'bold' },
  ordersBadgeWarn:          { color: '#ffa726', fontSize: 11 },
  ordersBadgeGray:          { color: '#555', fontSize: 11 },

  // Supply tab styles
  tabScroll:          { flex: 1 },
  sectionHeader:      { color: C.text, fontSize: F.size.lg, fontWeight: F.weight.bold, marginBottom: S.xs },
  sectionSubtitle:    { color: C.textMuted, fontSize: F.size.sm },
  card:               { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.sm },
  cardTitle:          { color: C.text, fontWeight: F.weight.bold, fontSize: F.size.md },
  rowInline:          { flexDirection: 'row', alignItems: 'center' },
  rowBetween:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.xs },
  buyerEmoji:         { fontSize: 22, marginRight: S.xs },
  buyerCropLabel:     { fontSize: F.size.xs, color: C.textFaint, marginTop: 2 },
  buyerStat:          { fontSize: F.size.xs, color: C.textMuted },
  streakPip:          { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
  tierBadge:          { paddingHorizontal: S.sm, paddingVertical: 2, borderRadius: R.sm },
  tierBadgeText:      { fontSize: F.size.xs, color: C.white, fontWeight: '700' },
  lockedReason:       { fontSize: F.size.xs, color: C.textFaint, marginTop: S.xs, fontStyle: 'italic' },
  activeContractChip: { backgroundColor: C.bg, borderRadius: R.sm, padding: S.sm, marginTop: S.sm },
  activeContractText: { fontSize: F.size.xs, color: C.textMuted },
  actionBtn:          { flex: 1, borderRadius: R.md, paddingVertical: S.sm, alignItems: 'center' },
  actionBtnText:      { color: C.white, fontWeight: '700', fontSize: F.size.sm },
  // Supply modal styles
  supplyChip:         { paddingHorizontal: S.sm, paddingVertical: S.xs, borderRadius: R.pill,
                        backgroundColor: C.bgCard, marginRight: S.xs, alignItems: 'center' },
  supplyChipActive:   { backgroundColor: C.green },
  supplyChipText:     { fontSize: F.size.sm, color: C.textMuted },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet:         { backgroundColor: C.bg, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
                        padding: S.lg, paddingBottom: 36 },
  modalTitle:         { color: C.text, fontSize: F.size.lg, fontWeight: F.weight.bold, marginBottom: S.xs },
  modalSub:           { color: C.textMuted, fontSize: F.size.sm, marginBottom: S.xs },
  formLabel:          { color: C.textMuted, fontSize: F.size.xs, fontWeight: '600',
                        marginTop: S.sm, marginBottom: 4 },
  formInput:          { backgroundColor: C.bgCard, borderRadius: R.md, color: C.text,
                        fontSize: F.size.md, paddingHorizontal: S.md, paddingVertical: S.sm,
                        marginBottom: S.sm },
});
