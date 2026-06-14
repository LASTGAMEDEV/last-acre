import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { NEIGHBOR_PROFILES, NEIGHBOR_IDS } from '../../data/neighborData';
import type { NeighborId } from '../../data/neighborData';
import type { NeighborStatus } from '../../features/neighbors/neighborTypes';

type CountyNewsItem = { icon: string; headline: string; color: string; tag: string };

function buildCountyNews(
  neighbors: Record<string, any>,
  npcFarms: any[],
  day: number
): CountyNewsItem[] {
  const items: CountyNewsItem[] = [];

  // Neighbor status events
  for (const id of NEIGHBOR_IDS) {
    const farm = neighbors[id];
    const profile = NEIGHBOR_PROFILES[id];
    if (!farm || !profile) continue;
    const status: NeighborStatus = farm.status ?? 'thriving';

    if (status === 'bankrupt') {
      items.push({ icon: '🔴', headline: `${profile.displayName} has gone bankrupt — watch for auction`, color: '#ef5350', tag: 'CRISIS' });
    } else if (status === 'struggling' && (farm.strugglingYears ?? 0) >= 2) {
      items.push({ icon: '🟡', headline: `${profile.displayName} entering 2nd year of struggle — land may go on market`, color: '#ffb74d', tag: 'RISK' });
    }

    // Recent farm events (last 3)
    const events: string[] = (farm.events ?? []).slice(-3);
    for (const ev of events) {
      items.push({ icon: '📋', headline: `${profile.displayName}: ${ev}`, color: C.textMuted, tag: 'UPDATE' });
    }

    // Relationship milestones
    const rel = farm.relationship ?? 50;
    if (rel >= 80) {
      items.push({ icon: '🤝', headline: `Strong alliance with ${profile.displayName} — +10% harvest help bonus`, color: '#81c784', tag: 'ALLY' });
    } else if (rel <= 20) {
      items.push({ icon: '😠', headline: `Strained relations with ${profile.displayName} — they may undercut your contracts`, color: '#ef9a9a', tag: 'RIVAL' });
    }
  }

  // NPC competitor sell pressure news
  const sellingSoon = (npcFarms ?? []).filter((f: any) => f.nextSellDay - day <= 3 && f.nextSellDay >= day);
  for (const f of sellingSoon.slice(0, 2)) {
    const crops = (f.specialization ?? []).join(', ') || 'crops';
    items.push({ icon: '⚠️', headline: `${f.name} selling ${crops} in ${f.nextSellDay - day}d — prices may dip`, color: '#f59e0b', tag: 'MARKET' });
  }

  // Wealthy rival
  const richRival = [...(npcFarms ?? [])].sort((a: any, b: any) => b.wealth - a.wealth)[0];
  if (richRival && richRival.wealth > 50000) {
    items.push({ icon: '🏭', headline: `${richRival.name} dominates the region with $${Math.round(richRival.wealth / 1000)}k in reserves`, color: '#ce93d8', tag: 'RIVAL' });
  }

  return items.slice(0, 8);
}

const STATUS_ICON: Record<NeighborStatus, string> = {
  thriving:   '🟢',
  struggling: '🟡',
  bankrupt:   '🔴',
  sold:       '⬜',
};

const STATUS_COLOR: Record<NeighborStatus, string> = {
  thriving:   '#81c784',
  struggling: '#ffb74d',
  bankrupt:   '#ef5350',
  sold:       '#555555',
};

function RelBar({ value }: { value: number }) {
  const color = value >= 60 ? '#81c784' : value >= 30 ? '#64b5f6' : '#ef5350';
  return (
    <View style={nf.relTrack}>
      <View style={[nf.relFill, { width: `${value}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const GIFT_OPTIONS = [
  { label: 'Small gift', amount: 50,  rel: 6 },
  { label: 'Nice gift',  amount: 200, rel: 12 },
  { label: 'Big gift',   amount: 500, rel: 20 },
];

export default function NeighborFarmsSection() {
  const {
    neighbors, pendingLandOpportunities = [], day, money, npcFarms,
    neighborActionCooldowns = {},
    visitNeighbor, sendNeighborGift, helpNeighborHarvest,
  } = useGameStore();
  const [giftModal, setGiftModal] = useState<NeighborId | null>(null);

  if (!neighbors) {
    return (
      <View style={nf.empty}>
        <Text style={nf.emptyIcon}>🏘️</Text>
        <Text style={nf.emptyTitle}>Neighbor data not available</Text>
        <Text style={nf.emptyDetail}>Neighbor tracking begins in Phase 3 of the game.</Text>
      </View>
    );
  }

  const hasOpportunities = pendingLandOpportunities.length > 0;
  const countyNews = buildCountyNews(neighbors as Record<string, any>, npcFarms ?? [], day);

  return (
    <>
    <ScrollView contentContainerStyle={nf.container} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

      {/* County News Feed */}
      {countyNews.length > 0 && (
        <>
          <Text style={nf.sectionHeader}>📰 County News</Text>
          <View style={nf.newsFeed}>
            {countyNews.map((item, i) => (
              <View key={i} style={[nf.newsRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#1a1a2a' }]}>
                <Text style={nf.newsIcon}>{item.icon}</Text>
                <Text style={[nf.newsHeadline, { color: item.color }]}>{item.headline}</Text>
                <View style={[nf.newsTag, { borderColor: item.color + '55' }]}>
                  <Text style={[nf.newsTagText, { color: item.color }]}>{item.tag}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Land opportunities banner */}
      {hasOpportunities && (
        <>
          <Text style={nf.sectionHeader}>🏡 Land Opportunities</Text>
          {pendingLandOpportunities.map((op, i) => {
            const profile = NEIGHBOR_PROFILES[op.neighborId as NeighborId];
            const total   = op.hectares * op.pricePerHectare;
            return (
              <View key={i} style={nf.opCard}>
                <Text style={nf.opIcon}>{op.type === 'auction' ? '🔨' : op.type === 'partnership' ? '🤝' : '🏷️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={nf.opTitle}>{profile?.displayName ?? op.neighborId} · {op.type.replace('_', ' ')}</Text>
                  <Text style={nf.opDetail}>{op.hectares} ha · ${op.pricePerHectare.toLocaleString()}/ha · ${total.toLocaleString()} total</Text>
                  <Text style={nf.opDesc}>{op.description}</Text>
                  {op.playerHasPriority && <Text style={nf.opPriority}>⭐ You have first priority</Text>}
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* Neighbor farm cards */}
      <Text style={nf.sectionHeader}>🏘️ Neighboring Farms</Text>
      {NEIGHBOR_IDS.map(id => {
        const farm    = (neighbors as any)[id];
        const profile = NEIGHBOR_PROFILES[id];
        if (!farm || !profile) return null;

        const status: NeighborStatus = farm.status ?? 'thriving';
        const statusColor = STATUS_COLOR[status];
        const debtRatio   = farm.cash > 0 ? farm.debt / farm.cash : (farm.debt > 0 ? 99 : 0);
        const debtLabel   = farm.debt === 0 ? 'Debt free' : debtRatio > 5 ? 'Dangerously leveraged' : debtRatio > 2 ? 'High debt' : debtRatio > 1 ? 'Moderate debt' : 'Low debt';
        const rel         = farm.relationship ?? 50;
        const relLabel    = rel >= 70 ? 'Friendly' : rel >= 40 ? 'Neutral' : 'Tense';

        return (
          <View key={id} style={[nf.farmCard, status === 'bankrupt' && nf.farmCardDanger]}>
            {/* Header */}
            <View style={nf.farmHeader}>
              <View style={{ flex: 1 }}>
                <Text style={nf.farmName}>{profile.displayName}</Text>
                <Text style={nf.farmArchetype}>{profile.archetype}</Text>
              </View>
              <View style={[nf.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '66' }]}>
                <Text style={[nf.statusText, { color: statusColor }]}>
                  {STATUS_ICON[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text style={nf.farmDesc}>{profile.description}</Text>

            {/* Stats row */}
            <View style={nf.statsRow}>
              <View style={nf.statItem}>
                <Text style={nf.statValue}>{farm.landHectares} ha</Text>
                <Text style={nf.statLabel}>Land</Text>
              </View>
              <View style={nf.statDivider} />
              <View style={nf.statItem}>
                <Text style={[nf.statValue, { color: '#81c784' }]}>${(farm.cash ?? 0).toLocaleString()}</Text>
                <Text style={nf.statLabel}>Cash</Text>
              </View>
              <View style={nf.statDivider} />
              <View style={nf.statItem}>
                <Text style={[nf.statValue, { color: farm.debt > 0 ? '#ef5350' : C.textMuted }]}>
                  {farm.debt > 0 ? `-$${farm.debt.toLocaleString()}` : 'None'}
                </Text>
                <Text style={nf.statLabel}>Debt</Text>
              </View>
              <View style={nf.statDivider} />
              <View style={nf.statItem}>
                <Text style={[nf.statValue, { color: farm.debt === 0 ? '#81c784' : debtRatio > 3 ? '#ef5350' : '#ffb74d' }]}>{debtLabel}</Text>
                <Text style={nf.statLabel}>Leverage</Text>
              </View>
            </View>

            {/* Relationship bar */}
            <View style={nf.relRow}>
              <Text style={nf.relLabel}>Relationship</Text>
              <RelBar value={rel} />
              <Text style={[nf.relScore, { color: rel >= 70 ? '#81c784' : rel >= 40 ? '#64b5f6' : '#ef5350' }]}>
                {rel} — {relLabel}
              </Text>
            </View>

            {/* Events feed */}
            {(farm.events ?? []).length > 0 && (
              <View style={nf.eventsBox}>
                {(farm.events as string[]).slice(-3).map((ev: string, i: number) => (
                  <Text key={i} style={nf.eventLine}>• {ev}</Text>
                ))}
              </View>
            )}

            {/* Struggling warning */}
            {status === 'struggling' && (
              <Text style={nf.warningLine}>⚠️ Struggling for {farm.strugglingYears} year{farm.strugglingYears !== 1 ? 's' : ''} — land opportunity may arise</Text>
            )}
            {status === 'bankrupt' && (
              <Text style={nf.dangerLine}>🔴 Bankrupt — watch for auction or fire sale</Text>
            )}

            {/* Relationship actions */}
            {status !== 'bankrupt' && status !== 'sold' && (() => {
              const visitKey  = `${id}_visit`;
              const giftKey   = `${id}_gift`;
              const helpKey   = `${id}_help`;
              const visitLeft = Math.max(0, 14 - (day - (neighborActionCooldowns[visitKey] ?? 0)));
              const giftLeft  = Math.max(0, 30 - (day - (neighborActionCooldowns[giftKey] ?? 0)));
              const helpLeft  = Math.max(0, 60 - (day - (neighborActionCooldowns[helpKey] ?? 0)));
              return (
                <View style={nf.actionRow}>
                  <TouchableOpacity
                    style={[nf.actionBtn, visitLeft > 0 && nf.actionBtnDisabled]}
                    disabled={visitLeft > 0}
                    onPress={() => visitNeighbor(id)}
                  >
                    <Text style={nf.actionBtnIcon}>👋</Text>
                    <Text style={[nf.actionBtnLabel, visitLeft > 0 && nf.actionBtnLabelDisabled]}>
                      {visitLeft > 0 ? `Visit (${visitLeft}d)` : 'Visit +4'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[nf.actionBtn, giftLeft > 0 && nf.actionBtnDisabled]}
                    disabled={giftLeft > 0}
                    onPress={() => setGiftModal(id)}
                  >
                    <Text style={nf.actionBtnIcon}>🎁</Text>
                    <Text style={[nf.actionBtnLabel, giftLeft > 0 && nf.actionBtnLabelDisabled]}>
                      {giftLeft > 0 ? `Gift (${giftLeft}d)` : 'Gift…'}
                    </Text>
                  </TouchableOpacity>

                  {(status === 'struggling') && (
                    <TouchableOpacity
                      style={[nf.actionBtn, nf.actionBtnHelp, helpLeft > 0 && nf.actionBtnDisabled]}
                      disabled={helpLeft > 0}
                      onPress={() => helpNeighborHarvest(id)}
                    >
                      <Text style={nf.actionBtnIcon}>🌾</Text>
                      <Text style={[nf.actionBtnLabel, helpLeft > 0 && nf.actionBtnLabelDisabled]}>
                        {helpLeft > 0 ? `Help (${helpLeft}d)` : 'Help +15'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}
          </View>
        );
      })}

    </ScrollView>

    {/* Gift modal */}
      <Modal visible={giftModal !== null} transparent animationType="fade" onRequestClose={() => setGiftModal(null)}>
        <View style={nf.modalOverlay}>
          <View style={nf.modalBox}>
            <Text style={nf.modalTitle}>🎁 Send a Gift</Text>
            {giftModal && <Text style={nf.modalSub}>To {NEIGHBOR_PROFILES[giftModal]?.displayName}</Text>}
            {GIFT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.amount}
                style={[nf.modalOption, money < opt.amount && nf.modalOptionDisabled]}
                disabled={money < opt.amount}
                onPress={() => {
                  if (giftModal) sendNeighborGift(giftModal, opt.amount);
                  setGiftModal(null);
                }}
              >
                <Text style={nf.modalOptionLabel}>{opt.label}</Text>
                <Text style={nf.modalOptionMeta}>${opt.amount} · +{opt.rel} relationship</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setGiftModal(null)} style={nf.modalCancel}>
              <Text style={nf.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const nf = StyleSheet.create({
  container:      { padding: S.md, gap: S.sm, paddingBottom: 40 },
  sectionHeader:  { color: C.textMuted, fontSize: F.size.xs, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: S.md, marginBottom: 2 },

  // County news feed
  newsFeed:       { backgroundColor: C.bgCard, borderRadius: R.md, overflow: 'hidden' },
  newsRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: S.md, paddingVertical: 9 },
  newsIcon:       { fontSize: 15, width: 20, textAlign: 'center' },
  newsHeadline:   { flex: 1, fontSize: F.size.xs, lineHeight: 16 },
  newsTag:        { borderRadius: R.pill, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  newsTagText:    { fontSize: 8, fontWeight: 'bold', letterSpacing: 0.5 },

  // Land opportunities
  opCard:         { backgroundColor: '#0f3460', borderRadius: R.md, padding: S.md, flexDirection: 'row', gap: S.sm, borderWidth: 1, borderColor: '#ffb74d55' },
  opIcon:         { fontSize: 24 },
  opTitle:        { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  opDetail:       { color: '#64b5f6', fontSize: F.size.sm, marginTop: 2 },
  opDesc:         { color: C.textMuted, fontSize: F.size.sm, marginTop: 2 },
  opPriority:     { color: '#ffd700', fontSize: 11, marginTop: 4, fontWeight: 'bold' },

  // Farm cards
  farmCard:       { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: S.sm },
  farmCardDanger: { borderWidth: 1, borderColor: '#ef535044' },
  farmHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm },
  farmName:       { color: C.text, fontSize: F.size.lg, fontWeight: 'bold' },
  farmArchetype:  { color: C.textMuted, fontSize: F.size.sm, marginTop: 1 },
  statusBadge:    { borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  statusText:     { fontSize: F.size.sm, fontWeight: 'bold' },
  farmDesc:       { color: C.textDim, fontSize: F.size.sm, lineHeight: 18 },

  statsRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm },
  statItem:       { flex: 1, alignItems: 'center' },
  statValue:      { color: C.text, fontSize: F.size.sm, fontWeight: 'bold' },
  statLabel:      { color: C.textFaint, fontSize: 9, textTransform: 'uppercase', marginTop: 1 },
  statDivider:    { width: 1, height: 28, backgroundColor: C.divider },

  relRow:         { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  relLabel:       { color: C.textMuted, fontSize: 10, width: 76 },
  relTrack:       { flex: 1, height: 5, backgroundColor: C.bgDeep, borderRadius: 3, overflow: 'hidden' },
  relFill:        { height: 5, borderRadius: 3 },
  relScore:       { fontSize: 10, fontWeight: 'bold', width: 76, textAlign: 'right' },

  eventsBox:      { backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, gap: 2 },
  eventLine:      { color: C.textDim, fontSize: F.size.sm },

  warningLine:    { color: '#ffb74d', fontSize: F.size.sm },
  dangerLine:     { color: '#ef5350', fontSize: F.size.sm },

  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xl, gap: S.sm },
  emptyIcon:      { fontSize: 40 },
  emptyTitle:     { color: C.text, fontSize: F.size.lg, fontWeight: 'bold' },
  emptyDetail:    { color: C.textMuted, fontSize: F.size.sm, textAlign: 'center' },

  // Relationship actions
  actionRow:            { flexDirection: 'row', gap: S.xs, flexWrap: 'wrap', marginTop: S.xs },
  actionBtn:            { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bgDeep, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#334' },
  actionBtnHelp:        { borderColor: '#2e5c28' },
  actionBtnDisabled:    { opacity: 0.45 },
  actionBtnIcon:        { fontSize: 13 },
  actionBtnLabel:       { color: C.text, fontSize: 11, fontWeight: 'bold' },
  actionBtnLabelDisabled: { color: C.textFaint },

  // Gift modal
  modalOverlay:     { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', alignItems: 'center', padding: S.xl },
  modalBox:         { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.lg, width: '100%', maxWidth: 340, gap: S.sm },
  modalTitle:       { color: C.text, fontSize: F.size.lg, fontWeight: 'bold' },
  modalSub:         { color: C.textMuted, fontSize: F.size.sm, marginBottom: S.xs },
  modalOption:      { backgroundColor: C.bgDeep, borderRadius: R.md, padding: S.md, borderWidth: 1, borderColor: '#334' },
  modalOptionDisabled: { opacity: 0.4 },
  modalOptionLabel: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  modalOptionMeta:  { color: C.textMuted, fontSize: F.size.sm, marginTop: 2 },
  modalCancel:      { alignItems: 'center', paddingVertical: S.sm },
  modalCancelText:  { color: C.textMuted, fontSize: F.size.sm },
});
