import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useGameStore, AuctionLot } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import HintCard from '../../components/HintCard';

export default function SubastaScreen() {
  const { auctionLots, day, money, placeBid } = useGameStore();
  const [bidInputs, setBidInputs] = useState<Record<string, string>>({});

  const activeLots = auctionLots.filter(l => !l.resolved);
  const resolvedLots = auctionLots.filter(l => l.resolved).slice(-5);

  function renderLot(lot: AuctionLot, isActive: boolean) {
    const daysLeft = lot.endDay - day;
    const bidText = bidInputs[lot.id] ?? '';
    const bidAmount = parseFloat(bidText.replace(/,/g, '')) || 0;
    const minBid = Math.ceil(lot.currentBid * 1.05);
    const canBid = bidAmount >= minBid && money >= bidAmount && isActive && daysLeft > 0;
    const playerIsLeading = lot.playerBid !== null && lot.playerBid >= lot.currentBid;
    const urgentColor = daysLeft <= 2 ? '#f44336' : daysLeft <= 5 ? '#ff9800' : '#888';

    return (
      <View key={lot.id} style={[styles.card, lot.playerWon === true && styles.cardWon, lot.playerWon === false && styles.cardLost]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.parcelTitle}>
            {lot.parcel.hectares} ha · Fertility {lot.parcel.fertility}/25
          </Text>
          {isActive ? (
            <Text style={[styles.daysLeft, { color: urgentColor }]}>
              {daysLeft > 0 ? `${daysLeft}d left` : 'Closing...'}
            </Text>
          ) : (
            <Text style={[styles.resolved, lot.playerWon ? styles.wonText : styles.lostText]}>
              {lot.playerWon ? '🏆 Won' : '❌ Lost'}
            </Text>
          )}
        </View>

        {/* Parcel info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Size</Text>
            <Text style={styles.infoValue}>{lot.parcel.hectares} ha</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Market price</Text>
            <Text style={styles.infoValue}>
              ${(lot.parcel.pricePerHa * lot.parcel.hectares).toLocaleString()}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Price/ha</Text>
            <Text style={styles.infoValue}>${lot.parcel.pricePerHa.toLocaleString()}</Text>
          </View>
        </View>

        {/* Bid info */}
        <View style={styles.bidInfo}>
          <View style={styles.bidRow}>
            <Text style={styles.bidLabel}>Current bid</Text>
            <Text style={styles.currentBid}>${lot.currentBid.toLocaleString()}</Text>
          </View>
          <View style={styles.bidRow}>
            <Text style={styles.bidLabel}>Starting bid</Text>
            <Text style={styles.startingBid}>${lot.startingBid.toLocaleString()}</Text>
          </View>
          {lot.playerBid !== null && (
            <View style={styles.bidRow}>
              <Text style={styles.bidLabel}>Your bid</Text>
              <Text style={[styles.playerBid, playerIsLeading ? styles.leading : styles.outbid]}>
                ${lot.playerBid.toLocaleString()} {playerIsLeading ? '✓ Leading' : '⚠ Outbid'}
              </Text>
            </View>
          )}
        </View>

        {/* Bid history */}
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

        {/* Bid input */}
        {isActive && daysLeft > 0 && (
          <View style={styles.bidInputRow}>
            <TextInput
              style={styles.bidInput}
              keyboardType="numeric"
              placeholder={`Min: $${minBid.toLocaleString()}`}
              placeholderTextColor="#555"
              value={bidText}
              onChangeText={v => setBidInputs(b => ({ ...b, [lot.id]: v }))}
            />
            <TouchableOpacity
              style={[styles.bidBtn, !canBid && styles.bidBtnDisabled]}
              disabled={!canBid}
              onPress={() => {
                placeBid(lot.id, bidAmount);
                setBidInputs(b => ({ ...b, [lot.id]: '' }));
              }}
            >
              <Text style={styles.bidBtnText}>Bid</Text>
            </TouchableOpacity>
          </View>
        )}

        {isActive && daysLeft > 0 && bidAmount > 0 && bidAmount < minBid && (
          <Text style={styles.bidWarn}>Minimum bid: ${minBid.toLocaleString()}</Text>
        )}
        {isActive && daysLeft > 0 && bidAmount >= minBid && money < bidAmount && (
          <Text style={styles.bidWarn}>Insufficient funds (you have ${money.toLocaleString()})</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Land Auction" subtitle="Premium parcels — winner pays their bid at close" />
      {!auctionLots.some(lot => lot.bids.some((b: { isPlayer?: boolean }) => b.isPlayer)) && (
        <HintCard id="hint_auction" title="Buy rare items at auction" body="New auction lots appear every few days — rare seeds, animals, and machinery at below-market prices. Place a bid before the deadline and win if you're the highest bidder." />
      )}
      <Text style={styles.subtitle}>
        Auctioned land consists of premium parcels. The winner pays their bid at close.
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {activeLots.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Active ({activeLots.length})</Text>
            {activeLots.map(lot => renderLot(lot, true))}
          </>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No active auctions right now.</Text>
            <Text style={styles.emptyHint}>Advance days for new auctions to appear.</Text>
          </View>
        )}

        {resolvedLots.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Recent</Text>
            {resolvedLots.map(lot => renderLot(lot, false))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  subtitle: { color: '#666', fontSize: 12, paddingHorizontal: 16, marginBottom: 10 },
  sectionLabel: { color: '#888', fontSize: 13, paddingHorizontal: 16, marginTop: 10, marginBottom: 6 },

  card: { backgroundColor: '#16213e', borderRadius: 12, margin: 10, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: '#1e1e3a' },
  cardWon: { borderColor: '#4caf50' },
  cardLost: { borderColor: '#333', opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  parcelTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 15, flex: 1 },
  daysLeft: { fontSize: 12, fontWeight: 'bold' },
  resolved: { fontSize: 13, fontWeight: 'bold' },
  wonText: { color: '#4caf50' },
  lostText: { color: '#666' },

  infoRow: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  infoItem: { flex: 1, backgroundColor: '#0f3460', borderRadius: 8, padding: 8, alignItems: 'center' },
  infoLabel: { color: '#666', fontSize: 9, marginBottom: 2 },
  infoValue: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 12 },

  bidInfo: { backgroundColor: '#0a1628', borderRadius: 8, padding: 10, marginBottom: 10 },
  bidRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  bidLabel: { color: '#666', fontSize: 12 },
  currentBid: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  startingBid: { color: '#888', fontSize: 12 },
  playerBid: { fontSize: 12, fontWeight: 'bold' },
  leading: { color: '#4caf50' },
  outbid: { color: '#ff9800' },

  historyBox: { backgroundColor: '#0d1117', borderRadius: 8, padding: 8, marginBottom: 10 },
  historyTitle: { color: '#555', fontSize: 10, marginBottom: 4 },
  historyItem: { color: '#888', fontSize: 11, paddingVertical: 2 },
  historyItemPlayer: { color: '#64b5f6' },

  bidInputRow: { flexDirection: 'row', gap: 8 },
  bidInput: { flex: 1, backgroundColor: '#0d1117', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', color: '#e8d5a3', padding: 10, fontSize: 14 },
  bidBtn: { backgroundColor: '#c8860a', borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center' },
  bidBtnDisabled: { backgroundColor: '#333' },
  bidBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  bidWarn: { color: '#ff9800', fontSize: 11, marginTop: 4 },

  emptyBox: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#555', fontSize: 15, marginBottom: 8 },
  emptyHint: { color: '#444', fontSize: 12 },
});
