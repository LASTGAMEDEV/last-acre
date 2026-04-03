import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';

interface Props {
  id: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function HintCard({ id, title, body, actionLabel, onAction }: Props) {
  const { dismissedHints, dismissHint } = useGameStore();

  if ((dismissedHints ?? []).includes(id)) return null;

  return (
    <View style={s.card}>
      <View style={s.topRow}>
        <Text style={s.title}>💡 {title}</Text>
        <TouchableOpacity onPress={() => dismissHint(id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.dismiss}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.body}>{body}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={s.actionBtn} onPress={onAction}>
          <Text style={s.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card:       { margin: 10, marginBottom: 0, borderWidth: 1, borderColor: '#7a5c00', backgroundColor: '#1e1600', borderRadius: 8, padding: 12 },
  topRow:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  title:      { color: '#ffd700', fontSize: 13, fontWeight: 'bold', flex: 1 },
  dismiss:    { color: '#7a5c00', fontSize: 16, paddingLeft: 8 },
  body:       { color: '#c8a86b', fontSize: 12, lineHeight: 18 },
  actionBtn:  { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#7a5c00', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  actionText: { color: '#ffd700', fontSize: 12, fontWeight: 'bold' },
});
