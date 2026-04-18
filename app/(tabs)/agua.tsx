import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore, Well } from '../../store/useGameStore';
import { PUMP_SPECS, wellFlowRate } from '../../engine/water';
import { C, S, F, R } from '../../constants/theme';

function AquiferBar({ level }: { level: number }) {
  const color = level >= 50 ? '#4caf50' : level >= 20 ? '#ff9800' : '#f44336';
  return (
    <View style={{ marginVertical: S.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: C.text, fontWeight: 'bold' }}>Aquifer Level</Text>
        <Text style={{ color, fontWeight: 'bold' }}>{level.toFixed(1)}%</Text>
      </View>
      <View style={{ height: 16, backgroundColor: C.bgDeep, borderRadius: R.md, overflow: 'hidden' }}>
        <View style={{ width: `${level}%` as any, height: '100%', backgroundColor: color, borderRadius: R.md }} />
      </View>
      {level < 20 && (
        <Text style={{ color: '#f44336', fontSize: F.size.sm, marginTop: 4 }}>
          ⚠️ Critically low — enable grid water to protect irrigation
        </Text>
      )}
    </View>
  );
}

function WellCard({ well }: { well: Well }) {
  const { installPump, money, aquiferLevel } = useGameStore();
  const statusLabels: Record<string, string> = {
    surveying: '🔍 Surveying...',
    survey_ready: '📋 Survey Ready',
    drilling: '⛏️ Drilling...',
    failed: '❌ Failed',
    active: well.pumpTier ? '✅ Active' : '⚙️ Needs Pump',
    dry: '🏜️ Dry',
  };
  return (
    <View style={[st.card, { marginBottom: S.sm }]}>
      <Text style={{ color: C.text, fontWeight: 'bold', marginBottom: 4 }}>
        Well — Parcel {well.parcelId}
      </Text>
      <Text style={{ color: C.faint, fontSize: F.size.md, marginBottom: 4 }}>
        {statusLabels[well.status] ?? well.status}
      </Text>
      {well.status === 'active' && !well.pumpTier && (
        <View style={{ gap: 6 }}>
          <Text style={{ color: C.text, fontSize: F.size.md, fontWeight: '600' }}>Install Pump:</Text>
          {([1, 2, 3] as const).map(tier => (
            <TouchableOpacity
              key={tier}
              style={[st.btn, { opacity: money >= PUMP_SPECS[tier].cost ? 1 : 0.5 }]}
              onPress={() => installPump(well.id, tier)}
              disabled={money < PUMP_SPECS[tier].cost}
            >
              <Text style={st.btnText}>{PUMP_SPECS[tier].label} — ${PUMP_SPECS[tier].cost.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {well.status === 'active' && well.pumpTier && (
        <Text style={{ color: C.faint, fontSize: F.size.sm }}>
          Pump: {PUMP_SPECS[well.pumpTier].label} · {wellFlowRate(well, aquiferLevel ?? 75).toFixed(0)} L/hr · Connected: {well.connectedParcelIds.length} parcels
        </Text>
      )}
    </View>
  );
}

export default function AguaScreen() {
  const {
    aquiferLevel, wells, gridWaterActive, gridWaterDailyRate,
    parcels, setGridWater,
  } = useGameStore();

  const irrigatedHa = (parcels ?? []).filter(p => p.owned && p.irrigated).reduce((s, p) => s + p.hectares, 0);
  const gridCostToday = gridWaterActive ? irrigatedHa * (gridWaterDailyRate ?? 12) : 0;

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ padding: S.md, paddingTop: S.lg }}>
        <Text style={{ color: C.text, fontWeight: 'bold', fontSize: F.size.xl, marginBottom: S.sm }}>💧 Water</Text>

        {/* Aquifer */}
        <View style={[st.card, { marginBottom: S.md }]}>
          <AquiferBar level={aquiferLevel ?? 75} />
        </View>

        {/* Grid water toggle */}
        <View style={[st.card, { marginBottom: S.md }]}>
          <Text style={{ color: C.text, fontWeight: 'bold', marginBottom: 4 }}>Grid Water</Text>
          <Text style={{ color: C.faint, fontSize: F.size.sm, marginBottom: S.sm }}>
            Fallback supply — bypasses aquifer. Cost: ${gridWaterDailyRate ?? 12}/ha/day
            {irrigatedHa > 0 && ` · ${irrigatedHa} ha irrigated = $${gridCostToday.toFixed(0)}/day`}
          </Text>
          <TouchableOpacity
            style={[st.btn, { backgroundColor: gridWaterActive ? C.red : C.green }]}
            onPress={() => setGridWater(!gridWaterActive)}
          >
            <Text style={st.btnText}>{gridWaterActive ? 'Disable Grid Water' : 'Enable Grid Water'}</Text>
          </TouchableOpacity>
        </View>

        {/* Wells */}
        <Text style={{ color: C.text, fontWeight: 'bold', fontSize: F.size.lg, marginBottom: S.sm }}>
          Wells ({(wells ?? []).length})
        </Text>
        {(wells ?? []).length === 0 && (
          <Text style={{ color: C.faint, fontSize: F.size.md }}>
            No wells yet. Hire a Hydrogeologist and assign them to a parcel in the Fields tab to begin a survey.
          </Text>
        )}
        {(wells ?? []).map(w => <WellCard key={w.id} well={w} />)}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.sm },
  btn:  { backgroundColor: C.green, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  btnText: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
});
