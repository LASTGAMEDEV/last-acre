// components/legado/FamiliaSection.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import type { FamilyMember, FarmRole } from '../../features/family/familyTypes';
import { C, F, S, R } from '../../constants/theme';

const ROLE_LABELS: Record<FarmRole, string> = {
  livestock_manager:  '🐄 Livestock Manager',
  crop_assistant:     '🌾 Crop Assistant',
  machinery_operator: '🚜 Machinery Operator',
  office_manager:     '📋 Office Manager',
  general_help:       '🤲 General Help',
};

const ROLE_OPTIONS: { role: FarmRole; label: string }[] = [
  { role: 'livestock_manager',  label: '🐄 Livestock' },
  { role: 'crop_assistant',     label: '🌾 Crops' },
  { role: 'machinery_operator', label: '🚜 Machinery' },
  { role: 'office_manager',     label: '📋 Office' },
  { role: 'general_help',       label: '🤲 General' },
];

function MemberCard({ member, onSetRole }: {
  member: FamilyMember;
  onSetRole: (id: string, role: FarmRole | undefined) => void;
}) {
  const isChild  = member.relation === 'child';
  const isAdult  = isChild && member.age >= 18;
  const healthPct = Math.max(0, Math.min(100, member.health));
  const healthColor = healthPct >= 60 ? '#4caf50' : healthPct >= 30 ? '#ff9800' : '#ef5350';
  const [showRolePicker, setShowRolePicker] = React.useState(false);

  return (
    <View style={fc.card}>
      {/* Header row */}
      <View style={fc.cardHeader}>
        <View style={fc.avatar}>
          <Text style={fc.avatarIcon}>
            {member.relation === 'spouse' ? '👩‍🌾' : member.age < 12 ? '🧒' : member.age < 18 ? '🧑' : '👨‍🌾'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={fc.memberName}>{member.firstName}</Text>
          <Text style={fc.memberMeta}>
            {member.relation === 'spouse' ? 'Spouse' : 'Child'} · Age {member.age}
            {member.isMarried ? ' · Married' : ''}
          </Text>
        </View>
        {member.farmRole && (
          <TouchableOpacity onPress={() => setShowRolePicker(!showRolePicker)}>
            <View style={fc.roleBadge}>
              <Text style={fc.roleText}>{ROLE_LABELS[member.farmRole]}</Text>
            </View>
          </TouchableOpacity>
        )}
        {!member.farmRole && (isAdult || member.relation === 'spouse') && (
          <TouchableOpacity style={fc.assignBtn} onPress={() => setShowRolePicker(!showRolePicker)}>
            <Text style={fc.assignText}>Assign role</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Role picker */}
      {showRolePicker && (
        <View style={fc.rolePicker}>
          {ROLE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.role}
              style={[fc.roleOption, member.farmRole === opt.role && fc.roleOptionActive]}
              onPress={() => {
                onSetRole(member.id, member.farmRole === opt.role ? undefined : opt.role);
                setShowRolePicker(false);
              }}
            >
              <Text style={fc.roleOptionText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bars */}
      <View style={{ gap: 6, marginTop: 8 }}>
        {/* Relationship bar */}
        <View style={fc.barRow}>
          <Text style={fc.barLabel}>Relationship</Text>
          <View style={fc.barTrack}>
            <View style={[fc.barFill, { width: `${member.relationshipWithFarmer}%` as any, backgroundColor: '#4a7c59' }]} />
          </View>
          <Text style={fc.barNum}>{member.relationshipWithFarmer}</Text>
        </View>
        {/* Farm interest bar (children only) */}
        {isChild && (
          <View style={fc.barRow}>
            <Text style={fc.barLabel}>Farm Interest</Text>
            <View style={fc.barTrack}>
              <View style={[fc.barFill, { width: `${member.farmInterest}%` as any, backgroundColor: '#c8860a' }]} />
            </View>
            <Text style={[fc.barNum, { color: '#c8860a' }]}>{member.farmInterest}</Text>
          </View>
        )}
        {/* Health bar */}
        <View style={fc.barRow}>
          <Text style={fc.barLabel}>Health</Text>
          <View style={fc.barTrack}>
            <View style={[fc.barFill, { width: `${healthPct}%` as any, backgroundColor: healthColor }]} />
          </View>
          <Text style={[fc.barNum, { color: healthColor }]}>{Math.round(healthPct)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function FamiliaSection() {
  const { day, family, coOwner, setFamilyMemberRole } = useGameStore(s => ({
    day:               s.day,
    family:            s.family,
    coOwner:           s.family.coOwner,
    setFamilyMemberRole: s.setFamilyMemberRole,
  }));

  const allMembers = [family.spouse, ...family.children].filter((m): m is FamilyMember => m !== undefined && m.isAlive);

  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} showsVerticalScrollIndicator={false}>

      {/* No family yet */}
      {allMembers.length === 0 && (
        <View style={fc.empty}>
          <Text style={fc.emptyIcon}>👨‍🌾</Text>
          <Text style={fc.emptyTitle}>No family yet</Text>
          <Text style={fc.emptyDesc}>Life events will introduce family members over time. Keep farming.</Text>
        </View>
      )}

      {/* Co-owner notice */}
      {coOwner && (
        <View style={[fc.card, { borderColor: coOwner.relationship < 30 ? '#ef535044' : '#4a7c5944', borderWidth: 1 }]}>
          <Text style={[fc.memberName, { color: '#c8860a' }]}>⚖️ Co-owner: {coOwner.sibling.firstName}</Text>
          <View style={fc.barRow}>
            <Text style={fc.barLabel}>Co-owner relationship</Text>
            <View style={fc.barTrack}>
              <View style={[fc.barFill, { width: `${coOwner.relationship}%` as any, backgroundColor: coOwner.relationship < 30 ? '#ef5350' : '#4a7c59' }]} />
            </View>
            <Text style={fc.barNum}>{coOwner.relationship}</Text>
          </View>
          <Text style={fc.memberMeta}>Ownership split: {coOwner.playerOwnershipShare}% / {100 - coOwner.playerOwnershipShare}%</Text>
          {coOwner.relationship < 30 && (
            <Text style={{ color: '#ef5350', fontSize: 10, marginTop: 6 }}>⚠ Relationship critical — buyout event incoming</Text>
          )}
        </View>
      )}

      {/* Member cards */}
      {allMembers.map(m => (
        <MemberCard
          key={m.id}
          member={m}
          onSetRole={setFamilyMemberRole}
        />
      ))}

    </ScrollView>
  );
}

const fc = StyleSheet.create({
  card:          { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 14 },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  avatar:        { width: 36, height: 36, backgroundColor: '#1a3a1a', borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarIcon:    { fontSize: 18 },
  memberName:    { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
  memberMeta:    { color: C.textMuted, fontSize: 10, marginTop: 1 },
  roleBadge:     { backgroundColor: '#0a2a0a', borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 3 },
  roleText:      { color: '#7cb87e', fontSize: 9, fontWeight: 'bold' },
  assignBtn:     { backgroundColor: '#0f1a0f', borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#1e2e1e' },
  assignText:    { color: '#3a5a3a', fontSize: 9 },
  rolePicker:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  roleOption:    { backgroundColor: '#0f1a0f', borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#1e2e1e' },
  roleOptionActive: { backgroundColor: '#1a3a1a', borderColor: '#4a7c59' },
  roleOptionText:{ color: '#7cb87e', fontSize: 10 },
  barRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel:      { color: C.textFaint, fontSize: 9, width: 80 },
  barTrack:      { flex: 1, height: 5, backgroundColor: '#1a2a1a', borderRadius: 3, overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: 3 },
  barNum:        { color: C.textMuted, fontSize: 9, width: 24, textAlign: 'right' },
  empty:         { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon:     { fontSize: 36 },
  emptyTitle:    { color: C.text, fontSize: F.size.md, fontWeight: 'bold' },
  emptyDesc:     { color: C.textFaint, fontSize: F.size.sm, textAlign: 'center', lineHeight: 18 },
});
