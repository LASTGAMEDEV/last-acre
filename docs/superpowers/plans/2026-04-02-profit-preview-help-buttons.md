# Profit Preview Enhancement & Contextual Help Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fertilizer/herbicide cost rows to the existing profit preview card, and add a reusable `HelpSheet` component with `?` buttons across 7 screens.

**Architecture:** Task 1 is a pure edit to `tierras.tsx` — no new files. Task 2 creates `components/HelpSheet.tsx` (a modal bottom sheet), then drops a `<HelpSheet>` inline next to existing labels in 7 screens. No new state, no new dependencies.

**Tech Stack:** React Native, TypeScript, Expo. Uses `Modal` + `Animated` (already imported across the codebase).

---

## File Map

| File | Action |
|------|--------|
| `app/(tabs)/tierras.tsx` | Modify — add fertilizer + herbicide rows to profit preview; add 2 `?` buttons |
| `components/HelpSheet.tsx` | Create — reusable `?` button + bottom-sheet modal |
| `app/(tabs)/animales.tsx` | Modify — add 1 `?` button next to Genes panel title |
| `app/(tabs)/economia.tsx` | Modify — add 2 `?` buttons (Sell Pressure, Futures) |
| `app/(tabs)/oficina.tsx` | Modify — add 1 `?` button next to Credit score label |
| `app/(tabs)/procesado.tsx` | Modify — add 1 `?` button next to Processing header |
| `app/(tabs)/granja.tsx` | Modify — add 1 `?` button next to Active Jobs label |

---

## Task 1: Enhance profit preview with fertilizer & herbicide rows

**Files:**
- Modify: `app/(tabs)/tierras.tsx` (lines 786–816)

### Background

The profit preview IIFE already computes `seedCostPrev`, `estRevenue`, `estProfit`, `dailyRate`. It renders a `rows` array then maps them into label/value pairs. The `PRODUCT_TYPES` import already exists at line 13.

### Changes

- [ ] **Step 1: Add fertilizer cost variable and herbicide cost variable**

Find this block (around line 786):
```typescript
const seedCostPrev = Math.round(crop.seedCost * ha * (fertilized ? 1.3 : 1.0) * coopDiscount);
const estYield = crop.baseYield * ha * soilMod * (rotation ? 1.15 : 1.0) * (fertilized ? 1.15 : 1.0);
const currentPrice = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
const estRevenue = Math.round(estYield * currentPrice);
const estProfit = estRevenue - seedCostPrev;
const dailyRate = Math.round(estProfit / crop.growthDays);
const profitColor = estProfit >= 0 ? '#66bb6a' : '#ef5350';
```

Replace with:
```typescript
const seedCostPrev = Math.round(crop.seedCost * ha * (fertilized ? 1.3 : 1.0) * coopDiscount);
const fertCost = fertilized ? Math.round(crop.seedCost * ha * coopDiscount * 0.3) : 0;
const estYield = crop.baseYield * ha * soilMod * (rotation ? 1.15 : 1.0) * (fertilized ? 1.15 : 1.0);
const currentPrice = prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
const estRevenue = Math.round(estYield * currentPrice);
const estProfit = estRevenue - seedCostPrev;
const dailyRate = Math.round(estProfit / crop.growthDays);
const profitColor = estProfit >= 0 ? '#66bb6a' : '#ef5350';
const cheapestHerbicide = PRODUCT_TYPES
  .filter(p => p.category === 'herbicide')
  .sort((a, b) => a.cost - b.cost)[0];
const herbCost = plantingParcel.hasWeeds
  ? Math.round((cheapestHerbicide?.cost ?? 70) * ha)
  : 0;
```

- [ ] **Step 2: Add fertilizer row to the rows array**

Find the `rows` array (around line 793):
```typescript
const rows: [string, string, string][] = [
  ['Seed cost', `-$${seedCostPrev.toLocaleString()}`, '#ef9a9a'],
  [`Est. yield (${Math.round(estYield).toLocaleString()} ${crop.unit})`, `+$${estRevenue.toLocaleString()}`, '#4caf50'],
  ['Est. profit', `${estProfit >= 0 ? '+' : ''}$${estProfit.toLocaleString()}`, profitColor],
  ['Daily return', `$${dailyRate.toLocaleString()}/day`, dailyRate >= 0 ? '#64b5f6' : '#ef5350'],
  ['Ready in', `${crop.growthDays}d`, '#888'],
];
```

Replace with:
```typescript
const rows: [string, string, string][] = [
  ['Seed cost', `-$${seedCostPrev.toLocaleString()}`, '#ef9a9a'],
  ...(fertilized ? [['Fertilizer addon', `-$${fertCost.toLocaleString()}`, '#ef9a9a'] as [string, string, string]] : []),
  [`Est. yield (${Math.round(estYield).toLocaleString()} ${crop.unit})`, `+$${estRevenue.toLocaleString()}`, '#4caf50'],
  ['Est. profit', `${estProfit >= 0 ? '+' : ''}$${estProfit.toLocaleString()}`, profitColor],
  ['Daily return', `$${dailyRate.toLocaleString()}/day`, dailyRate >= 0 ? '#64b5f6' : '#ef5350'],
  ['Ready in', `${crop.growthDays}d`, '#888'],
];
```

- [ ] **Step 3: Add herbicide advisory row after the fertility row**

Find (around line 809):
```typescript
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ color: '#666', fontSize: 11 }}>Fertility after harvest</Text>
```

After the closing `</View>` of the fertility row (around line 814), before the disclaimer `<Text>`, add:
```typescript
                  {herbCost > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ color: '#666', fontSize: 11 }}>⚠️ Herbicide (weeds)</Text>
                      <Text style={{ color: '#ffb74d', fontSize: 11, fontWeight: 'bold' }}>~-${herbCost.toLocaleString()}</Text>
                    </View>
                  )}
                  {herbCost > 0 && (
                    <Text style={{ color: '#665500', fontSize: 9, marginBottom: 2 }}>* Weed cost not included in profit above</Text>
                  )}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
```

Expected: same pre-existing errors, no new ones.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "app/(tabs)/tierras.tsx"
git commit -m "feat(ui): add fertilizer and herbicide cost rows to profit preview"
```

---

## Task 2: Create HelpSheet component

**Files:**
- Create: `components/HelpSheet.tsx`

- [ ] **Step 1: Create the component**

```typescript
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, StyleSheet, Pressable } from 'react-native';

interface HelpSheetProps {
  title: string;
  body: string;
  size?: number;
}

export default function HelpSheet({ title, body, size = 14 }: HelpSheetProps) {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  const open = () => {
    setVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const close = () => {
    Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start(() => setVisible(false));
  };

  return (
    <>
      <TouchableOpacity onPress={open} style={[hs.btn, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={[hs.btnText, { fontSize: size - 2 }]}>?</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
        <Pressable style={hs.backdrop} onPress={close} />
        <Animated.View style={[hs.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={hs.handle} />
          <Text style={hs.title}>{title}</Text>
          <Text style={hs.body}>{body}</Text>
          <TouchableOpacity style={hs.closeBtn} onPress={close}>
            <Text style={hs.closeBtnText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </>
  );
}

const hs = StyleSheet.create({
  btn:        { backgroundColor: '#1a2744', borderWidth: 1, borderColor: '#2a4a7f', alignItems: 'center', justifyContent: 'center' },
  btnText:    { color: '#4fc3f7', fontWeight: 'bold' },
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:      { backgroundColor: '#0d1117', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: '#1e2a3a', padding: 20, paddingBottom: 32 },
  handle:     { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:      { color: '#e8d5a3', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  body:       { color: '#aaa', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  closeBtn:   { backgroundColor: '#1a3a5c', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { color: '#4fc3f7', fontSize: 14, fontWeight: 'bold' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "components/HelpSheet.tsx"
git commit -m "feat(ui): add reusable HelpSheet component"
```

---

## Task 3: Add ? buttons to tierras.tsx (Soil Type + Crop Rotation)

**Files:**
- Modify: `app/(tabs)/tierras.tsx`

- [ ] **Step 1: Import HelpSheet**

At the top of `tierras.tsx`, after the last import (around line 15), add:
```typescript
import HelpSheet from '../../components/HelpSheet';
```

- [ ] **Step 2: Add ? button next to Soil Type**

Find (around line 665) inside the planting modal header:
```typescript
              {plantingParcel?.soilType ? ` · ${SOIL_ICONS[plantingParcel.soilType]} ${plantingParcel.soilType} soil` : ''}
```

This is inside a `<Text>` tag. The soil type is shown as part of a subtitle string. Find the `<Text>` that contains this (it's the subtitle of the planting modal) and replace it with a row that includes the `?` button. Find the exact structure:

```typescript
<Text style={styles.plantModalSub}>
  {plantingParcel.hectares} ha{plantingParcel?.soilType ? ` · ${SOIL_ICONS[plantingParcel.soilType]} ${plantingParcel.soilType} soil` : ''}
</Text>
```

Replace with:
```typescript
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
  <Text style={styles.plantModalSub}>
    {plantingParcel.hectares} ha{plantingParcel?.soilType ? ` · ${SOIL_ICONS[plantingParcel.soilType]} ${plantingParcel.soilType} soil` : ''}
  </Text>
  {plantingParcel?.soilType && (
    <HelpSheet
      title="Soil Type"
      body="Each soil type favours different crops. Loamy soil gives balanced yields, sandy soil suits drought-tolerant crops, clay soil suits root vegetables, and chalky soil suits specialty crops. Matching crop to soil gives up to +20% yield."
    />
  )}
</View>
```

- [ ] **Step 3: Add ? button next to the Rotation Bonus heading**

Find (around line 753):
```typescript
                    <Text style={{ color: '#66bb6a', fontSize: 12, fontWeight: 'bold' }}>✅ +15% Rotation Bonus</Text>
```

Replace with:
```typescript
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: '#66bb6a', fontSize: 12, fontWeight: 'bold' }}>✅ +15% Rotation Bonus</Text>
                      <HelpSheet
                        title="Crop Rotation"
                        body="Planting a different crop than the previous one gives a +15% yield bonus. Rotating also slows fertility loss over time. Try to avoid planting the same high-drain crop twice in a row."
                      />
                    </View>
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "app/(tabs)/tierras.tsx"
git commit -m "feat(ui): add soil type and crop rotation help buttons"
```

---

## Task 4: Add ? button to animales.tsx (Gene Grade)

**Files:**
- Modify: `app/(tabs)/animales.tsx`

- [ ] **Step 1: Import HelpSheet**

At the top of `animales.tsx`, after the last import, add:
```typescript
import HelpSheet from '../../components/HelpSheet';
```

- [ ] **Step 2: Add ? button next to the Genes panel title**

Find (around line 188):
```typescript
                    <View style={genStyles.panelHeader}>
                      <Text style={genStyles.panelTitle}>🧬 Genes</Text>
                      <View style={[genStyles.gradeBadge, { backgroundColor: avgColor + '33', borderColor: avgColor }]}>
                        <Text style={[genStyles.gradeBadgeText, { color: avgColor }]}>{avgGrade} Grade</Text>
                      </View>
                    </View>
```

Replace with:
```typescript
                    <View style={genStyles.panelHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={genStyles.panelTitle}>🧬 Genes</Text>
                        <HelpSheet
                          title="Gene Grade"
                          body="Each gene is scored D (weak) to S (exceptional). The overall grade is the average of all four genes. Higher grades mean more production, disease resistance, faster growth, or better sell price. Breed selectively to improve grades over generations."
                          size={12}
                        />
                      </View>
                      <View style={[genStyles.gradeBadge, { backgroundColor: avgColor + '33', borderColor: avgColor }]}>
                        <Text style={[genStyles.gradeBadgeText, { color: avgColor }]}>{avgGrade} Grade</Text>
                      </View>
                    </View>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "app/(tabs)/animales.tsx"
git commit -m "feat(ui): add gene grade help button to animal cards"
```

---

## Task 5: Add ? buttons to economia.tsx (Sell Pressure + Futures)

**Files:**
- Modify: `app/(tabs)/economia.tsx`

- [ ] **Step 1: Import HelpSheet**

At the top of `economia.tsx`, after the last import, add:
```typescript
import HelpSheet from '../../components/HelpSheet';
```

- [ ] **Step 2: Add ? button next to the sell pressure warning**

Find (around line 590):
```typescript
                    <Text style={styles.sellPressureWarn}>
                      ⚠️ Selling {Math.round(inStock).toLocaleString()} {selected.unit} will depress price by {Math.round((1 - pressureMod) * 100)}% for {sellPressureDuration(inStock)} days
                    </Text>
```

Replace with:
```typescript
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.sellPressureWarn, { flex: 1 }]}>
                        ⚠️ Selling {Math.round(inStock).toLocaleString()} {selected.unit} will depress price by {Math.round((1 - pressureMod) * 100)}% for {sellPressureDuration(inStock)} days
                      </Text>
                      <HelpSheet
                        title="Sell Pressure"
                        body="Selling a large quantity of a crop at once drives the market price down temporarily. Spreading sales over several days or selling smaller amounts avoids the penalty. The pressure lifts after a few days."
                        size={12}
                      />
                    </View>
```

- [ ] **Step 3: Add ? button next to the Futures section label**

Find (around line 333):
```typescript
            <Text style={styles.futuresSectionLabel}>Select Crop</Text>
```

This is the first element inside the futures ScrollView. Before it, add a header row with a `?` button. Insert before that line:
```typescript
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Text style={[styles.futuresSectionLabel, { marginBottom: 0 }]}>📉 Futures Trading</Text>
              <HelpSheet
                title="Futures Trading"
                body="A futures contract locks in today's price for a crop you'll deliver later. Useful when prices are high but your harvest isn't ready yet. If you can't deliver the agreed quantity, you pay a penalty."
              />
            </View>
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "app/(tabs)/economia.tsx"
git commit -m "feat(ui): add sell pressure and futures help buttons"
```

---

## Task 6: Add ? button to oficina.tsx (Credit Score)

**Files:**
- Modify: `app/(tabs)/oficina.tsx`

- [ ] **Step 1: Import HelpSheet**

At the top of `oficina.tsx`, after the last import, add:
```typescript
import HelpSheet from '../../components/HelpSheet';
```

- [ ] **Step 2: Add ? button next to Credit score label**

Find (around line 70):
```typescript
            <Text style={styles.creditLabel}>Credit score</Text>
```

Replace with:
```typescript
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.creditLabel}>Credit score</Text>
              <HelpSheet
                title="Credit Score"
                body="Your credit score determines how much you can borrow and at what interest rate. It's based on your rolling income over recent days, your existing debt, and how reliably you've repaid past loans."
                size={12}
              />
            </View>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "app/(tabs)/oficina.tsx"
git commit -m "feat(ui): add credit score help button"
```

---

## Task 7: Add ? button to procesado.tsx (Processing)

**Files:**
- Modify: `app/(tabs)/procesado.tsx`

- [ ] **Step 1: Import HelpSheet**

At the top of `procesado.tsx`, after the last import, add:
```typescript
import HelpSheet from '../../components/HelpSheet';
```

- [ ] **Step 2: Add ? button next to the Processing screen header**

Find (around line 63):
```typescript
      <ScreenHeader title="Processing" subtitle="Transform raw materials into higher-value products" />
```

`ScreenHeader` doesn't accept a `?` slot. Add the button below it as a row instead. After the `<ScreenHeader>` line, insert:
```typescript
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 }}>
        <HelpSheet
          title="Processing"
          body="Processing raw crops into products (flour, oil, cheese, etc.) increases their sell value by 50–200%. It takes time and requires the right building, but produces goods that are immune to crop market fluctuations."
        />
        <Text style={{ color: '#555', fontSize: 11, marginLeft: 6 }}>What is processing?</Text>
      </View>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "app/(tabs)/procesado.tsx"
git commit -m "feat(ui): add processing help button"
```

---

## Task 8: Add ? button to granja.tsx (Seed Lab)

**Files:**
- Modify: `app/(tabs)/granja.tsx`

- [ ] **Step 1: Import HelpSheet**

At the top of `granja.tsx`, after the last import, add:
```typescript
import HelpSheet from '../../components/HelpSheet';
```

- [ ] **Step 2: Add ? button next to Active Jobs label**

Find (around line 181):
```typescript
      <Text style={slStyles.sectionLabel}>Active Jobs ({hybridJobs.length}/{maxSlots})</Text>
```

Replace with:
```typescript
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 12, marginTop: 8, marginBottom: 4 }}>
        <Text style={[slStyles.sectionLabel, { marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>Active Jobs ({hybridJobs.length}/{maxSlots})</Text>
        <HelpSheet
          title="Seed Lab"
          body="The Seed Lab lets you hybridize two seed batches to breed offspring with combined genes. Higher-generation seeds have better yield, drought resistance, and quality. Requires a Seed Lab building."
          size={12}
        />
      </View>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "app/(tabs)/granja.tsx"
git commit -m "feat(ui): add seed lab help button"
```
