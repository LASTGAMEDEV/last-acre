import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, TextInput } from 'react-native';
import OficinaScreen from './oficina';
import CalendarioScreen from './calendario';
import Encyclopedia from '../../components/Encyclopedia';
import { useGameStore } from '../../store/useGameStore';
import { getSeason } from '../../engine/climate';
import { SEASON_THEME, C } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import { ANIMAL_TYPES } from '../../data/animalTypes';

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
                  <Text style={{ color: '#e8d5a3', fontSize: 11 }}>{Math.round(progress * 100)}%</Text>
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
          <Text style={{ color: '#888', fontSize: 11 }}>Wealth: ${Math.round(topRival.wealth).toLocaleString()} · sells in {Math.max(0, topRival.nextSellDay - day)}d</Text>
        </View>
      )}

      {/* Records peek */}
      <View style={dash.goalsCard}>
        <Text style={dash.goalsTitle}>📊 Personal Bests</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#888', fontSize: 10 }}>Peak Cash</Text>
            <Text style={{ color: '#e8d5a3', fontSize: 12, fontWeight: 'bold' }}>${Math.round(personalRecords?.peakMoney ?? 0).toLocaleString()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#888', fontSize: 10 }}>Total Harvests</Text>
            <Text style={{ color: '#e8d5a3', fontSize: 12, fontWeight: 'bold' }}>{personalRecords?.totalHarvests ?? 0}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#888', fontSize: 10 }}>Days Survived</Text>
            <Text style={{ color: '#e8d5a3', fontSize: 12, fontWeight: 'bold' }}>{personalRecords?.longestDay ?? day}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const dash = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 8 },
  card:      { flex: 1, backgroundColor: '#16213e', borderRadius: 10, padding: 12 },
  cardLabel: { color: '#888', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 4 },
  cardValue: { color: '#e8d5a3', fontSize: 18, fontWeight: 'bold' },
  cardSub:   { color: '#555', fontSize: 10, marginTop: 2 },
  netWorthCard:      { backgroundColor: '#16213e', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#c8860a33' },
  netWorthLabel:     { color: '#888', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  netWorthValue:     { color: '#c8860a', fontSize: 24, fontWeight: 'bold' },
  netWorthBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, alignItems: 'center' },
  netWorthSub:       { color: '#555', fontSize: 10 },
  netWorthDot:       { color: '#333', fontSize: 10 },
  warnBanner:{ backgroundColor: '#3a1a00', borderRadius: 8, padding: 10, gap: 4 },
  warnText:  { color: '#ffb74d', fontSize: 11, fontWeight: 'bold' },
  goalsCard: { backgroundColor: '#16213e', borderRadius: 10, padding: 12 },
  goalsTitle:{ color: '#e8d5a3', fontSize: 12, fontWeight: 'bold' },
  rivalCard: { backgroundColor: '#1a1030', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#ef9a9a33' },
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
                <Text style={[set.cropChipText, alertCropId === c.id && { color: '#fff' }]}>{c.name}</Text>
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
            thumbColor="#fff"
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
            thumbColor="#fff"
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
            thumbColor="#fff"
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
            <Text style={{ color: '#666', fontSize: 11, marginTop: 2 }}>Applies to crops, animals, and processed goods</Text>
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
              <Text style={{ color: '#888', fontSize: 11 }}>Next prestige reward: +5% sell revenue · +${((prestige + 1) * 2000).toLocaleString()} starting cash</Text>
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
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>⭐ Prestige to Level {prestige + 1}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* About */}
      <View style={set.section}>
        <Text style={set.sectionTitle}>ℹ️ About</Text>
        <Text style={{ color: '#888', fontSize: 12, lineHeight: 18 }}>
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
  section:       { backgroundColor: '#16213e', borderRadius: 12, padding: 14 },
  sectionTitle:  { color: '#e8d5a3', fontSize: 13, fontWeight: 'bold', marginBottom: 10 },
  row:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowInfo:       { flex: 1 },
  rowLabel:      { color: '#ccc', fontSize: 13 },
  rowSub:        { color: '#555', fontSize: 11, marginTop: 1 },
  recordRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  recordLabel:   { color: '#888', fontSize: 12 },
  recordValue:   { color: '#e8d5a3', fontSize: 12, fontWeight: 'bold' },
  resetBtn:      { backgroundColor: '#3a0a0a', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  resetBtnText:  { color: '#ef5350', fontWeight: 'bold', fontSize: 14 },
  nameInput:     { flex: 1, backgroundColor: '#0d1a2e', color: '#e8d5a3', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: '#2a3a5e' },
  nameBtn:       { backgroundColor: '#0f3460', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  nameBtnText:   { color: '#64b5f6', fontWeight: 'bold', fontSize: 12 },
  alertRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e2a3a' },
  priceInput:    { flex: 1, backgroundColor: '#0d1a2e', color: '#e8d5a3', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: '#2a3a5e' },
  cropChip:      { backgroundColor: '#0d1a2e', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginRight: 5, borderWidth: 1, borderColor: '#2a3a5e' },
  cropChipActive:{ backgroundColor: '#0f3460', borderColor: '#64b5f6' },
  cropChipText:  { color: '#888', fontSize: 11 },
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
  section:       { backgroundColor: '#16213e', borderRadius: 12, padding: 14 },
  title:         { color: '#e8d5a3', fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  sub:           { color: '#555', fontSize: 11, marginBottom: 8 },
  empty:         { color: '#444', fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  shopRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  shopCrop:      { color: '#ccc', fontSize: 12 },
  buyBtn:        { backgroundColor: '#0f3460', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 6 },
  buyBtnDisabled:{ backgroundColor: '#1a1a2e', opacity: 0.5 },
  buyBtnText:    { color: '#64b5f6', fontSize: 11, fontWeight: 'bold' },
  vaultRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e3a', gap: 8 },
  vaultName:     { color: '#e8d5a3', fontSize: 12, fontWeight: 'bold' },
  vaultGenes:    { color: '#888', fontSize: 10, marginTop: 1 },
  vaultQty:      { color: '#555', fontSize: 10, marginTop: 1 },
  sellBtn:       { backgroundColor: '#1a3a1a', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' },
  sellBtnText:   { color: '#66bb6a', fontSize: 11, fontWeight: 'bold' },
  sellBtnSub:    { color: '#4caf50', fontSize: 10 },
});

// ── Main ──────────────────────────────────────────────────────────────────────
type OfficeTab = 'dashboard' | 'office' | 'calendar' | 'settings' | 'guide' | 'seeds';

const TABS: { id: OfficeTab; label: string }[] = [
  { id: 'dashboard', label: '🏠 Home' },
  { id: 'office',    label: '📋 Office' },
  { id: 'calendar',  label: '📅 Calendar' },
  { id: 'seeds',     label: '🌱 Seeds' },
  { id: 'settings',  label: '⚙️ Settings' },
  { id: 'guide',     label: '📖 Guide' },
];

export default function GestionScreen() {
  const [tab, setTab] = useState<OfficeTab>('dashboard');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'dashboard' && <DashboardSection />}
      {tab === 'office'    && <OficinaScreen />}
      {tab === 'calendar'  && <CalendarioScreen />}
      {tab === 'seeds'     && <SeedMarketSection />}
      {tab === 'settings'  && <SettingsSection />}
      {tab === 'guide'     && <Encyclopedia />}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0a1628' },
  tabBar:           { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 6, backgroundColor: '#0a1628' },
  tabBtn:           { flex: 1, backgroundColor: '#16213e', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  tabBtnActive:     { backgroundColor: '#0f3460' },
  tabBtnText:       { color: '#888', fontSize: 10, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#e8d5a3' },
});
