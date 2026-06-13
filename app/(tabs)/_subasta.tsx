import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useGameStore, AuctionListing, AuctionCategory , OwnedMachine } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import HintCard from '../../components/HintCard';
import { ANIMAL_TYPES } from '../../data/animalTypes';
import { geneScore , OwnedAnimal } from '../../engine/animals';

import { BREED_TYPES, BreedRarity } from '../../data/breedTypes';
import { CROP_TYPES } from '../../data/cropTypes';
import { MACHINE_TYPES } from '../../data/machineTypes';


const SUBASTA_COLORS = {
  rarityCommon:    '#607d8b',
  rarityUncommon:  '#7b5ea7',
  rarityRare:      '#c9962a',
  gradeS:          '#7eb8f7',
  condGoodColor:   C.green,
  condGoodBg:      C.bgElevated,
  condFairBg:      '#3a2a0a',
  condPoorBg:      '#3a1a0a',
  breedName:       '#e0e0e0',
  dimText:         '#555',
} as const;

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
        <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
          <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Auction</Text>
        </View>
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
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider }}>
        <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>Auction</Text>
      </View>
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
    const urgentColor = daysLeft <= 2 ? C.red : daysLeft <= 5 ? C.orange : C.textMuted;
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
            <TextInput style={styles.bidInput} keyboardType="numeric" placeholder={`Min: $${minBid.toLocaleString()}`} placeholderTextColor={SUBASTA_COLORS.dimText} value={bidText} onChangeText={v => setBidInputs(b => ({ ...b, [lot.id]: v }))} />
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

const RARITY_COLORS: Record<BreedRarity, string> = {
  common:   SUBASTA_COLORS.rarityCommon,
  uncommon: SUBASTA_COLORS.rarityUncommon,
  rare:     SUBASTA_COLORS.rarityRare,
};

function BreedBadge({ breedId }: { breedId?: string }) {
  if (!breedId) return <Text style={{ color: SUBASTA_COLORS.rarityCommon, fontSize: 11 }}>Mixed</Text>;
  const breed = BREED_TYPES.find(b => b.id === breedId);
  if (!breed) return <Text style={{ color: SUBASTA_COLORS.rarityCommon, fontSize: 11 }}>Mixed</Text>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
      <View style={{ backgroundColor: RARITY_COLORS[breed.rarity], borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
        <Text style={{ color: C.white, fontSize: 10, fontWeight: 'bold' }}>
          {breed.rarity.toUpperCase()}
        </Text>
      </View>
      <Text style={{ color: SUBASTA_COLORS.breedName, fontSize: 12, fontWeight: '600' }}>{breed.name}</Text>
      <Text style={{ color: C.textMuted, fontSize: 11 }}>· {breed.purposeLabel}</Text>
    </View>
  );
}

// Placeholder components — will be replaced in Tasks 5, 6, 7
function geneLabel(score: number): { grade: string; color: string } {
  if (score >= 1.3) return { grade: 'S', color: SUBASTA_COLORS.gradeS };
  if (score >= 1.15) return { grade: 'A', color: C.green };
  if (score >= 1.0)  return { grade: 'B', color: C.amber };
  if (score >= 0.85) return { grade: 'C', color: C.red };
  return { grade: 'D', color: C.textMuted };
}

function AnimalView({ listings, day, money, placeBid, listItem, withdrawListing,
                      nextAnimalAuctionDay, animals, bidInputs, setBidInputs }: {
  listings: AuctionListing[];
  day: number; money: number;
  placeBid: (id: string, amount: number) => void;
  listItem: (params: any) => void;
  withdrawListing: (id: string) => void;
  nextAnimalAuctionDay: number;
  animals: OwnedAnimal[];
  bidInputs: Record<string, string>;
  setBidInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [showListForm, setShowListForm] = React.useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = React.useState<string | null>(null);
  const [startBidInput, setStartBidInput] = React.useState('');
  const [reserveInput, setReserveInput] = React.useState('');

  const daysToEvent = nextAnimalAuctionDay - day;
  const activeListings = listings.filter(l => !l.resolved && l.category === 'animal');
  const playerListings = activeListings.filter(l => l.sellerId === 'player');
  const npcListings = activeListings.filter(l => l.sellerId !== 'player');
  const resolvedListings = listings.filter(l => l.resolved && l.category === 'animal').slice(-5).reverse();

  function renderAnimalCard(listing: AuctionListing, isPlayer: boolean) {
    const animalTypeDef = ANIMAL_TYPES.find((a: any) => a.id === listing.animalTypeId);
    const score = listing.animalGenes ? geneScore(listing.animalGenes) : 1.0;
    const { grade, color } = geneLabel(score);
    const minBid = Math.ceil(listing.currentBid * 1.05);
    const bidText = bidInputs[listing.id] ?? '';
    const bidAmount = parseFloat(bidText.replace(/,/g, '')) || 0;
    const canBid = !isPlayer && bidAmount >= minBid && money >= bidAmount;
    const hasBids = listing.bids.length > 0;

    return (
      <View key={listing.id} style={[anStyles.card, listing.playerWon === true && anStyles.cardWon]}>
        <View style={anStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={anStyles.cardTitle}>{animalTypeDef?.name ?? listing.animalTypeId}</Text>
            <BreedBadge breedId={listing.animalBreedId} />
            {listing.animalBreedId && (() => {
              const breed = BREED_TYPES.find(b => b.id === listing.animalBreedId);
              return breed ? (
                <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                  🌍 {breed.originCountry} · {breed.description}
                </Text>
              ) : null;
            })()}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 3, alignItems: 'center' }}>
              <View style={[anStyles.gradeBadge, { backgroundColor: color + '33', borderColor: color }]}>
                <Text style={[anStyles.gradeText, { color }]}>Grade {grade}</Text>
              </View>
              {listing.sellerId === 'player' && <Text style={anStyles.yourTag}>Your listing</Text>}
            </View>
            {listing.animalGenes && (() => {
              const genes = listing.animalGenes!;
              return (
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  {(['production', 'hardiness', 'growth', 'value'] as const).map((key, i) => {
                    const gColor = ['#4caf50', '#64b5f6', '#ce93d8', '#ffcc80'][i];
                    const { grade: g } = geneLabel(genes[key]);
                    return (
                      <Text key={key} style={{ color: gColor, fontSize: 10, backgroundColor: gColor + '22', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                        {['Prd', 'Hrd', 'Grw', 'Val'][i]} {g}
                      </Text>
                    );
                  })}
                </View>
              );
            })()}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={anStyles.currentBid}>${listing.currentBid.toLocaleString()}</Text>
            <Text style={anStyles.bidSub}>current bid</Text>
          </View>
        </View>

        {!isPlayer && !listing.resolved && (
          <View style={anStyles.bidRow}>
            <TextInput
              style={anStyles.bidInput}
              keyboardType="numeric"
              placeholder={`Min: $${minBid.toLocaleString()}`}
              placeholderTextColor={SUBASTA_COLORS.dimText}
              value={bidText}
              onChangeText={v => setBidInputs(b => ({ ...b, [listing.id]: v }))}
            />
            <TouchableOpacity
              style={[anStyles.bidBtn, !canBid && anStyles.bidBtnDisabled]}
              disabled={!canBid}
              onPress={() => { placeBid(listing.id, bidAmount); setBidInputs(b => ({ ...b, [listing.id]: '' })); }}
            >
              <Text style={anStyles.bidBtnText}>Bid</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPlayer && !listing.resolved && (
          <TouchableOpacity
            style={[anStyles.withdrawBtn, hasBids && anStyles.withdrawBtnDisabled]}
            disabled={hasBids}
            onPress={() => withdrawListing(listing.id)}
          >
            <Text style={anStyles.withdrawBtnText}>
              {hasBids ? 'Bids placed — cannot withdraw' : 'Withdraw'}
            </Text>
          </TouchableOpacity>
        )}

        {listing.resolved && (
          <Text style={[anStyles.resolvedTag, listing.playerWon ? { color: C.green } : { color: C.textFaint }]}>
            {listing.playerWon ? '🏆 Won' : listing.sellerId === 'player' ? '💰 Sold' : '❌ Lost'}
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Event countdown banner */}
      <View style={anStyles.eventBanner}>
        <View>
          <Text style={anStyles.eventTitle}>⚡ County Livestock Auction</Text>
          <Text style={anStyles.eventSub}>Resolves Day {nextAnimalAuctionDay} · List before that day</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={anStyles.eventDays}>{daysToEvent <= 0 ? 'Today!' : `${daysToEvent}d`}</Text>
          <Text style={anStyles.eventDaysSub}>remaining</Text>
        </View>
      </View>

      {/* Player listings */}
      <Text style={styles.sectionLabel}>Your Listings ({playerListings.length})</Text>
      {playerListings.map(l => renderAnimalCard(l, true))}

      {/* List an animal form */}
      {!showListForm ? (
        <TouchableOpacity style={anStyles.listBtn} onPress={() => setShowListForm(true)}>
          <Text style={anStyles.listBtnText}>+ List an Animal</Text>
        </TouchableOpacity>
      ) : (
        <View style={anStyles.listForm}>
          <Text style={anStyles.formTitle}>List an Animal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {animals.map(a => {
              const typeDef = ANIMAL_TYPES.find((t: any) => t.id === a.typeId);
              const score = a.genes ? geneScore(a.genes) : 1.0;
              const { grade, color } = geneLabel(score);
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[anStyles.animalChip, selectedAnimalId === a.id && anStyles.animalChipActive]}
                  onPress={() => setSelectedAnimalId(a.id)}
                >
                  <Text style={anStyles.animalChipName}>{typeDef?.name ?? a.typeId}</Text>
                  <Text style={[anStyles.animalChipGrade, { color }]}>Grade {grade}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={anStyles.formLabel}>Starting Bid</Text>
              <TextInput style={anStyles.formInput} keyboardType="numeric" value={startBidInput} onChangeText={setStartBidInput} placeholder="$0" placeholderTextColor={SUBASTA_COLORS.dimText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={anStyles.formLabel}>Reserve Price</Text>
              <TextInput style={anStyles.formInput} keyboardType="numeric" value={reserveInput} onChangeText={setReserveInput} placeholder="$0" placeholderTextColor={SUBASTA_COLORS.dimText} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[anStyles.confirmBtn, (!selectedAnimalId || !startBidInput) && anStyles.confirmBtnDisabled]}
              disabled={!selectedAnimalId || !startBidInput}
              onPress={() => {
                if (!selectedAnimalId) return;
                const sb = parseInt(startBidInput) || 0;
                const rp = parseInt(reserveInput) || sb;
                listItem({ category: 'animal', animalId: selectedAnimalId, startingBid: sb, reservePrice: rp, durationDays: 7 });
                setShowListForm(false); setSelectedAnimalId(null); setStartBidInput(''); setReserveInput('');
              }}
            >
              <Text style={anStyles.confirmBtnText}>Confirm Listing</Text>
            </TouchableOpacity>
            <TouchableOpacity style={anStyles.cancelBtn} onPress={() => setShowListForm(false)}>
              <Text style={anStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* NPC listings */}
      <Text style={styles.sectionLabel}>NPC Listings ({npcListings.length})</Text>
      {npcListings.length === 0
        ? <Text style={styles.emptyHint}>No animals listed yet — check back after the event.</Text>
        : npcListings.map(l => renderAnimalCard(l, false))}

      {/* History */}
      {resolvedListings.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Recent Results</Text>
          {resolvedListings.map(l => renderAnimalCard(l, false))}
        </>
      )}
    </ScrollView>
  );
}

const anStyles = StyleSheet.create({
  card:              { backgroundColor: C.bgCard, borderRadius: R.lg, marginHorizontal: S.md, marginVertical: 5, padding: S.md, borderWidth: 1, borderColor: C.border },
  cardWon:           { borderColor: C.green },
  cardHeader:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: S.sm },
  cardTitle:         { color: C.text, fontWeight: 'bold', fontSize: F.size.lg },
  gradeBadge:        { borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: 2, borderWidth: 1 },
  gradeText:         { fontSize: 11, fontWeight: 'bold' },
  yourTag:           { color: C.textMuted, fontSize: F.size.xs, fontStyle: 'italic' },
  currentBid:        { color: C.white, fontWeight: 'bold', fontSize: 15 },
  bidSub:            { color: SUBASTA_COLORS.dimText, fontSize: 9 },
  bidRow:            { flexDirection: 'row', gap: 8, marginTop: S.xs },
  bidInput:          { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.md, borderWidth: 1, borderColor: C.border, color: C.text, padding: 10, fontSize: F.size.md },
  bidBtn:            { backgroundColor: C.amber, borderRadius: R.md, paddingHorizontal: S.lg, justifyContent: 'center' },
  bidBtnDisabled:    { backgroundColor: C.bgElevated },
  bidBtnText:        { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  withdrawBtn:       { marginTop: 6, backgroundColor: C.redDark, borderRadius: R.md, paddingVertical: 7, alignItems: 'center' },
  withdrawBtnDisabled:{ backgroundColor: C.bgElevated },
  withdrawBtnText:   { color: C.white, fontSize: F.size.sm, fontWeight: 'bold' },
  resolvedTag:       { marginTop: 6, fontSize: F.size.md, fontWeight: 'bold' },
  eventBanner:       { margin: S.md, backgroundColor: C.bgElevated, borderRadius: 10, padding: S.md, borderWidth: 1, borderColor: C.amber, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle:        { color: C.amber, fontWeight: 'bold', fontSize: F.size.md },
  eventSub:          { color: C.textMuted, fontSize: F.size.xs, marginTop: 2 },
  eventDays:         { color: C.amber, fontSize: F.size.title, fontWeight: 'bold' },
  eventDaysSub:      { color: C.textMuted, fontSize: 9 },
  listBtn:           { margin: S.md, borderRadius: 10, padding: S.md, borderWidth: 1, borderColor: C.green, borderStyle: 'dashed', alignItems: 'center' },
  listBtnText:       { color: C.green, fontWeight: 'bold', fontSize: F.size.md },
  listForm:          { margin: S.md, backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  formTitle:         { color: C.text, fontWeight: 'bold', fontSize: F.size.lg, marginBottom: 10 },
  formLabel:         { color: C.textMuted, fontSize: F.size.xs, marginBottom: S.xs },
  formInput:         { backgroundColor: C.bgDeep, borderRadius: R.md, color: C.text, padding: 10, fontSize: F.size.md, borderWidth: 1, borderColor: C.border },
  animalChip:        { backgroundColor: C.bgDeep, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm, marginRight: 6, borderWidth: 1, borderColor: C.border },
  animalChipActive:  { borderColor: C.green, backgroundColor: C.bgCard },
  animalChipName:    { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  animalChipGrade:   { fontSize: F.size.xs, marginTop: 2 },
  confirmBtn:        { flex: 1, backgroundColor: C.blue, borderRadius: R.md, paddingVertical: 10, alignItems: 'center' },
  confirmBtnDisabled:{ backgroundColor: C.bgElevated },
  confirmBtnText:    { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  cancelBtn:         { backgroundColor: C.bgElevated, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText:     { color: C.textMuted, fontSize: F.size.md },
});

function CropView({ listings, day, money, placeBid, listItem, withdrawListing,
                    inventory, bidInputs, setBidInputs }: {
  listings: AuctionListing[];
  day: number; money: number;
  placeBid: (id: string, amount: number) => void;
  listItem: (params: any) => void;
  withdrawListing: (id: string) => void;
  inventory: Record<string, number>;
  bidInputs: Record<string, string>;
  setBidInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [cropId, setCropId] = React.useState<string>(CROP_TYPES[0].id);
  const [qtyInput, setQtyInput] = React.useState('');
  const [startBidInput, setStartBidInput] = React.useState('');
  const [reserveInput, setReserveInput] = React.useState('');
  const [termDays, setTermDays] = React.useState<3 | 7 | 14>(7);

  const activeListings = listings.filter(l => !l.resolved && l.category === 'crop');
  const playerListings = activeListings.filter(l => l.sellerId === 'player');
  const npcListings = activeListings.filter(l => l.sellerId !== 'player');
  const resolvedListings = listings.filter(l => l.resolved && l.category === 'crop').slice(-5).reverse();
  const stockedCrops = CROP_TYPES.filter(c => (inventory[c.id] ?? 0) > 0);
  const inStock = inventory[cropId] ?? 0;
  const parsedQty = parseInt(qtyInput) || 0;
  const parsedBid = parseInt(startBidInput) || 0;
  const parsedReserve = parseInt(reserveInput) || parsedBid;
  const canList = parsedQty > 0 && parsedQty <= inStock && parsedBid > 0;

  function renderCropCard(listing: AuctionListing, isPlayer: boolean) {
    const cropDef = CROP_TYPES.find(c => c.id === listing.cropId);
    const daysLeft = listing.expiresDay - day;
    const minBid = Math.ceil(listing.currentBid * 1.05);
    const bidText = bidInputs[listing.id] ?? '';
    const bidAmount = parseFloat(bidText.replace(/,/g, '')) || 0;
    const canBid = !isPlayer && bidAmount >= minBid && money >= bidAmount;
    const hasBids = listing.bids.some(b => !b.isPlayer);
    return (
      <View key={listing.id} style={[cropStyles.card, listing.playerWon === true && cropStyles.cardWon]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <View>
            <Text style={cropStyles.cardTitle}>{cropDef?.name ?? listing.cropId}</Text>
            <Text style={cropStyles.cardSub}>{listing.cropQuantity?.toLocaleString()} {cropDef?.unit ?? 'units'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={cropStyles.currentBid}>${listing.currentBid.toLocaleString()}</Text>
            {!listing.resolved && <Text style={cropStyles.daysLeft}>{daysLeft}d left</Text>}
          </View>
        </View>
        {!isPlayer && !listing.resolved && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[cropStyles.bidInput, { flex: 1 }]} keyboardType="numeric" placeholder={`Min $${minBid.toLocaleString()}`} placeholderTextColor={SUBASTA_COLORS.dimText} value={bidText} onChangeText={v => setBidInputs(b => ({ ...b, [listing.id]: v }))} />
            <TouchableOpacity style={[cropStyles.bidBtn, !canBid && cropStyles.bidBtnDisabled]} disabled={!canBid} onPress={() => { placeBid(listing.id, bidAmount); setBidInputs(b => ({ ...b, [listing.id]: '' })); }}>
              <Text style={cropStyles.bidBtnText}>Bid</Text>
            </TouchableOpacity>
          </View>
        )}
        {isPlayer && !listing.resolved && (
          <TouchableOpacity style={[cropStyles.withdrawBtn, hasBids && cropStyles.withdrawBtnDisabled]} disabled={hasBids} onPress={() => withdrawListing(listing.id)}>
            <Text style={cropStyles.withdrawBtnText}>{hasBids ? 'Bids placed — cannot withdraw' : 'Withdraw'}</Text>
          </TouchableOpacity>
        )}
        {listing.resolved && (
          <Text style={{ color: listing.playerWon ? C.green : C.textFaint, fontSize: 12, marginTop: 4 }}>
            {listing.playerWon ? '🏆 Won' : listing.sellerId === 'player' ? (listing.currentBid > listing.startingBid ? '💰 Sold' : '📋 Reserve not met') : '❌ Lost'}
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* List crops form */}
      <View style={cropStyles.form}>
        <Text style={cropStyles.formTitle}>List Crops for Auction</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {stockedCrops.length === 0
            ? <Text style={{ color: SUBASTA_COLORS.dimText, fontSize: 12 }}>No crops in inventory</Text>
            : stockedCrops.map(c => (
              <TouchableOpacity key={c.id} style={[cropStyles.cropChip, cropId === c.id && cropStyles.cropChipActive]} onPress={() => setCropId(c.id)}>
                <Text style={[cropStyles.cropChipText, cropId === c.id && { color: C.white }]}>{c.name}</Text>
                <Text style={cropStyles.cropChipStock}>{Math.round(inventory[c.id] ?? 0)} {c.unit}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={{ flex: 1 }}><Text style={cropStyles.label}>Quantity</Text><TextInput style={cropStyles.input} keyboardType="numeric" value={qtyInput} onChangeText={setQtyInput} placeholder={`Max ${Math.round(inStock)}`} placeholderTextColor={SUBASTA_COLORS.dimText} /></View>
          <View style={{ flex: 1 }}><Text style={cropStyles.label}>Starting Bid</Text><TextInput style={cropStyles.input} keyboardType="numeric" value={startBidInput} onChangeText={setStartBidInput} placeholder="$0" placeholderTextColor={SUBASTA_COLORS.dimText} /></View>
          <View style={{ flex: 1 }}><Text style={cropStyles.label}>Reserve</Text><TextInput style={cropStyles.input} keyboardType="numeric" value={reserveInput} onChangeText={setReserveInput} placeholder="$0" placeholderTextColor={SUBASTA_COLORS.dimText} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {([3, 7, 14] as const).map(t => (
            <TouchableOpacity key={t} style={[cropStyles.termBtn, termDays === t && cropStyles.termBtnActive]} onPress={() => setTermDays(t)}>
              <Text style={[cropStyles.termText, termDays === t && { color: C.white }]}>{t}d</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[cropStyles.listBtn, !canList && cropStyles.listBtnDisabled]} disabled={!canList} onPress={() => {
          listItem({ category: 'crop', cropId, cropQuantity: parsedQty, startingBid: parsedBid, reservePrice: parsedReserve, durationDays: termDays });
          setQtyInput(''); setStartBidInput(''); setReserveInput('');
        }}>
          <Text style={cropStyles.listBtnText}>{canList ? `List ${parsedQty.toLocaleString()} ${CROP_TYPES.find(c => c.id === cropId)?.unit ?? 'units'} for ${termDays}d` : 'Enter quantity & bid'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Your Listings ({playerListings.length})</Text>
      {playerListings.length === 0 ? <Text style={styles.emptyHint}>No active listings.</Text> : playerListings.map(l => renderCropCard(l, true))}

      <Text style={styles.sectionLabel}>NPC Listings ({npcListings.length})</Text>
      {npcListings.length === 0 ? <Text style={styles.emptyHint}>No NPC crop listings yet.</Text> : npcListings.map(l => renderCropCard(l, false))}

      {resolvedListings.length > 0 && (
        <><Text style={styles.sectionLabel}>Recent Results</Text>{resolvedListings.map(l => renderCropCard(l, false))}</>
      )}
    </ScrollView>
  );
}

const cropStyles = StyleSheet.create({
  form:              { margin: S.md, backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  formTitle:         { color: C.text, fontWeight: 'bold', fontSize: F.size.lg, marginBottom: 10 },
  label:             { color: C.textMuted, fontSize: F.size.xs, marginBottom: S.xs },
  input:             { backgroundColor: C.bgDeep, borderRadius: R.md, color: C.text, padding: S.sm, fontSize: F.size.sm, borderWidth: 1, borderColor: C.border },
  cropChip:          { backgroundColor: C.bgDeep, borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, borderWidth: 1, borderColor: C.border },
  cropChipActive:    { borderColor: C.green, backgroundColor: C.bgCard },
  cropChipText:      { color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold' },
  cropChipStock:     { color: SUBASTA_COLORS.dimText, fontSize: 9 },
  termBtn:           { backgroundColor: C.bgDeep, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
  termBtnActive:     { backgroundColor: C.blue, borderColor: C.blue },
  termText:          { color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold' },
  listBtn:           { backgroundColor: C.blue, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  listBtnDisabled:   { backgroundColor: C.bgElevated },
  listBtnText:       { color: C.white, fontWeight: 'bold', fontSize: F.size.sm },
  card:              { backgroundColor: C.bgCard, borderRadius: 10, marginHorizontal: S.md, marginVertical: S.xs, padding: S.md, borderWidth: 1, borderColor: C.border },
  cardWon:           { borderColor: C.green },
  cardTitle:         { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  cardSub:           { color: C.textMuted, fontSize: 11, marginTop: 1 },
  currentBid:        { color: C.white, fontWeight: 'bold', fontSize: F.size.lg },
  daysLeft:          { color: C.textMuted, fontSize: F.size.xs, marginTop: 1 },
  bidInput:          { backgroundColor: C.bgDeep, borderRadius: R.md, borderWidth: 1, borderColor: C.border, color: C.text, padding: S.sm, fontSize: F.size.md },
  bidBtn:            { backgroundColor: C.amber, borderRadius: R.md, paddingHorizontal: 14, justifyContent: 'center' },
  bidBtnDisabled:    { backgroundColor: C.bgElevated },
  bidBtnText:        { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  withdrawBtn:       { marginTop: 6, backgroundColor: C.redDark, borderRadius: R.md, paddingVertical: 6, alignItems: 'center' },
  withdrawBtnDisabled:{ backgroundColor: C.bgElevated },
  withdrawBtnText:   { color: C.white, fontSize: 11, fontWeight: 'bold' },
});

function computeConditionScore(machine: OwnedMachine, day: number, machineRepairs: any[]): number {
  const ageDays = day - machine.purchasedDay;
  const repairs = machineRepairs.filter((r: any) => r.machineId === machine.id);
  const repairedOnTime = repairs.filter((r: any) => r.readyDay !== null).length;
  const missedRepairs = repairs.filter((r: any) => r.startDay === null).length;
  return Math.min(100, Math.max(0,
    100 - Math.floor(ageDays / 5) + repairedOnTime * 3 - missedRepairs * 8
  ));
}

function conditionLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: 'Good', color: SUBASTA_COLORS.condGoodColor, bg: SUBASTA_COLORS.condGoodBg };
  if (score >= 40) return { label: 'Fair', color: C.amber, bg: SUBASTA_COLORS.condFairBg };
  return { label: 'Poor', color: C.red, bg: SUBASTA_COLORS.condPoorBg };
}

function MachineryView({ listings, day, money, placeBid, listItem, withdrawListing,
                         machines, bidInputs, setBidInputs }: {
  listings: AuctionListing[];
  day: number; money: number;
  placeBid: (id: string, amount: number) => void;
  listItem: (params: any) => void;
  withdrawListing: (id: string) => void;
  machines: any[];
  bidInputs: Record<string, string>;
  setBidInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const { machineRepairs } = useGameStore.getState();
  const [selectedMachineId, setSelectedMachineId] = React.useState<string | null>(null);
  const [startBidInput, setStartBidInput] = React.useState('');
  const [reserveInput, setReserveInput] = React.useState('');
  const [termDays, setTermDays] = React.useState<3 | 7 | 14>(7);

  const activeListings = listings.filter(l => !l.resolved && l.category === 'machinery');
  const playerListings = activeListings.filter(l => l.sellerId === 'player');
  const npcListings = activeListings.filter(l => l.sellerId !== 'player');
  const resolvedListings = listings.filter(l => l.resolved && l.category === 'machinery').slice(-5).reverse();

  const eligibleMachines = (machines ?? []).filter((m: OwnedMachine) => {
    const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
    return mt && (mt.category === 'tractor' || mt.category === 'harvester');
  });

  const selectedMachine = eligibleMachines.find((m: OwnedMachine) => m.id === selectedMachineId);
  const selectedMachineType = selectedMachine ? MACHINE_TYPES.find(t => t.id === selectedMachine.typeId) : null;
  const selectedCondition = selectedMachine ? computeConditionScore(selectedMachine, day, machineRepairs ?? []) : 0;
  const suggestedPrice = selectedMachineType ? Math.round(selectedMachineType.cost * (selectedCondition / 100) * 0.70) : 0;
  const { label: condLabel, color: condColor } = conditionLabel(selectedCondition);

  const parsedBid = parseInt(startBidInput) || 0;
  const parsedReserve = parseInt(reserveInput) || parsedBid;
  const canList = !!selectedMachineId && parsedBid > 0;

  function renderMachineCard(listing: AuctionListing, isPlayer: boolean) {
    const machineType = MACHINE_TYPES.find(t => t.id === listing.machineTypeId);
    const daysLeft = listing.expiresDay - day;
    const score = listing.conditionScore ?? 70;
    const { label, color, bg } = conditionLabel(score);
    const minBid = Math.ceil(listing.currentBid * 1.05);
    const bidText = bidInputs[listing.id] ?? '';
    const bidAmount = parseFloat(bidText.replace(/,/g, '')) || 0;
    const canBid = !isPlayer && bidAmount >= minBid && money >= bidAmount;
    const hasBids = listing.bids.some(b => !b.isPlayer);
    return (
      <View key={listing.id} style={[mStyles.card, listing.playerWon === true && mStyles.cardWon]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={mStyles.cardTitle}>{machineType?.name ?? listing.machineTypeId}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 3, alignItems: 'center' }}>
              <View style={[mStyles.condBadge, { backgroundColor: bg }]}>
                <Text style={[mStyles.condText, { color }]}>{label} {score}/100</Text>
              </View>
              {!listing.resolved && <Text style={mStyles.daysLeft}>{daysLeft}d left</Text>}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={mStyles.currentBid}>${listing.currentBid.toLocaleString()}</Text>
            {listing.sellerId !== 'player' && <Text style={mStyles.sellerName}>NPC Farm</Text>}
          </View>
        </View>
        {!isPlayer && !listing.resolved && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[mStyles.bidInput, { flex: 1 }]} keyboardType="numeric" placeholder={`Min $${minBid.toLocaleString()}`} placeholderTextColor={SUBASTA_COLORS.dimText} value={bidText} onChangeText={v => setBidInputs(b => ({ ...b, [listing.id]: v }))} />
            <TouchableOpacity style={[mStyles.bidBtn, !canBid && mStyles.bidBtnDisabled]} disabled={!canBid} onPress={() => { placeBid(listing.id, bidAmount); setBidInputs(b => ({ ...b, [listing.id]: '' })); }}>
              <Text style={mStyles.bidBtnText}>Bid</Text>
            </TouchableOpacity>
          </View>
        )}
        {isPlayer && !listing.resolved && (
          <TouchableOpacity style={[mStyles.withdrawBtn, hasBids && mStyles.withdrawBtnDisabled]} disabled={hasBids} onPress={() => withdrawListing(listing.id)}>
            <Text style={mStyles.withdrawBtnText}>{hasBids ? 'Bids placed — cannot withdraw' : 'Withdraw'}</Text>
          </TouchableOpacity>
        )}
        {listing.resolved && (
          <Text style={{ color: listing.playerWon ? C.green : C.textFaint, fontSize: 12, marginTop: 4 }}>
            {listing.playerWon ? '🏆 Won' : listing.sellerId === 'player' ? (listing.currentBid > listing.startingBid ? '💰 Sold' : '📋 Reserve not met') : '❌ Lost'}
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* List machine form */}
      <View style={mStyles.form}>
        <Text style={mStyles.formTitle}>List a Machine</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {eligibleMachines.length === 0
            ? <Text style={{ color: SUBASTA_COLORS.dimText, fontSize: 12 }}>No tractors or combines to list</Text>
            : eligibleMachines.map((m: OwnedMachine) => {
              const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
              const score = computeConditionScore(m, day, machineRepairs ?? []);
              const { label, color } = conditionLabel(score);
              return (
                <TouchableOpacity key={m.id} style={[mStyles.machineChip, selectedMachineId === m.id && mStyles.machineChipActive]} onPress={() => {
                  setSelectedMachineId(m.id);
                  const sugg = mt ? Math.round(mt.cost * (score / 100) * 0.70) : 0;
                  setStartBidInput(String(Math.round(sugg * 0.8)));
                  setReserveInput(String(sugg));
                }}>
                  <Text style={mStyles.machineChipName}>{mt?.name ?? m.typeId}</Text>
                  <Text style={[mStyles.machineChipCond, { color }]}>{label} {score}/100</Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        {selectedMachine && (
          <View style={mStyles.condBar}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={mStyles.condBarLabel}>Condition</Text>
              <Text style={[mStyles.condBarScore, { color: condColor }]}>{condLabel} {selectedCondition}/100</Text>
            </View>
            <View style={mStyles.condBarTrack}>
              <View style={[mStyles.condBarFill, { width: `${selectedCondition}%` as any, backgroundColor: condColor }]} />
            </View>
            <Text style={mStyles.condBarHint}>Suggested price: ${suggestedPrice.toLocaleString()}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={{ flex: 1 }}><Text style={mStyles.label}>Starting Bid</Text><TextInput style={mStyles.input} keyboardType="numeric" value={startBidInput} onChangeText={setStartBidInput} placeholder="$0" placeholderTextColor={SUBASTA_COLORS.dimText} /></View>
          <View style={{ flex: 1 }}><Text style={mStyles.label}>Reserve Price</Text><TextInput style={mStyles.input} keyboardType="numeric" value={reserveInput} onChangeText={setReserveInput} placeholder="$0" placeholderTextColor={SUBASTA_COLORS.dimText} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {([3, 7, 14] as const).map(t => (
            <TouchableOpacity key={t} style={[mStyles.termBtn, termDays === t && mStyles.termBtnActive]} onPress={() => setTermDays(t)}>
              <Text style={[mStyles.termText, termDays === t && { color: C.white }]}>{t}d</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[mStyles.listBtn, !canList && mStyles.listBtnDisabled]} disabled={!canList} onPress={() => {
          if (!selectedMachineId) return;
          listItem({ category: 'machinery', machineId: selectedMachineId, startingBid: parsedBid, reservePrice: parsedReserve, durationDays: termDays });
          setSelectedMachineId(null); setStartBidInput(''); setReserveInput('');
        }}>
          <Text style={mStyles.listBtnText}>{canList ? 'List for Auction' : 'Select a machine & set price'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Your Listings ({playerListings.length})</Text>
      {playerListings.length === 0 ? <Text style={styles.emptyHint}>No machines listed.</Text> : playerListings.map(l => renderMachineCard(l, true))}

      <Text style={styles.sectionLabel}>NPC Listings ({npcListings.length})</Text>
      {npcListings.length === 0 ? <Text style={styles.emptyHint}>No NPC machinery listed yet.</Text> : npcListings.map(l => renderMachineCard(l, false))}

      {resolvedListings.length > 0 && (
        <><Text style={styles.sectionLabel}>Recent Results</Text>{resolvedListings.map(l => renderMachineCard(l, false))}</>
      )}
    </ScrollView>
  );
}

const mStyles = StyleSheet.create({
  form:              { margin: S.md, backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  formTitle:         { color: C.text, fontWeight: 'bold', fontSize: F.size.lg, marginBottom: 10 },
  label:             { color: C.textMuted, fontSize: F.size.xs, marginBottom: S.xs },
  input:             { backgroundColor: C.bgDeep, borderRadius: R.md, color: C.text, padding: S.sm, fontSize: F.size.sm, borderWidth: 1, borderColor: C.border },
  machineChip:       { backgroundColor: C.bgDeep, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm, marginRight: 6, borderWidth: 1, borderColor: C.border },
  machineChipActive: { borderColor: C.blue, backgroundColor: C.bgElevated },
  machineChipName:   { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  machineChipCond:   { fontSize: F.size.xs, marginTop: 2 },
  condBar:           { backgroundColor: C.bgDeep, borderRadius: R.md, padding: 10, marginBottom: 10 },
  condBarLabel:      { color: C.textMuted, fontSize: F.size.xs },
  condBarScore:      { fontSize: 11, fontWeight: 'bold' },
  condBarTrack:      { backgroundColor: C.bgElevated, borderRadius: R.xs, height: 6, marginBottom: S.xs },
  condBarFill:       { height: 6, borderRadius: R.xs },
  condBarHint:       { color: C.textFaint, fontSize: F.size.xs },
  termBtn:           { backgroundColor: C.bgDeep, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
  termBtnActive:     { backgroundColor: C.blue, borderColor: C.blue },
  termText:          { color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold' },
  listBtn:           { backgroundColor: C.blue, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  listBtnDisabled:   { backgroundColor: C.bgElevated },
  listBtnText:       { color: C.white, fontWeight: 'bold', fontSize: F.size.sm },
  card:              { backgroundColor: C.bgCard, borderRadius: 10, marginHorizontal: S.md, marginVertical: S.xs, padding: S.md, borderWidth: 1, borderColor: C.border },
  cardWon:           { borderColor: C.green },
  cardTitle:         { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  condBadge:         { borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: 2 },
  condText:          { fontSize: F.size.xs, fontWeight: 'bold' },
  daysLeft:          { color: C.textMuted, fontSize: F.size.xs },
  currentBid:        { color: C.white, fontWeight: 'bold', fontSize: F.size.lg },
  sellerName:        { color: SUBASTA_COLORS.dimText, fontSize: 9 },
  bidInput:          { backgroundColor: C.bgDeep, borderRadius: R.md, borderWidth: 1, borderColor: C.border, color: C.text, padding: S.sm, fontSize: F.size.md },
  bidBtn:            { backgroundColor: C.amber, borderRadius: R.md, paddingHorizontal: 14, justifyContent: 'center' },
  bidBtnDisabled:    { backgroundColor: C.bgElevated },
  bidBtnText:        { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  withdrawBtn:       { marginTop: 6, backgroundColor: C.redDark, borderRadius: R.md, paddingVertical: 6, alignItems: 'center' },
  withdrawBtnDisabled:{ backgroundColor: C.bgElevated },
  withdrawBtnText:   { color: C.white, fontSize: 11, fontWeight: 'bold' },
});

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  backBtn:         { paddingHorizontal: S.lg, paddingVertical: S.sm },
  backBtnText:     { color: C.text, fontSize: F.size.md },
  sectionLabel:    { color: C.textMuted, fontSize: F.size.md, paddingHorizontal: S.lg, marginTop: 10, marginBottom: 6 },
  emptyHint:       { color: C.textFaint, fontSize: F.size.sm, paddingHorizontal: S.lg },

  // Hub grid
  grid:            { flexDirection: 'row', flexWrap: 'wrap', padding: S.md, gap: 10 },
  tile:            { width: '47%', backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  tileAnimal:      { borderColor: C.amber, backgroundColor: C.bgElevated },
  tileIcon:        { fontSize: 28, marginBottom: S.xs },
  tileLabel:       { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  tileLabelAnimal: { color: C.amber },
  tileSub:         { color: C.textFaint, fontSize: 11, marginTop: 2 },
  tileSubAnimal:   { color: C.amber },

  // Active bids strip
  bidsStrip:       { margin: S.md, backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md },
  bidStripTitle:   { color: C.textFaint, fontSize: 9, letterSpacing: 1, marginBottom: S.sm },
  bidStripRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  bidStripLabel:   { color: C.text, fontSize: F.size.sm },
  bidStripStatus:  { fontSize: F.size.sm, fontWeight: 'bold' },

  // Shared land card styles
  card:            { backgroundColor: C.bgCard, borderRadius: R.lg, margin: 10, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: C.divider },
  cardWon:         { borderColor: C.green },
  cardLost:        { borderColor: C.border, opacity: 0.7 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  parcelTitle:     { color: C.text, fontWeight: 'bold', fontSize: 15, flex: 1 },
  daysLeft:        { fontSize: F.size.sm, fontWeight: 'bold' },
  resolved:        { fontSize: F.size.md, fontWeight: 'bold' },
  wonText:         { color: C.green },
  lostText:        { color: C.textFaint },
  infoRow:         { flexDirection: 'row', marginBottom: 10, gap: 8 },
  infoItem:        { flex: 1, backgroundColor: C.bgElevated, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  infoLabel:       { color: C.textFaint, fontSize: 9, marginBottom: 2 },
  infoValue:       { color: C.text, fontWeight: 'bold', fontSize: F.size.sm },
  bidInfo:         { backgroundColor: C.bgDeep, borderRadius: R.md, padding: 10, marginBottom: 10 },
  bidRow:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.xs },
  bidLabel:        { color: C.textFaint, fontSize: F.size.sm },
  currentBid:      { color: C.white, fontWeight: 'bold', fontSize: F.size.xl },
  startingBid:     { color: C.textMuted, fontSize: F.size.sm },
  playerBid:       { fontSize: F.size.sm, fontWeight: 'bold' },
  leading:         { color: C.green },
  outbid:          { color: C.amber },
  historyBox:      { backgroundColor: C.bgDeep, borderRadius: R.md, padding: S.sm, marginBottom: 10 },
  historyTitle:    { color: C.textFaint, fontSize: F.size.xs, marginBottom: S.xs },
  historyItem:     { color: C.textMuted, fontSize: 11, paddingVertical: 2 },
  historyItemPlayer:{ color: C.blue },
  bidInputRow:     { flexDirection: 'row', gap: 8 },
  bidInput:        { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.md, borderWidth: 1, borderColor: C.border, color: C.text, padding: 10, fontSize: F.size.lg },
  bidBtn:          { backgroundColor: C.amber, borderRadius: R.md, paddingHorizontal: 20, justifyContent: 'center' },
  bidBtnDisabled:  { backgroundColor: C.bgElevated },
  bidBtnText:      { color: C.white, fontWeight: 'bold', fontSize: F.size.lg },
  bidWarn:         { color: C.amber, fontSize: 11, marginTop: S.xs },
  emptyBox:        { alignItems: 'center', padding: 40 },
  emptyText:       { color: C.textFaint, fontSize: 15, marginBottom: S.sm },
  screenTitle: {
    color: C.text,
    fontSize: F.size.xl,
    fontWeight: F.weight.bold,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
});
