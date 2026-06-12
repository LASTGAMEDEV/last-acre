import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { getEFACount } from '../../engine/hedgerows';
import {
  AES_SCHEMES,
  calculateAnnualSubsidy,
  checkAESViolation,
  BASIC_PAYMENT_PER_HA,
  GREENING_BONUS_PCT,
  YOUNG_FARMER_MAX_DAY,
} from '../../engine/subsidies';

const STATUS_COLORS: Record<string, string> = {
  active: '#4caf50',
  pending: '#ffb74d',
  violated: '#ef5350',
  expired: '#555',
};

export default function SubsidiesSection() {
  const {
    day, parcels, hedgerows, cropsGrownThisYear, strawBurnedThisYear,
    aesEnrollments, subsidyLog, enrollAES,
  } = useGameStore();

  const [enrollingScheme, setEnrollingScheme] = useState<string | null>(null);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([]);

  const ownedParcels = parcels.filter(p => p.owned);
  const ownedHa = ownedParcels.reduce((s, p) => s + p.hectares, 0);
  const efaCount = getEFACount(hedgerows ?? [], day);
  const diversityMet = (cropsGrownThisYear ?? []).length >= 3;
  const efaMet = efaCount >= 2;
  const noburn = !(strawBurnedThisYear ?? false);
  const greeningQualified = diversityMet && efaMet && noburn;

  // Projected next payment (if paid today)
  const projected = calculateAnnualSubsidy({
    currentDay: day,
    ownedHa,
    leasedHa: 0,
    cropsGrownThisYear: cropsGrownThisYear ?? [],
    hedgerows: hedgerows ?? [],
    strawBurnedThisYear: strawBurnedThisYear ?? false,
    aesEnrollments: aesEnrollments ?? [],
  });

  const isYoungFarmer = day <= YOUNG_FARMER_MAX_DAY;
  const daysUntilPayment = 365 - (day % 365);

  function Badge({ ok, label }: { ok: boolean; label: string }) {
    return (
      <View style={[ss.badge, { backgroundColor: ok ? C.greenDark : '#5c1a1a' }]}>
        <Text style={ss.badgeText}>{ok ? '✅' : '❌'} {label}</Text>
      </View>
    );
  }

  function handleEnroll() {
    if (!enrollingScheme || selectedParcelIds.length === 0) return;
    enrollAES(enrollingScheme, selectedParcelIds);
    setEnrollingScheme(null);
    setSelectedParcelIds([]);
  }

  const enrolledSchemeIds = new Set((aesEnrollments ?? []).filter(e => e.status === 'active').map(e => e.schemeId));

  return (
    <ScrollView contentContainerStyle={{ padding: S.md, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={ss.header}>💶 CAP Subsidies</Text>

      {/* Projected next payment */}
      <View style={[ss.card, { borderWidth: 1, borderColor: '#c8860a33' }]}>
        <Text style={ss.cardTitle}>📅 Next Payment Estimate</Text>
        <Text style={ss.paymentAmount}>€{projected.total.toLocaleString()}</Text>
        <Text style={ss.paymentSub}>Due in ~{daysUntilPayment}d at year end</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <Text style={ss.breakChip}>Basic €{projected.basic.toLocaleString()}</Text>
          {projected.greening > 0 && <Text style={[ss.breakChip, { color: '#4caf50' }]}>Greening +€{projected.greening.toLocaleString()}</Text>}
          {projected.youngFarmer > 0 && <Text style={[ss.breakChip, { color: '#64b5f6' }]}>Young €{projected.youngFarmer.toLocaleString()}</Text>}
          {projected.aes > 0 && <Text style={[ss.breakChip, { color: '#9ccc65' }]}>AES €{projected.aes.toLocaleString()}</Text>}
        </View>
        {!projected.greeningQualified && (
          <Text style={{ color: '#ef9a9a', fontSize: F.size.xs, marginTop: 6 }}>
            ⚠️ Missing +{Math.round(GREENING_BONUS_PCT * 100)}% greening bonus ({projected.greeningFailReasons.join(', ')})
          </Text>
        )}
      </View>

      {/* Greening status */}
      <View style={ss.card}>
        <Text style={ss.cardTitle}>🌿 Greening Requirements</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          <Badge ok={diversityMet} label={`Crops: ${cropsGrownThisYear?.length ?? 0}/3`} />
          <Badge ok={efaMet} label={`EFA: ${efaCount}/2`} />
          <Badge ok={noburn} label="No straw burn" />
        </View>
        {greeningQualified
          ? <Text style={[ss.statusText, { color: C.green }]}>✅ Greening qualified (+30%)</Text>
          : <Text style={[ss.statusText, { color: '#ef5350' }]}>
              ⚠️ Fix to unlock +€{Math.round(projected.basic * GREENING_BONUS_PCT).toLocaleString()} bonus
            </Text>
        }
      </View>

      {/* Land area */}
      <View style={ss.card}>
        <Text style={ss.cardTitle}>🌾 Basic Payment</Text>
        <Text style={ss.row}>{ownedHa.toFixed(1)} ha × €{BASIC_PAYMENT_PER_HA} = <Text style={{ color: C.text, fontWeight: 'bold' }}>€{projected.basic.toLocaleString()}</Text></Text>
        {isYoungFarmer && (
          <Text style={[ss.row, { color: '#64b5f6', marginTop: 4 }]}>
            👨‍🌾 Young Farmer +25% active (expires day {YOUNG_FARMER_MAX_DAY})
          </Text>
        )}
      </View>

      {/* AES Schemes available */}
      <View style={ss.card}>
        <Text style={ss.cardTitle}>🌱 Agri-Environment Schemes</Text>
        {AES_SCHEMES.map(scheme => {
          const myEnrollment = (aesEnrollments ?? []).find(e => e.schemeId === scheme.id);
          const isEnrolled = myEnrollment?.status === 'active';
          const isEnrolling = enrollingScheme === scheme.id;
          const isViolating = isEnrolled && myEnrollment ? checkAESViolation(myEnrollment, parcels, day) : false;
          const violationHint = scheme.id === 'aes_cover'
            ? 'no cover crop on enrolled parcel — scheme may be flagged'
            : scheme.id === 'aes_lowpest'
            ? 'synthetic pesticide used on enrolled parcel in last 30d'
            : '';
          return (
            <View key={scheme.id} style={[ss.schemeRow, isEnrolled && { borderColor: isViolating ? '#4a2a2a' : '#2a4a2a' }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={ss.schemeName}>{scheme.name}</Text>
                  {isEnrolled && (
                    <View style={[ss.statusBadge, { backgroundColor: STATUS_COLORS[myEnrollment!.status] + '33', borderColor: STATUS_COLORS[myEnrollment!.status] + '66' }]}>
                      <Text style={[ss.statusBadgeText, { color: STATUS_COLORS[myEnrollment!.status] }]}>{myEnrollment!.status}</Text>
                    </View>
                  )}
                </View>
                <Text style={ss.schemeObligation}>{scheme.obligation}</Text>
                <Text style={{ color: '#4caf50', fontSize: F.size.xs, marginTop: 2 }}>€{scheme.paymentPerHa}/ha/year</Text>
                {isEnrolled && (
                  <Text style={ss.schemeMuted}>{myEnrollment!.enrolledHa}ha enrolled</Text>
                )}
                {isViolating && violationHint !== '' && (
                  <Text style={{ color: '#ef5350', fontSize: F.size.xs, marginTop: 3 }}>⚠ Violation: {violationHint}</Text>
                )}
              </View>
              {!isEnrolled && (
                <TouchableOpacity
                  style={[ss.enrollBtn, isEnrolling && { backgroundColor: C.blue }]}
                  onPress={() => {
                    if (isEnrolling) { setEnrollingScheme(null); setSelectedParcelIds([]); }
                    else { setEnrollingScheme(scheme.id); setSelectedParcelIds([]); }
                  }}
                >
                  <Text style={ss.enrollBtnText}>{isEnrolling ? 'Cancel' : 'Enroll'}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Parcel picker for enrollment */}
      {enrollingScheme && (
        <View style={ss.card}>
          <Text style={ss.cardTitle}>Select parcels to enroll</Text>
          <Text style={ss.schemeMuted}>
            {AES_SCHEMES.find(s => s.id === enrollingScheme)?.obligation}
          </Text>
          {ownedParcels.map(p => {
            const selected = selectedParcelIds.includes(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[ss.parcelRow, selected && { backgroundColor: '#1a3a1a' }]}
                onPress={() => setSelectedParcelIds(selected ? selectedParcelIds.filter(id => id !== p.id) : [...selectedParcelIds, p.id])}
              >
                <Text style={{ color: selected ? '#4caf50' : C.text, fontSize: F.size.sm }}>{selected ? '✓ ' : '○ '}{p.name}</Text>
                <Text style={ss.schemeMuted}>{p.hectares}ha</Text>
              </TouchableOpacity>
            );
          })}
          {selectedParcelIds.length > 0 && (
            <TouchableOpacity style={ss.confirmBtn} onPress={handleEnroll}>
              <Text style={ss.confirmBtnText}>
                Enroll {selectedParcelIds.length} parcel{selectedParcelIds.length !== 1 ? 's' : ''} · €{
                  Math.round((AES_SCHEMES.find(s => s.id === enrollingScheme)?.paymentPerHa ?? 0) *
                    ownedParcels.filter(p => selectedParcelIds.includes(p.id)).reduce((s, p) => s + p.hectares, 0))
                }/yr
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Payment history */}
      <View style={ss.card}>
        <Text style={ss.cardTitle}>📋 Payment History</Text>
        {!subsidyLog || subsidyLog.length === 0 ? (
          <Text style={ss.muted}>No payments received yet. First payment at year end.</Text>
        ) : (
          subsidyLog.slice().reverse().map((pmt, i) => (
            <View key={i} style={[ss.histRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={ss.row}>Day {pmt.day} — <Text style={{ color: '#c8860a', fontWeight: 'bold' }}>€{pmt.total.toLocaleString()}</Text></Text>
                <Text style={ss.muted}>
                  Basic €{pmt.basic.toLocaleString()} · Greening €{pmt.greening.toLocaleString()} ·
                  Young €{pmt.youngFarmer.toLocaleString()} · AES €{pmt.aes.toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  header:            { fontSize: F.size.xl, fontWeight: 'bold', color: C.text, marginBottom: S.sm },
  card:              { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 4 },
  cardTitle:         { fontSize: F.size.md, fontWeight: '600', color: C.text, marginBottom: 4 },
  badge:             { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.sm },
  badgeText:         { color: '#fff', fontSize: F.size.xs, fontWeight: '600' },
  statusText:        { fontSize: F.size.sm, fontWeight: '600', marginTop: 8 },
  row:               { fontSize: F.size.sm, color: C.text },
  muted:             { fontSize: F.size.sm, color: C.textMuted },
  paymentAmount:     { color: '#c8860a', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  paymentSub:        { color: C.textMuted, fontSize: F.size.xs, marginTop: 2 },
  breakChip:         { color: C.textMuted, fontSize: 10, backgroundColor: C.bgDeep, borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 },
  schemeRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  schemeName:        { color: C.text, fontSize: F.size.sm, fontWeight: '600' },
  schemeObligation:  { color: C.textMuted, fontSize: F.size.xs, marginTop: 2, lineHeight: 16 },
  schemeMuted:       { color: C.textFaint, fontSize: F.size.xs, marginTop: 2 },
  statusBadge:       { borderRadius: R.pill, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1 },
  statusBadgeText:   { fontSize: 9, fontWeight: 'bold' },
  enrollBtn:         { backgroundColor: C.bgDeep, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.border, alignSelf: 'flex-start' },
  enrollBtnText:     { color: C.text, fontSize: F.size.xs, fontWeight: '600' },
  parcelRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  confirmBtn:        { backgroundColor: '#1a3a1a', borderRadius: R.md, padding: S.sm, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#2a6a2a' },
  confirmBtnText:    { color: '#4caf50', fontSize: F.size.sm, fontWeight: 'bold' },
  histRow:           { paddingVertical: 6 },
  aesRow:            { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border },
});
