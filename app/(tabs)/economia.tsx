import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { playSound } from '../../engine/sounds';
import Svg, { Polyline, Line, Text as SvgText, Rect, G, Circle } from 'react-native-svg';
import { useGameStore } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import { CROP_TYPES, CropTier } from '../../data/cropTypes';
import { MARKET_REGIONS, MarketId } from '../../data/marketRegions';
import { sellRevenue, computeSellPressureModifier, sellPressureDuration } from '../../engine/market';
import { getSeason } from '../../engine/climate';
import HelpSheet from '../../components/HelpSheet';
import HintCard from '../../components/HintCard';

const TIER_COLORS: Record<CropTier, string> = {
  D: '#9e9e9e', C: '#4caf50', B: '#2196f3', A: '#9c27b0', S: '#ff9800',
};

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W * 0.62 - 24;
const REV_CHART_W = SCREEN_W - 48;
const REV_CHART_H = 120;
const REV_PAD = { top: 8, bottom: 24, left: 44, right: 8 };

type SaleRecord = { day: number; amount: number; category?: string };

function RevenueHistoryChart({ salesLog, currentDay }: { salesLog: SaleRecord[]; currentDay: number }) {
  const DAYS = 30;
  // Build daily buckets for last DAYS days
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
        {/* X axis labels: first, middle, last day */}
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
const CHART_H = 150;
const PAD = { top: 12, bottom: 28, left: 44, right: 10 };

function PriceChart({ history, basePrice }: { history: number[]; basePrice: number }) {
  if (history.length < 2) {
    return (
      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartEmpty}>Advance days to see history</Text>
      </View>
    );
  }

  const w = CHART_W - PAD.left - PAD.right;
  const h = CHART_H - PAD.top - PAD.bottom;
  const minVal = Math.min(...history) * 0.95;
  const maxVal = Math.max(...history) * 1.05;
  const range = maxVal - minVal || 1;
  const toX = (i: number) => PAD.left + (i / (history.length - 1)) * w;
  const toY = (v: number) => PAD.top + h - ((v - minVal) / range) * h;
  const points = history.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const baseY = toY(Math.max(minVal, Math.min(maxVal, basePrice)));
  const current = history[history.length - 1];
  const up = current >= basePrice;
  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal];

  // 7-day simple moving average
  const MA_WINDOW = 7;
  const maPointsStr = history.reduce<string>((acc, _, i) => {
    if (i < MA_WINDOW - 1) return acc;
    const slice = history.slice(i - MA_WINDOW + 1, i + 1);
    const avg = slice.reduce((s, v) => s + v, 0) / MA_WINDOW;
    return acc + (acc ? ' ' : '') + `${toX(i).toFixed(1)},${toY(avg).toFixed(1)}`;
  }, '');

  const lastX = toX(history.length - 1);
  const lastY = toY(current);

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Rect x={PAD.left} y={PAD.top} width={w} height={h} fill="#0a1628" rx={4} />
      <Line x1={PAD.left} y1={baseY} x2={PAD.left + w} y2={baseY} stroke="#444" strokeWidth={1} strokeDasharray="4,3" />
      {yLabels.map((v, i) => (
        <SvgText key={i} x={PAD.left - 4} y={toY(v) + 4} fontSize={9} fill="#666" textAnchor="end">
          ${v.toFixed(0)}
        </SvgText>
      ))}
      {[0, Math.floor((history.length - 1) / 2), history.length - 1].map(idx => (
        <SvgText key={idx} x={toX(idx)} y={CHART_H - 6} fontSize={9} fill="#666" textAnchor="middle">
          -{history.length - 1 - idx}d
        </SvgText>
      ))}
      <Polyline points={points} fill="none" stroke={up ? '#4caf50' : '#ef5350'} strokeWidth={2} />
      {history.length >= MA_WINDOW && (
        <Polyline points={maPointsStr} fill="none" stroke="#ffd54f" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.8} />
      )}
      <Circle cx={lastX} cy={lastY} r={4} fill={up ? '#4caf50' : '#ef5350'} stroke="#fff" strokeWidth={1} />
    </Svg>
  );
}

type EcoTab = 'market' | 'autosell' | 'stats' | 'futures' | 'orders';

export default function EconomiaScreen() {
  const { prices, priceHistory, inventory, sellCrop, newsEvents, day, salesLog, totalRevenue, autoSell, setAutoSell, prestige, sellPressures, futures, openFuture, priceAlerts, addPriceAlert, removePriceAlert, money, marketOrders, placeMarketOrder, cancelMarketOrder, selectedMarket, setSelectedMarket } = useGameStore();
  const [selectedCrop, setSelectedCrop] = useState<string>(CROP_TYPES[0].id);
  const [ecoTab, setEcoTab] = useState<EcoTab>('market');
  const [autoSellMinPrice, setAutoSellMinPrice] = useState<Record<string, string>>({});
  const [futuresCrop, setFuturesCrop] = useState<string>(CROP_TYPES[0].id);
  const [futuresQty, setFuturesQty] = useState<string>('');
  const [futuresTerm, setFuturesTerm] = useState<30 | 60 | 90>(30);
  const [futuresFlash, setFuturesFlash] = useState(false);
  const futuresFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');
  const [orderCrop, setOrderCrop] = useState<string>(CROP_TYPES[0].id);
  const [orderQty, setOrderQty] = useState('');
  const [orderTargetPrice, setOrderTargetPrice] = useState('');
  const [orderTerm, setOrderTerm] = useState<7 | 14 | 30>(7);

  useEffect(() => {
    return () => {
      if (futuresFlashTimerRef.current) clearTimeout(futuresFlashTimerRef.current);
    };
  }, []);

  const selected = CROP_TYPES.find(c => c.id === selectedCrop)!;
  const selectedPrice = prices.find(p => p.cropId === selectedCrop);
  const history = priceHistory[selectedCrop] ?? [];
  const inStock = inventory[selectedCrop] ?? 0;
  const revenue = sellRevenue(inStock, selectedPrice?.price ?? 0);
  const current = selectedPrice?.price ?? selected.basePrice;

  const activeRegion = MARKET_REGIONS.find(r => r.id === (selectedMarket ?? 'local')) ?? MARKET_REGIONS[0];
  const regionalEffectivePrice = current * activeRegion.priceMultiplier;
  const transportTotal = Math.round(inStock * activeRegion.transportCostPerUnit);
  const regionalRevenue = Math.max(0, Math.round(sellRevenue(inStock, regionalEffectivePrice) - transportTotal));
  const pct = ((current - selected.basePrice) / selected.basePrice) * 100;
  const up = pct >= 0;

  const currentSeason = getSeason(day);
  const isPeakSeason = currentSeason === selected.peakSeason;
  const sellSignal: { label: string; color: string; advice: string } = (() => {
    if (isPeakSeason && current < selected.basePrice * 0.95)
      return { label: '🔴 Harvest glut', color: '#ef5350', advice: 'Peak season — prices are low. Hold if possible.' };
    if (!isPeakSeason && current > selected.basePrice * 1.05)
      return { label: '🟢 Off-season premium', color: '#66bb6a', advice: 'Good time to sell — above seasonal average.' };
    return { label: '🟡 Fair price', color: '#ffa726', advice: `Peak season: ${selected.peakSeason} (expect lower prices then).` };
  })();

  const histMin = history.length ? Math.min(...history) : current;
  const histMax = history.length ? Math.max(...history) : current;
  const histAvg = history.length ? history.reduce((a, b) => a + b, 0) / history.length : current;

  // Stats computations
  const rev7 = salesLog.filter(s => s.day >= day - 7).reduce((a, s) => a + s.amount, 0);
  const rev30 = salesLog.filter(s => s.day >= day - 30).reduce((a, s) => a + s.amount, 0);
  const rev90 = salesLog.filter(s => s.day >= day - 90).reduce((a, s) => a + s.amount, 0);
  const catRevenue = { crops: 0, animals: 0, processed: 0, contracts: 0 };
  for (const s of salesLog) {
    if (s.category === 'crops') catRevenue.crops += s.amount;
    else if (s.category === 'animals') catRevenue.animals += s.amount;
    else if (s.category === 'processed') catRevenue.processed += s.amount;
    else if (s.category === 'contracts') catRevenue.contracts += s.amount;
  }

  // ROI: (price × baseYield - seedCost) / growthDays
  const roiRanking = CROP_TYPES
    .map(crop => {
      const p = prices.find(px => px.cropId === crop.id)?.price ?? crop.basePrice;
      const roi = (p * crop.baseYield * 0.85 - crop.seedCost) / crop.growthDays;
      return { crop, roi, price: p };
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  const stockedCrops = CROP_TYPES
    .map(crop => ({ crop, qty: Math.round(inventory[crop.id] ?? 0), price: prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice }))
    .filter(x => x.qty > 0);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Economy" />
      {Object.values(inventory).reduce((a, b) => a + b, 0) > 0 && money < 5000 && (
        <HintCard id="hint_sell" title="You have crops to sell!" body="Your inventory has stock but funds are low. Go to the Market tab, select a crop, and tap Sell All to convert it to cash." />
      )}

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={{ flexDirection: 'row' }}>
        {(['market', 'autosell', 'stats', 'futures', 'orders'] as EcoTab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, ecoTab === t && styles.tabBtnActive]} onPress={() => setEcoTab(t)}>
            <Text style={[styles.tabBtnText, ecoTab === t && styles.tabBtnTextActive]}>
              {t === 'market' ? '📈 Market' : t === 'autosell' ? '🤖 Auto-Sell' : t === 'stats' ? '📊 Stats' : t === 'futures' ? '📉 Futures' : '📋 Orders'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* AUTO-SELL TAB */}
      {ecoTab === 'autosell' && (
        <ScrollView style={styles.autoSellScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.autoSellDesc}>
            Enable auto-sell per crop. Each day, if the market price meets your minimum, all stock is sold automatically.
          </Text>
          {CROP_TYPES.map(crop => {
            const rule = (autoSell ?? {})[crop.id];
            const currentPrice = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
            const inputVal = autoSellMinPrice[crop.id] ?? String(rule?.minPrice ?? Math.round(crop.basePrice));
            return (
              <View key={crop.id} style={styles.autoSellRow}>
                <View style={styles.autoSellLeft}>
                  <Text style={styles.autoSellName}>{crop.name}</Text>
                  <Text style={styles.autoSellPrice}>Now: ${currentPrice.toFixed(2)}/{crop.unit}</Text>
                </View>
                <TextInput
                  style={styles.autoSellInput}
                  value={inputVal}
                  onChangeText={v => setAutoSellMinPrice(prev => ({ ...prev, [crop.id]: v }))}
                  keyboardType="numeric"
                  placeholder="Min $"
                  placeholderTextColor="#444"
                />
                <TouchableOpacity
                  style={[styles.autoSellToggle, rule?.enabled && styles.autoSellToggleOn]}
                  onPress={() => {
                    const minPrice = parseFloat(inputVal) || crop.basePrice;
                    if (rule?.enabled) {
                      setAutoSell(crop.id, { enabled: false, minPrice });
                    } else {
                      setAutoSell(crop.id, { enabled: true, minPrice });
                    }
                  }}
                >
                  <Text style={styles.autoSellToggleText}>{rule?.enabled ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* STATS TAB */}
      {ecoTab === 'stats' && (
        <ScrollView style={styles.statsScroll} showsVerticalScrollIndicator={false}>
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

      {/* FUTURES TAB */}
      {ecoTab === 'futures' && (() => {
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

      {/* ORDERS TAB */}
      {ecoTab === 'orders' && (() => {
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

      {/* MARKET TAB */}
      {ecoTab === 'market' && <>
      {/* News ticker */}
      {newsEvents.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.ticker}
          contentContainerStyle={styles.tickerContent}
        >
          {newsEvents.map(event => (
            <View key={event.id} style={[styles.tickerItem, event.modifier >= 1 ? styles.tickerBull : styles.tickerBear]}>
              <Text style={styles.tickerText}>{event.description}</Text>
              <Text style={styles.tickerDays}>{event.daysRemaining}d</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Active alerts summary */}
      {(priceAlerts ?? []).length > 0 && (
        <View style={styles.alertSummaryBar}>
          <Text style={styles.alertSummaryTitle}>🎯 Active Alerts</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
            {(priceAlerts ?? []).map(alert => {
              const cropDef = CROP_TYPES.find(c => c.id === alert.cropId);
              return (
                <View key={alert.id} style={styles.alertSummaryChip}>
                  <Text style={styles.alertSummaryChipName}>{cropDef?.name ?? alert.cropId}</Text>
                  <Text style={styles.alertSummaryChipPrice}>
                    {alert.direction === 'below' ? '≤' : '≥'}${alert.targetPrice.toFixed(2)}
                  </Text>
                  <TouchableOpacity onPress={() => removePriceAlert(alert.id)}>
                    <Text style={styles.alertSummaryChipRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.body}>
        {/* Left column */}
        <ScrollView style={styles.leftCol} showsVerticalScrollIndicator={false}>
          {CROP_TYPES.map(crop => {
            const p = prices.find(px => px.cropId === crop.id);
            const cpct = p ? ((p.price - p.basePrice) / p.basePrice) * 100 : 0;
            const isSelected = selectedCrop === crop.id;
            // 3-day trend: compare last price vs 3 days ago
            const hist = priceHistory[crop.id] ?? [];
            const recentTrend = hist.length >= 3
              ? hist[hist.length - 1] - hist[hist.length - 4 < 0 ? 0 : hist.length - 4]
              : 0;
            const trendIcon = recentTrend > 0.5 ? '↗' : recentTrend < -0.5 ? '↘' : '→';
            const trendColor = recentTrend > 0.5 ? '#66bb6a' : recentTrend < -0.5 ? '#ef5350' : '#888';
            return (
              <TouchableOpacity
                key={crop.id}
                style={[styles.cropRow, { borderLeftWidth: 2, borderLeftColor: TIER_COLORS[crop.tier] }, isSelected && styles.cropRowSelected]}
                onPress={() => setSelectedCrop(crop.id)}
              >
                <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[crop.tier] }]} />
                <View style={styles.cropRowInfo}>
                  <Text style={[styles.cropRowName, isSelected && styles.cropRowNameSelected]} numberOfLines={1}>
                    {crop.name}
                  </Text>
                  <Text style={[styles.cropRowPct, cpct >= 0 ? styles.up : styles.down]}>
                    {cpct >= 0 ? '▲' : '▼'} {Math.abs(cpct).toFixed(1)}%
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: trendColor, fontWeight: 'bold' }}>{trendIcon}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Right panel */}
        <ScrollView style={styles.rightPanel} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Chart header */}
          <View style={styles.chartMeta}>
            <Text style={styles.chartCropName}>{selected.name}</Text>
            <View style={styles.chartPriceRow}>
              <Text style={styles.chartCurrentPrice}>${current.toFixed(2)}</Text>
              <Text style={styles.chartUnit}>/{selected.unit}</Text>
              <Text style={[styles.chartPct, up ? styles.up : styles.down]}>
                {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
              </Text>
            </View>
          </View>

          <PriceChart history={history} basePrice={selected.basePrice} />

          {/* Stats bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>MIN</Text>
              <Text style={styles.statValue}>${histMin.toFixed(2)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>AVG</Text>
              <Text style={styles.statValue}>${histAvg.toFixed(2)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>MAX</Text>
              <Text style={styles.statValue}>${histMax.toFixed(2)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>BASE</Text>
              <Text style={[styles.statValue, { color: '#888' }]}>${selected.basePrice.toFixed(2)}</Text>
            </View>
          </View>

          {/* Sell signal */}
          <View style={[styles.signalPanel, { borderLeftColor: sellSignal.color }]}>
            <Text style={[styles.signalLabel, { color: sellSignal.color }]}>{sellSignal.label}</Text>
            <Text style={styles.signalAdvice}>{sellSignal.advice}</Text>
          </View>

          {/* Sell panel */}
          <View style={styles.sellPanel}>
            {/* Regional market selector */}
            <View style={regionStyles.row}>
              {MARKET_REGIONS.map(region => {
                const locked = day < region.unlockDay;
                const active = (selectedMarket ?? 'local') === region.id;
                return (
                  <TouchableOpacity
                    key={region.id}
                    style={[regionStyles.chip, active && regionStyles.chipActive, locked && regionStyles.chipLocked]}
                    onPress={() => !locked && setSelectedMarket(region.id as MarketId)}
                    disabled={locked}
                    activeOpacity={locked ? 1 : 0.75}
                  >
                    <Text style={regionStyles.chipIcon}>{region.icon}</Text>
                    <Text style={[regionStyles.chipName, active && regionStyles.chipNameActive, locked && regionStyles.chipNameLocked]}>
                      {region.name}
                    </Text>
                    {locked ? (
                      <Text style={regionStyles.chipLockLabel}>Unlocks day {region.unlockDay}</Text>
                    ) : (
                      <Text style={[regionStyles.chipMult, active && { color: '#ffd700' }]}>
                        ×{region.priceMultiplier.toFixed(2)}{region.transportCostPerUnit > 0 ? ` -$${region.transportCostPerUnit.toFixed(2)}/u` : ''}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.sellStock}>
              In stock:{' '}
              <Text style={styles.sellStockNum}>
                {Math.round(inStock).toLocaleString()} {selected.unit}
              </Text>
            </Text>
            {(() => {
              const pressureMod = computeSellPressureModifier(inStock);
              const activePressure = (sellPressures ?? []).find(sp => sp.cropId === selectedCrop);
              return (
                <>
                  {inStock > 500 && pressureMod < 1.0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.sellPressureWarn, { flex: 1 }]}>
                        ⚠️ Selling {Math.round(inStock).toLocaleString()} {selected.unit} will depress price by {Math.round((1 - pressureMod) * 100)}% for {sellPressureDuration(inStock)} days
                      </Text>
                      <HelpSheet
                        title="Sell Pressure"
                        body="Selling a large quantity of a crop at once drives the market price down temporarily. Spreading sales over several days or selling smaller amounts avoids the penalty. The pressure lifts after a few days."
                        buttonSize={12}
                      />
                    </View>
                  )}
                  {activePressure && (
                    <Text style={styles.sellPressureActive}>
                      📉 Price depressed {Math.round((1 - activePressure.modifier) * 100)}% · expires day {activePressure.expiresDay}
                    </Text>
                  )}
                </>
              );
            })()}
            {activeRegion.transportCostPerUnit > 0 && inStock > 0 && (
              <Text style={regionStyles.transportNote}>
                🚚 Transport: -${transportTotal.toLocaleString()} · Net: ${regionalRevenue.toLocaleString()}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.sellBtn, inStock <= 0 && styles.sellBtnDisabled]}
              onPress={() => { sellCrop(selectedCrop, inStock, selectedMarket ?? 'local'); playSound(regionalRevenue >= 5000 ? 'bigSale' : 'sell'); if (regionalRevenue >= 1000) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
              disabled={inStock <= 0}
            >
              <Text style={styles.sellBtnText}>
                {inStock > 0 ? `Sell all · $${regionalRevenue.toLocaleString()}` : 'No stock'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Price Alert */}
          {(() => {
            const existingAlert = (priceAlerts ?? []).find(a => a.cropId === selectedCrop);
            return (
              <View style={styles.alertPanel}>
                <Text style={styles.alertPanelTitle}>🎯 Price Alert</Text>
                {existingAlert ? (
                  <View style={styles.alertActiveRow}>
                    <Text style={styles.alertActiveText}>
                      {existingAlert.direction === 'below' ? 'Sell when ≤' : 'Sell when ≥'} ${existingAlert.targetPrice.toFixed(2)}
                    </Text>
                    <TouchableOpacity onPress={() => removePriceAlert(existingAlert.id)}>
                      <Text style={styles.alertRemoveBtn}>✕ Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.alertDirectionRow}>
                      {(['above', 'below'] as const).map(dir => (
                        <TouchableOpacity
                          key={dir}
                          style={[styles.alertDirBtn, alertDirection === dir && styles.alertDirBtnActive]}
                          onPress={() => setAlertDirection(dir)}
                        >
                          <Text style={[styles.alertDirBtnText, alertDirection === dir && styles.alertDirBtnTextActive]}>
                            {dir === 'above' ? '≥ Above' : '≤ Below'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.alertInputRow}>
                      <TextInput
                        style={styles.alertInput}
                        value={alertTargetPrice}
                        onChangeText={setAlertTargetPrice}
                        placeholder="Target $"
                        placeholderTextColor="#444"
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        style={styles.alertSetBtn}
                        onPress={() => {
                          const tp = parseFloat(alertTargetPrice);
                          if (!tp || tp <= 0) return;
                          addPriceAlert(selectedCrop, tp, alertDirection);
                          setAlertTargetPrice('');
                        }}
                      >
                        <Text style={styles.alertSetBtnText}>Set Alert</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            );
          })()}

          {/* ROI Ranking */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top profitability now</Text>
            <Text style={styles.sectionSub}>(estimated profit per ha/day)</Text>
            {roiRanking.map(({ crop, roi, price }, i) => (
              <TouchableOpacity key={crop.id} style={styles.roiRow} onPress={() => setSelectedCrop(crop.id)}>
                <Text style={styles.roiRank}>#{i + 1}</Text>
                <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[crop.tier], marginRight: 8 }]} />
                <Text style={styles.roiName}>{crop.name}</Text>
                <View style={styles.roiRight}>
                  <Text style={styles.roiValue}>${roi.toFixed(1)}/d</Text>
                  <Text style={styles.roiPrice}>${price.toFixed(2)}/{crop.unit}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Inventory Summary */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.sectionTitle}>Stored inventory</Text>
              {stockedCrops.length > 1 && (() => {
                const totalVal = stockedCrops.reduce((sum, { qty, price }) => sum + sellRevenue(qty, price), 0);
                return (
                  <TouchableOpacity
                    style={{ backgroundColor: '#1b4a1b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}
                    onPress={() => stockedCrops.forEach(({ crop, qty }) => sellCrop(crop.id, qty))}
                  >
                    <Text style={{ color: '#4caf50', fontSize: 11, fontWeight: 'bold' }}>
                      Sell All · ${Math.round(totalVal).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
            {/* Spoilage warning: crops sitting below 85% of base price */}
            {stockedCrops.filter(({ crop, price }) => price < crop.basePrice * 0.85).length > 0 && (
              <View style={styles.spoilageWarn}>
                <Text style={styles.spoilageWarnText}>
                  ⚠️ {stockedCrops.filter(({ crop, price }) => price < crop.basePrice * 0.85).map(x => x.crop.name).join(', ')} — prices down {'>'}15% from base. Consider selling now.
                </Text>
              </View>
            )}
            {stockedCrops.length === 0 ? (
              <Text style={styles.emptyText}>No harvests stored</Text>
            ) : (
              stockedCrops.map(({ crop, qty, price }) => {
                const val = sellRevenue(qty, price);
                const isSpoiling = price < crop.basePrice * 0.85;
                return (
                  <TouchableOpacity key={crop.id} style={[styles.invRow, isSpoiling && styles.invRowWarn]} onPress={() => setSelectedCrop(crop.id)}>
                    <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[crop.tier] }]} />
                    <Text style={styles.invName}>{crop.name}</Text>
                    <Text style={styles.invQty}>{qty.toLocaleString()} {crop.unit}</Text>
                    <TouchableOpacity style={styles.invSellBtn} onPress={() => sellCrop(crop.id, qty)}>
                      <Text style={styles.invSellText}>${Math.round(val).toLocaleString()}</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  ticker: { maxHeight: 44, marginBottom: 4 },
  tickerContent: { paddingHorizontal: 10, gap: 8, alignItems: 'center' },
  tickerItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  tickerBull: { backgroundColor: '#1b3a1b' },
  tickerBear: { backgroundColor: '#3a1b1b' },
  tickerText: { color: '#e8d5a3', fontSize: 11, maxWidth: 200 },
  tickerDays: { color: '#888', fontSize: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#e8d5a3' },
  body: { flex: 1, flexDirection: 'row' },

  leftCol: { width: '36%', borderRightWidth: 1, borderRightColor: '#222' },
  cropRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  cropRowSelected: { backgroundColor: '#0f3460' },
  tierDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6, flexShrink: 0 },
  cropRowInfo: { flex: 1 },
  cropRowName: { color: '#aaa', fontSize: 12 },
  cropRowNameSelected: { color: '#e8d5a3', fontWeight: 'bold' },
  cropRowPct: { fontSize: 10 },

  rightPanel: { flex: 1, padding: 10 },
  chartMeta: { marginBottom: 6 },
  chartCropName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 15 },
  chartPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  chartCurrentPrice: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  chartUnit: { color: '#666', fontSize: 12, marginRight: 4 },
  chartPct: { fontSize: 13, fontWeight: 'bold' },
  chartPlaceholder: { height: CHART_H, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a1628', borderRadius: 4 },
  chartEmpty: { color: '#555', fontSize: 12 },

  up: { color: '#81c784' },
  down: { color: '#ef9a9a' },

  statsBar: { flexDirection: 'row', backgroundColor: '#16213e', borderRadius: 8, marginTop: 6, padding: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { color: '#555', fontSize: 9, fontWeight: 'bold', marginBottom: 2 },
  statValue: { color: '#e8d5a3', fontSize: 12, fontWeight: 'bold' },
  statDivider: { width: 1, backgroundColor: '#2a2a4a', marginHorizontal: 4 },

  signalPanel: { marginTop: 8, backgroundColor: '#16213e', borderRadius: 8, padding: 10, borderLeftWidth: 3 },
  signalLabel: { fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
  signalAdvice: { color: '#888', fontSize: 11 },
  sellPanel: { marginTop: 8, backgroundColor: '#16213e', borderRadius: 10, padding: 10 },
  sellStock: { color: '#888', fontSize: 12, marginBottom: 6 },
  sellStockNum: { color: '#e8d5a3', fontWeight: 'bold' },
  sellBtn: { backgroundColor: '#2e7d32', borderRadius: 8, padding: 9, alignItems: 'center' },
  sellBtnDisabled: { backgroundColor: '#333' },
  sellBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  section: { backgroundColor: '#16213e', borderRadius: 10, marginTop: 8, padding: 12 },
  sectionTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  sectionSub: { color: '#555', fontSize: 10, marginBottom: 8 },
  emptyText: { color: '#555', fontSize: 12 },

  roiRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  roiRank: { color: '#555', fontSize: 12, width: 22 },
  roiName: { flex: 1, color: '#ccc', fontSize: 12 },
  roiRight: { alignItems: 'flex-end' },
  roiValue: { color: '#81c784', fontSize: 12, fontWeight: 'bold' },
  roiPrice: { color: '#666', fontSize: 10 },

  invRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  invRowWarn: { backgroundColor: '#2a1a0a', borderRadius: 6 },
  invName: { flex: 1, color: '#ccc', fontSize: 12 },
  invQty: { color: '#888', fontSize: 11, marginRight: 8 },
  invSellBtn: { backgroundColor: '#1b5e20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  invSellText: { color: '#81c784', fontSize: 11, fontWeight: 'bold' },
  spoilageWarn: { backgroundColor: '#2a1400', borderRadius: 6, padding: 8, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#ff7043' },
  spoilageWarnText: { color: '#ff8a65', fontSize: 11 },

  // Tab bar
  tabBar: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 6 },
  tabBtn: { flex: 1, backgroundColor: '#16213e', borderRadius: 8, padding: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#0f3460' },
  tabBtnText: { color: '#888', fontSize: 11, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#e8d5a3' },

  // Auto-sell
  autoSellScroll: { flex: 1, paddingHorizontal: 12 },
  autoSellDesc: { color: '#888', fontSize: 12, marginBottom: 12, marginTop: 4 },
  autoSellRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 10, padding: 10, marginBottom: 6 },
  autoSellLeft: { flex: 1 },
  autoSellName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  autoSellPrice: { color: '#888', fontSize: 11, marginTop: 1 },
  autoSellInput: { backgroundColor: '#0a1628', color: '#fff', fontSize: 12, borderRadius: 6, padding: 6, width: 72, marginHorizontal: 8, textAlign: 'center' },
  autoSellToggle: { backgroundColor: '#333', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  autoSellToggleOn: { backgroundColor: '#1b5e20' },
  autoSellToggleText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  // Stats
  statsScroll: { flex: 1, paddingHorizontal: 12 },
  statsCard: { backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginBottom: 8 },
  statsCardTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  statsLabel: { color: '#888', fontSize: 12 },
  statsValue: { color: '#ccc', fontSize: 12, fontWeight: 'bold' },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  catLabel: { color: '#888', fontSize: 12, width: 90 },
  catBarWrap: { flex: 1, height: 8, backgroundColor: '#0a1628', borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  catBar: { height: 8, borderRadius: 4 },
  catValue: { fontSize: 12, fontWeight: 'bold', width: 80, textAlign: 'right' },
  prestigeCard: { backgroundColor: '#1a1050', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#7c4dff', alignItems: 'center' },
  prestigeTitle: { color: '#b39ddb', fontWeight: 'bold', fontSize: 15 },
  prestigeSub: { color: '#7c4dff', fontSize: 12, marginTop: 2 },
  prestigeHint: { color: '#7c7c9a', fontSize: 11, marginTop: 6, textAlign: 'center' },
  sellPressureWarn: { color: '#ffb74d', fontSize: 11, marginBottom: 6, textAlign: 'center' },
  sellPressureActive: { color: '#ef9a9a', fontSize: 11, marginBottom: 6, textAlign: 'center' },
  futuresScroll: { flex: 1, paddingHorizontal: 12 },

  // Futures tab
  futuresSectionLabel: { color: '#888', fontSize: 12, fontWeight: 'bold', marginTop: 16, marginBottom: 6 },
  futuresCropScroll:   { marginBottom: 4 },
  futuresCropChip:     { backgroundColor: '#16213e', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  futuresCropChipActive: { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  futuresCropChipText: { color: '#888', fontSize: 11 },
  futuresCropChipTextActive: { color: '#e8d5a3', fontWeight: 'bold' },
  futuresCropMeta:     { color: '#888', fontSize: 11, marginBottom: 10 },

  futuresForm:         { backgroundColor: '#16213e', borderRadius: 12, padding: 12, marginBottom: 4 },
  futuresFormRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  futuresFormLabel:    { color: '#888', fontSize: 12, marginBottom: 6 },
  futuresQtyInput:     { backgroundColor: '#0a1628', color: '#fff', fontSize: 13, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 100, textAlign: 'right' },
  futuresTermRow:      { flexDirection: 'row', gap: 8, marginBottom: 10 },
  futuresTermBtn:      { flex: 1, backgroundColor: '#0a1628', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  futuresTermBtnActive: { backgroundColor: '#1565c0' },
  futuresTermBtnText:  { color: '#666', fontWeight: 'bold', fontSize: 13 },
  futuresTermBtnTextActive: { color: '#fff' },
  futuresPreview:      { backgroundColor: '#0a1628', borderRadius: 8, padding: 8, marginBottom: 10 },
  futuresPreviewText:  { color: '#81c784', fontSize: 11 },
  futuresOpenBtn:      { backgroundColor: '#1b5e20', borderRadius: 8, padding: 10, alignItems: 'center' },
  futuresOpenBtnDisabled: { backgroundColor: '#333' },
  futuresOpenBtnText:  { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  futuresFlash:        { color: '#81c784', fontSize: 12, textAlign: 'center', marginTop: 8 },

  futuresCard:         { backgroundColor: '#16213e', borderRadius: 12, padding: 12, marginBottom: 4 },
  futuresCardLast:    { backgroundColor: '#16213e', borderRadius: 12, padding: 12, marginBottom: 32 },
  futuresEmpty:        { color: '#555', fontSize: 12 },
  futuresPosRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  futuresPosLeft:      { flex: 1 },
  futuresPosRight:     { alignItems: 'flex-end', justifyContent: 'center' },
  futuresPosName:      { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  futuresPosDetail:    { color: '#888', fontSize: 11, marginTop: 2 },
  futuresPosStock:     { fontSize: 11, marginTop: 3 },
  futuresPosStockOk:   { color: '#66bb6a' },
  futuresPosStockShort:{ color: '#ffa726' },
  futuresPosDelivery:  { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
  futuresPosDay:       { color: '#555', fontSize: 10, marginTop: 2 },
  futuresSettledBadge: { color: '#66bb6a', fontSize: 12, fontWeight: 'bold' },
  alertPanel:           { backgroundColor: '#16213e', borderRadius: 10, padding: 10, marginTop: 8, gap: 6 },
  alertPanelTitle:      { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  alertActiveRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertActiveText:      { color: '#66bb6a', fontSize: 12 },
  alertRemoveBtn:       { color: '#ef5350', fontSize: 12, paddingHorizontal: 6 },
  alertDirectionRow:    { flexDirection: 'row', gap: 6 },
  alertDirBtn:          { flex: 1, backgroundColor: '#0d1117', borderRadius: 6, paddingVertical: 5, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  alertDirBtnActive:    { backgroundColor: '#0f3460', borderColor: '#e8d5a3' },
  alertDirBtnText:      { color: '#666', fontSize: 11, fontWeight: 'bold' },
  alertDirBtnTextActive:{ color: '#e8d5a3', fontSize: 11, fontWeight: 'bold' },
  alertInputRow:        { flexDirection: 'row', gap: 6, alignItems: 'center' },
  alertInput:           { flex: 1, backgroundColor: '#0d1117', borderRadius: 6, borderWidth: 1, borderColor: '#333', color: '#e8d5a3', fontSize: 12, paddingHorizontal: 8, paddingVertical: 5 },
  alertSetBtn:          { backgroundColor: '#0f3460', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  alertSetBtnText:      { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold' },
  alertSummaryBar:          { backgroundColor: '#16213e', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  alertSummaryTitle:        { color: '#e8d5a3', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  alertSummaryChip:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f3460', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  alertSummaryChipName:     { color: '#e8d5a3', fontSize: 10, fontWeight: 'bold' },
  alertSummaryChipPrice:    { color: '#66bb6a', fontSize: 10 },
  alertSummaryChipRemove:   { color: '#ef5350', fontSize: 11, paddingLeft: 2 },

  // Orders tab
  ordersSection:            { margin: 12, backgroundColor: '#16213e', borderRadius: 12, padding: 14 },
  ordersSubtitle:           { color: '#666', fontSize: 11, marginBottom: 10, marginTop: -6 },
  orderCropScroll:          { marginBottom: 10 },
  orderCropChip:            { backgroundColor: '#0d1b2e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, borderWidth: 1, borderColor: '#1e2a3a' },
  orderCropChipActive:      { backgroundColor: '#1565c0', borderColor: '#42a5f5' },
  orderCropChipText:        { color: '#888', fontSize: 12 },
  orderCropChipTextActive:  { color: '#fff', fontWeight: 'bold' },
  ordersFormRow:            { flexDirection: 'row', gap: 10, marginBottom: 10 },
  ordersFormHalf:           { flex: 1 },
  ordersFormLabel:          { color: '#888', fontSize: 10, marginBottom: 4 },
  ordersInput:              { backgroundColor: '#0d1b2e', borderRadius: 8, color: '#e8d5a3', paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, borderWidth: 1, borderColor: '#1e2a3a' },
  ordersTermRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  ordersTermBtn:            { backgroundColor: '#0d1b2e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#1e2a3a' },
  ordersTermBtnActive:      { backgroundColor: '#1565c0', borderColor: '#42a5f5' },
  ordersTermText:           { color: '#888', fontSize: 12, fontWeight: 'bold' },
  ordersTermTextActive:     { color: '#fff' },
  ordersTermHint:           { color: '#555', fontSize: 11, flex: 1, textAlign: 'right' },
  ordersPlaceBtn:           { backgroundColor: '#1565c0', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  ordersPlaceBtnDisabled:   { backgroundColor: '#333' },
  ordersPlaceBtnText:       { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  ordersCard:               { marginHorizontal: 12, backgroundColor: '#16213e', borderRadius: 12, padding: 12, marginBottom: 8 },
  ordersRow:                { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e2a3a' },
  ordersRowName:            { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  ordersRowDetail:          { color: '#888', fontSize: 11, marginTop: 1 },
  ordersRowExpiry:          { color: '#ffa726', fontSize: 10, marginTop: 2 },
  ordersCancelBtn:          { backgroundColor: '#b71c1c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  ordersCancelText:         { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  ordersBadgeGood:          { color: '#66bb6a', fontSize: 11, fontWeight: 'bold' },
  ordersBadgeWarn:          { color: '#ffa726', fontSize: 11 },
  ordersBadgeGray:          { color: '#555', fontSize: 11 },
});

const regionStyles = StyleSheet.create({
  row:             { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  chip:            { flex: 1, minWidth: 90, borderWidth: 1, borderColor: '#2a3a2a', backgroundColor: '#0f1e0f', borderRadius: 8, padding: 8, alignItems: 'center' },
  chipActive:      { borderColor: '#4caf50', backgroundColor: '#0f2a0f' },
  chipLocked:      { opacity: 0.4 },
  chipIcon:        { fontSize: 18, marginBottom: 2 },
  chipName:        { color: '#888', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  chipNameActive:  { color: '#e8d5a3' },
  chipNameLocked:  { color: '#555' },
  chipMult:        { color: '#888', fontSize: 10, textAlign: 'center', marginTop: 1 },
  chipLockLabel:   { color: '#555', fontSize: 9, textAlign: 'center', marginTop: 1 },
  transportNote:   { color: '#ef9a9a', fontSize: 10, marginBottom: 4 },
});
