# Save Export / Import — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

Allow players to back up their save file and restore it. Export shares the full game state as a JSON file. Import reads a JSON file and restores state.

## Technical Approach

Uses `expo-file-system` to write a temp file and `expo-sharing` to share it (works on iOS, Android, and web). For import, use `expo-document-picker` to let the player select a `.json` file from their device.

Both are available as Expo SDK packages compatible with the existing Expo 54 project.

## Export Flow

1. Player taps "Export Save" in the Settings section of `gestion.tsx`
2. Read current AsyncStorage key `granja-tycoon-save-v4`
3. Write to a temp file: `FileSystem.cacheDirectory + 'granja-tycoon-save.json'`
4. Call `Sharing.shareAsync(filePath)` — triggers native share sheet
5. Show success toast or alert on completion

## Import Flow

1. Player taps "Import Save" in Settings
2. Confirmation alert: "This will overwrite your current save. Continue?"
3. Open `DocumentPicker.getDocumentAsync({ type: 'application/json' })`
4. Read file contents, parse JSON, validate it has `day` and `money` fields
5. Write to AsyncStorage key `granja-tycoon-save-v4`
6. Show alert: "Save imported. Restart the app to apply." (no hot-reload needed — AsyncStorage hydrates on mount)

## Error Handling

- Malformed JSON: alert "Invalid save file."
- Missing required fields: alert "This doesn't look like a valid Granja Tycoon save."
- Sharing cancelled: silently ignore

## Files Changed

| File | Action |
|------|--------|
| `package.json` | Add `expo-sharing`, `expo-file-system`, `expo-document-picker` |
| `app/(tabs)/gestion.tsx` | Modify — add Export/Import buttons to Settings tab |
