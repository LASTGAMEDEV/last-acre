import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { getScoreLabel, getYieldTrend } from '../../engine/precision';

export default function PrecisionTab() {
  const state = useGameStore();
  const [showYieldMap, setShowYieldMap] = useState(false);
  const unlocked = (state.legacyReputation ?? 0) >= 65;

  const ownedParcels = state.parcels.filter(p => p.owned);

  if (!unlocked) {
    return (
      <View style={styles.center}>
        <Text style={styles.lockedTitle}>🔒 Precision Agriculture</Text>
        <Text style={styles.lockedText}>Unlock at reputation 65</Text>
        <Text style={styles.lockedSub}>Current: {Math.round(state.legacyReputation ?? 0)}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: S.md, gap: S.lg }}>
      {/* Top card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Precision Agriculture</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Soil Lab</Text>
          <Text style={styles.value}>{state.soilLabBuilt ? '✅ Built' : '❌ Not built'}</Text>
        </View>
        {!state.soilLabBuilt && (
          <Text style={styles.hint}>Build a Soil Lab (€45,000) for faster, cheaper analyses.</Text>
        )}
        <TouchableOpacity style={styles.smallButton} onPress={() => setShowYieldMap(!showYieldMap)}>
          <Text style={styles.smallButtonText}>{showYieldMap ? '📋 List View' : '📊 Yield Map'}</Text>
        </TouchableOpacity>
      </View>

      {/* Parcel list */}
      {ownedParcels.map(parcel => {
        const analysis = parcel.soilAnalysis;
        const pending = state.pendingAnalyses.find((pa: any) => pa.parcelId === parcel.id);
        const trend = getYieldTrend(parcel.yieldHistory ?? []);
        const trendEmoji = trend === 'rising' ? '↑' : trend === 'declining' ? '↓' : trend === 'underperforming' ? '⚠️' : '→';
        const trendColor = trend === 'rising' ? C.green : trend === 'declining' || trend === 'underperforming' ? '#ef5350' : '#aaa';

        return (
          <View key={parcel.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>{parcel.name}</Text>
              <Text style={styles.label}>{parcel.hectares} ha</Text>
            </View>

            {/* Soil score */}
            {analysis ? (
              <View style={styles.row}>
                <Text style={styles.label}>Soil Score</Text>
                <Text style={[styles.value, analysis.score >= 80 ? styles.good : analysis.score >= 50 ? styles.warning : styles.danger]}>
                  {analysis.score} {getScoreLabel(analysis.score).emoji}
                </Text>
              </View>
            ) : (
              <Text style={styles.label}>Not analyzed</Text>
            )}

            {/* Yield trend */}
            {(parcel.yieldHistory ?? []).length >= 2 && (
              <View style={styles.row}>
                <Text style={styles.label}>Yield Trend</Text>
                <Text style={[styles.value, { color: trendColor }]}>{trendEmoji} {trend}</Text>
              </View>
            )}

            {/* Weed early warning */}
            {parcel.weedDetectedDay && !parcel.hasWeeds && (
              <View style={[styles.row, { backgroundColor: '#fff3e0', borderRadius: R.sm, padding: S.sm }]}>
                <Text style={styles.warning}>⚠️ Weeds detected early — spray now for 40% cost</Text>
              </View>
            )}

            {/* Pending */}
            {pending && (
              <Text style={styles.hint}>🧪 Analysis arriving in {pending.arrivesDay - state.day} day(s)</Text>
            )}

            {/* Actions */}
            <View style={styles.buttonRow}>
              {!pending && (
                <TouchableOpacity style={styles.smallButton} onPress={() => state.orderSoilAnalysis(parcel.id)}>
                  <Text style={styles.smallButtonText}>🧪 Order Analysis</Text>
                </TouchableOpacity>
              )}
              {analysis && (
                <TouchableOpacity style={styles.smallButton} onPress={() => state.applyPrecisionInputs(parcel.id)}>
                  <Text style={styles.smallButtonText}>🎯 Precision Apply</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Analysis report */}
            {analysis && (
              <View style={{ marginTop: S.sm, gap: 2 }}>
                <Text style={styles.label}>N: {analysis.deficitN > 2 ? `↓ ${Math.round(analysis.deficitN)}` : '✅ OK'}</Text>
                <Text style={styles.label}>P: {analysis.deficitP > 2 ? `↓ ${Math.round(analysis.deficitP)}` : '✅ OK'}</Text>
                <Text style={styles.label}>K: {analysis.deficitK > 2 ? `↓ ${Math.round(analysis.deficitK)}` : '✅ OK'}</Text>
                <Text style={styles.label}>pH: {analysis.deficitPh > 0.2 ? `↓ ${analysis.deficitPh.toFixed(1)}` : '✅ OK'}</Text>
                <Text style={[styles.hint, { marginTop: S.sm }]}>{analysis.recommendation}</Text>
              </View>
            )}

            {/* Yield sparkline */}
            {showYieldMap && (parcel.yieldHistory ?? []).length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: S.sm, height: 40 }}>
                {(parcel.yieldHistory ?? []).slice(-4).map((h: any, i: number) => {
                  const max = Math.max(...(parcel.yieldHistory ?? []).slice(-4).map((hh: any) => hh.kgPerHa));
                  const hPct = max > 0 ? (h.kgPerHa / max) * 100 : 0;
                  return (
                    <View key={i} style={{ flex: 1, backgroundColor: C.green, height: `${Math.max(10, hPct)}%`, borderRadius: 2 }} />
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: S.xl },
  lockedTitle: { color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.bold },
  lockedText: { color: C.textMuted, fontSize: F.size.lg, marginTop: S.sm },
  lockedSub: { color: C.textFaint, fontSize: F.size.md, marginTop: S.xs },
  card: { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.lg, gap: S.sm },
  cardTitle: { color: C.text, fontSize: F.size.lg, fontWeight: F.weight.bold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: C.textMuted, fontSize: F.size.md },
  value: { color: C.text, fontSize: F.size.md, fontWeight: F.weight.medium },
  good: { color: C.green },
  warning: { color: '#ff9800' },
  danger: { color: '#ef5350' },
  hint: { color: C.textFaint, fontSize: F.size.sm, marginTop: S.xs },
  buttonRow: { flexDirection: 'row', gap: S.md, marginTop: S.sm },
  smallButton: { flex: 1, backgroundColor: C.green, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  smallButtonText: { color: C.white, fontWeight: F.weight.bold, fontSize: F.size.sm },
});
