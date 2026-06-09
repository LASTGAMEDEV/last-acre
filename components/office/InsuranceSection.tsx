import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C } from '../../constants/theme';
import { INSURANCE_PLANS, InsuranceType } from '../../data/insuranceTypes';

function InsuranceSection() {
  const {
    day, money, insurances, insuranceClaims,
    buyInsurance, cancelInsurance,
  } = useGameStore();

  const totalPremiumPerDay = insurances
    .filter(p => p.active)
    .reduce((s, p) => {
      const plan = INSURANCE_PLANS.find(pl => pl.type === p.type);
      return s + (plan?.premiumPerDay ?? 0);
    }, 0);

  const totalPayouts = insuranceClaims.reduce((s, c) => s + c.payout, 0);
  const recentClaims = [...insuranceClaims].reverse().slice(0, 20);

  function getPolicyForType(type: InsuranceType) {
    return insurances.find(p => p.type === type && p.active) ?? null;
  }

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      {/* Summary */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1, backgroundColor: '#0f3460', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 11 }}>Daily premium</Text>
          <Text style={{ color: C.white, fontSize: 16, fontWeight: 'bold' }}>${totalPremiumPerDay}/day</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#0f3460', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 11 }}>Total paid out</Text>
          <Text style={{ color: C.green, fontSize: 16, fontWeight: 'bold' }}>${totalPayouts.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>Available policies</Text>
      {INSURANCE_PLANS.map(plan => {
        const activePolicy = getPolicyForType(plan.type);
        const active = activePolicy !== null;
        return (
          <View key={plan.type} style={{ backgroundColor: active ? '#0f3460' : C.bgCard, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: active ? 1 : 0, borderColor: '#4fc3f7' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 24 }}>{plan.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: 'bold' }}>{plan.name}</Text>
                <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{plan.description}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: C.textMuted, fontSize: 10 }}>Premium</Text>
                <Text style={{ color: C.white, fontSize: 13, fontWeight: 'bold' }}>${plan.premiumPerDay}/day</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: C.textMuted, fontSize: 10 }}>Coverage</Text>
                <Text style={{ color: C.white, fontSize: 13, fontWeight: 'bold' }}>{Math.round(plan.coveragePercent * 100)}%</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: C.textMuted, fontSize: 10 }}>Status</Text>
                <Text style={{ color: active ? C.green : C.textMuted, fontSize: 13, fontWeight: 'bold' }}>{active ? '✅ Active' : '—'}</Text>
              </View>
            </View>
            {active ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: C.textMuted, fontSize: 11 }}>
                  Since day {activePolicy!.startDay} · ${plan.premiumPerDay * (day - activePolicy!.startDay)} paid
                </Text>
                <TouchableOpacity
                  onPress={() => cancelInsurance(activePolicy!.id)}
                  style={{ backgroundColor: '#c62828', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={{ color: C.white, fontSize: 12, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => money >= plan.premiumPerDay && buyInsurance(plan.type)}
                style={{ backgroundColor: money >= plan.premiumPerDay ? '#1565c0' : '#333', borderRadius: 6, padding: 10, alignItems: 'center' }}
              >
                <Text style={{ color: C.white, fontSize: 13, fontWeight: 'bold' }}>
                  Activate — ${plan.premiumPerDay}/day
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {recentClaims.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>Recent claims</Text>
          {recentClaims.map(c => (
            <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#222' }}>
              <Text style={{ color: '#ccc', fontSize: 12 }}>Day {c.day} · {c.description}</Text>
              <Text style={{ color: C.green, fontSize: 12, fontWeight: 'bold' }}>+${c.payout.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default InsuranceSection;
