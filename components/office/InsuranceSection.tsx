import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { INSURANCE_PLANS, InsuranceType } from '../../data/insuranceTypes';

function policyDailyRate(type: InsuranceType, ownedHa: number): number {
  const plan = INSURANCE_PLANS.find(p => p.type === type);
  if (!plan) return 0;
  if (plan.perHa && plan.ratePerHaPerDay) return plan.ratePerHaPerDay * ownedHa;
  return plan.premiumPerDay;
}

function fmt(n: number) {
  return `€${Math.round(n).toLocaleString()}`;
}

export default function InsuranceSection() {
  const { day, money, insurances, insuranceClaims, parcels, buyInsurance, cancelInsurance } = useGameStore();

  const ownedHa = parcels.filter(p => p.owned).reduce((s, p) => s + p.hectares, 0);

  const activePolicies = insurances.filter(p => p.active);

  const totalDailyPremium = activePolicies.reduce((s, p) => s + policyDailyRate(p.type, ownedHa), 0);
  const annualCostProj = totalDailyPremium * 365;

  // Total premiums paid (all-time, across all policies active/inactive)
  const totalPremiumsPaid = insurances.reduce((s, p) => {
    const endDay = p.active ? day : day; // conservative: cap at today
    const daysActive = Math.max(0, endDay - p.startDay);
    return s + daysActive * policyDailyRate(p.type, ownedHa);
  }, 0);

  const totalPayouts = insuranceClaims.reduce((s, c) => s + c.payout, 0);
  const netCost = totalPremiumsPaid - totalPayouts;
  const roi = totalPremiumsPaid > 0 ? (totalPayouts / totalPremiumsPaid) * 100 : 0;

  const recentClaims = [...insuranceClaims].sort((a, b) => b.day - a.day).slice(0, 20);

  function getPolicyForType(type: InsuranceType) {
    return insurances.find(p => p.type === type && p.active) ?? null;
  }

  return (
    <ScrollView contentContainerStyle={is.container} showsVerticalScrollIndicator={false}>
      <Text style={is.header}>🛡️ Farm Insurance</Text>

      {/* Summary */}
      <View style={is.card}>
        <Text style={is.cardTitle}>Coverage Overview</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <View style={is.statBox}>
            <Text style={is.statLabel}>ACTIVE POLICIES</Text>
            <Text style={[is.statVal, { color: activePolicies.length > 0 ? C.green : C.textMuted }]}>
              {activePolicies.length} / {INSURANCE_PLANS.length}
            </Text>
          </View>
          <View style={is.statBox}>
            <Text style={is.statLabel}>DAILY PREMIUM</Text>
            <Text style={[is.statVal, { color: '#ef9a9a' }]}>
              {ownedHa > 0 ? `€${totalDailyPremium.toFixed(2)}` : '—'}
            </Text>
          </View>
          <View style={is.statBox}>
            <Text style={is.statLabel}>ANNUAL COST</Text>
            <Text style={[is.statVal, { color: '#ef9a9a' }]}>
              {annualCostProj > 0 ? fmt(annualCostProj) : '—'}
            </Text>
          </View>
        </View>
        {ownedHa > 0 && totalDailyPremium > 0 && (
          <Text style={is.muted}>Based on {ownedHa.toFixed(1)} ha owned · rates update as you buy land</Text>
        )}
      </View>

      {/* ROI panel — only show after some history */}
      {totalPremiumsPaid > 0 && (
        <View style={is.card}>
          <Text style={is.cardTitle}>📊 Insurance ROI</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <View style={is.statBox}>
              <Text style={is.statLabel}>PREMIUMS PAID</Text>
              <Text style={[is.statVal, { color: '#ef9a9a' }]}>{fmt(totalPremiumsPaid)}</Text>
            </View>
            <View style={is.statBox}>
              <Text style={is.statLabel}>CLAIMS RECEIVED</Text>
              <Text style={[is.statVal, { color: C.green }]}>{fmt(totalPayouts)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={is.statBox}>
              <Text style={is.statLabel}>NET COST</Text>
              <Text style={[is.statVal, { color: netCost > 0 ? '#ef9a9a' : C.green }]}>
                {netCost > 0 ? `-${fmt(netCost)}` : `+${fmt(-netCost)}`}
              </Text>
            </View>
            <View style={is.statBox}>
              <Text style={is.statLabel}>PAYOUT RATIO</Text>
              <Text style={[is.statVal, { color: roi >= 100 ? C.green : roi >= 50 ? '#ffa726' : C.textMuted }]}>
                {roi.toFixed(0)}%
              </Text>
            </View>
          </View>
          <Text style={is.muted}>
            {roi >= 100
              ? '✅ Claims exceeded premiums — insurance has paid off'
              : roi >= 50
              ? '🔶 Getting partial value — keep coverage for catastrophic events'
              : '📉 No claims yet — premiums are pure risk protection'}
          </Text>
        </View>
      )}

      {/* Policy cards */}
      <Text style={is.sectionLabel}>AVAILABLE POLICIES</Text>
      {INSURANCE_PLANS.map(plan => {
        const activePolicy = getPolicyForType(plan.type);
        const active = activePolicy !== null;
        const dailyRate = policyDailyRate(plan.type, ownedHa);
        const daysActive = active && activePolicy ? day - activePolicy.startDay : 0;
        const paidThisPolicy = daysActive * dailyRate;
        const claimsThisType = insuranceClaims.filter(c => c.type === plan.type).reduce((s, c) => s + c.payout, 0);

        return (
          <View key={plan.type} style={[is.card, active && is.cardActive]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Text style={{ fontSize: 22, marginTop: 2 }}>{plan.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={is.planName}>{plan.name}</Text>
                  <Text style={[is.statusBadge, { color: active ? C.green : C.textFaint }]}>
                    {active ? '● Active' : '○ Inactive'}
                  </Text>
                </View>
                <Text style={is.planDesc}>{plan.description}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={is.miniStat}>
                <Text style={is.miniLabel}>DAILY COST</Text>
                <Text style={is.miniVal}>
                  {plan.perHa
                    ? ownedHa > 0 ? `€${dailyRate.toFixed(2)}` : `€${plan.ratePerHaPerDay}/ha`
                    : `€${plan.premiumPerDay}`}
                </Text>
              </View>
              <View style={is.miniStat}>
                <Text style={is.miniLabel}>COVERAGE</Text>
                <Text style={is.miniVal}>{Math.round(plan.coveragePercent * 100)}%</Text>
              </View>
              {active && daysActive > 0 && (
                <View style={is.miniStat}>
                  <Text style={is.miniLabel}>PAID IN</Text>
                  <Text style={[is.miniVal, { color: '#ef9a9a' }]}>{fmt(paidThisPolicy)}</Text>
                </View>
              )}
              {claimsThisType > 0 && (
                <View style={is.miniStat}>
                  <Text style={is.miniLabel}>CLAIMED</Text>
                  <Text style={[is.miniVal, { color: C.green }]}>{fmt(claimsThisType)}</Text>
                </View>
              )}
            </View>

            {active && activePolicy ? (
              <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={is.muted}>Day {activePolicy.startDay} – now · {daysActive}d active</Text>
                <TouchableOpacity
                  onPress={() => cancelInsurance(activePolicy.id)}
                  style={is.cancelBtn}
                >
                  <Text style={is.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => dailyRate > 0 && money >= dailyRate && buyInsurance(plan.type)}
                disabled={dailyRate === 0 || money < dailyRate}
                style={[is.buyBtn, (dailyRate === 0 || money < dailyRate) && { opacity: 0.5 }]}
              >
                <Text style={is.buyBtnText}>
                  {dailyRate === 0 && ownedHa === 0
                    ? 'Buy land to activate'
                    : `Activate — €${dailyRate.toFixed(2)}/day`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Claims history */}
      {recentClaims.length > 0 && (
        <>
          <Text style={is.sectionLabel}>CLAIMS HISTORY</Text>
          <View style={is.card}>
            {recentClaims.map(c => {
              const plan = INSURANCE_PLANS.find(p => p.type === c.type);
              return (
                <View key={c.id} style={is.claimRow}>
                  <Text style={is.claimIcon}>{plan?.icon ?? '🛡️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={is.claimDesc}>{c.description}</Text>
                    <Text style={is.claimDay}>Day {c.day}</Text>
                  </View>
                  <Text style={is.claimPayout}>+{fmt(c.payout)}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const is = StyleSheet.create({
  container:    { padding: S.md, gap: 10, paddingBottom: 40 },
  header:       { fontSize: F.size.xl, fontWeight: 'bold', color: C.text, marginBottom: S.xs },
  sectionLabel: { color: C.textMuted, fontSize: F.size.xs, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: S.xs },
  card:         { backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md, gap: 4 },
  cardActive:   { borderWidth: 1, borderColor: C.green + '44' },
  cardTitle:    { color: C.text, fontSize: F.size.md, fontWeight: '600' },

  statBox:  { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, alignItems: 'center' },
  statLabel:{ color: C.textFaint, fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  statVal:  { color: C.text, fontSize: F.size.sm, fontWeight: 'bold', marginTop: 2 },

  miniStat: { flex: 1, backgroundColor: C.bgDeep, borderRadius: R.sm, padding: 6, alignItems: 'center' },
  miniLabel:{ color: C.textFaint, fontSize: 8, fontWeight: '600', letterSpacing: 0.5 },
  miniVal:  { color: C.text, fontSize: F.size.xs, fontWeight: 'bold', marginTop: 1 },

  muted:        { color: C.textMuted, fontSize: F.size.xs, marginTop: 4 },
  planName:     { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
  planDesc:     { color: C.textMuted, fontSize: F.size.xs, marginTop: 3, lineHeight: 16 },
  statusBadge:  { fontSize: F.size.xs, fontWeight: '600' },

  buyBtn:     { backgroundColor: '#1565c0', borderRadius: R.sm, padding: S.sm, alignItems: 'center', marginTop: 4 },
  buyBtnText: { color: '#fff', fontWeight: '600', fontSize: F.size.sm },
  cancelBtn:  { backgroundColor: '#3a0a0a', borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 6 },
  cancelBtnText: { color: '#ef5350', fontSize: F.size.xs, fontWeight: 'bold' },

  claimRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.divider },
  claimIcon:  { fontSize: 16, width: 22 },
  claimDesc:  { color: C.text, fontSize: F.size.sm },
  claimDay:   { color: C.textFaint, fontSize: 10, marginTop: 2 },
  claimPayout:{ color: C.green, fontSize: F.size.sm, fontWeight: 'bold' },
});
