import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore, GameEvent , MachineRepair } from '../store/useGameStore';

import { C } from '../constants/theme';

function severityColor(type: string): string {
  if (['weather_frost','weather_heatwave','weather_hailstorm','pest_outbreak','animal_illness','equipment_failure'].includes(type))
    return '#ef5350';
  if (['market_surge','windfall_subsidy','windfall_soil','windfall_harvest'].includes(type))
    return C.green;
  return '#ffb74d';
}

export default function EventBanner() {
  const activeEvents = useGameStore(s => s.activeEvents ?? []);
  const machineRepairs = useGameStore(s => s.machineRepairs ?? []);
  const day = useGameStore(s => s.day);
  const [expanded, setExpanded] = useState(false);

  const pendingRepairs = machineRepairs.filter(r => r.startDay === null);
  const inProgressRepairs = machineRepairs.filter(r => r.startDay !== null && r.readyDay !== null);

  const totalBadge = activeEvents.length + pendingRepairs.length + inProgressRepairs.length;
  if (totalBadge === 0) return null;

  const mostSevere = activeEvents[0];

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.bar} onPress={() => setExpanded(e => !e)}>
        <Text style={styles.barIcon}>{mostSevere?.icon ?? '⚙️'}</Text>
        <Text style={styles.barText} numberOfLines={1}>
          {mostSevere ? mostSevere.title : pendingRepairs.length > 0 ? 'Machine needs repair' : 'Repair in progress'}
          {totalBadge > 1 ? ` +${totalBadge - 1} more` : ''}
        </Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.list} nestedScrollEnabled>
          {activeEvents.map((e: GameEvent) => (
            <View key={e.id} style={styles.eventRow}>
              <Text style={styles.eventIcon}>{e.icon}</Text>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: severityColor(e.type) }]}>{e.title}</Text>
                <Text style={styles.eventDetail}>
                  {e.description} · {e.expiresDay - day}d remaining
                </Text>
              </View>
            </View>
          ))}
          {pendingRepairs.map((r: MachineRepair) => (
            <View key={r.id} style={styles.eventRow}>
              <Text style={styles.eventIcon}>⚙️</Text>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: '#ef5350' }]}>Machine broken</Text>
                <Text style={styles.eventDetail}>
                  Repair cost: ${r.cost.toLocaleString()}
                  {r.insurancePaid > 0 ? ` (insurance covers $${r.insurancePaid.toLocaleString()})` : ''}
                  {' '}· Go to Machinery tab
                </Text>
              </View>
            </View>
          ))}
          {inProgressRepairs.map((r: MachineRepair) => (
            <View key={r.id} style={styles.eventRow}>
              <Text style={styles.eventIcon}>🔧</Text>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: '#ffb74d' }]}>Repair in progress</Text>
                <Text style={styles.eventDetail}>
                  Ready in {Math.max(0, (r.readyDay ?? 0) - day)}d
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:     { backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#333' },
  bar:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, gap: 8 },
  barIcon:     { fontSize: 16 },
  barText:     { flex: 1, color: '#ffb74d', fontSize: 12, fontWeight: 'bold' },
  chevron:     { color: '#666', fontSize: 11 },
  list:        { maxHeight: 200, paddingHorizontal: 12, paddingBottom: 8 },
  eventRow:    { flexDirection: 'row', gap: 10, paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#222' },
  eventIcon:   { fontSize: 18, width: 24 },
  eventInfo:   { flex: 1 },
  eventTitle:  { fontSize: 12, fontWeight: 'bold' },
  eventDetail: { fontSize: 11, color: '#888', marginTop: 1 },
});
