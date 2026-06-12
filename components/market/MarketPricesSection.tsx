import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { playSound } from '../../engine/sounds';
import Svg, { Polyline, Line, Text as SvgText, Rect, Circle } from 'react-native-svg';
import { useGameStore, DeliveryCargo, COLD_CARGO_IDS, BULK_LIQUID_IDS } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES, CropTier } from '../../data/cropTypes';
import { MARKET_REGIONS, MarketId } from '../../data/marketRegions';
import { sellRevenue, computeSellPressureModifier, sellPressureDuration } from '../../engine/market';
import { getSeason } from '../../engine/climate';
import HelpSheet from '../../components/HelpSheet';
import DispatchModal from '../../components/DispatchModal';
import GuideButton from '../../components/GuideButton';
import { GUIDE_ENTRY_IDS } from '../../data/guideEntries';

const TIER_COLORS: Record<CropTier, string> = {
  D: '#9e9e9e', C: C.green, B: '#2196f3', A: '#9c27b0', S: '#ff9800',
};

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W * 0.62 - 24;
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
        <SvgText key={i} x={PAD.left - 4} y={toY(v) + 4} fontSize={9} fill={C.textFaint} textAnchor="end">
          ${v.toFixed(0)}
        </SvgText>
      ))}
      {[0, Math.floor((history.length - 1) / 2), history.length - 1].map(idx => (
        <SvgText key={idx} x={toX(idx)} y={CHART_H - 6} fontSize={9} fill={C.textFaint} textAnchor="middle">
          -{history.length - 1 - idx}d
        </SvgText>
      ))}
      <Polyline points={points} fill="none" stroke={up ? C.green : '#ef5350'} strokeWidth={2} />
      {history.length >= MA_WINDOW && (
        <Polyline points={maPointsStr} fill="none" stroke="#ffd54f" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.8} />
      )}
      <Circle cx={lastX} cy={lastY} r={4} fill={up ? C.green : '#ef5350'} stroke={C.white} strokeWidth={1} />
    </Svg>
  );
}

export default function MarketPricesSection() {
  const {
    prices,
    priceHistory,
    inventory,
    sellCrop,
    newsEvents,
    day,
    sellPressures,
    priceAlerts,
    addPriceAlert,
    removePriceAlert,
    selectedMarket,
    setSelectedMarket,
    hapticEnabled,
    inventoryReserves,
    setInventoryReserve,
    activeShocks,
    priceMomentum,
  } = useGameStore();

  const [selectedCrop, setSelectedCrop] = useState<string>(CROP_TYPES[0].id);
  const [dispatchVisible, setDispatchVisible] = useState(false);
  const [dispatchCargo, setDispatchCargo] = useState<DeliveryCargo[]>([]);
  const [dispatchMarket, setDispatchMarket] = useState<'local' | 'city' | 'export'>('local');
  const [contractorCropId, setContractorCropId] = useState<string | null>(null);
  const [contractorQty, setContractorQty] = useState(0);
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');

  const selected = CROP_TYPES.find(c => c.id === selectedCrop)!;
  const selectedPrice = prices.find(p => p.cropId === selectedCrop);
  const history = priceHistory[selectedCrop] ?? [];
  const inStock = inventory[selectedCrop] ?? 0;
  const current = selectedPrice?.price ?? selected.basePrice;

  const activeRegion = MARKET_REGIONS.find(r => r.id === (selectedMarket ?? 'local')) ?? MARKET_REGIONS[0];
  const regionalEffectivePrice = current * activeRegion.priceMultiplier;
  const transportTotal = Math.round(inStock * activeRegion.transportCostPerUnit);
  const regionalRevenue = Math.max(0, Math.round(sellRevenue(inStock, regionalEffectivePrice) - transportTotal));
  const pct = ((current - selected.basePrice) / selected.basePrice) * 100;
  const up = pct >= 0;

  const needsDispatch = (cropOrProductId: string, market: 'local' | 'city' | 'export'): boolean => {
    if (market === 'local') return false;
    return COLD_CARGO_IDS.has(cropOrProductId) || BULK_LIQUID_IDS.has(cropOrProductId);
  };

  const handleSell = (cropId: string, qty: number, market: 'local' | 'city' | 'export') => {
    if (needsDispatch(cropId, market)) {
      setDispatchCargo([{ itemId: cropId, quantity: qty, category: 'crop' }]);
      setDispatchMarket(market);
      setContractorCropId(cropId);
      setContractorQty(qty);
      setDispatchVisible(true);
    } else {
      sellCrop(cropId, qty, market);
      playSound('sell');
      if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const currentSeason = getSeason(day);
  const isPeakSeason = currentSeason === selected.peakSeason;
  const sellSignal: { label: string; color: string; advice: string } = (() => {
    if (isPeakSeason && current < selected.basePrice * 0.95)
      return { label: '🔴 Harvest glut', color: '#ef5350', advice: 'Peak season — prices are low. Hold if possible.' };
    if (!isPeakSeason && current > selected.basePrice * 1.05)
      return { label: '🟢 Off-season premium', color: C.green, advice: 'Good time to sell — above seasonal average.' };
    return { label: '🟡 Fair price', color: '#ffa726', advice: `Peak season: ${selected.peakSeason} (expect lower prices then).` };
  })();

  const histMin = history.length ? Math.min(...history) : current;
  const histMax = history.length ? Math.max(...history) : current;
  const histAvg = history.length ? history.reduce((a, b) => a + b, 0) / history.length : current;

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
    <>
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
            const hist = priceHistory[crop.id] ?? [];
            const recentTrend = hist.length >= 3
              ? hist[hist.length - 1] - hist[hist.length - 4 < 0 ? 0 : hist.length - 4]
              : 0;
            const trendIcon = recentTrend > 0.5 ? '↗' : recentTrend < -0.5 ? '↘' : '→';
            const trendColor = recentTrend > 0.5 ? C.green : recentTrend < -0.5 ? '#ef5350' : C.textMuted;
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
              <Text style={styles.chartCropName}>{selected.name}</Text>
              <GuideButton entryId={GUIDE_ENTRY_IDS.crop(selected.id)} compact />
            </View>
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
              <Text style={[styles.statValue, { color: C.textMuted }]}>${selected.basePrice.toFixed(2)}</Text>
            </View>
          </View>

          {/* Price Drivers */}
          {(() => {
            const drivers: { icon: string; text: string; color: string }[] = [];

            // Seasonal factor
            if (isPeakSeason) {
              drivers.push({ icon: '🌾', text: `Peak harvest season — supply high, prices soft`, color: '#ffa726' });
            } else {
              const offPct = Math.round(((current - selected.basePrice) / selected.basePrice) * 100);
              if (offPct > 5) {
                drivers.push({ icon: '📈', text: `Off-season: +${offPct}% above base price`, color: C.green });
              } else if (offPct < -5) {
                drivers.push({ icon: '📉', text: `Off-season: ${offPct}% below base price`, color: '#ef5350' });
              }
            }

            // Active shocks for this crop or global
            for (const shock of (activeShocks ?? []).filter(s => s.commodityId === selectedCrop || s.commodityId === null)) {
              const pct = Math.round(Math.abs(shock.magnitude) * 100);
              const dir = shock.magnitude > 0 ? '+' : '-';
              drivers.push({
                icon: '⚡',
                text: `Market shock ${dir}${pct}% · ${shock.remainingDays}d remaining`,
                color: shock.magnitude > 0 ? C.green : '#ef5350',
              });
            }

            // News events for this crop or global
            for (const ev of (newsEvents ?? []).filter(e => e.cropId === selectedCrop || e.cropId === null)) {
              const pct = Math.round(Math.abs(ev.modifier - 1) * 100);
              const up = ev.modifier > 1;
              const label = ev.description.length > 38 ? ev.description.slice(0, 38) + '…' : ev.description;
              drivers.push({
                icon: '📰',
                text: `${label} (${up ? '+' : '-'}${pct}% · ${ev.daysRemaining}d)`,
                color: up ? C.green : '#ef5350',
              });
            }

            // Active sell pressure this crop (player or rival)
            const allPressures = (sellPressures ?? []).filter(sp => sp.cropId === selectedCrop);
            for (const pressure of allPressures) {
              const pressPct = Math.round((1 - pressure.modifier) * 100);
              const daysLeft = Math.max(0, pressure.expiresDay - day);
              const isRival = pressure.source && pressure.source !== 'player';
              drivers.push({
                icon: isRival ? '🏭' : '📦',
                text: isRival
                  ? `${pressure.source} flooded the market -${pressPct}% · ${daysLeft}d remaining`
                  : `Your sell pressure -${pressPct}% · ${daysLeft}d remaining`,
                color: isRival ? '#ef9a9a' : '#ffb74d',
              });
            }

            // Momentum
            const mom = (priceMomentum ?? {})[selectedCrop] ?? 0;
            if (Math.abs(mom) > 0.01) {
              const mPct = Math.round(Math.abs(mom) * 100);
              drivers.push({
                icon: mom > 0 ? '↗' : '↘',
                text: `${mom > 0 ? 'Rising' : 'Falling'} momentum ${mPct}%/day`,
                color: mom > 0 ? C.green : '#ef9a9a',
              });
            }

            if (drivers.length === 0) {
              drivers.push({ icon: '⚖️', text: 'No major price factors active', color: '#555' });
            }

            return (
              <View style={styles.driversPanel}>
                <Text style={styles.driversPanelTitle}>💡 Why this price?</Text>
                {drivers.map((d, i) => (
                  <View key={i} style={styles.driverRow}>
                    <Text style={{ fontSize: 11 }}>{d.icon}</Text>
                    <Text style={[styles.driverText, { color: d.color }]}>{d.text}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

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
                        entryId="system_market_prices"
                      />
                      <GuideButton entryId="system_market_prices" compact />
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
              onPress={() => { handleSell(selectedCrop, inStock, selectedMarket ?? 'local'); }}
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
                const reserves = inventoryReserves ?? {};
                const sellable = stockedCrops.map(({ crop, qty, price }) => ({
                  crop, price,
                  sellQty: Math.max(0, qty - (reserves[crop.id] ?? 0)),
                })).filter(x => x.sellQty > 0);
                const totalVal = sellable.reduce((sum, { sellQty, price }) => sum + sellRevenue(sellQty, price), 0);
                const hasReserves = stockedCrops.some(({ crop }) => (reserves[crop.id] ?? 0) > 0);
                if (totalVal <= 0) return null;
                return (
                  <TouchableOpacity
                    style={{ backgroundColor: C.bgCard, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}
                    onPress={() => sellable.forEach(({ crop, sellQty }) => sellCrop(crop.id, sellQty))}
                  >
                    <Text style={{ color: C.green, fontSize: 11, fontWeight: 'bold' }}>
                      {hasReserves ? 'Sell Above Reserve' : 'Sell All'} · ${Math.round(totalVal).toLocaleString()}
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
                const reserves = inventoryReserves ?? {};
                const reserve = reserves[crop.id] ?? 0;
                const sellQty = Math.max(0, qty - reserve);
                const val = sellRevenue(sellQty, price);
                const isSpoiling = price < crop.basePrice * 0.85;
                const RESERVE_STEPS = [0, 100, 500, 1000, 5000, 10000];
                const nextReserve = RESERVE_STEPS[RESERVE_STEPS.indexOf(reserve) + 1] ?? 0;
                return (
                  <TouchableOpacity key={crop.id} style={[styles.invRow, isSpoiling && styles.invRowWarn]} onPress={() => setSelectedCrop(crop.id)}>
                    <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[crop.tier] }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invName}>{crop.name}</Text>
                      {reserve > 0 && (
                        <Text style={{ color: '#f59e0b', fontSize: 9 }}>keep {reserve.toLocaleString()} {crop.unit}</Text>
                      )}
                    </View>
                    <Text style={styles.invQty}>{qty.toLocaleString()} {crop.unit}</Text>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                      onPress={() => setInventoryReserve(crop.id, nextReserve)}
                    >
                      <Text style={{ color: reserve > 0 ? '#f59e0b' : C.textFaint, fontSize: 9 }}>🔒{reserve > 0 ? reserve.toLocaleString() : '+'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.invSellBtn, sellQty <= 0 && { opacity: 0.4 }]}
                      disabled={sellQty <= 0}
                      onPress={() => sellCrop(crop.id, sellQty)}
                    >
                      <Text style={styles.invSellText}>${Math.round(val).toLocaleString()}</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>

      <DispatchModal
        visible={dispatchVisible}
        cargo={dispatchCargo}
        marketId={dispatchMarket}
        onClose={() => setDispatchVisible(false)}
        onContractor={() => {
          if (contractorCropId) {
            const effectiveQty = Math.floor(contractorQty * 0.95 * 0.88);
            sellCrop(contractorCropId, effectiveQty, dispatchMarket);
          }
          setDispatchVisible(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  ticker: { maxHeight: 44, marginBottom: S.xs },
  tickerContent: { paddingHorizontal: 10, gap: 8, alignItems: 'center' },
  tickerItem: { flexDirection: 'row', alignItems: 'center', borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  tickerBull: { backgroundColor: C.bgElevated },
  tickerBear: { backgroundColor: '#3a1b1b' },
  tickerText: { color: C.text, fontSize: 11, maxWidth: 200 },
  tickerDays: { color: C.textMuted, fontSize: F.size.xs },
  body: { flex: 1, flexDirection: 'row' },

  leftCol: { width: '36%', borderRightWidth: 1, borderRightColor: '#222' },
  cropRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.divider },
  cropRowSelected: { backgroundColor: '#0f3460' },
  tierDot: { width: 8, height: 8, borderRadius: R.xs, marginRight: 6, flexShrink: 0 },
  cropRowInfo: { flex: 1 },
  cropRowName: { color: '#aaa', fontSize: F.size.sm },
  cropRowNameSelected: { color: C.text, fontWeight: 'bold' },
  cropRowPct: { fontSize: F.size.xs },

  rightPanel: { flex: 1, padding: 10 },
  chartMeta: { marginBottom: 6 },
  chartCropName: { color: C.text, fontWeight: 'bold', fontSize: 15 },
  chartPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  chartCurrentPrice: { color: C.white, fontSize: F.size.title, fontWeight: 'bold' },
  chartUnit: { color: C.textFaint, fontSize: F.size.sm, marginRight: S.xs },
  chartPct: { fontSize: F.size.md, fontWeight: 'bold' },
  chartPlaceholder: { height: CHART_H, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a1628', borderRadius: R.xs },
  chartEmpty: { color: '#555', fontSize: F.size.sm },

  up: { color: C.green },
  down: { color: '#ef9a9a' },

  statsBar: { flexDirection: 'row', backgroundColor: C.bgCard, borderRadius: R.md, marginTop: 6, padding: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { color: '#555', fontSize: 9, fontWeight: 'bold', marginBottom: 2 },
  statValue: { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  statDivider: { width: 1, backgroundColor: '#2a2a4a', marginHorizontal: S.xs },

  signalPanel: { marginTop: S.sm, backgroundColor: C.bgCard, borderRadius: R.md, padding: 10, borderLeftWidth: 3 },
  signalLabel: { fontWeight: 'bold', fontSize: F.size.sm, marginBottom: 2 },
  signalAdvice: { color: C.textMuted, fontSize: 11 },
  sellPanel: { marginTop: S.sm, backgroundColor: C.bgCard, borderRadius: 10, padding: 10 },
  sellStock: { color: C.textMuted, fontSize: F.size.sm, marginBottom: 6 },
  sellStockNum: { color: C.text, fontWeight: 'bold' },
  sellBtn: { backgroundColor: C.greenDark, borderRadius: R.md, padding: 9, alignItems: 'center' },
  sellBtnDisabled: { backgroundColor: '#333' },
  sellBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },

  section: { backgroundColor: C.bgCard, borderRadius: 10, marginTop: S.sm, padding: S.md },
  sectionTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.md, marginBottom: 2 },
  sectionSub: { color: '#555', fontSize: F.size.xs, marginBottom: S.sm },
  emptyText: { color: '#555', fontSize: F.size.sm },

  roiRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.divider },
  roiRank: { color: '#555', fontSize: F.size.sm, width: 22 },
  roiName: { flex: 1, color: '#ccc', fontSize: F.size.sm },
  roiRight: { alignItems: 'flex-end' },
  roiValue: { color: C.green, fontSize: F.size.sm, fontWeight: 'bold' },
  roiPrice: { color: C.textFaint, fontSize: F.size.xs },

  invRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.divider },
  invRowWarn: { backgroundColor: '#2a1a0a', borderRadius: R.sm },
  invName: { flex: 1, color: '#ccc', fontSize: F.size.sm },
  invQty: { color: C.textMuted, fontSize: 11, marginRight: S.sm },
  invSellBtn: { backgroundColor: C.bgElevated, borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: S.xs },
  invSellText: { color: C.green, fontSize: 11, fontWeight: 'bold' },
  spoilageWarn: { backgroundColor: '#2a1400', borderRadius: R.sm, padding: S.sm, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#ff7043' },
  spoilageWarnText: { color: '#ff8a65', fontSize: 11 },

  driversPanel: { marginTop: S.sm, backgroundColor: C.bgCard, borderRadius: R.md, padding: 10 },
  driversPanelTitle: { color: '#555', fontSize: 9, fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  driverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 3 },
  driverText: { flex: 1, fontSize: 11 },

  sellPressureWarn: { color: '#ffb74d', fontSize: 11, marginBottom: 6, textAlign: 'center' },
  sellPressureActive: { color: '#ef9a9a', fontSize: 11, marginBottom: 6, textAlign: 'center' },

  alertPanel: { backgroundColor: C.bgCard, borderRadius: 10, padding: 10, marginTop: S.sm, gap: 6 },
  alertPanelTitle: { color: C.text, fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  alertActiveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertActiveText: { color: C.green, fontSize: F.size.sm },
  alertRemoveBtn: { color: '#ef5350', fontSize: F.size.sm, paddingHorizontal: 6 },
  alertDirectionRow: { flexDirection: 'row', gap: 6 },
  alertDirBtn: { flex: 1, backgroundColor: '#0d1117', borderRadius: R.sm, paddingVertical: 5, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  alertDirBtnActive: { backgroundColor: '#0f3460', borderColor: C.text },
  alertDirBtnText: { color: C.textFaint, fontSize: 11, fontWeight: 'bold' },
  alertDirBtnTextActive: { color: C.text, fontSize: 11, fontWeight: 'bold' },
  alertInputRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  alertInput: { flex: 1, backgroundColor: '#0d1117', borderRadius: R.sm, borderWidth: 1, borderColor: '#333', color: C.text, fontSize: F.size.sm, paddingHorizontal: S.sm, paddingVertical: 5 },
  alertSetBtn: { backgroundColor: '#0f3460', borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6 },
  alertSetBtnText: { color: C.text, fontSize: 11, fontWeight: 'bold' },
  alertSummaryBar: { backgroundColor: C.bgCard, paddingHorizontal: S.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.divider },
  alertSummaryTitle: { color: C.text, fontSize: F.size.xs, fontWeight: 'bold', marginBottom: S.xs },
  alertSummaryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f3460', borderRadius: R.lg, paddingHorizontal: S.sm, paddingVertical: S.xs, gap: 4 },
  alertSummaryChipName: { color: C.text, fontSize: F.size.xs, fontWeight: 'bold' },
  alertSummaryChipPrice: { color: C.green, fontSize: F.size.xs },
  alertSummaryChipRemove: { color: '#ef5350', fontSize: 11, paddingLeft: 2 },
});

const regionStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  chip: { flex: 1, minWidth: 90, borderWidth: 1, borderColor: '#2a3a2a', backgroundColor: C.bgDeep, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  chipActive: { borderColor: C.green, backgroundColor: C.bgDeep },
  chipLocked: { opacity: 0.4 },
  chipIcon: { fontSize: F.size.xxl, marginBottom: 2 },
  chipName: { color: C.textMuted, fontSize: F.size.xs, fontWeight: 'bold', textAlign: 'center' },
  chipNameActive: { color: C.text },
  chipNameLocked: { color: '#555' },
  chipMult: { color: C.textMuted, fontSize: F.size.xs, textAlign: 'center', marginTop: 1 },
  chipLockLabel: { color: '#555', fontSize: 9, textAlign: 'center', marginTop: 1 },
  transportNote: { color: '#ef9a9a', fontSize: F.size.xs, marginBottom: S.xs },
});
