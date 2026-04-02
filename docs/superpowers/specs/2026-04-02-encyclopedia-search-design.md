# Encyclopedia Search — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

Add a search bar to the existing Encyclopedia component so players can find entries by name or keyword without browsing tabs.

## Current State

`components/Encyclopedia.tsx` has 4 tabs (Crops, Buildings, Animals, Mechanics) with tier filtering for crops. No search functionality exists.

## Design

### Search bar
A `TextInput` at the top of the Encyclopedia (above the tab row) with:
- Placeholder: "Search crops, buildings, animals…"
- On type: filter ALL entries across all tabs by whether `name` or `description`/`effectLabel` contains the query (case-insensitive)
- Clear button (✕) when text is present
- When query is non-empty: hide tab row, show flat filtered results list with a small "tab badge" showing which category each result belongs to (e.g. "🌾 Crop", "🏠 Building", "🐄 Animal", "📖 Mechanic")
- When query is empty: show normal tab view as before

### Result display
Each search result shows:
- Icon + name (bold)
- Category badge
- First line of description

## Files Changed

| File | Action |
|------|--------|
| `components/Encyclopedia.tsx` | Modify — add search state, TextInput, filtered results view |
