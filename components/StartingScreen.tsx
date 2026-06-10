// components/StartingScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { C, F, S, R } from '../constants/theme';

type Backstory = 'first_gen' | 'inherited' | 'established';
type FarmStyle = 'crop_focus' | 'livestock' | 'market_trader' | 'balanced';

const BACKSTORY_OPTIONS: { id: Backstory; title: string; desc: string; detail: string }[] = [
  { id: 'first_gen',   title: 'First Generation', desc: 'Start from scratch',    detail: '$8k · 20 ha · No debt' },
  { id: 'inherited',   title: 'Inherited Farm',   desc: 'Modest existing setup', detail: '$22k · 50 ha · Some debt' },
  { id: 'established', title: 'Established',      desc: 'Going concern',         detail: '$45k · 100 ha · Leveraged' },
];

const STYLE_OPTIONS: { id: FarmStyle; icon: string; title: string; desc: string; bonus: string }[] = [
  { id: 'crop_focus',     icon: '🌾', title: 'Crop Farm',        desc: 'Fields & harvests', bonus: '+$1,500 seed budget' },
  { id: 'livestock',      icon: '🐔', title: 'Livestock Farm',   desc: 'Animals first',     bonus: '4 starter hens' },
  { id: 'market_trader',  icon: '📊', title: 'Market Trader',    desc: 'Buy low, sell high', bonus: '+$2,500 trading cash' },
  { id: 'balanced',       icon: '🏡', title: 'Balanced Farm',    desc: 'A bit of everything', bonus: 'Standard start' },
];

export default function StartingScreen() {
  const completeGameSetup = useGameStore(s => s.completeGameSetup);

  const [farmName,     setFarmName]     = useState('');
  const [farmerName,   setFarmerName]   = useState('');
  const [backstory,    setBackstory]    = useState<Backstory>('first_gen');
  const [farmStyle,    setFarmStyle]    = useState<FarmStyle>('balanced');
  const [error,        setError]        = useState('');

  function handleBegin() {
    if (!farmName.trim())   return setError('Enter a farm name to continue.');
    if (!farmerName.trim()) return setError('Enter your farmer name to continue.');
    setError('');
    completeGameSetup(farmName.trim(), farmerName.trim(), backstory, farmStyle);
  }

  return (
    <KeyboardAvoidingView style={ss.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={ss.scroll} keyboardShouldPersistTaps="handled">

        <Text style={ss.gameTitle}>LAST ACRE</Text>
        <Text style={ss.subtitle}>YOUR DYNASTY BEGINS · 1970</Text>

        <View style={ss.field}>
          <Text style={ss.fieldLabel}>FARM NAME</Text>
          <TextInput
            style={ss.input}
            value={farmName}
            onChangeText={setFarmName}
            placeholder="e.g. Hartwell Family Farm"
            placeholderTextColor={C.textFaint}
            maxLength={48}
          />
        </View>

        <View style={ss.field}>
          <Text style={ss.fieldLabel}>YOUR STORY</Text>
          <View style={ss.backstoryRow}>
            {BACKSTORY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[ss.bsChip, backstory === opt.id && ss.bsChipActive]}
                onPress={() => setBackstory(opt.id)}
                activeOpacity={0.8}
              >
                <Text style={[ss.bsTitle, backstory === opt.id && ss.bsTitleActive]}>{opt.title}</Text>
                <Text style={ss.bsDesc}>{opt.desc}</Text>
                <Text style={ss.bsDetail}>{opt.detail}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={ss.field}>
          <Text style={ss.fieldLabel}>FARM FOCUS</Text>
          <View style={ss.styleGrid}>
            {STYLE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[ss.styleChip, farmStyle === opt.id && ss.styleChipActive]}
                onPress={() => setFarmStyle(opt.id)}
                activeOpacity={0.8}
              >
                <Text style={ss.styleIcon}>{opt.icon}</Text>
                <Text style={[ss.styleTitle, farmStyle === opt.id && ss.styleTitleActive]}>{opt.title}</Text>
                <Text style={ss.styleDesc}>{opt.desc}</Text>
                <Text style={[ss.styleBonus, farmStyle === opt.id && ss.styleBonusActive]}>{opt.bonus}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={ss.field}>
          <Text style={ss.fieldLabel}>FARMER NAME</Text>
          <TextInput
            style={ss.input}
            value={farmerName}
            onChangeText={setFarmerName}
            placeholder="e.g. James Hartwell"
            placeholderTextColor={C.textFaint}
            maxLength={32}
          />
        </View>

        {error ? <Text style={ss.error}>{error}</Text> : null}

        <TouchableOpacity style={ss.beginBtn} onPress={handleBegin} activeOpacity={0.85}>
          <Text style={ss.beginText}>BEGIN YOUR LEGACY →</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ss = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#0a0f0a' },
  scroll:        { padding: S.xl, paddingTop: 60, gap: S.xl },
  gameTitle:     { color: '#c8860a', fontSize: 28, fontWeight: 'bold', textAlign: 'center', letterSpacing: 4 },
  subtitle:      { color: '#2a4a2a', fontSize: 10, textAlign: 'center', letterSpacing: 3, marginTop: -12 },
  field:         { gap: 8 },
  fieldLabel:    { color: '#3a6a3a', fontSize: 9, letterSpacing: 2, fontWeight: 'bold' },
  input:         { backgroundColor: '#0f1a0f', borderWidth: 1, borderColor: '#1e3a1e', borderRadius: R.md, padding: 12, color: C.text, fontSize: F.size.md },
  backstoryRow:  { flexDirection: 'row', gap: 8 },
  bsChip:        { flex: 1, backgroundColor: '#0f1a0f', borderWidth: 1, borderColor: '#1e3a1e', borderRadius: R.md, padding: 10, alignItems: 'center' },
  bsChipActive:  { backgroundColor: '#1a2e1a', borderColor: '#4a7c59' },
  bsTitle:       { color: '#4a6a4a', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  bsTitleActive: { color: '#a5d6a7' },
  bsDesc:        { color: '#2a4a2a', fontSize: 9, textAlign: 'center', marginTop: 3 },
  bsDetail:      { color: '#1a3a1a', fontSize: 8, textAlign: 'center', marginTop: 2 },
  styleGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  styleChip:        { flexBasis: '48%', flexGrow: 1, backgroundColor: '#0f1a0f', borderWidth: 1, borderColor: '#1e3a1e', borderRadius: R.md, padding: 10, alignItems: 'center', gap: 2 },
  styleChipActive:  { backgroundColor: '#1a2e1a', borderColor: '#4a7c59' },
  styleIcon:        { fontSize: 22, marginBottom: 2 },
  styleTitle:       { color: '#4a6a4a', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  styleTitleActive: { color: '#a5d6a7' },
  styleDesc:        { color: '#2a4a2a', fontSize: 9, textAlign: 'center' },
  styleBonus:       { color: '#1a3a1a', fontSize: 8, textAlign: 'center', marginTop: 2 },
  styleBonusActive: { color: '#4a7c59' },
  error:         { color: '#ef5350', fontSize: F.size.sm, textAlign: 'center' },
  beginBtn:      { backgroundColor: '#4a7c59', borderRadius: R.md, paddingVertical: 14, alignItems: 'center', marginTop: S.sm },
  beginText:     { color: '#fff', fontSize: F.size.md, fontWeight: 'bold', letterSpacing: 1 },
});
