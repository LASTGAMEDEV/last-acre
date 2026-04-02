# Encyclopedia Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cross-tab full-text search to `components/Encyclopedia.tsx` that hides the tab UI when a query is active and shows flat filtered results with a category badge.

**Architecture:** A single `searchQuery` state string in the `Encyclopedia` default-export component controls everything. When non-empty the existing four section components are bypassed in favour of a flat `FlatList`/`ScrollView` of matched items. The search index is built from the same static data arrays already imported: `CROP_TYPES`, `BUILDING_TYPES`, `ANIMAL_TYPES`, and the `MECHANICS` constant. No new files or dependencies are required.

**Tech Stack:** React Native, TypeScript, Expo Router.

---

## File Map

| File | Action |
|------|--------|
| `components/Encyclopedia.tsx` | Modify — add search bar + clear button; build search index; render search results view |

---

## Task 1: Add search bar with clear button above the tab bar

**Files:**
- Modify: `components/Encyclopedia.tsx`

### Background

The `Encyclopedia` default export (line 248) renders:
1. A container `<View style={enc.container}>`
2. An inner tab bar `<View style={enc.tabBar}>`
3. Conditional section renders

The search bar goes between the container opening and the tab bar. When `searchQuery.trim()` is non-empty both the tab bar and the section renders are hidden, replaced by the search results (added in Task 3).

`TextInput` is not currently imported in `Encyclopedia.tsx` — it uses only `View, Text, TouchableOpacity, StyleSheet, ScrollView`.

### Changes

- [ ] **Step 1.1: Add `TextInput` to the React Native import**

  Find:
  ```typescript
  import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
  ```
  Replace with:
  ```typescript
  import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
  ```

- [ ] **Step 1.2: Add `searchQuery` state to the `Encyclopedia` component**

  Find:
  ```typescript
  export default function Encyclopedia() {
    const [tab, setTab] = useState<EncycTab>('crops');
  ```
  Replace with:
  ```typescript
  export default function Encyclopedia() {
    const [tab, setTab] = useState<EncycTab>('crops');
    const [searchQuery, setSearchQuery] = useState('');
    const trimmed = searchQuery.trim().toLowerCase();
    const isSearching = trimmed.length > 0;
  ```

- [ ] **Step 1.3: Insert the search bar JSX between `<View style={enc.container}>` and the tab bar**

  Find:
  ```typescript
    return (
      <View style={enc.container}>
        {/* Inner tab bar */}
        <View style={enc.tabBar}>
  ```
  Replace with:
  ```typescript
    return (
      <View style={enc.container}>
        {/* Search bar */}
        <View style={enc.searchRow}>
          <TextInput
            style={enc.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search crops, buildings, animals…"
            placeholderTextColor="#444"
            returnKeyType="search"
            clearButtonMode="never"
          />
          {isSearching && (
            <TouchableOpacity style={enc.searchClear} onPress={() => setSearchQuery('')}>
              <Text style={enc.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Inner tab bar — hidden while searching */}
        {!isSearching && <View style={enc.tabBar}>
  ```

  Then find the closing of the tab bar block:
  ```typescript
        </View>

        {tab === 'crops'     && <CropsSection />}
  ```
  Replace with:
  ```typescript
        </View>}

        {tab === 'crops'     && !isSearching && <CropsSection />}
  ```

  And update the remaining tab conditionals:
  ```typescript
        {tab === 'buildings' && !isSearching && <BuildingsSection />}
        {tab === 'animals'   && !isSearching && <AnimalsSection />}
        {tab === 'mechanics' && !isSearching && <MechanicsSection />}
  ```

- [ ] **Step 1.4: Add search bar styles**

  In `enc` StyleSheet, append:
  ```typescript
    searchRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#1a1a2e', gap: 6 },
    searchInput:     { flex: 1, backgroundColor: '#16213e', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', color: '#e8d5a3', fontSize: 12, paddingHorizontal: 10, paddingVertical: 6 },
    searchClear:     { backgroundColor: '#16213e', borderRadius: 8, padding: 6, alignItems: 'center', justifyContent: 'center' },
    searchClearText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  ```

- [ ] **Step 1.5: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 1.6: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add components/Encyclopedia.tsx && git commit -m "feat(encyclopedia): add search bar with clear button above tab bar"
  ```

---

## Task 2: Build search index

**Files:**
- Modify: `components/Encyclopedia.tsx`

### Background

The search index is a flat array of `SearchResult` objects built from four sources:
- `CROP_TYPES` (already imported, line 3): use `name` + a generated description string
- `BUILDING_TYPES` (already imported, line 4): use `name` + `effectLabel`
- `ANIMAL_TYPES` (already imported, line 5): use `name`; description from `enclosureType`
- `MECHANICS` (defined at line 198): use `title` + `body`

The index is a module-level constant (not inside the component) to avoid recomputation on every render.

### Changes

- [ ] **Step 2.1: Define the `SearchResult` type and `SEARCH_INDEX` constant**

  Place this block after all imports and before `const TIER_COLORS` (i.e. before line 8):

  ```typescript
  // ── Search Index ───────────────────────────────────────────────────────────────
  type SearchCategory = 'crop' | 'building' | 'animal' | 'mechanic';

  interface SearchResult {
    id: string;
    category: SearchCategory;
    name: string;
    description: string;
    badge: string;
  }

  function buildSearchIndex(): SearchResult[] {
    const results: SearchResult[] = [];

    // Crops
    for (const c of CROP_TYPES) {
      results.push({
        id: `crop_${c.id}`,
        category: 'crop',
        name: c.name,
        description: `Tier ${c.tier} · $${c.basePrice}/${c.unit} · ${c.growthDays} days · seasons: ${c.seasons.join(', ')}`,
        badge: '🌾',
      });
    }

    // Buildings
    for (const b of BUILDING_TYPES) {
      results.push({
        id: `bld_${b.id}`,
        category: 'building',
        name: b.name,
        description: b.effectLabel,
        badge: '🏠',
      });
    }

    // Animals
    for (const a of ANIMAL_TYPES) {
      results.push({
        id: `animal_${a.id}`,
        category: 'animal',
        name: a.name,
        description: `${a.enclosureType} enclosure · matures in ${a.maturityDays} days`,
        badge: '🐄',
      });
    }

    // Mechanics
    for (const m of MECHANICS) {
      results.push({
        id: `mech_${m.title.replace(/\s+/g, '_')}`,
        category: 'mechanic',
        name: m.title,
        description: m.body,
        badge: '📖',
      });
    }

    return results;
  }

  const SEARCH_INDEX: SearchResult[] = buildSearchIndex();
  ```

  Note: `MECHANICS` is defined later in the file (line 198). Because `buildSearchIndex` is a function called at module init time (after the file fully parses), forward-referencing `MECHANICS` is fine for a `const` array — but to be safe, move the call of `buildSearchIndex()` to after the `MECHANICS` definition, or move the `MECHANICS` array before the search index. The simplest approach: move the `MECHANICS` array and `SEARCH_INDEX` constant to just before the `MechanicsSection` function.

  **Placement:** Insert the `SearchResult` type and `buildSearchIndex` function right after `MECHANICS` (after line 229), and place `const SEARCH_INDEX = buildSearchIndex();` immediately after.

- [ ] **Step 2.2: Add the `filterResults` computation inside the `Encyclopedia` component**

  Inside `Encyclopedia()`, after `const isSearching = trimmed.length > 0;`, add:
  ```typescript
    const filteredResults = isSearching
      ? SEARCH_INDEX.filter(
          item =>
            item.name.toLowerCase().includes(trimmed) ||
            item.description.toLowerCase().includes(trimmed)
        )
      : [];
  ```

- [ ] **Step 2.3: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 2.4: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add components/Encyclopedia.tsx && git commit -m "feat(encyclopedia): build cross-tab search index from crops, buildings, animals, mechanics"
  ```

---

## Task 3: Render search results when query is active

**Files:**
- Modify: `components/Encyclopedia.tsx`

### Background

When `isSearching` is true, after the search bar and before where the tabs would be, render a `ScrollView` of filtered results. Each result card shows: badge icon, category label, name, and first line of description. An empty state message is shown if nothing matches.

### Changes

- [ ] **Step 3.1: Add the search results view to the JSX**

  In the `Encyclopedia` component's return, after the closing `</View>}` of the tab bar (i.e. after `{!isSearching && <View style={enc.tabBar}>...</View>}`), add:

  ```typescript
        {/* Search results */}
        {isSearching && (
          <ScrollView contentContainerStyle={{ padding: 10, gap: 6 }} showsVerticalScrollIndicator={false}>
            {filteredResults.length === 0 ? (
              <View style={enc.searchEmpty}>
                <Text style={enc.searchEmptyText}>No results for "{searchQuery.trim()}"</Text>
              </View>
            ) : (
              filteredResults.map(item => (
                <View key={item.id} style={enc.searchResultCard}>
                  <View style={enc.searchResultHeader}>
                    <Text style={enc.searchResultBadge}>{item.badge}</Text>
                    <Text style={enc.searchResultCategory}>{item.category.toUpperCase()}</Text>
                    <Text style={enc.searchResultName}>{item.name}</Text>
                  </View>
                  <Text style={enc.searchResultDesc} numberOfLines={2}>{item.description}</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
  ```

- [ ] **Step 3.2: Add search results styles**

  In `enc` StyleSheet, append:
  ```typescript
    searchEmpty:          { paddingVertical: 40, alignItems: 'center' },
    searchEmptyText:      { color: '#555', fontSize: 13 },
    searchResultCard:     { backgroundColor: '#16213e', borderRadius: 10, padding: 10, gap: 4 },
    searchResultHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    searchResultBadge:    { fontSize: 14 },
    searchResultCategory: { color: '#555', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    searchResultName:     { color: '#e8d5a3', fontSize: 12, fontWeight: 'bold', flex: 1 },
    searchResultDesc:     { color: '#888', fontSize: 11, lineHeight: 15 },
  ```

- [ ] **Step 3.3: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 3.4: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add components/Encyclopedia.tsx && git commit -m "feat(encyclopedia): render flat search results with category badge when query is active"
  ```
