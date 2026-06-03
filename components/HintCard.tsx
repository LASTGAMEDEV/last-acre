import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { C, F, R, S } from '../constants/theme';

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
  card:       { margin: S.md, marginBottom: 0, borderLeftWidth: 3, borderLeftColor: C.amber, backgroundColor: C.bgCard, borderRadius: R.md, padding: S.md },
  topRow:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: S.xs },
  title:      { color: C.text, fontSize: F.size.md, fontWeight: F.weight.bold, flex: 1 },
  dismiss:    { color: C.textDim, fontSize: 16, paddingLeft: S.sm },
  body:       { color: C.textDim, fontSize: F.size.sm, lineHeight: 18 },
  actionBtn:  { marginTop: S.sm, alignSelf: 'flex-start', backgroundColor: C.amber, paddingHorizontal: S.md, paddingVertical: S.xs, borderRadius: R.sm },
  actionText: { color: C.bgCard, fontSize: F.size.sm, fontWeight: F.weight.bold },
});
