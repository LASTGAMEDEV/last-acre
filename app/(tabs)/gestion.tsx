import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import OficinaScreen from './oficina';
import CalendarioScreen from './calendario';
import Encyclopedia from '../../components/Encyclopedia';
import { useGameStore, HenilBatch, ProductionBuildingState, OwnedAttachment, IncubationBatch } from '../../store/useGameStore';
import { getSeason } from '../../engine/climate';
import { SEASON_THEME, C, S, F, R } from '../../constants/theme';
import SubTabBar from '../../components/SubTabBar';
import { CROP_TYPES } from '../../data/cropTypes';
import { ANIMAL_TYPES } from '../../data/animalTypes';
import { BUILDING_TYPES, PRODUCTION_EQUIPMENT } from '../../data/buildingTypes';

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardSection() {
  const {
    money, savings, day, loans, contracts, seasonGoals, seasonHarvestCount,
    seasonStartRevenue, totalRevenue, parcels, animals, npcFarms, salesLog,
    personalRecords, inventory, prices,
  } = useGameStore();
  const season = getSeason(day);
  const theme = SEASON_THEME[season];

  const ownedParcels = parcels.filter(p => p.owned);
  const cropsReady = ownedParcels.filter(p => p.plantedCrop).length; // simplified

  // Net worth
  const inventoryValue = CROP_TYPES.reduce((sum, crop) => {
    const qty = inventory[crop.id] ?? 0;
    const price = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
    return sum + qty * price;
  }, 0);
  const animalValue = animals.reduce((sum, a) => {
    const type = ANIMAL_TYPES.find(t => t.id === a.typeId);
    return sum + (type?.buyCost ?? 0) * 0.6; // resale ~60%
  }, 0);
  const netWorth = money + savings.balance + inventoryValue + animalValue;
  const urgentLoans = loans.filter(l => !l.paid && !l.defaulted && l.payoffDay - day <= 7 && l.payoffDay >= day);
  const urgentContracts = contracts.filter(c => !c.completed && !c.failed && c.deadlineDay - day <= 7 && c.deadlineDay >= day);
  const rev7 = salesLog.filter(s => s.day >= day - 7).reduce((a, s) => a + s.amount, 0);
  const rev30 = salesLog.filter(s => s.day >= day - 30).reduce((a, s) => a + s.amount, 0);
  const topRival = [...(npcFarms ?? [])].sort((a, b) => b.wealth - a.wealth)[0];
  const seasonEarned = Math.max(0, (totalRevenue ?? 0) - (seasonStartRevenue ?? 0));
  const activeGoals = seasonGoals.filter(g => !g.claimed);

  function Card({ title, value, color, sub }: { title: string; value: string; color?: string; sub?: string }) {
    return (
      <View style={dash.card}>
        <Text style={dash.cardLabel}>{title}</Text>
        <Text style={[dash.cardValue, color ? { color } : {}]}>{value}</Text>
        {sub ? <Text style={dash.cardSub}>{sub}</Text> : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
      {/* Warnings row */}
      {(urgentLoans.length > 0 || urgentContracts.length > 0) && (
        <View style={[dash.warnBanner]}>
          {urgentLoans.map(l => (
            <Text key={l.id} style={dash.warnText}>⚠️ Loan ${ Math.round(l.totalOwed).toLocaleString()} due in {l.payoffDay - day}d</Text>
          ))}
          {urgentContracts.map(c => (
            <Text key={c.id} style={dash.warnText}>⚠️ Contract deadline in {c.deadlineDay - day}d</Text>
          ))}
        </View>
      )}

      {/* Finances row */}
      <View style={dash.row}>
        <Card title="💵 CASH" value={`$${Math.round(money).toLocaleString()}`} color="#4caf50" />
        <Card title="🏦 SAVINGS" value={`$${Math.round(savings.balance).toLocaleString()}`} color="#64b5f6" />
      </View>

      {/* Net worth */}
      <View style={dash.netWorthCard}>
        <Text style={dash.netWorthLabel}>💎 NET WORTH</Text>
        <Text style={dash.netWorthValue}>${Math.round(netWorth).toLocaleString()}</Text>
        <View style={dash.netWorthBreakdown}>
          <Text style={dash.netWorthSub}>Cash ${Math.round(money).toLocaleString()}</Text>
          <Text style={dash.netWorthDot}>·</Text>
          <Text style={dash.netWorthSub}>Savings ${Math.round(savings.balance).toLocaleString()}</Text>
          <Text style={dash.netWorthDot}>·</Text>
          <Text style={dash.netWorthSub}>Stock ${Math.round(inventoryValue).toLocaleString()}</Text>
          {animalValue > 0 && <><Text style={dash.netWorthDot}>·</Text><Text style={dash.netWorthSub}>Animals ${Math.round(animalValue).toLocaleString()}</Text></>}
        </View>
      </View>

      {/* Revenue row */}
      <View style={dash.row}>
        <Card title="📈 7-DAY REV" value={`$${Math.round(rev7).toLocaleString()}`} />
        <Card title="📊 30-DAY REV" value={`$${Math.round(rev30).toLocaleString()}`} />
      </View>

      {/* Farm row */}
      <View style={dash.row}>
        <Card title="🌾 OWNED PLOTS" value={`${ownedParcels.length}`} sub={`${ownedParcels.reduce((s, p) => s + p.hectares, 0).toFixed(1)} ha`} />
        <Card title="🐄 ANIMALS" value={`${animals.length}`} />
      </View>

      {/* Season goals strip */}
      {activeGoals.length > 0 && (
        <View style={dash.goalsCard}>
          <Text style={dash.goalsTitle}>{season.charAt(0).toUpperCase() + season.slice(1)} Goals</Text>
          {activeGoals.map(goal => {
            let progress = 0;
            if (goal.type === 'earn') progress = Math.min(1, seasonEarned / goal.target);
            if (goal.type === 'harvest_count') progress = Math.min(1, (seasonHarvestCount ?? 0) / goal.target);
            if (goal.type === 'own_ha') progress = Math.min(1, ownedParcels.reduce((s, p) => s + p.hectares, 0) / goal.target);
            return (
              <View key={goal.id} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#ccc', fontSize: 11 }}>{goal.icon} {goal.label}</Text>
                  <Text style={{ color: C.text, fontSize: 11 }}>{Math.round(progress * 100)}%</Text>
                </View>
                <View style={{ height: 4, backgroundColor: '#0d1117', borderRadius: 2, marginTop: 3 }}>
                  <View style={{ height: 4, width: `${Math.round(progress * 100)}%` as any, backgroundColor: progress >= 1 ? '#4caf50' : theme.accent, borderRadius: 2 }} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Top rival */}
      {topRival && (
        <View style={dash.rivalCard}>
          <Text style={{ color: '#ef9a9a', fontSize: 12, fontWeight: 'bold' }}>🏭 Top Rival: {topRival.name}</Text>
          <Text style={{ color: C.textMuted, fontSize: 11 }}>Wealth: ${Math.round(topRival.wealth).toLocaleString()} · sells in {Math.max(0, topRival.nextSellDay - day)}d</Text>
        </View>
      )}

      {/* Records peek */}
      <View style={dash.goalsCard}>
        <Text style={dash.goalsTitle}>📊 Personal Bests</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textMuted, fontSize: 10 }}>Peak Cash</Text>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: 'bold' }}>${Math.round(personalRecords?.peakMoney ?? 0).toLocaleString()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textMuted, fontSize: 10 }}>Total Harvests</Text>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: 'bold' }}>{personalRecords?.totalHarvests ?? 0}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textMuted, fontSize: 10 }}>Days Survived</Text>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: 'bold' }}>{personalRecords?.longestDay ?? day}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const dash = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 8 },
  card:      { flex: 1, backgroundColor: C.bgCard, borderRadius: 10, padding: S.md },
  cardLabel: { color: C.textMuted, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: S.xs },
  cardValue: { color: C.text, fontSize: F.size.xxl, fontWeight: 'bold' },
  cardSub:   { color: '#555', fontSize: F.size.xs, marginTop: 2 },
  netWorthCard:      { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md, borderWidth: 1, borderColor: '#c8860a33' },
  netWorthLabel:     { color: C.textMuted, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  netWorthValue:     { color: '#c8860a', fontSize: 24, fontWeight: 'bold' },
  netWorthBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: S.xs, alignItems: 'center' },
  netWorthSub:       { color: '#555', fontSize: F.size.xs },
  netWorthDot:       { color: '#333', fontSize: F.size.xs },
  warnBanner:{ backgroundColor: '#3a1a00', borderRadius: R.md, padding: 10, gap: 4 },
  warnText:  { color: '#ffb74d', fontSize: 11, fontWeight: 'bold' },
  goalsCard: { backgroundColor: C.bgCard, borderRadius: 10, padding: S.md },
  goalsTitle:{ color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  rivalCard: { backgroundColor: '#1a1030', borderRadius: 10, padding: S.md, borderWidth: 1, borderColor: '#ef9a9a33' },
});

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsSection() {
  const {
    soundEnabled, hapticEnabled, musicEnabled,
    setSoundEnabled, setHapticEnabled, setMusicEnabled,
    personalRecords, day, totalRevenue, resetGame,
    prestige, performPrestige,
    farmName, setFarmName,
    priceAlerts, prices, addPriceAlert, removePriceAlert,
  } = useGameStore();

  const [nameInput, setNameInput] = useState(farmName ?? 'My Farm');
  const [alertCropId, setAlertCropId] = useState(CROP_TYPES[0]?.id ?? '');
  const [alertPrice, setAlertPrice] = useState('');

  async function exportSave() {
    try {
      const raw = await AsyncStorage.getItem('granja-tycoon-save-v4');
      if (!raw) {
        Alert.alert('Export Failed', 'No save data found.');
        return;
      }
      const path = (FileSystem.cacheDirectory ?? '') + 'granja-tycoon-save.json';
      await FileSystem.writeAsStringAsync(path, raw, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Export Failed', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export Granja Tycoon Save' });
    } catch (e) {
      Alert.alert('Export Failed', String(e));
    }
  }

  async function importSave() {
    Alert.alert(
      'Import Save',
      'This will overwrite your current save with the selected file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });
              if (result.canceled) return;
              const asset = result.assets?.[0];
              if (!asset?.uri) return;
              const raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
              let parsed: unknown;
              try {
                parsed = JSON.parse(raw);
              } catch {
                Alert.alert('Import Failed', 'File is not valid JSON.');
                return;
              }
              if (
                typeof parsed !== 'object' ||
                parsed === null ||
                !('state' in parsed) ||
                typeof (parsed as Record<string, unknown>).state !== 'object'
              ) {
                Alert.alert('Import Failed', 'File does not look like a valid Granja Tycoon save (missing "state" key).');
                return;
              }
              const state = (parsed as Record<string, Record<string, unknown>>).state;
              if (typeof state.day !== 'number' || typeof state.money !== 'number') {
                Alert.alert('Import Failed', 'Save file is missing required fields (day, money).');
                return;
              }
              await AsyncStorage.setItem('granja-tycoon-save-v4', raw);
              Alert.alert('Import Successful', 'Save imported. Please restart the app to load your save.');
            } catch (e) {
              Alert.alert('Import Failed', String(e));
            }
          },
        },
      ]
    );
  }

  function confirmReset() {
    Alert.alert(
      'Reset Game',
      'This will erase all progress and start a new game. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetGame },
      ]
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* Farm identity */}
      <View style={set.section}>
        <Text style={set.sectionTitle}>🏡 Farm Identity</Text>
        <View style={set.row}>
          <TextInput
            style={set.nameInput}
            value={nameInput}
            onChangeText={setNameInput}
            onEndEditing={() => setFarmName(nameInput)}
            placeholder="Farm name"
            placeholderTextColor="#444"
            maxLength={24}
          />
          <TouchableOpacity style={set.nameBtn} onPress={() => setFarmName(nameInput)}>
            <Text style={set.nameBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Price alerts */}
      <View style={set.section}>
        <Text style={set.sectionTitle}>🎯 Price Alerts (one-shot auto-sell)</Text>
        {(priceAlerts ?? []).length === 0 && <Text style={[set.rowSub, { marginBottom: 8 }]}>No alerts set. Add one below.</Text>}
        {(priceAlerts ?? []).map(a => {
          const crop = CROP_TYPES.find(c => c.id === a.cropId);
          const cur = prices.find(p => p.cropId === a.cropId)?.price ?? 0;
          return (
            <View key={a.id} style={set.alertRow}>
              <View style={{ flex: 1 }}>
                <Text style={set.rowLabel}>{crop?.name ?? a.cropId}</Text>
                <Text style={set.rowSub}>Sell all when ≥ ${a.targetPrice.toFixed(2)} · now ${cur.toFixed(2)}</Text>
              </View>
              <TouchableOpacity onPress={() => removePriceAlert(a.id)}>
                <Text style={{ color: '#ef5350', fontSize: 18, paddingHorizontal: 8 }}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={[set.row, { marginTop: 8, gap: 6 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            {CROP_TYPES.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[set.cropChip, alertCropId === c.id && set.cropChipActive]}
                onPress={() => setAlertCropId(c.id)}
              >
                <Text style={[set.cropChipText, alertCropId === c.id && { color: C.white }]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={[set.row, { marginTop: 6, gap: 6 }]}>
          <TextInput
            style={set.priceInput}
            value={alertPrice}
            onChangeText={setAlertPrice}
            placeholder="Target price"
            placeholderTextColor="#444"
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={set.nameBtn}
            onPress={() => {
              const tp = parseFloat(alertPrice);
              if (!tp || tp <= 0) return;
              addPriceAlert(alertCropId, tp, 'above');
              setAlertPrice('');
            }}
          >
            <Text style={set.nameBtnText}>Add Alert</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Save Data */}
      <View style={set.section}>
        <Text style={set.sectionTitle}>💾 Save Data</Text>
        <TouchableOpacity style={set.saveDataBtn} onPress={exportSave}>
          <Text style={set.saveDataBtnText}>📤 Export Save</Text>
        </TouchableOpacity>
        <Text style={[set.rowSub, { marginTop: 4, marginBottom: 8 }]}>Shares your save as a JSON file you can back up or transfer.</Text>
        <TouchableOpacity style={[set.saveDataBtn, { backgroundColor: '#3a1a00' }]} onPress={importSave}>
          <Text style={[set.saveDataBtnText, { color: '#ffb74d' }]}>📥 Import Save</Text>
        </TouchableOpacity>
        <Text style={[set.rowSub, { marginTop: 4 }]}>Load a previously exported save file. Overwrites current progress.</Text>
      </View>

      {/* Audio */}
      <View style={set.section}>
        <Text style={set.sectionTitle}>🔊 Audio</Text>
        <View style={set.row}>
          <View style={set.rowInfo}>
            <Text style={set.rowLabel}>Sound Effects</Text>
            <Text style={set.rowSub}>Harvest, sell, milestone sounds</Text>
          </View>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ false: '#333', true: '#4caf50' }}
            thumbColor=C.white
          />
        </View>
        <View style={[set.row, { marginTop: 8 }]}>
          <View style={set.rowInfo}>
            <Text style={set.rowLabel}>Haptic Feedback</Text>
            <Text style={set.rowSub}>Vibration on key actions</Text>
          </View>
          <Switch
            value={hapticEnabled}
            onValueChange={setHapticEnabled}
            trackColor={{ false: '#333', true: '#4caf50' }}
            thumbColor=C.white
          />
        </View>
        <View style={[set.row, { marginTop: 8 }]}>
          <View style={set.rowInfo}>
            <Text style={set.rowLabel}>Background Music</Text>
            <Text style={set.rowSub}>Ambient seasonal soundtrack</Text>
          </View>
          <Switch
            value={musicEnabled}
            onValueChange={setMusicEnabled}
            trackColor={{ false: '#333', true: '#4caf50' }}
            thumbColor=C.white
          />
        </View>
      </View>

      {/* Records */}
      <View style={set.section}>
        <Text style={set.sectionTitle}>📊 Personal Records</Text>
        {[
          { label: 'Peak Cash', value: `$${Math.round(personalRecords?.peakMoney ?? 0).toLocaleString()}` },
          { label: 'Total Harvests', value: `${personalRecords?.totalHarvests ?? 0}` },
          { label: 'Days Survived', value: `${personalRecords?.longestDay ?? day}` },
          { label: 'Best Season Revenue', value: `$${Math.round(personalRecords?.bestSeasonRevenue ?? 0).toLocaleString()}` },
          { label: 'Total Revenue (All Time)', value: `$${Math.round(totalRevenue ?? 0).toLocaleString()}` },
        ].map(r => (
          <View key={r.label} style={set.recordRow}>
            <Text style={set.recordLabel}>{r.label}</Text>
            <Text style={set.recordValue}>{r.value}</Text>
          </View>
        ))}
      </View>

      {/* Prestige */}
      <View style={[set.section, { borderColor: '#c8860a44', borderWidth: 1 }]}>
        <Text style={set.sectionTitle}>⭐ Prestige Legacy</Text>
        {prestige > 0 && (
          <View style={{ backgroundColor: '#1a1a00', borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <Text style={{ color: '#c8860a', fontSize: 13, fontWeight: 'bold' }}>Level {prestige} — +{prestige * 5}% all sell revenue</Text>
            <Text style={{ color: C.textFaint, fontSize: 11, marginTop: 2 }}>Applies to crops, animals, and processed goods</Text>
          </View>
        )}
        {day < 1080 ? (
          <View>
            <Text style={{ color: '#555', fontSize: 12, lineHeight: 18 }}>
              Prestige unlocks at Year 3 (Day 1080).{'\n'}
              You're on day {day} — {1080 - day} days to go.{'\n'}
              On prestige: keep your records, gain a permanent revenue bonus, and start fresh with ${((prestige + 1) * 2000 + 3500).toLocaleString()} seed money.
            </Text>
            <View style={{ backgroundColor: '#0d1117', borderRadius: 8, padding: 8, marginTop: 8 }}>
              <Text style={{ color: C.textMuted, fontSize: 11 }}>Next prestige reward: +5% sell revenue · +${((prestige + 1) * 2000).toLocaleString()} starting cash</Text>
            </View>
          </View>
        ) : (
          <View>
            <Text style={{ color: '#a5d6a7', fontSize: 12, marginBottom: 10 }}>
              🎉 Year 3 complete! You can prestige now.{'\n'}
              Next level: +5% revenue bonus · +${((prestige + 1) * 2000).toLocaleString()} starting cash.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#c8860a', borderRadius: 10, padding: 13, alignItems: 'center' }}
              onPress={() => Alert.alert(
                '⭐ Prestige?',
                `Reset your farm and gain:\n• Permanent +5% sell revenue (total: ${(prestige + 1) * 5}%)\n• $${((prestige + 1) * 2000).toLocaleString()} starting cash bonus\n• Your personal records carry over\n\nThis cannot be undone.`,
                [
                  { text: 'Not yet', style: 'cancel' },
                  { text: 'Prestige!', style: 'default', onPress: performPrestige },
                ]
              )}
            >
              <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 14 }}>⭐ Prestige to Level {prestige + 1}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* About */}
      <View style={set.section}>
        <Text style={set.sectionTitle}>ℹ️ About</Text>
        <Text style={{ color: C.textMuted, fontSize: 12, lineHeight: 18 }}>
          Last Acre v1.0{'\n'}
          A farming tycoon game built with passion.{'\n'}
          Day {day} · Total revenue: ${Math.round(totalRevenue ?? 0).toLocaleString()}
        </Text>
      </View>

      {/* Danger zone */}
      <View style={[set.section, { borderColor: '#ef535044', borderWidth: 1 }]}>
        <Text style={[set.sectionTitle, { color: '#ef5350' }]}>⚠️ Danger Zone</Text>
        <TouchableOpacity style={set.resetBtn} onPress={confirmReset}>
          <Text style={set.resetBtnText}>Reset Game</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const set = StyleSheet.create({
  section:       { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  sectionTitle:  { color: C.text, fontSize: F.size.md, fontWeight: 'bold', marginBottom: 10 },
  row:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowInfo:       { flex: 1 },
  rowLabel:      { color: '#ccc', fontSize: F.size.md },
  rowSub:        { color: '#555', fontSize: 11, marginTop: 1 },
  recordRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.divider },
  recordLabel:   { color: C.textMuted, fontSize: F.size.sm },
  recordValue:   { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  resetBtn:      { backgroundColor: '#3a0a0a', borderRadius: R.md, paddingVertical: S.md, alignItems: 'center', marginTop: S.xs },
  resetBtnText:  { color: '#ef5350', fontWeight: 'bold', fontSize: F.size.lg },
  nameInput:     { flex: 1, backgroundColor: '#0d1a2e', color: C.text, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm, fontSize: F.size.md, borderWidth: 1, borderColor: '#2a3a5e' },
  nameBtn:       { backgroundColor: '#0f3460', borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 9 },
  nameBtnText:   { color: '#64b5f6', fontWeight: 'bold', fontSize: F.size.sm },
  alertRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: '#1e2a3a' },
  priceInput:    { flex: 1, backgroundColor: '#0d1a2e', color: C.text, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm, fontSize: F.size.md, borderWidth: 1, borderColor: '#2a3a5e' },
  cropChip:      { backgroundColor: '#0d1a2e', borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 5, marginRight: 5, borderWidth: 1, borderColor: '#2a3a5e' },
  cropChipActive:{ backgroundColor: '#0f3460', borderColor: '#64b5f6' },
  cropChipText:  { color: C.textMuted, fontSize: 11 },
  saveDataBtn:     { backgroundColor: '#0f3460', borderRadius: R.md, paddingVertical: 10, alignItems: 'center', marginTop: S.xs },
  saveDataBtnText: { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
});

// ── Seed Market ───────────────────────────────────────────────────────────────
function SeedMarketSection() {
  const { seedVault, money, day, sellSeedBatch, buyMarketSeed } = useGameStore();

  const sellableEntries = [...(seedVault ?? [])].sort((a, b) => b.generation - a.generation);

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
      {/* Buy standard seeds */}
      <View style={smk.section}>
        <Text style={smk.title}>🛒 Buy Standard Seeds</Text>
        <Text style={smk.sub}>5 seeds per purchase · Gen 1 · 1.0 genes</Text>
        {CROP_TYPES.map(crop => {
          const cost = Math.round((crop.seedCost ?? 50) * 1.5 + 25) * 5;
          const canAfford = money >= cost;
          return (
            <View key={crop.id} style={smk.shopRow}>
              <Text style={smk.shopCrop}>{crop.name}</Text>
              <TouchableOpacity
                style={[smk.buyBtn, !canAfford && smk.buyBtnDisabled]}
                onPress={() => buyMarketSeed(crop.id)}
                disabled={!canAfford}
              >
                <Text style={smk.buyBtnText}>${cost.toLocaleString()}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Sell seed vault entries */}
      <View style={smk.section}>
        <Text style={smk.title}>💰 Sell Seed Vault</Text>
        {sellableEntries.length === 0 && <Text style={smk.empty}>No seeds in vault.</Text>}
        {sellableEntries.map(entry => {
          const crop = CROP_TYPES.find(c => c.id === entry.cropId);
          const avgGene = (entry.genes.yield + entry.genes.drought + entry.genes.growth + entry.genes.quality) / 4;
          const pricePerSeed = Math.round(30 * avgGene * Math.max(1, entry.generation));
          const revenue = pricePerSeed * entry.quantity;
          return (
            <View key={entry.id} style={smk.vaultRow}>
              <View style={{ flex: 1 }}>
                <Text style={smk.vaultName}>{crop?.name ?? entry.cropId} · Gen {entry.generation}</Text>
                <Text style={smk.vaultGenes}>
                  Y{entry.genes.yield.toFixed(2)} D{entry.genes.drought.toFixed(2)} G{entry.genes.growth.toFixed(2)} Q{entry.genes.quality.toFixed(2)}
                </Text>
                <Text style={smk.vaultQty}>{entry.quantity} seeds · day {entry.createdDay}</Text>
              </View>
              <TouchableOpacity style={smk.sellBtn} onPress={() => sellSeedBatch(entry.id)}>
                <Text style={smk.sellBtnText}>Sell</Text>
                <Text style={smk.sellBtnSub}>${revenue.toLocaleString()}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const smk = StyleSheet.create({
  section:       { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  title:         { color: C.text, fontSize: F.size.md, fontWeight: 'bold', marginBottom: 6 },
  sub:           { color: '#555', fontSize: 11, marginBottom: S.sm },
  empty:         { color: '#444', fontSize: F.size.sm, textAlign: 'center', paddingVertical: S.sm },
  shopRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.divider },
  shopCrop:      { color: '#ccc', fontSize: F.size.sm },
  buyBtn:        { backgroundColor: '#0f3460', borderRadius: 7, paddingHorizontal: S.md, paddingVertical: 6 },
  buyBtnDisabled:{ backgroundColor: C.bg, opacity: 0.5 },
  buyBtnText:    { color: '#64b5f6', fontSize: 11, fontWeight: 'bold' },
  vaultRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider, gap: 8 },
  vaultName:     { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  vaultGenes:    { color: C.textMuted, fontSize: F.size.xs, marginTop: 1 },
  vaultQty:      { color: '#555', fontSize: F.size.xs, marginTop: 1 },
  sellBtn:       { backgroundColor: '#1a3a1a', borderRadius: 7, paddingHorizontal: 10, paddingVertical: S.sm, alignItems: 'center' },
  sellBtnText:   { color: '#66bb6a', fontSize: 11, fontWeight: 'bold' },
  sellBtnSub:    { color: '#4caf50', fontSize: F.size.xs },
});

// ── Henil ─────────────────────────────────────────────────────────────────────
function HenilAndBuildingsSection() {
  const {
    henilQueue, addToHenil, day, inventory, buildings,
    slurryLevel, slurryCapacity, spreadSlurry, attachments,
    silageLevel, silageCapacity, fillSilagePit,
    biogasMode, setBiogasMode,
    incubationQueue, hatcheryCapacity, queueEggsForIncubation,
    animalInventory,
    milkGrades, animalWelfareScores, productionBuildings,
  } = useGameStore();

  const hasHenil = (buildings ?? []).includes('bld_henil');
  const grassInStock = inventory['grass'] ?? 0;
  const activeBatches = (henilQueue ?? []).filter((b: HenilBatch) => b.readyDay >= day);
  const canStartBatch = hasHenil && grassInStock > 0 && activeBatches.length < 2;

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
          {/* Henil (Hay Drying Barn) */}
          {hasHenil && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🌿 Henil</Text>
              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>
                Wet grass → hay · 3-day drying · 62.5% yield
              </Text>

              {activeBatches.length === 0 && (
                <Text style={{ color: C.textFaint, fontSize: 12, marginBottom: 8 }}>No active batches.</Text>
              )}
              {activeBatches.map((batch: HenilBatch) => {
                const daysLeft = batch.readyDay - day;
                const hayYield = Math.floor(batch.wetGrassKg * 0.625);
                return (
                  <View key={batch.batchId} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a2a1a' }}>
                    <Text style={{ color: '#ccc', fontSize: 12 }}>
                      {batch.wetGrassKg.toLocaleString()} kg grass
                    </Text>
                    <Text style={{ color: '#66bb6a', fontSize: 12 }}>
                      → {hayYield.toLocaleString()} kg hay
                    </Text>
                    <Text style={{ color: daysLeft <= 1 ? '#66bb6a' : C.textMuted, fontSize: 12 }}>
                      {daysLeft === 0 ? 'Ready!' : `${daysLeft}d left`}
                    </Text>
                  </View>
                );
              })}

              <TouchableOpacity
                style={{
                  marginTop: 10,
                  backgroundColor: canStartBatch ? '#1b5e20' : C.bg,
                  borderRadius: 6, padding: 10, alignItems: 'center',
                  opacity: canStartBatch ? 1 : 0.5,
                }}
                onPress={canStartBatch ? addToHenil : undefined}
                disabled={!canStartBatch}
              >
                <Text style={{ color: C.white, fontWeight: 'bold' }}>
                  {activeBatches.length >= 2 ? 'Queue Full (2/2)' : grassInStock <= 0 ? 'No Grass in Stock' : `Start Batch (${Math.min(Math.floor(grassInStock), 700)} kg grass)`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {!hasHenil && (
            <View style={[styles.sectionCard, { opacity: 0.6 }]}>
              <Text style={styles.sectionTitle}>🌿 Henil</Text>
              <Text style={{ color: C.textFaint, fontSize: 12 }}>Build a Henil to convert grass into hay for your animals.</Text>
            </View>
          )}
          <AnimalQualitySection
            milkGrades={milkGrades ?? {}}
            animalWelfareScores={animalWelfareScores ?? {}}
            productionBuildings={productionBuildings ?? []}
          />
          <IncubationSection
            incubationQueue={incubationQueue ?? []}
            hatcheryCapacity={hatcheryCapacity ?? 0}
            queueEggsForIncubation={queueEggsForIncubation}
            eggsInStock={animalInventory?.['eggs'] ?? 0}
            currentDay={day}
          />
          <SilageSection
            silageLevel={silageLevel ?? 0}
            silageCapacity={silageCapacity ?? 0}
            fillSilagePit={fillSilagePit}
            grassInStock={Math.floor(grassInStock)}
          />
          <SlurrySection
            slurryLevel={slurryLevel ?? 0}
            slurryCapacity={slurryCapacity ?? 0}
            spreadSlurry={spreadSlurry}
            hasSlurryTanker={(attachments ?? []).some((a: OwnedAttachment) =>
              a.typeId === 'att_slurry_tanker_s' || a.typeId === 'att_slurry_tanker_l'
            )}
          />
          {(buildings ?? []).includes('bld_biogas_upgrader') && (
            <BiogasToggle
              biogasMode={biogasMode ?? 'income'}
              setBiogasMode={setBiogasMode}
            />
          )}
          <ProductionBuildingsSection />
    </ScrollView>
  );
}

// ── Animal Quality Section ────────────────────────────────────────────────────
function AnimalQualitySection({
  milkGrades,
  animalWelfareScores,
  productionBuildings,
}: {
  milkGrades: Record<string, 'A' | 'B' | 'C'>;
  animalWelfareScores: Record<string, number>;
  productionBuildings: { animalTypeId: string }[];
}) {
  if (productionBuildings.length === 0) return null;

  const DAIRY_LABELS: Record<string, string> = {
    vaca: 'Cows 🐄',
    cabra: 'Goats 🐐',
    bufalo: 'Buffalo 🐃',
  };
  const SPECIES_LABELS: Record<string, string> = {
    vaca: 'Cow', cabra: 'Goat', bufalo: 'Buffalo',
    oveja: 'Sheep', cerdo: 'Pig', conejo: 'Rabbit',
    gallina: 'Chicken', pato: 'Duck', codorniz: 'Quail',
    abeja: 'Bees',
  };

  const dairyEntries = Object.entries(milkGrades);
  const welfareEntries = Object.entries(animalWelfareScores).filter(
    ([typeId]) => productionBuildings.some(pb => pb.animalTypeId === typeId)
  );

  if (dairyEntries.length === 0 && welfareEntries.length === 0) return null;

  return (
    <View style={{ backgroundColor: '#1c1c1c', borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>📊 Animal Quality</Text>

      {/* Milk grades */}
      {dairyEntries.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Milk Grade</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {dairyEntries.map(([typeId, grade]) => {
              const badgeColor = grade === 'A' ? '#4caf50' : grade === 'B' ? '#ffa726' : '#f44336';
              return (
                <View
                  key={typeId}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <Text style={{ color: '#ccc', fontSize: 11, marginRight: 4 }}>
                    {DAIRY_LABELS[typeId] ?? typeId}
                  </Text>
                  <View style={{ backgroundColor: badgeColor, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: C.white, fontSize: 11, fontWeight: 'bold' }}>Grade {grade}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Welfare scores */}
      {welfareEntries.length > 0 && (
        <View>
          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Welfare Score</Text>
          {welfareEntries.map(([typeId, score]) => {
            const barColor = score >= 80 ? '#4caf50' : score >= 60 ? '#ffa726' : '#f44336';
            const label = SPECIES_LABELS[typeId] ?? typeId;
            return (
              <View key={typeId} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: '#ccc', fontSize: 11, width: 64 }}>{label}</Text>
                <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 6, marginHorizontal: 6 }}>
                  <View style={{ width: `${Math.round(score)}%`, backgroundColor: barColor, borderRadius: 4, height: 6 }} />
                </View>
                <Text style={{ color: '#aaa', fontSize: 11, width: 30, textAlign: 'right' }}>{Math.round(score)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Incubation Section ───────────────────────────────────────────────────────
const POULTRY_HATCH_CONFIG = [
  { typeId: 'gallina',  label: 'Chicken', icon: '🐓', days: 21 },
  { typeId: 'pato',     label: 'Duck',    icon: '🦆', days: 28 },
  { typeId: 'codorniz', label: 'Quail',   icon: '🪶', days: 17 },
] as const;

function IncubationSection({
  incubationQueue,
  hatcheryCapacity,
  queueEggsForIncubation,
  eggsInStock,
  currentDay,
}: {
  incubationQueue: IncubationBatch[];
  hatcheryCapacity: number;
  queueEggsForIncubation: (typeId: string, quantity: number) => void;
  eggsInStock: number;
  currentDay: number;
}) {
  if (hatcheryCapacity <= 0) return null;

  const eggsInQueue = incubationQueue.reduce((sum, b) => sum + b.eggCount, 0);
  const space = hatcheryCapacity - eggsInQueue;
  const fillPct = Math.min(1, eggsInQueue / hatcheryCapacity);
  const barColor = fillPct >= 0.9 ? '#e65100' : fillPct >= 0.5 ? '#f57c00' : '#ffa726';

  return (
    <View style={{ backgroundColor: C.bg, borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 13 }}>🥚 Hatchery</Text>

      {/* Capacity bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 8 }}>
        <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 8, marginRight: 8 }}>
          <View style={{ width: `${Math.round(fillPct * 100)}%`, backgroundColor: barColor, borderRadius: 4, height: 8 }} />
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>
          {eggsInQueue} / {hatcheryCapacity} eggs
        </Text>
      </View>

      {/* Add-eggs rows */}
      {POULTRY_HATCH_CONFIG.map(({ typeId, label, icon, days }) => {
        const canAdd = eggsInStock > 0 && space > 0;
        const toAdd = Math.min(eggsInStock, space);
        return (
          <View key={typeId} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#ddd', fontSize: 12 }}>{icon} {label} <Text style={{ color: C.textMuted }}>({days}d)</Text></Text>
            {canAdd ? (
              <TouchableOpacity
                style={{ backgroundColor: '#37474f', borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5 }}
                onPress={() => queueEggsForIncubation(typeId, toAdd)}
              >
                <Text style={{ color: C.white, fontSize: 11 }}>+ {toAdd} eggs</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#555', fontSize: 11 }}>
                {eggsInStock <= 0 ? 'No eggs' : 'Hatchery full'}
              </Text>
            )}
          </View>
        );
      })}

      {/* Active batches */}
      {incubationQueue.length > 0 && (
        <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 8 }}>
          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Incubating:</Text>
          {incubationQueue.map(batch => {
            const cfg = POULTRY_HATCH_CONFIG.find(c => c.typeId === batch.typeId);
            const daysLeft = batch.readyDay - currentDay;
            return (
              <Text key={batch.batchId} style={{ color: '#ccc', fontSize: 11, marginBottom: 2 }}>
                {cfg?.icon ?? '🥚'} {batch.eggCount} {cfg?.label ?? batch.typeId} eggs — {daysLeft > 0 ? `hatches in ${daysLeft}d` : 'Ready!'}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Silage Section ────────────────────────────────────────────────────────────
function SilageSection({
  silageLevel,
  silageCapacity,
  fillSilagePit,
  grassInStock,
}: {
  silageLevel: number;
  silageCapacity: number;
  fillSilagePit: (kg: number) => void;
  grassInStock: number;
}) {
  if (silageCapacity <= 0) return null;
  const fillPct = Math.min(1, silageLevel / silageCapacity);
  const barColor = fillPct >= 0.9 ? '#4caf50' : fillPct >= 0.5 ? '#8bc34a' : '#ff9800';
  const space = silageCapacity - silageLevel;
  const canFill = grassInStock > 0 && space > 0;
  return (
    <View style={{ backgroundColor: '#1a2e1a', borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 13 }}>🌿 Silage Pit</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 8, marginRight: 8 }}>
          <View style={{ width: `${Math.round(fillPct * 100)}%`, backgroundColor: barColor, borderRadius: 4, height: 8 }} />
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>
          {silageLevel.toLocaleString()} / {silageCapacity.toLocaleString()} kg
        </Text>
      </View>
      {canFill && (
        <TouchableOpacity
          style={{ backgroundColor: '#388e3c', borderRadius: 6, padding: 8, marginTop: 8, alignItems: 'center' }}
          onPress={() => fillSilagePit(Math.floor(Math.min(grassInStock, space)))}
        >
          <Text style={{ color: C.white, fontSize: 12 }}>
            Fill with Grass ({Math.floor(Math.min(grassInStock, space))} kg available)
          </Text>
        </TouchableOpacity>
      )}
      {!canFill && space > 0 && (
        <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>No grass in stock to fill pit</Text>
      )}
      {space <= 0 && (
        <Text style={{ color: '#4caf50', fontSize: 11, marginTop: 6 }}>Pit full — spread or wait for winter feed draw</Text>
      )}
    </View>
  );
}

// ── Biogas Toggle ─────────────────────────────────────────────────────────────
function BiogasToggle({
  biogasMode,
  setBiogasMode,
}: {
  biogasMode: 'income' | 'fuel';
  setBiogasMode: (mode: 'income' | 'fuel') => void;
}) {
  return (
    <View style={{ backgroundColor: C.bg, borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 13 }}>⚡ Biogas Upgrader</Text>
        <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>
          {biogasMode === 'income' ? 'Selling to grid · $0.80/animal/day' : 'On-farm fuel · 0.3 L/animal/day'}
        </Text>
      </View>
      <TouchableOpacity
        style={{ backgroundColor: biogasMode === 'income' ? '#1565c0' : '#2e7d32', borderRadius: 6, padding: 8, minWidth: 70, alignItems: 'center' }}
        onPress={() => setBiogasMode(biogasMode === 'income' ? 'fuel' : 'income')}
      >
        <Text style={{ color: C.white, fontSize: 11, fontWeight: 'bold' }}>
          {biogasMode === 'income' ? '💰 Income' : '⛽ Fuel'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Slurry Section ────────────────────────────────────────────────────────────
function SlurrySection({
  slurryLevel,
  slurryCapacity,
  spreadSlurry,
  hasSlurryTanker,
}: {
  slurryLevel: number;
  slurryCapacity: number;
  spreadSlurry: () => void;
  hasSlurryTanker: boolean;
}) {
  if (slurryCapacity <= 0) return null;
  const fillPct = Math.min(1, slurryLevel / slurryCapacity);
  const barColor = fillPct >= 0.9 ? '#f44336' : fillPct >= 0.7 ? '#ff9800' : '#4caf50';
  return (
    <View style={{ backgroundColor: C.bg, borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 13 }}>Slurry Tank</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 8, marginRight: 8 }}>
          <View style={{ width: `${Math.round(fillPct * 100)}%`, backgroundColor: barColor, borderRadius: 4, height: 8 }} />
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>
          {slurryLevel.toLocaleString()} / {slurryCapacity.toLocaleString()} L
        </Text>
      </View>
      {hasSlurryTanker && slurryLevel > 0 && (
        <TouchableOpacity
          style={{ backgroundColor: '#2e7d32', borderRadius: 6, padding: 8, marginTop: 8, alignItems: 'center' }}
          onPress={spreadSlurry}
        >
          <Text style={{ color: C.white, fontSize: 12 }}>Spread on Fields (+1 fertility all owned parcels)</Text>
        </TouchableOpacity>
      )}
      {!hasSlurryTanker && slurryLevel > 0 && (
        <Text style={{ color: '#ff9800', fontSize: 11, marginTop: 6 }}>Buy a Slurry Tanker attachment to spread slurry</Text>
      )}
    </View>
  );
}

function HenilSection() {
  return <HenilAndBuildingsSection />;
}

// ── Production Buildings ──────────────────────────────────────────────────────
function ProductionBuildingsSection() {
  const {
    productionBuildings,
    workers,
    money,
    assignWorkerToBuilding,
    unassignWorkerFromBuilding,
    installEquipment,
    performDeepClean,
  } = useGameStore();

  const farmhands = (workers ?? []).filter((w: any) => w.typeId === 'farmhand');

  if (!productionBuildings || productionBuildings.length === 0) {
    return (
      <View style={{ backgroundColor: C.bgCard, borderRadius: 10, margin: 8, padding: 14 }}>
        <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 14, marginBottom: 6 }}>Production Buildings</Text>
        <Text style={{ color: '#aaa', fontSize: 12 }}>
          No production buildings built yet. Buy them in the Shop to stop paying contractor fees.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 8 }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: C.bgCard, borderRadius: 10, margin: 0, padding: 14 }}>
        <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 14, marginBottom: 10 }}>Production Buildings</Text>
        {productionBuildings.map((pb: ProductionBuildingState) => {
          const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
          if (!bt) return null;
          const certColor = pb.certificationTier === 'organic' ? '#4caf50' : pb.certificationTier === 'certified' ? '#2196f3' : '#9e9e9e';
          const certLabel = pb.certificationTier === 'organic' ? '🌿 Organic' : pb.certificationTier === 'certified' ? '✅ Certified' : 'Basic';
          const availableWorkers = farmhands.filter((w: any) => !pb.assignedWorkerIds.includes(w.id));
          const maxSlots = bt.equipmentSlotCount ?? 2;
          const availableEquipment = PRODUCTION_EQUIPMENT.filter(eq =>
            eq.applicableBuildingPrefixes.some(prefix => pb.buildingTypeId.startsWith(prefix)) &&
            !pb.equipmentSlots.includes(eq.id)
          );

          return (
            <View key={pb.id} style={{ borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10, marginTop: 10 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: C.text, fontWeight: 'bold' }}>{bt.name}</Text>
                <Text style={{ color: certColor, fontSize: 12 }}>{certLabel}</Text>
              </View>

              {/* Hygiene bar */}
              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 3 }}>Hygiene</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1, height: 8, backgroundColor: '#2a2a4a', borderRadius: 4 }}>
                  <View style={{
                    width: `${pb.hygiene}%` as any, height: 8, borderRadius: 4,
                    backgroundColor: pb.hygiene >= 80 ? '#4caf50' : pb.hygiene >= 60 ? '#ff9800' : pb.hygiene >= 40 ? '#ff5722' : '#ef5350',
                  }} />
                </View>
                <Text style={{ color: '#aaa', fontSize: 11, width: 32 }}>{Math.round(pb.hygiene)}%</Text>
              </View>

              {/* Cert progress hint */}
              {pb.certificationTier === 'basic' && (
                <Text style={{ color: '#aaa', fontSize: 10, marginBottom: 6 }}>
                  To Certified: {Math.max(0, 30 - pb.certDaysAtThreshold)}d at hygiene ≥60 + 1 inspection
                </Text>
              )}

              {/* Workers */}
              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Workers assigned: {pb.assignedWorkerIds.length}</Text>
              {pb.assignedWorkerIds.map((wid, idx) => (
                <View key={wid} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: '#81c784', fontSize: 12 }}>👷 Farmhand #{idx + 1}</Text>
                  <TouchableOpacity onPress={() => unassignWorkerFromBuilding(pb.id, wid)}>
                    <Text style={{ color: '#ef5350', fontSize: 12 }}>Unassign</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {availableWorkers.length > 0 && (
                <TouchableOpacity
                  style={{ backgroundColor: '#1e3a5f', borderRadius: 6, padding: 6, alignItems: 'center', marginBottom: 8 }}
                  onPress={() => assignWorkerToBuilding(pb.id, availableWorkers[0].id)}
                >
                  <Text style={{ color: '#90caf9', fontSize: 12 }}>+ Assign Farmhand</Text>
                </TouchableOpacity>
              )}

              {/* Equipment slots */}
              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>
                Equipment: {pb.equipmentSlots.length}/{maxSlots} slots used
              </Text>
              {pb.equipmentSlots.map(eqId => {
                const eq = PRODUCTION_EQUIPMENT.find(e => e.id === eqId);
                return (
                  <Text key={eqId} style={{ color: '#81c784', fontSize: 11, marginBottom: 2 }}>
                    ✓ {eq?.name ?? eqId}
                  </Text>
                );
              })}
              {pb.equipmentSlots.length < maxSlots && availableEquipment.length > 0 && (
                <Text style={{ color: '#aaa', fontSize: 10, marginTop: 2 }}>
                  Buy equipment in the Shop to fill remaining slots
                </Text>
              )}

              {/* Deep clean */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: pb.hygiene > 80 ? '#2a2a4a' : '#1b5e20', borderRadius: 6, padding: 8, alignItems: 'center' }}
                  onPress={() => performDeepClean(pb.id, false)}
                  disabled={pb.hygiene > 80}
                >
                  <Text style={{ color: pb.hygiene > 80 ? '#555' : '#a5d6a7', fontSize: 12 }}>
                    {pb.hygiene > 80 ? '✓ Clean' : '🧹 Deep Clean (Worker)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: money < 150 ? '#2a2a4a' : '#3e1f00', borderRadius: 6, padding: 8, alignItems: 'center' }}
                  onPress={() => performDeepClean(pb.id, true)}
                  disabled={money < 150}
                >
                  <Text style={{ color: money < 150 ? '#555' : '#ffcc80', fontSize: 12 }}>
                    🧹 Contractor ($150–$400)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type OfficeTab = 'dashboard' | 'office' | 'calendar' | 'settings' | 'guide' | 'seeds' | 'henil';

const TABS: { id: OfficeTab; label: string }[] = [
  { id: 'dashboard', label: '🏠 Home' },
  { id: 'office',    label: '📋 Office' },
  { id: 'calendar',  label: '📅 Calendar' },
  { id: 'seeds',     label: '🌱 Seeds' },
  { id: 'henil',     label: '🌿 Henil' },
  { id: 'settings',  label: '⚙️ Settings' },
  { id: 'guide',     label: '📖 Guide' },
];

export default function GestionScreen() {
  const [tab, setTab] = useState<OfficeTab>('dashboard');

  return (
    <View style={styles.container}>
      <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as OfficeTab)} />

      {tab === 'dashboard' && <DashboardSection />}
      {tab === 'office'    && <OficinaScreen />}
      {tab === 'calendar'  && <CalendarioScreen />}
      {tab === 'seeds'     && <SeedMarketSection />}
      {tab === 'henil'     && <HenilSection />}
      {tab === 'settings'  && <SettingsSection />}
      {tab === 'guide'     && <Encyclopedia />}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  sectionCard:  { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  sectionTitle: { color: C.text, fontSize: F.size.md, fontWeight: 'bold', marginBottom: S.sm },
});
