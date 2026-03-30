# Tab Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce 13 main tabs to 5 by grouping related screens behind combined tabs with internal sub-navigation.

**Architecture:** Each of the 4 multi-screen combined tabs (`granja`, `mercado`, `fabrica`, `gestion`) is a new file in `app/(tabs)/` that renders a horizontal sub-tab bar and conditionally imports + renders the existing screen components. The existing 13 tab files stay in place — they are hidden from the tab bar via `href: null` in `_layout.tsx`. `clima.tsx` is renamed/kept as the Weather tab. No screen content is duplicated or rewritten.

**Tech Stack:** React Native, Expo Router (file-based routing), TypeScript, Zustand. Sub-tab pattern identical to `app/(tabs)/economia.tsx`.

---

## File Structure

**Create:**
- `app/(tabs)/granja.tsx` — Farm tab (Fields, Animals, Machinery, Workers)
- `app/(tabs)/mercado.tsx` — Market tab (Economy, Auction, Store)
- `app/(tabs)/fabrica.tsx` — Processing tab (Processing, Insurance)
- `app/(tabs)/gestion.tsx` — Office tab (Office, Calendar, Achievements)

**Modify:**
- `app/(tabs)/_layout.tsx` — Hide 13 old tabs, register 5 new ones

**Unchanged:**
- `app/(tabs)/clima.tsx` — Weather tab (already solo, just re-labeled in layout)
- All 13 existing screen files — content untouched, just hidden from tab bar

---

### Task 1: Create `granja.tsx` — Farm tab

**Files:**
- Create: `app/(tabs)/granja.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import TierrasScreen from './tierras';
import AnimalesScreen from './animales';
import MaquinariaScreen from './maquinaria';
import TrabajadoresScreen from './trabajadores';

type FarmTab = 'fields' | 'animals' | 'machinery' | 'workers';

const TABS: { id: FarmTab; label: string }[] = [
  { id: 'fields',    label: '🌾 Fields' },
  { id: 'animals',   label: '🐄 Animals' },
  { id: 'machinery', label: '🚜 Machinery' },
  { id: 'workers',   label: '👨‍🌾 Workers' },
];

export default function GranjaScreen() {
  const [tab, setTab] = useState<FarmTab>('fields');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'fields'    && <TierrasScreen />}
      {tab === 'animals'   && <AnimalesScreen />}
      {tab === 'machinery' && <MaquinariaScreen />}
      {tab === 'workers'   && <TrabajadoresScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0a1628' },
  tabBar:         { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 6, backgroundColor: '#0a1628' },
  tabBtn:         { flex: 1, backgroundColor: '#16213e', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  tabBtnActive:   { backgroundColor: '#0f3460' },
  tabBtnText:     { color: '#888', fontSize: 10, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#e8d5a3' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
```

Expected: same pre-existing errors as before, no new errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/granja.tsx"
git commit -m "feat(tabs): add Farm combined tab (Fields, Animals, Machinery, Workers)"
```

---

### Task 2: Create `mercado.tsx` — Market tab

**Files:**
- Create: `app/(tabs)/mercado.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import EconomiaScreen from './economia';
import SubastaScreen from './subasta';
import TiendaScreen from './tienda';

type MarketTab = 'economy' | 'auction' | 'store';

const TABS: { id: MarketTab; label: string }[] = [
  { id: 'economy', label: '📈 Economy' },
  { id: 'auction', label: '🔨 Auction' },
  { id: 'store',   label: '🛒 Store' },
];

export default function MercadoScreen() {
  const [tab, setTab] = useState<MarketTab>('economy');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'economy' && <EconomiaScreen />}
      {tab === 'auction' && <SubastaScreen />}
      {tab === 'store'   && <TiendaScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0a1628' },
  tabBar:           { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 6, backgroundColor: '#0a1628' },
  tabBtn:           { flex: 1, backgroundColor: '#16213e', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  tabBtnActive:     { backgroundColor: '#0f3460' },
  tabBtnText:       { color: '#888', fontSize: 10, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#e8d5a3' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: same pre-existing errors, no new ones.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/mercado.tsx"
git commit -m "feat(tabs): add Market combined tab (Economy, Auction, Store)"
```

---

### Task 3: Create `fabrica.tsx` — Processing tab

**Files:**
- Create: `app/(tabs)/fabrica.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ProcesadoScreen from './procesado';
import SegurosScreen from './seguros';

type ProcessingTab = 'processing' | 'insurance';

const TABS: { id: ProcessingTab; label: string }[] = [
  { id: 'processing', label: '🏭 Processing' },
  { id: 'insurance',  label: '🛡️ Insurance' },
];

export default function FabricaScreen() {
  const [tab, setTab] = useState<ProcessingTab>('processing');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'processing' && <ProcesadoScreen />}
      {tab === 'insurance'  && <SegurosScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0a1628' },
  tabBar:           { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 6, backgroundColor: '#0a1628' },
  tabBtn:           { flex: 1, backgroundColor: '#16213e', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  tabBtnActive:     { backgroundColor: '#0f3460' },
  tabBtnText:       { color: '#888', fontSize: 10, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#e8d5a3' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/fabrica.tsx"
git commit -m "feat(tabs): add Processing combined tab (Processing, Insurance)"
```

---

### Task 4: Create `gestion.tsx` — Office tab

**Files:**
- Create: `app/(tabs)/gestion.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import OficinaScreen from './oficina';
import CalendarioScreen from './calendario';
import LogrosScreen from './logros';

type OfficeTab = 'office' | 'calendar' | 'achievements';

const TABS: { id: OfficeTab; label: string }[] = [
  { id: 'office',       label: '📋 Office' },
  { id: 'calendar',     label: '📅 Calendar' },
  { id: 'achievements', label: '🏆 Goals' },
];

export default function GestionScreen() {
  const [tab, setTab] = useState<OfficeTab>('office');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'office'       && <OficinaScreen />}
      {tab === 'calendar'     && <CalendarioScreen />}
      {tab === 'achievements' && <LogrosScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0a1628' },
  tabBar:           { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 6, backgroundColor: '#0a1628' },
  tabBtn:           { flex: 1, backgroundColor: '#16213e', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  tabBtnActive:     { backgroundColor: '#0f3460' },
  tabBtnText:       { color: '#888', fontSize: 10, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#e8d5a3' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/gestion.tsx"
git commit -m "feat(tabs): add Office combined tab (Office, Calendar, Achievements)"
```

---

### Task 5: Update `_layout.tsx` — show 5 new tabs, hide 13 old ones

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Replace the `<Tabs>` block**

Find the entire `<Tabs ...>` block (lines 37–59 in the current file) and replace it with:

```tsx
<Tabs
  screenOptions={{
    headerShown: false,
    tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.accent + '33' },
    tabBarActiveTintColor: theme.accent,
    tabBarInactiveTintColor: C.faint,
    tabBarLabelStyle: { fontSize: 10 },
  }}
>
  {/* ── 5 visible combined tabs ── */}
  <Tabs.Screen name="granja"   options={{ title: 'Farm',       tabBarLabel: '🌾 Farm' }} />
  <Tabs.Screen name="mercado"  options={{ title: 'Market',     tabBarLabel: '💰 Market' }} />
  <Tabs.Screen name="fabrica"  options={{ title: 'Processing', tabBarLabel: '🏭 Processing' }} />
  <Tabs.Screen name="gestion"  options={{ title: 'Office',     tabBarLabel: '📋 Office' }} />
  <Tabs.Screen name="clima"    options={{ title: 'Weather',    tabBarLabel: '☀️ Weather' }} />

  {/* ── Hidden legacy screens (content accessed via combined tabs) ── */}
  <Tabs.Screen name="tierras"      options={{ href: null }} />
  <Tabs.Screen name="animales"     options={{ href: null }} />
  <Tabs.Screen name="maquinaria"   options={{ href: null }} />
  <Tabs.Screen name="trabajadores" options={{ href: null }} />
  <Tabs.Screen name="economia"     options={{ href: null }} />
  <Tabs.Screen name="subasta"      options={{ href: null }} />
  <Tabs.Screen name="tienda"       options={{ href: null }} />
  <Tabs.Screen name="procesado"    options={{ href: null }} />
  <Tabs.Screen name="seguros"      options={{ href: null }} />
  <Tabs.Screen name="oficina"      options={{ href: null }} />
  <Tabs.Screen name="calendario"   options={{ href: null }} />
  <Tabs.Screen name="logros"       options={{ href: null }} />
</Tabs>
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: same pre-existing errors, no new ones.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/_layout.tsx"
git commit -m "feat(tabs): consolidate 13 tabs into 5 combined tabs"
```
