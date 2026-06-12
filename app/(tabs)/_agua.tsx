import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore, Well } from '../../store/useGameStore';
import { PUMP_SPECS, wellFlowRate, calcParcelWaterDemand } from '../../engine/water';
import { CROP_TYPES } from '../../data/cropTypes';
import { C, S, F, R } from '../../constants/theme';
import GuideButton from '../../components/GuideButton';

function AquiferBar({ level }: { level: number }) {
  const color = level >= 50 ? C.green : level >= 20 ? C.amber : C.red;
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: C.textMuted, fontSize: F.size.xs, fontWeight: '600', letterSpacing: 0.5 }}>AQUIFER LEVEL</Text>
        <Text style={{ color, fontWeight: 'bold', fontSize: F.size.sm }}>{level.toFixed(1)}%</Text>
      </View>
      <View style={{ height: 14, backgroundColor: C.bgDeep, borderRadius: 7, overflow: 'hidden' }}>
        <View style={{ width: `${level}%` as any, height: '100%', backgroundColor: color, borderRadius: 7 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
        <Text style={{ color: '#444', fontSize: 9 }}>Empty</Text>
        <Text style={{ color: C.amber, fontSize: 9 }}>20% Critical</Text>
        <Text style={{ color: '#444', fontSize: 9 }}>Full</Text>
      </View>
    </View>
  );
}

function WellCard({ well, parcels }: { well: Well; parcels: ReturnType<typeof useGameStore.getState>['parcels'] }) {
  const { installPump, money, aquiferLevel } = useGameStore();
  const aqLevel = aquiferLevel ?? 75;

  const statusLabels: Record<string, string> = {
    surveying:    '🔍 Surveying...',
    survey_ready: '📋 Survey Ready',
    drilling:     '⛏️ Drilling...',
    failed:       '❌ Failed',
    active:       well.pumpTier ? '✅ Active' : '⚙️ Needs Pump',
    dry:          '🏜️ Dry — aquifer too depleted',
  };

  const connectedParcels = (parcels ?? []).filter(p =>
    well.connectedParcelIds.includes(p.id) || p.id === well.parcelId
  );

  const effectiveFlow = wellFlowRate(well, aqLevel);
  const maxFlow = well.pumpTier ? PUMP_SPECS[well.pumpTier].maxFlowRate : 0;
  const efficiency = maxFlow > 0 ? Math.round((effectiveFlow / maxFlow) * 100) : 100;
  const effColor = efficiency >= 90 ? C.green : efficiency >= 60 ? C.amber : '#ef5350';

  const parcelDemand = calcParcelWaterDemand(
    connectedParcels.filter(p => p.plantedCrop).map(p => p.id),
    parcels ?? [],
    CROP_TYPES,
  );
  const supplyMeetsdemand = effectiveFlow >= parcelDemand;

  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={st.cardTitle}>
          🌊 Well — {(parcels ?? []).find(p => p.id === well.parcelId)?.name ?? `Parcel ${well.parcelId}`}
        </Text>
        <Text style={[st.statusBadge, {
          color: well.status === 'active' && well.pumpTier ? C.green
            : well.status === 'active' ? C.amber
            : well.status === 'failed' || well.status === 'dry' ? '#ef5350'
            : C.textMuted
        }]}>
          {statusLabels[well.status] ?? well.status}
        </Text>
      </View>

      {well.status === 'active' && !well.pumpTier && (
        <View style={{ gap: 6 }}>
          <Text style={{ color: C.textMuted, fontSize: F.size.xs, marginBottom: 2 }}>Install a pump to start drawing water:</Text>
          {([1, 2, 3] as const).map(tier => (
            <TouchableOpacity
              key={tier}
              style={[st.btn, money < PUMP_SPECS[tier].cost && { opacity: 0.5 }]}
              onPress={() => installPump(well.id, tier)}
              disabled={money < PUMP_SPECS[tier].cost}
            >
              <Text style={st.btnText}>{PUMP_SPECS[tier].label} · ${PUMP_SPECS[tier].cost.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {well.status === 'active' && well.pumpTier && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={st.statBox}>
              <Text style={st.statLabel}>PUMP</Text>
              <Text style={st.statVal}>{PUMP_SPECS[well.pumpTier].label.split(' (')[0]}</Text>
            </View>
            <View style={st.statBox}>
              <Text style={st.statLabel}>FLOW</Text>
              <Text style={[st.statVal, { color: effColor }]}>{effectiveFlow.toLocaleString()} L/hr</Text>
            </View>
            <View style={st.statBox}>
              <Text style={st.statLabel}>EFFICIENCY</Text>
              <Text style={[st.statVal, { color: effColor }]}>{efficiency}%</Text>
            </View>
          </View>

          {efficiency < 100 && (
            <Text style={{ color: C.amber, fontSize: F.size.xs, marginBottom: 6 }}>
              ⚠️ Flow reduced — aquifer below 50%. Efficiency improves as aquifer recharges.
            </Text>
          )}

          {connectedParcels.length > 0 && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ color: C.textMuted, fontSize: F.size.xs, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 }}>
                CONNECTED PARCELS ({connectedParcels.length})
              </Text>
              {connectedParcels.map(p => {
                const crop = p.plantedCrop ? CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId) : null;
                const demand = calcParcelWaterDemand([p.id], parcels ?? [], CROP_TYPES);
                return (
                  <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderTopWidth: 1, borderTopColor: C.divider }}>
                    <Text style={{ color: C.text, fontSize: F.size.xs }}>{p.name} · {p.hectares}ha</Text>
                    <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>
                      {crop ? `${crop.name} · ${demand.toLocaleString()} L/hr` : 'No crop'}
                    </Text>
                  </View>
                );
              })}
              {parcelDemand > 0 && (
                <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
                  <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>Demand vs. supply</Text>
                  <Text style={{ color: supplyMeetsdemand ? C.green : '#ef5350', fontSize: F.size.xs, fontWeight: 'bold' }}>
                    {parcelDemand.toLocaleString()} L/hr needed · {supplyMeetsdemand ? '✅ Covered' : '❌ Shortfall'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {well.status === 'surveying' && well.surveyCompletesDay != null && (
        <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>
          Survey completes day {well.surveyCompletesDay}
        </Text>
      )}
      {well.status === 'drilling' && well.drillingCompletesDay != null && (
        <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>
          Drilling completes day {well.drillingCompletesDay}
        </Text>
      )}
      {well.status === 'survey_ready' && (
        <Text style={{ color: C.amber, fontSize: F.size.xs }}>
          Survey complete — choose a drill spot from the Fields tab.
        </Text>
      )}
    </View>
  );
}

export default function AguaScreen() {
  const {
    aquiferLevel, wells, gridWaterActive, gridWaterDailyRate,
    parcels, setGridWater, forecast,
  } = useGameStore();

  const aqLevel = aquiferLevel ?? 75;
  const ownedParcels = (parcels ?? []).filter(p => p.owned);
  const irrigatedHa = ownedParcels.filter(p => p.irrigated).reduce((s, p) => s + p.hectares, 0);
  const gridCostToday = gridWaterActive ? irrigatedHa * (gridWaterDailyRate ?? 12) : 0;

  const activeWells = (wells ?? []).filter(w => w.status === 'active' && w.pumpTier);
  const totalSupplyLhr = activeWells.reduce((s, w) => s + wellFlowRate(w, aqLevel), 0);

  const allConnectedParcelIds = activeWells.flatMap(w => [...w.connectedParcelIds, w.parcelId]);
  const uniqueIds = [...new Set(allConnectedParcelIds)];
  const totalDemandLhr = calcParcelWaterDemand(
    uniqueIds.filter(id => (parcels ?? []).find(p => p.id === id)?.plantedCrop != null),
    parcels ?? [],
    CROP_TYPES,
  );

  const dailyDraw = totalDemandLhr / 100_000;
  const avgRecharge = (forecast ?? []).slice(0, 7).reduce((sum, f) => {
    if (f.event === 'rain') return sum + 1.5 / 7;
    if (f.event === 'heavy_rain') return sum + 3.5 / 7;
    if (f.event === 'drought') return sum - 0.5 / 7;
    return sum;
  }, 0.05);
  const netDailyDelta = avgRecharge - dailyDraw;
  const netIsPositive = netDailyDelta >= 0;

  const daysUntilCritical = !netIsPositive && aqLevel > 20
    ? Math.round((aqLevel - 20) / Math.abs(netDailyDelta))
    : null;
  const daysUntilEmpty = !netIsPositive && aqLevel > 0
    ? Math.round(aqLevel / Math.abs(netDailyDelta))
    : null;

  const systemStatus: 'ok' | 'warn' | 'critical' =
    aqLevel < 20 ? 'critical' : aqLevel < 40 || (daysUntilCritical != null && daysUntilCritical < 30) ? 'warn' : 'ok';
  const statusColor = systemStatus === 'ok' ? C.green : systemStatus === 'warn' ? C.amber : '#ef5350';
  const statusText = systemStatus === 'ok' ? '✅ Healthy' : systemStatus === 'warn' ? '⚠️ Monitor' : '🚨 Critical';

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.sm }}>
          <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Water</Text>
          <GuideButton entryId="system_water_irrigation" compact />
        </View>
      </View>

      <View style={{ padding: S.md }}>

        {/* System Overview */}
        <View style={[st.card, { borderLeftWidth: 3, borderLeftColor: statusColor }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={st.cardTitle}>💧 Water System</Text>
            <Text style={{ color: statusColor, fontWeight: 'bold', fontSize: F.size.sm }}>{statusText}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={st.statBox}>
              <Text style={st.statLabel}>SUPPLY</Text>
              <Text style={[st.statVal, { color: C.blue }]}>{totalSupplyLhr.toLocaleString()} L/hr</Text>
            </View>
            <View style={st.statBox}>
              <Text style={st.statLabel}>DEMAND</Text>
              <Text style={[st.statVal, { color: totalDemandLhr > totalSupplyLhr ? '#ef5350' : C.text }]}>
                {totalDemandLhr.toLocaleString()} L/hr
              </Text>
            </View>
            <View style={st.statBox}>
              <Text style={st.statLabel}>DAILY ΔAQUIFER</Text>
              <Text style={[st.statVal, { color: netIsPositive ? C.green : '#ef5350' }]}>
                {netIsPositive ? '+' : ''}{netDailyDelta.toFixed(2)}%
              </Text>
            </View>
          </View>

          <AquiferBar level={aqLevel} />

          {!netIsPositive && (daysUntilCritical != null || daysUntilEmpty != null) && (
            <View style={{ marginTop: 8, backgroundColor: '#1a0a0a', borderRadius: R.sm, padding: S.sm }}>
              {daysUntilCritical != null && (
                <Text style={{ color: C.amber, fontSize: F.size.xs }}>
                  ⚠️ Aquifer critical in ~{daysUntilCritical}d — enable grid water or reduce irrigation
                </Text>
              )}
              {daysUntilEmpty != null && (
                <Text style={{ color: '#ef5350', fontSize: F.size.xs, marginTop: 2 }}>
                  🏜️ Aquifer empty in ~{daysUntilEmpty}d without rain
                </Text>
              )}
            </View>
          )}
          {netIsPositive && aqLevel < 100 && (
            <Text style={{ color: '#4fc3f7', fontSize: F.size.xs, marginTop: 6 }}>
              📈 Recharging +{netDailyDelta.toFixed(2)}%/day from rainfall forecast
            </Text>
          )}
          {aqLevel < 20 && (
            <Text style={{ color: '#ef5350', fontSize: F.size.xs, marginTop: 6 }}>
              🚨 Critically low — wells will stop pumping below 0%. Enable grid water now.
            </Text>
          )}
        </View>

        {/* Grid Water */}
        <View style={st.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={st.cardTitle}>🔌 Grid Water</Text>
            <Text style={{ color: gridWaterActive ? C.green : C.textFaint, fontSize: F.size.xs, fontWeight: '600' }}>
              {gridWaterActive ? 'ACTIVE' : 'OFF'}
            </Text>
          </View>
          <Text style={{ color: C.textMuted, fontSize: F.size.xs, marginBottom: 6 }}>
            Municipal supply bypasses aquifer. Reliable but costs ${gridWaterDailyRate ?? 12}/ha/day.
          </Text>
          {irrigatedHa > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>
                {irrigatedHa} ha irrigated × ${gridWaterDailyRate ?? 12}/ha
              </Text>
              <Text style={{ color: gridWaterActive ? '#ef5350' : C.textFaint, fontSize: F.size.xs, fontWeight: 'bold' }}>
                ${gridCostToday.toFixed(0)}/day
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[st.btn, { backgroundColor: gridWaterActive ? '#c62828' : C.green }]}
            onPress={() => setGridWater(!gridWaterActive)}
          >
            <Text style={st.btnText}>{gridWaterActive ? '⛔ Disable Grid Water' : '💧 Enable Grid Water'}</Text>
          </TouchableOpacity>
        </View>

        {/* Wells */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm }}>
          <Text style={{ color: C.text, fontWeight: 'bold', fontSize: F.size.lg }}>
            Wells ({(wells ?? []).length})
          </Text>
          {activeWells.length > 0 && (
            <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>
              {activeWells.length} active · {totalSupplyLhr.toLocaleString()} L/hr total
            </Text>
          )}
        </View>

        {(wells ?? []).length === 0 ? (
          <View style={[st.card, { gap: 4 }]}>
            <Text style={{ color: C.text, fontWeight: 'bold', marginBottom: 4 }}>No wells drilled yet</Text>
            <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>
              1. Hire a Hydrogeologist (Workers tab){'\n'}
              2. Assign them to a parcel in the Fields tab → Soil → Survey{'\n'}
              3. Choose a drill spot from the survey results{'\n'}
              4. Install a pump after drilling completes
            </Text>
          </View>
        ) : (
          (wells ?? []).map(w => <WellCard key={w.id} well={w} parcels={parcels ?? []} />)
        )}

      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  card:      { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.sm },
  cardTitle: { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
  btn:       { backgroundColor: C.green, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  btnText:   { color: C.white, fontWeight: 'bold', fontSize: F.size.sm },
  statBox:   { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, alignItems: 'center' },
  statLabel: { color: C.textFaint, fontSize: 9, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  statVal:   { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  statusBadge: { fontSize: F.size.xs, fontWeight: '600' },
});
