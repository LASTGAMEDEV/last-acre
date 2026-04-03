import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useGameStore, AuctionListing, AuctionCategory } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import HintCard from '../../components/HintCard';

type AuctionView = 'hub' | AuctionCategory;

export default function SubastaScreen() {
  const { listings, day, money, placeBid, listItem, withdrawListing, nextAnimalAuctionDay,
          animals, inventory, machines } = useGameStore();
  const [view, setView] = useState<AuctionView>('hub');
  const [bidInputs, setBidInputs] = useState<Record<string, string>>({});

  const allListings = listings ?? [];
  const activeListings = allListings.filter(l => !l.resolved);
  const playerBids = activeListings.filter(l => l.playerBid !== null);

  function countActive(cat: AuctionCategory) {
    return activeListings.filter(l => l.category === cat).length;
  }

  const daysToAnimalEvent = nextAnimalAuctionDay - day;

  if (view === 'hub') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Auction House" />
        <HintCard
          id="hint_auction"
          title="Buy and sell at auction"
          body="List your animals, crops, and used machinery for sale. Bid on NPC listings. Land auctions appear automatically."
        />

        {/* 2×2 category grid */}
        <View style={styles.grid}>
          {([
            { cat: 'land',      icon: '🏡', label: 'Land',      sub: `${countActive('land')} active` },
            { cat: 'animal',    icon: '🐄', label: 'Animals',   sub: daysToAnimalEvent <= 0 ? '⚡ Event today!' : `⚡ Event in ${daysToAnimalEvent}d` },
            { cat: 'crop',      icon: '🌾', label: 'Crops',     sub: `${countActive('crop')} listings` },
            { cat: 'machinery', icon: '⚙️', label: 'Machinery', sub: `${countActive('machinery')} listings` },
          ] as { cat: AuctionCategory; icon: string; label: string; sub: string }[]).map(({ cat, icon, label, sub }) => (
            <TouchableOpacity
              key={cat}
              style={[styles.tile, cat === 'animal' && styles.tileAnimal]}
              onPress={() => setView(cat)}
            >
              <Text style={styles.tileIcon}>{icon}</Text>
              <Text style={[styles.tileLabel, cat === 'animal' && styles.tileLabelAnimal]}>{label}</Text>
              <Text style={[styles.tileSub, cat === 'animal' && styles.tileSubAnimal]}>{sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active bids strip */}
        {playerBids.length > 0 && (
          <View style={styles.bidsStrip}>
            <Text style={styles.bidStripTitle}>YOUR ACTIVE BIDS</Text>
            {playerBids.map(l => {
              const isLeading = l.playerBid !== null && l.playerBid >= l.currentBid;
              const label = l.category === 'land' ? `📍 ${l.parcel?.name ?? 'Parcel'}`
                          : l.category === 'animal' ? `🐄 ${l.animalTypeId ?? 'Animal'}`
                          : l.category === 'crop' ? `🌾 ${l.cropId ?? 'Crop'}`
                          : `⚙️ ${l.machineTypeId ?? 'Machine'}`;
              return (
                <TouchableOpacity key={l.id} style={styles.bidStripRow} onPress={() => setView(l.category)}>
                  <Text style={styles.bidStripLabel}>{label}</Text>
                  <Text style={[styles.bidStripStatus, isLeading ? styles.leading : styles.outbid]}>
                    {isLeading ? `✓ Leading $${l.playerBid?.toLocaleString()}` : `⚠ Outbid $${l.playerBid?.toLocaleString()}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={view === 'land' ? '🏡 Land Auction' : view === 'animal' ? '🐄 Animals' : view === 'crop' ? '🌾 Crops' : '⚙️ Machinery'} />
      <TouchableOpacity style={styles.backBtn} onPress={() => setView('hub')}>
        <Text style={styles.backBtnText}>← Back to Auction House</Text>
      </TouchableOpacity>
      {view === 'land' && <LandView listings={allListings} day={day} money={money} placeBid={placeBid} bidInputs={bidInputs} setBidInputs={setBidInputs} />}
      {view === 'animal' && <AnimalView listings={allListings} day={day} money={money} placeBid={placeBid} listItem={listItem} withdrawListing={withdrawListing} nextAnimalAuctionDay={nextAnimalAuctionDay} animals={animals} bidInputs={bidInputs} setBidInputs={setBidInputs} />}
      {view === 'crop' && <CropView listings={allListings} day={day} money={money} placeBid={placeBid} listItem={listItem} withdrawListing={withdrawListing} inventory={inventory} bidInputs={bidInputs} setBidInputs={setBidInputs} />}
      {view === 'machinery' && <MachineryView listings={allListings} day={day} money={money} placeBid={placeBid} listItem={listItem} withdrawListing={withdrawListing} machines={machines} bidInputs={bidInputs} setBidInputs={setBidInputs} />}
    </View>
  );
}

function LandView({ listings, day, money, placeBid, bidInputs, setBidInputs }: {
  listings: AuctionListing[];
  day: number; money: number;
  placeBid: (id: string, amount: number) => void;
  bidInputs: Record<string, string>;
  setBidInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const activeLots = listings.filter(l => !l.resolved && l.category === 'land');
  const resolvedLots = listings.filter(l => l.resolved && l.category === 'land').slice(-5).reverse();

  function renderLot(lot: AuctionListing, isActive: boolean) {
    const daysLeft = lot.expiresDay - day;
    const bidText = bidInputs[lot.id] ?? '';
    const bidAmount = parseFloat(bidText.replace(/,/g, '')) || 0;
    const minBid = Math.ceil(lot.currentBid * 1.05);
    const canBid = bidAmount >= minBid && money >= bidAmount && isActive && daysLeft > 0;
    const playerIsLeading = lot.playerBid !== null && lot.playerBid >= lot.currentBid;
    const urgentColor = daysLeft <= 2 ? '#f44336' : daysLeft <= 5 ? '#ff9800' : '#888';
    return (
      <View key={lot.id} style={[styles.card, lot.playerWon === true && styles.cardWon, lot.playerWon === false && styles.cardLost]}>
        <View style={styles.cardHeader}>
          <Text style={styles.parcelTitle}>{lot.parcel?.name ?? 'Parcel'} · {lot.parcel?.hectares}ha</Text>
          {isActive
            ? <Text style={[styles.daysLeft, { color: urgentColor }]}>{daysLeft > 0 ? `${daysLeft}d left` : 'Closing...'}</Text>
            : <Text style={[styles.resolved, lot.playerWon ? styles.wonText : styles.lostText]}>{lot.playerWon ? '🏆 Won' : '❌ Lost'}</Text>}
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Size</Text><Text style={styles.infoValue}>{lot.parcel?.hectares} ha</Text></View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Fertility</Text><Text style={styles.infoValue}>{lot.parcel?.fertility}/25</Text></View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Market</Text><Text style={styles.infoValue}>${((lot.parcel?.pricePerHa ?? 0) * (lot.parcel?.hectares ?? 0)).toLocaleString()}</Text></View>
        </View>
        <View style={styles.bidInfo}>
          <View style={styles.bidRow}><Text style={styles.bidLabel}>Current bid</Text><Text style={styles.currentBid}>${lot.currentBid.toLocaleString()}</Text></View>
          <View style={styles.bidRow}><Text style={styles.bidLabel}>Starting bid</Text><Text style={styles.startingBid}>${lot.startingBid.toLocaleString()}</Text></View>
          {lot.playerBid !== null && (
            <View style={styles.bidRow}>
              <Text style={styles.bidLabel}>Your bid</Text>
              <Text style={[styles.playerBid, playerIsLeading ? styles.leading : styles.outbid]}>
                ${lot.playerBid.toLocaleString()} {playerIsLeading ? '✓ Leading' : '⚠ Outbid'}
              </Text>
            </View>
          )}
        </View>
        {lot.bids.length > 0 && (
          <View style={styles.historyBox}>
            <Text style={styles.historyTitle}>Recent bids</Text>
            {lot.bids.slice(-3).reverse().map((bid, i) => (
              <Text key={i} style={[styles.historyItem, bid.isPlayer && styles.historyItemPlayer]}>
                {bid.isPlayer ? '👤 You' : '🤖 Other'} · ${bid.amount.toLocaleString()} · day {bid.day}
              </Text>
            ))}
          </View>
        )}
        {isActive && daysLeft > 0 && (
          <View style={styles.bidInputRow}>
            <TextInput style={styles.bidInput} keyboardType="numeric" placeholder={`Min: $${minBid.toLocaleString()}`} placeholderTextColor="#555" value={bidText} onChangeText={v => setBidInputs(b => ({ ...b, [lot.id]: v }))} />
            <TouchableOpacity style={[styles.bidBtn, !canBid && styles.bidBtnDisabled]} disabled={!canBid} onPress={() => { placeBid(lot.id, bidAmount); setBidInputs(b => ({ ...b, [lot.id]: '' })); }}>
              <Text style={styles.bidBtnText}>Bid</Text>
            </TouchableOpacity>
          </View>
        )}
        {isActive && daysLeft > 0 && bidAmount > 0 && bidAmount < minBid && <Text style={styles.bidWarn}>Minimum bid: ${minBid.toLocaleString()}</Text>}
        {isActive && daysLeft > 0 && bidAmount >= minBid && money < bidAmount && <Text style={styles.bidWarn}>Insufficient funds</Text>}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {activeLots.length > 0
        ? <>{<Text style={styles.sectionLabel}>Active ({activeLots.length})</Text>}{activeLots.map(l => renderLot(l, true))}</>
        : <View style={styles.emptyBox}><Text style={styles.emptyText}>No active land auctions.</Text><Text style={styles.emptyHint}>Advance days for new lots.</Text></View>}
      {resolvedLots.length > 0 && <>{<Text style={styles.sectionLabel}>Recent</Text>}{resolvedLots.map(l => renderLot(l, false))}</>}
    </ScrollView>
  );
}

// Placeholder components — will be replaced in Tasks 5, 6, 7
function AnimalView(_props: any) { return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#888' }}>Animals — coming soon</Text></View>; }
function CropView(_props: any) { return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#888' }}>Crops — coming soon</Text></View>; }
function MachineryView(_props: any) { return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#888' }}>Machinery — coming soon</Text></View>; }

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#1a1a2e' },
  backBtn:         { paddingHorizontal: 16, paddingVertical: 8 },
  backBtnText:     { color: '#7eb8f7', fontSize: 13 },
  sectionLabel:    { color: '#888', fontSize: 13, paddingHorizontal: 16, marginTop: 10, marginBottom: 6 },
  emptyHint:       { color: '#444', fontSize: 12, paddingHorizontal: 16 },

  // Hub grid
  grid:            { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  tile:            { width: '47%', backgroundColor: '#16213e', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1e2a3a' },
  tileAnimal:      { borderColor: '#ffd700', backgroundColor: '#1a2744' },
  tileIcon:        { fontSize: 28, marginBottom: 4 },
  tileLabel:       { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  tileLabelAnimal: { color: '#ffd700' },
  tileSub:         { color: '#666', fontSize: 11, marginTop: 2 },
  tileSubAnimal:   { color: '#ffd700' },

  // Active bids strip
  bidsStrip:       { margin: 12, backgroundColor: '#16213e', borderRadius: 12, padding: 12 },
  bidStripTitle:   { color: '#555', fontSize: 9, letterSpacing: 1, marginBottom: 8 },
  bidStripRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  bidStripLabel:   { color: '#e8d5a3', fontSize: 12 },
  bidStripStatus:  { fontSize: 12, fontWeight: 'bold' },

  // Shared land card styles
  card:            { backgroundColor: '#16213e', borderRadius: 12, margin: 10, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: '#1e1e3a' },
  cardWon:         { borderColor: '#4caf50' },
  cardLost:        { borderColor: '#333', opacity: 0.7 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  parcelTitle:     { color: '#e8d5a3', fontWeight: 'bold', fontSize: 15, flex: 1 },
  daysLeft:        { fontSize: 12, fontWeight: 'bold' },
  resolved:        { fontSize: 13, fontWeight: 'bold' },
  wonText:         { color: '#4caf50' },
  lostText:        { color: '#666' },
  infoRow:         { flexDirection: 'row', marginBottom: 10, gap: 8 },
  infoItem:        { flex: 1, backgroundColor: '#0f3460', borderRadius: 8, padding: 8, alignItems: 'center' },
  infoLabel:       { color: '#666', fontSize: 9, marginBottom: 2 },
  infoValue:       { color: '#e8d5a3', fontWeight: 'bold', fontSize: 12 },
  bidInfo:         { backgroundColor: '#0a1628', borderRadius: 8, padding: 10, marginBottom: 10 },
  bidRow:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  bidLabel:        { color: '#666', fontSize: 12 },
  currentBid:      { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  startingBid:     { color: '#888', fontSize: 12 },
  playerBid:       { fontSize: 12, fontWeight: 'bold' },
  leading:         { color: '#4caf50' },
  outbid:          { color: '#ff9800' },
  historyBox:      { backgroundColor: '#0d1117', borderRadius: 8, padding: 8, marginBottom: 10 },
  historyTitle:    { color: '#555', fontSize: 10, marginBottom: 4 },
  historyItem:     { color: '#888', fontSize: 11, paddingVertical: 2 },
  historyItemPlayer:{ color: '#64b5f6' },
  bidInputRow:     { flexDirection: 'row', gap: 8 },
  bidInput:        { flex: 1, backgroundColor: '#0d1117', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', color: '#e8d5a3', padding: 10, fontSize: 14 },
  bidBtn:          { backgroundColor: '#c8860a', borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center' },
  bidBtnDisabled:  { backgroundColor: '#333' },
  bidBtnText:      { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  bidWarn:         { color: '#ff9800', fontSize: 11, marginTop: 4 },
  emptyBox:        { alignItems: 'center', padding: 40 },
  emptyText:       { color: '#555', fontSize: 15, marginBottom: 8 },
});
