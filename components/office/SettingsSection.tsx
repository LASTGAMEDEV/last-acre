import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';

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
      const raw = await AsyncStorage.getItem('granja-tycoon-save-v9');
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
              await AsyncStorage.setItem('granja-tycoon-save-v9', raw);
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
            thumbColor={C.white}
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
            thumbColor={C.white}
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
            thumbColor={C.white}
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
              You&apos;re on day {day} — {1080 - day} days to go.{'\n'}
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

export default SettingsSection;
