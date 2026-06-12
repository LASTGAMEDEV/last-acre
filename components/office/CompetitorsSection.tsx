import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import { NPC_FARM_GROUP } from '../../data/npcFarmGroups';

function CompetitorsSection() {
  const { npcFarms = [], sellPressures = [], mapFields = [], day, rivalNews = [] } = useGameStore();
  const [expandedFarmId, setExpandedFarmId] = React.useState<string | null>(null);

  const NPC_MAP_OWNER = NPC_FARM_GROUP;

  function wealthColor(wealth: number): string {
    if (wealth < 10000) return C.green;
    if (wealth < 30000) return '#ffb74d';
    return '#ef5350';
  }

  function wealthTrend(wealth: number): string {
    if (wealth < 3000) return '📉 Struggling';
    if (wealth < 10000) return '🟡 Growing';
    if (wealth < 30000) return '🟠 Established';
    return '🔴 Dominant';
  }

  function activePressureDetail(farm: { specialization: string[] }): { cropId: string; pct: number; daysLeft: number } | null {
    for (const crop of farm.specialization) {
      const sp = sellPressures.find(s => s.cropId === crop && s.expiresDay >= day && s.source !== 'player');
      if (sp) return { cropId: crop, pct: Math.round((1 - sp.modifier) * 100), daysLeft: sp.expiresDay - day };
    }
    return null;
  }

  function landCount(farmId: string): number {
    const owner = NPC_MAP_OWNER[farmId];
    if (!owner) return 0;
    return mapFields.filter((f: any) => f.owner === owner).length;
  }

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>
        Rivals apply sell pressure to the market and bid at auction. Watch them expand.
      </Text>
      {npcFarms.map(farm => {
        const pressureDetail = activePressureDetail(farm);
        const fields = landCount(farm.id);
        const isExpanded = expandedFarmId === farm.id;
        const farmNews = rivalNews.filter((n: any) => n.detail?.includes(farm.name) || n.title?.includes(farm.name));
        const totalHa = mapFields.filter((f: any) => f.owner === NPC_MAP_OWNER[farm.id]).reduce((s: number, f: any) => s + (f.approximateHa ?? 0), 0);
        return (
          <View key={farm.id} style={{ backgroundColor: C.bgCard, borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <TouchableOpacity onPress={() => setExpandedFarmId(isExpanded ? null : farm.id)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: 'bold' }}>{farm.name}</Text>
                  <View style={{ backgroundColor: farm.tier === 3 ? '#c62828' : farm.tier === 2 ? '#f57f17' : C.greenDark, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: C.white, fontSize: 10, fontWeight: 'bold' }}>Tier {farm.tier}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: wealthColor(farm.wealth), fontSize: 12, fontWeight: 'bold' }}>
                    ${Math.round(farm.wealth).toLocaleString()}
                  </Text>
                  <Text style={{ color: '#555', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                  <Text style={{ color: C.textMuted, fontSize: 9 }}>STATUS</Text>
                  <Text style={{ color: wealthColor(farm.wealth), fontSize: 11, fontWeight: 'bold' }}>{wealthTrend(farm.wealth)}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                  <Text style={{ color: C.textMuted, fontSize: 9 }}>MAP FIELDS</Text>
                  <Text style={{ color: C.text, fontSize: 11, fontWeight: 'bold' }}>{fields} field{fields !== 1 ? 's' : ''} · {Math.round(totalHa)}ha</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                  <Text style={{ color: C.textMuted, fontSize: 9 }}>NEXT SELL</Text>
                  <Text style={{ color: '#ccc', fontSize: 11, fontWeight: 'bold' }}>in {Math.max(0, farm.nextSellDay - day)}d</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {farm.specialization.map((cropId: string) => {
                  const crop = CROP_TYPES.find(c => c.id === cropId);
                  return (
                    <View key={cropId} style={{ backgroundColor: '#0f3460', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: '#ccc', fontSize: 11 }}>{crop?.name ?? cropId}</Text>
                    </View>
                  );
                })}
              </View>
              {pressureDetail && (
                <Text style={{ color: '#ef9a9a', fontSize: 11 }}>
                  ⚠️ Flooding {CROP_TYPES.find(c => c.id === pressureDetail.cropId)?.name ?? pressureDetail.cropId} market −{pressureDetail.pct}% · {pressureDetail.daysLeft}d remaining
                </Text>
              )}
              {farm.wealth < 5000 && (
                <Text style={{ color: '#ffb74d', fontSize: 11 }}>
                  ⚡ Financial trouble — foreclosure risk
                </Text>
              )}
            </TouchableOpacity>

            {/* Expanded profile */}
            {isExpanded && (
              <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#1e2a3a', paddingTop: 10 }}>
                <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: 'bold', marginBottom: 6, letterSpacing: 0.5 }}>📊 PROFILE</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                    <Text style={{ color: C.textMuted, fontSize: 9 }}>WEALTH</Text>
                    <Text style={{ color: wealthColor(farm.wealth), fontSize: 13, fontWeight: 'bold' }}>${Math.round(farm.wealth).toLocaleString()}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                    <Text style={{ color: C.textMuted, fontSize: 9 }}>SELL INTERVAL</Text>
                    <Text style={{ color: '#ccc', fontSize: 13, fontWeight: 'bold' }}>every {farm.sellIntervalDays}d</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                    <Text style={{ color: C.textMuted, fontSize: 9 }}>TIER</Text>
                    <Text style={{ color: farm.tier === 3 ? '#ef5350' : farm.tier === 2 ? '#ffb74d' : C.green, fontSize: 13, fontWeight: 'bold' }}>
                      {farm.tier === 3 ? 'Dominant' : farm.tier === 2 ? 'Growing' : 'Small'}
                    </Text>
                  </View>
                </View>

                {farmNews.length > 0 && (
                  <View>
                    <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>📡 Recent Activity</Text>
                    {farmNews.slice(0, 5).map((item: any) => (
                      <View key={item.id} style={{ flexDirection: 'row', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1e2a3a' }}>
                        <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.text, fontSize: 11 }}>{item.title}</Text>
                          <Text style={{ color: '#555', fontSize: 10 }}>Day {item.day}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {farmNews.length === 0 && (
                  <Text style={{ color: '#444', fontSize: 11, fontStyle: 'italic' }}>No recent activity recorded for this farm.</Text>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Rival Intel feed */}
      {rivalNews.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 0.5 }}>📡 RIVAL INTEL</Text>
          {rivalNews.slice(0, 10).map(item => (
            <View key={item.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#1e2a3a', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 16 }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 11, fontWeight: 'bold' }}>{item.title}</Text>
                <Text style={{ color: C.textFaint, fontSize: 10, marginTop: 2 }}>{item.detail}</Text>
              </View>
              <Text style={{ color: '#444', fontSize: 10 }}>d{item.day}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default CompetitorsSection;
