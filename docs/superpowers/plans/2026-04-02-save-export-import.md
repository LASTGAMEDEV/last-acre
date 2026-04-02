# Save Export/Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Export Save (share JSON) and Import Save (pick JSON file) buttons to the Settings tab in `app/(tabs)/gestion.tsx`.

**Architecture:** Three Expo SDK packages handle the work: `expo-file-system` writes a temp file, `expo-sharing` triggers the OS share sheet, and `expo-document-picker` opens a file picker. The Settings section already exists as `SettingsSection` (a standalone function component inside `gestion.tsx`). No new files or store changes are needed — export reads directly from `AsyncStorage` and import writes directly to `AsyncStorage` then prompts the user to restart. The storage key `granja-tycoon-save-v4` must be used exactly.

**Tech Stack:** React Native, TypeScript, Expo 54, `expo-file-system`, `expo-sharing`, `expo-document-picker`, `AsyncStorage` (via `@react-native-async-storage/async-storage`).

---

## File Map

| File | Action |
|------|--------|
| `package.json` | Updated automatically by `npx expo install` |
| `app/(tabs)/gestion.tsx` | Modify — add export + import buttons in `SettingsSection` |

---

## Task 1: Install dependencies

### Background

Current `dependencies` in `package.json` do not include `expo-file-system`, `expo-sharing`, or `expo-document-picker`. The project uses `expo ~54.0.33`, so `npx expo install` will pin compatible versions automatically.

AsyncStorage is accessed in the Zustand persist middleware via the storage key `granja-tycoon-save-v4`. The export function needs to read that key directly; the simplest approach is to import `AsyncStorage` from `@react-native-async-storage/async-storage` (which is already a transitive dependency of `zustand`'s persist + expo — check with `npx expo install` if it needs to be explicit).

### Changes

- [ ] **Step 1.1: Install the three Expo packages**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx expo install expo-file-system expo-sharing expo-document-picker
  ```

- [ ] **Step 1.2: Verify AsyncStorage is resolvable**

  Check whether `@react-native-async-storage/async-storage` is already in `node_modules`:
  ```bash
  ls "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\node_modules\@react-native-async-storage" 2>/dev/null || echo "not found"
  ```

  If not found, install it:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx expo install @react-native-async-storage/async-storage
  ```

- [ ] **Step 1.3: TypeScript verify (baseline after install)**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 1.4: Git commit package changes**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add package.json && git commit -m "chore: install expo-file-system, expo-sharing, expo-document-picker for save export/import"
  ```

---

## Task 2: Add Export Save button

**Files:**
- Modify: `app/(tabs)/gestion.tsx`

### Background

`SettingsSection` is defined starting at line 173. Its `return` begins at line 199 with a `ScrollView`. Imports at the top of `gestion.tsx` (line 1–10) already include `Alert`. The export button goes in a new "Save Data" section inside the Settings `ScrollView`, after the existing "Price Alerts" section (line 273) and before the "Audio" section (line 275).

### Changes

- [ ] **Step 2.1: Add new imports to `gestion.tsx`**

  Find the existing import block at the top of `gestion.tsx`:
  ```typescript
  import React, { useState } from 'react';
  import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, TextInput } from 'react-native';
  ```

  Add three new import lines immediately after it (before the other imports):
  ```typescript
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import * as FileSystem from 'expo-file-system';
  import * as Sharing from 'expo-sharing';
  import * as DocumentPicker from 'expo-document-picker';
  ```

- [ ] **Step 2.2: Add the `exportSave` handler inside `SettingsSection`**

  Find the existing `confirmReset` function inside `SettingsSection` (around line 188):
  ```typescript
    function confirmReset() {
  ```

  Insert the `exportSave` function immediately before `confirmReset`:
  ```typescript
    async function exportSave() {
      try {
        const raw = await AsyncStorage.getItem('granja-tycoon-save-v4');
        if (!raw) {
          Alert.alert('Export Failed', 'No save data found.');
          return;
        }
        const path = (FileSystem.cacheDirectory ?? '') + 'granja-tycoon-save.json';
        await FileSystem.writeAsStringAsync(path, raw, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          Alert.alert('Export Failed', 'Sharing is not available on this device.');
          return;
        }
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export Granja Tycoon Save' });
      } catch (e) {
        Alert.alert('Export Failed', String(e));
      }
    }
  ```

- [ ] **Step 2.3: Add the Save Data section in the JSX**

  Find the closing tag of the Price Alerts section and the opening of the Audio section:
  ```typescript
        </View>

        {/* Audio */}
        <View style={set.section}>
  ```

  Insert a new section between them:
  ```typescript
        {/* Save Data */}
        <View style={set.section}>
          <Text style={set.sectionTitle}>💾 Save Data</Text>
          <TouchableOpacity style={set.saveDataBtn} onPress={exportSave}>
            <Text style={set.saveDataBtnText}>📤 Export Save</Text>
          </TouchableOpacity>
          <Text style={[set.rowSub, { marginTop: 4 }]}>Shares your save as a JSON file you can back up or transfer.</Text>
        </View>

        {/* Audio */}
  ```

- [ ] **Step 2.4: Add styles for the save data section**

  In the `set` StyleSheet at the bottom of `gestion.tsx` (the `StyleSheet.create({})` for the Settings section), add:
  ```typescript
    saveDataBtn:     { backgroundColor: '#0f3460', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
    saveDataBtnText: { color: '#e8d5a3', fontSize: 13, fontWeight: 'bold' },
  ```

- [ ] **Step 2.5: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 2.6: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add app/\(tabs\)/gestion.tsx && git commit -m "feat(gestion): add Export Save button that shares save JSON via OS share sheet"
  ```

---

## Task 3: Add Import Save button

**Files:**
- Modify: `app/(tabs)/gestion.tsx`

### Background

The import flow is: confirmation alert → `DocumentPicker.getDocumentAsync` → read file via `FileSystem.readAsStringAsync` → parse JSON → validate presence of `day` and `money` keys → write to `AsyncStorage` → alert user to restart. The DocumentPicker returns a result with `assets` array when successful (Expo SDK 49+ API). The import button goes in the same "Save Data" section added in Task 2.

### Changes

- [ ] **Step 3.1: Add the `importSave` handler inside `SettingsSection`**

  Insert after `exportSave` and before `confirmReset`:
  ```typescript
    async function importSave() {
      Alert.alert(
        'Import Save',
        'This will overwrite your current save with the selected file. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await DocumentPicker.getDocumentAsync({
                  type: 'application/json',
                  copyToCacheDirectory: true,
                });
                if (result.canceled) return;
                const asset = result.assets?.[0];
                if (!asset?.uri) return;
                const raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
                let parsed: unknown;
                try {
                  parsed = JSON.parse(raw);
                } catch {
                  Alert.alert('Import Failed', 'File is not valid JSON.');
                  return;
                }
                if (
                  typeof parsed !== 'object' ||
                  parsed === null ||
                  !('state' in parsed) ||
                  typeof (parsed as Record<string, unknown>).state !== 'object'
                ) {
                  Alert.alert('Import Failed', 'File does not look like a valid Granja Tycoon save (missing "state" key).');
                  return;
                }
                const state = (parsed as Record<string, Record<string, unknown>>).state;
                if (typeof state.day !== 'number' || typeof state.money !== 'number') {
                  Alert.alert('Import Failed', 'Save file is missing required fields (day, money).');
                  return;
                }
                await AsyncStorage.setItem('granja-tycoon-save-v4', raw);
                Alert.alert('Import Successful', 'Save imported. Please restart the app to load your save.');
              } catch (e) {
                Alert.alert('Import Failed', String(e));
              }
            },
          },
        ]
      );
    }
  ```

- [ ] **Step 3.2: Add the Import button to the Save Data section JSX**

  Find the export button and description in the Save Data section:
  ```typescript
          <TouchableOpacity style={set.saveDataBtn} onPress={exportSave}>
            <Text style={set.saveDataBtnText}>📤 Export Save</Text>
          </TouchableOpacity>
          <Text style={[set.rowSub, { marginTop: 4 }]}>Shares your save as a JSON file you can back up or transfer.</Text>
  ```

  Replace with:
  ```typescript
          <TouchableOpacity style={set.saveDataBtn} onPress={exportSave}>
            <Text style={set.saveDataBtnText}>📤 Export Save</Text>
          </TouchableOpacity>
          <Text style={[set.rowSub, { marginTop: 4, marginBottom: 8 }]}>Shares your save as a JSON file you can back up or transfer.</Text>
          <TouchableOpacity style={[set.saveDataBtn, { backgroundColor: '#3a1a00' }]} onPress={importSave}>
            <Text style={[set.saveDataBtnText, { color: '#ffb74d' }]}>📥 Import Save</Text>
          </TouchableOpacity>
          <Text style={[set.rowSub, { marginTop: 4 }]}>Load a previously exported save file. Overwrites current progress.</Text>
  ```

- [ ] **Step 3.3: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 3.4: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add app/\(tabs\)/gestion.tsx && git commit -m "feat(gestion): add Import Save button with JSON validation and AsyncStorage write"
  ```
