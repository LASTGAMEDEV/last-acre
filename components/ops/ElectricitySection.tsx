import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import {
  GRID_TIER_CONFIG, GENERATOR_CONFIG,
  SOLAR_COST_PER_PANEL, WIND_COST_PER_TURBINE,
  BIOGAS_BUILD_COST, BIOMASS_BUILD_COST, HEAT_PIPE_BUILD_COST,
  BATTERY_COST_PER_BANK, BATTERY_KWH_PER_BANK,
} from '../../data/electricityTypes';
import {
  calcSolarOutput, calcWindOutput, calcBiogasOutput,
  calcBiomassOutput, calcGeneratorOutput, calcTotalDemand,
  nextGridTier,
} from '../../engine/electricity';
import { getSeason } from '../../engine/climate';
import { C, S, F, R } from '../../constants/theme';

function ElectricitySection() {
  const { electricity, buildings, animals, workers, day, money,
    upgradeGridTier, buySolarPanels, buyWindTurbines,
    buildBiogasPlant, buildBiomassCHP, loadBiomassStraw,
    buildHeatPipeNetwork, buyBatteryBanks, buyGenerator,
    refuelGenerator, toggleGenerator, serviceEquipment,
  } = useGameStore();

  const el = electricity;
  const [solarQty, setSolarQty] = React.useState('10');
  const [windQty, setWindQty] = React.useState('1');
  const [batteryQty, setBatteryQty] = React.useState('1');

  const season = getSeason(day);
  const todayWeather = useGameStore(s => s.todayWeather);
  const weatherEvent = (todayWeather?.event ?? 'sunny') as any;

  const solarKw   = calcSolarOutput(el.solarPanelCount, el.solarPanelHealth, weatherEvent, season);
  const windKw    = calcWindOutput(el.windTurbineCount, el.windTurbineHealth, weatherEvent);
  const biogasKw  = calcBiogasOutput(animals.length, el.biogasPlantBuilt);
  const biomassKw = calcBiomassOutput(el.biomassCHPBuilt, el.biomassFuelDaysRemaining);
  const genKw     = calcGeneratorOutput(el.generatorModel, el.generatorActive);
  const totalGen  = solarKw + windKw + biogasKw + biomassKw + genKw;
  const totalDemand = calcTotalDemand(buildings);

  const hasElecCert = (workers ?? []).some((w: any) =>
    w.role === 'farm_mechanic' && w.certifications?.some((c: any) => c.id === 'fm_electrical' && c.passed)
  );
  const nextTier = nextGridTier(el.gridTier);
  const billDaysLeft = Math.max(0, el.billDueDay - day);

  const pct = totalDemand > 0 ? Math.min(100, (totalGen / totalDemand) * 100) : 100;
  const genBarColor = pct >= 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>⚡ Overview</Text>

      {el.outageActive && (
        <View style={{ backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <Text style={{ color: '#dc2626', fontWeight: 'bold' }}>
            ⚠️ Grid outage active{el.outageEndDay ? ` — restores day ${el.outageEndDay}` : ''}
          </Text>
        </View>
      )}

      <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10, marginBottom: 8 }}>
        <Text style={{ fontWeight: '600', marginBottom: 4 }}>
          Generation: {totalGen.toFixed(1)} kW / Demand: {totalDemand.toFixed(1)} kW
        </Text>
        <View style={{ height: 12, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.min(100, pct)}%` as any, backgroundColor: genBarColor, borderRadius: 6 }} />
        </View>
        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          {pct >= 100 ? '✅ Self-sufficient' : `Grid import: ${(totalDemand - totalGen).toFixed(1)} kW`}
        </Text>
      </View>

      <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10, marginBottom: 12 }}>
        <Text style={{ fontWeight: '600' }}>Grid: {GRID_TIER_CONFIG[el.gridTier].label} ({GRID_TIER_CONFIG[el.gridTier].maxImportKw} kW max)</Text>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>Rate: ${el.gridRateBase.toFixed(3)}/kWh</Text>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Month bill estimate: ${Math.round(el.currentMonthBillEstimate).toLocaleString()} — due in {billDaysLeft} day{billDaysLeft !== 1 ? 's' : ''}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>Last month: ${el.lastMonthBill.toLocaleString()}</Text>
        {el.batteryBankCount > 0 && (
          <Text style={{ color: '#6b7280', fontSize: 13 }}>
            Battery: {el.batteryChargeKwh.toFixed(1)} / {(el.batteryBankCount * BATTERY_KWH_PER_BANK).toFixed(0)} kWh ({el.batteryHealthPercent.toFixed(0)}% health)
          </Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>🔆 Generation Sources</Text>

      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>☀️ Solar Panels — {el.solarPanelCount} panels ({solarKw.toFixed(1)} kW today)</Text>
        {el.solarPanelCount > 0 && (
          <Text style={elStyles.cardSub}>Health: {el.solarPanelHealth.toFixed(1)}%{el.damagedSources.includes('solar') ? '  ⚠️ DAMAGED' : ''}</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <TextInput style={elStyles.input} value={solarQty} onChangeText={setSolarQty} keyboardType="number-pad" />
          <TouchableOpacity
            style={[elStyles.btn, money < (parseInt(solarQty) || 0) * SOLAR_COST_PER_PANEL && elStyles.btnDisabled]}
            onPress={() => buySolarPanels(parseInt(solarQty) || 0)}
          >
            <Text style={elStyles.btnText}>Buy ({(parseInt(solarQty) || 0)} × $300 = ${((parseInt(solarQty) || 0) * SOLAR_COST_PER_PANEL).toLocaleString()})</Text>
          </TouchableOpacity>
          {el.solarPanelCount > 0 && (
            <TouchableOpacity
              style={[elStyles.btn, (!hasElecCert || money < 200) && elStyles.btnDisabled]}
              onPress={() => serviceEquipment('solar')}
            >
              <Text style={elStyles.btnText}>Service ($200){!hasElecCert ? ' 🔒' : ''}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>🌬️ Wind Turbines — {el.windTurbineCount} turbines ({windKw.toFixed(1)} kW today)</Text>
        {el.windTurbineCount > 0 && (
          <Text style={elStyles.cardSub}>Health: {el.windTurbineHealth.toFixed(1)}%{el.damagedSources.includes('wind') ? '  ⚠️ DAMAGED' : ''}</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <TextInput style={elStyles.input} value={windQty} onChangeText={setWindQty} keyboardType="number-pad" />
          <TouchableOpacity
            style={[elStyles.btn, money < (parseInt(windQty) || 0) * WIND_COST_PER_TURBINE && elStyles.btnDisabled]}
            onPress={() => buyWindTurbines(parseInt(windQty) || 0)}
          >
            <Text style={elStyles.btnText}>Buy ({(parseInt(windQty) || 0)} × $2,000 = ${((parseInt(windQty) || 0) * WIND_COST_PER_TURBINE).toLocaleString()})</Text>
          </TouchableOpacity>
          {el.windTurbineCount > 0 && (
            <TouchableOpacity
              style={[elStyles.btn, (!hasElecCert || money < 300) && elStyles.btnDisabled]}
              onPress={() => serviceEquipment('wind')}
            >
              <Text style={elStyles.btnText}>Service ($300){!hasElecCert ? ' 🔒' : ''}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>🐄 Biogas Plant — {biogasKw.toFixed(1)} kW</Text>
        <Text style={elStyles.cardSub}>
          {el.biogasPlantBuilt
            ? `${animals.length} animals → ${biogasKw.toFixed(1)} kW${animals.length < 10 ? ' (need 10+ animals)' : ''}`
            : 'Not built — requires 10+ animals to be viable'}
        </Text>
        {!el.biogasPlantBuilt && (
          <TouchableOpacity
            style={[elStyles.btn, money < BIOGAS_BUILD_COST && elStyles.btnDisabled, { marginTop: 6 }]}
            onPress={buildBiogasPlant}
          >
            <Text style={elStyles.btnText}>Build ($8,000)</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>🌾 Biomass CHP — {biomassKw.toFixed(1)} kW</Text>
        <Text style={elStyles.cardSub}>
          {el.biomassCHPBuilt
            ? `Fuel: ${el.biomassFuelDaysRemaining} days remaining`
            : 'Not built — burns straw for 15 kW constant output'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {!el.biomassCHPBuilt && (
            <TouchableOpacity
              style={[elStyles.btn, money < BIOMASS_BUILD_COST && elStyles.btnDisabled]}
              onPress={buildBiomassCHP}
            >
              <Text style={elStyles.btnText}>Build ($12,000)</Text>
            </TouchableOpacity>
          )}
          {el.biomassCHPBuilt && (
            <TouchableOpacity style={elStyles.btn} onPress={loadBiomassStraw}>
              <Text style={elStyles.btnText}>Load Straw (90 days)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>🔋 Battery Banks — {el.batteryBankCount} × 50 kWh</Text>
        <Text style={elStyles.cardSub}>
          {el.batteryBankCount > 0
            ? `${el.batteryChargeKwh.toFixed(0)} / ${(el.batteryBankCount * 50).toFixed(0)} kWh charged (${el.batteryHealthPercent.toFixed(0)}% health)`
            : 'Stores surplus generation for later use'}
        </Text>
        <Text style={elStyles.cardSub}>Requires Electrical Engineer cert{hasElecCert ? ' ✅' : ' 🔒'}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <TextInput style={elStyles.input} value={batteryQty} onChangeText={setBatteryQty} keyboardType="number-pad" />
          <TouchableOpacity
            style={[elStyles.btn, (!hasElecCert || money < (parseInt(batteryQty) || 0) * BATTERY_COST_PER_BANK) && elStyles.btnDisabled]}
            onPress={() => buyBatteryBanks(parseInt(batteryQty) || 0)}
          >
            <Text style={elStyles.btnText}>Buy (${((parseInt(batteryQty) || 0) * BATTERY_COST_PER_BANK).toLocaleString()})</Text>
          </TouchableOpacity>
          {el.batteryBankCount > 0 && (
            <TouchableOpacity
              style={[elStyles.btn, (!hasElecCert || money < 500) && elStyles.btnDisabled]}
              onPress={() => serviceEquipment('battery')}
            >
              <Text style={elStyles.btnText}>Service ($500){!hasElecCert ? ' 🔒' : ''}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>⛽ Diesel Generator — {genKw.toFixed(0)} kW</Text>
        <Text style={elStyles.cardSub}>
          {el.generatorModel
            ? `${GENERATOR_CONFIG[el.generatorModel].label} · ${el.generatorFuelLitres.toFixed(0)}L fuel · ${el.generatorActive ? '🟢 Running' : '⚫ Off'}`
            : 'Not purchased — emergency backup power'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {!el.generatorModel && (['25kw', '50kw', '100kw'] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[elStyles.btn, money < GENERATOR_CONFIG[m].purchaseCost && elStyles.btnDisabled]}
              onPress={() => buyGenerator(m)}
            >
              <Text style={elStyles.btnText}>{GENERATOR_CONFIG[m].label} (${GENERATOR_CONFIG[m].purchaseCost.toLocaleString()})</Text>
            </TouchableOpacity>
          ))}
          {el.generatorModel && (
            <>
              <TouchableOpacity style={elStyles.btn} onPress={() => refuelGenerator(100)}>
                <Text style={elStyles.btnText}>Refuel +100L</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[elStyles.btn, el.generatorFuelLitres === 0 && elStyles.btnDisabled]}
                onPress={toggleGenerator}
              >
                <Text style={elStyles.btnText}>{el.generatorActive ? 'Stop' : 'Start'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginBottom: 8, marginTop: 4 }]}>🔌 Grid & Billing</Text>

      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>Grid Connection: {GRID_TIER_CONFIG[el.gridTier].label}</Text>
        <Text style={elStyles.cardSub}>Max import: {GRID_TIER_CONFIG[el.gridTier].maxImportKw} kW · Rate: ${el.gridRateBase.toFixed(3)}/kWh</Text>
        {nextTier && (
          <TouchableOpacity
            style={[elStyles.btn, money < GRID_TIER_CONFIG[nextTier].upgradeCost && elStyles.btnDisabled, { marginTop: 6 }]}
            onPress={upgradeGridTier}
          >
            <Text style={elStyles.btnText}>
              Upgrade to {GRID_TIER_CONFIG[nextTier].label} (${GRID_TIER_CONFIG[nextTier].upgradeCost.toLocaleString()})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>Monthly Bill</Text>
        <Text style={elStyles.cardSub}>This month: {el.currentMonthKwhImported.toFixed(0)} kWh imported · ~${Math.round(el.currentMonthBillEstimate).toLocaleString()}</Text>
        <Text style={elStyles.cardSub}>Bill due in {billDaysLeft} day{billDaysLeft !== 1 ? 's' : ''}</Text>
        <Text style={elStyles.cardSub}>Last month: ${el.lastMonthBill.toLocaleString()}</Text>
        {el.billHistory.length > 1 && (
          <Text style={elStyles.cardSub}>
            History: {el.billHistory.slice(-6).map(b => `$${b}`).join(' · ')}
          </Text>
        )}
      </View>

      {(el.biogasPlantBuilt || el.biomassCHPBuilt) && (
        <View style={elStyles.card}>
          <Text style={elStyles.cardTitle}>🌡️ Heat Recovery Network</Text>
          <Text style={elStyles.cardSub}>
            {el.heatPipeNetworkBuilt
              ? '✅ Active — biogas/CHP heat piped to processing buildings'
              : 'Pipes biogas/CHP heat to dairy, brewery, smokehouse — reduces fuel costs'}
          </Text>
          {!el.heatPipeNetworkBuilt && (
            <TouchableOpacity
              style={[elStyles.btn, money < HEAT_PIPE_BUILD_COST && elStyles.btnDisabled, { marginTop: 6 }]}
              onPress={buildHeatPipeNetwork}
            >
              <Text style={elStyles.btnText}>Build Heat Pipe Network ($5,000)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: C.text, fontSize: F.size.md, fontWeight: 'bold', marginBottom: S.sm },
});

const elStyles = StyleSheet.create({
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: { fontWeight: '600', fontSize: 14, color: '#111827' },
  cardSub:   { fontSize: 12, color: '#6b7280', marginTop: 2 },
  btn: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 48,
    backgroundColor: '#fff',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default ElectricitySection;
