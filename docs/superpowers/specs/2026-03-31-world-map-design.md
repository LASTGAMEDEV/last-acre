# World Map — Design Spec
**Date:** 2026-03-31
**Sub-project:** World Map (Foundation — Phase 1 of 3)
**Status:** Ready for implementation planning

---

## 1. Overview

A pannable, zoomable world map screen showing the full fictional farming region. The player can drag to explore the map and tap any field to view ownership, crop status, and take actions. The map is the foundation for future AI Competitors (Phase 2) and Dynamic Economy (Phase 3).

---

## 2. Goals

- Show ~100 fields of all shapes and sizes across a large map canvas
- Player can pan (drag) and pinch-to-zoom to explore
- Fields are color-coded by ownership and status
- Tapping a field opens a detail panel with context-sensitive actions
- Town(s) are embedded organically in the landscape — not boxed-off areas
- No empty ground — the entire canvas is covered by fields, water, roads, or settled land
- Fields feel realistic: irregular shapes, varied sizes (~5ha to ~120ha), boundaries follow natural features

---

## 3. Visual Design (confirmed via brainstorming)

### 3.1 Map Canvas
- **SVG canvas size:** 1400 × 1800 px (or larger — to be determined during implementation)
- **Viewport:** device screen, showing ~30–40% of the canvas at a time
- **Coordinate system:** SVG userSpace units, 1 unit ≈ 1 meter at zoom level 1

### 3.2 Field Shapes
- Irregular polygons / path shapes using SVG `<path>` with `Q` bezier curves for organic edges
- Fields share borders — no gaps between adjacent fields (tessellation)
- Road and river overlays cover ±10–15px of field edges, giving tolerance for approximate boundaries
- Sizes range from tiny (~5–8ha) near town transitions to large (~80–120ha) in open farmland

### 3.3 Natural Features
- **River:** 1–2 rivers crossing the map, rendered as layered stroked paths (bank shadow → body → highlight). Acts as a hard field boundary
- **Roads:** 2–3 main roads + town road network, rendered as curved `<path>` strokes with dashed centerlines. Roads are slightly curved/winding, never perfectly straight
- **Town(s):** 1 main market town + 1 smaller village. Embedded in the landscape — buildings sit along road networks, no bounding box. Includes: market, grain elevator/silos, bank, dealer, agro supply, repair shop, church, residential clusters, trees
- **Other terrain:** forest patches (dark green circles/blobs), lake (ellipse with river inlet), hills (subtle shading bands) — adds variety and breaks up the field mosaic

### 3.4 Color Coding (dark game aesthetic)
| Category | Fill pattern | Stroke |
|---|---|---|
| Your field — planted | Horizontal row lines, dark green | `#286020` |
| Your field — ready to harvest | Horizontal row lines, golden-green | `#7a9010` (with glow) |
| Your field — unplanted | Flat dark soil | `#264818` dashed |
| Hacienda Rivera (Rival A) | Horizontal rows, dark red | `#6a1818` |
| Granja del Norte (Rival B) | Horizontal rows, dark indigo | `#281858` |
| For Sale | Flat, dark amber | `#906010` |
| Unowned / wilderness | Flat, very dark soil | no stroke |

### 3.5 Field Labels
- Small text showing approximate size (`~40ha`) — never exact numbers
- Shown only on fields above a minimum size threshold (to avoid clutter on tiny fields)
- Labels disappear at low zoom levels

### 3.6 Detail Panel
- Slides up from bottom when a field is tapped
- Shows: field name/ID, owner, approximate size, crop, status, fertility
- Shows asking price if for sale
- Context-sensitive action button:
  - Your field, unplanted → "Plant Crop →"
  - Your field, growing → "Manage Field →"
  - Your field, ready → "⚡ Harvest Now →"
  - For Sale → "Buy Field →"
  - Rival field → "Scout Report ($500)"

### 3.7 Mini-map
- Small overview panel (top-right or top-left corner, ~80×100px)
- Shows full map at thumbnail scale
- Colored dots/blobs for owned vs rival vs for-sale fields
- White rectangle showing current viewport position
- Tap mini-map to jump to that region

### 3.8 Legend
- Compact, semi-transparent overlay
- Positioned where it doesn't overlap fields (town area or screen edge)
- Color swatches + labels for ownership categories

---

## 4. Gesture & Navigation

### 4.1 Pan
- One-finger drag moves the viewport across the canvas
- Uses React Native Gesture Handler `PanGestureHandler`
- Animated with `react-native-reanimated` (Shared Values + `useAnimatedStyle`)
- Clamped so viewport cannot go outside canvas bounds

### 4.2 Pinch to Zoom
- Two-finger pinch scales the canvas
- `PinchGestureHandler` from Gesture Handler
- Scale range: 0.4× (overview) to 2.5× (detail)
- Zoom focal point: midpoint between the two fingers
- Pan offset adjusts simultaneously to keep focal point stable

### 4.3 Double-tap
- Double-tap a field to zoom in and center on it
- Double-tap empty area to reset zoom to fit-screen

### 4.4 Initial Position
- On first open: map zoomed to fit the player's owned fields (all visible)
- Subsequent opens: restores last pan/zoom position (persisted in Zustand)

---

## 5. Data Model

### 5.1 MapField (stored in Zustand)
```typescript
interface MapField {
  id: string;                        // e.g. 'mf-001'
  name: string;                      // e.g. 'North Meadow'
  svgPath: string;                   // SVG path d= string
  approximateHa: number;             // rounded/approximate
  labelX: number;                    // SVG coordinate for label
  labelY: number;
  owner: 'player' | 'rivalA' | 'rivalB' | 'forsale' | 'unowned';
  parcelId?: string;                 // links to OwnedParcel if player-owned
  fertility?: number;                // 0–100, shown in panel
  askingPrice?: number;              // set if forsale
  knownCrop?: CropId;                // null if competitor (unknown unless scouted)
  scouted: boolean;                  // whether player has paid for scout report
  scoutExpiresDay?: number;          // scout info is stale after N days
}
```

### 5.2 MapState (Zustand slice)
```typescript
interface MapState {
  fields: MapField[];
  panX: number;
  panY: number;
  zoom: number;
  selectedFieldId: string | null;
  // actions
  selectField: (id: string | null) => void;
  buyField: (id: string) => void;
  savePanZoom: (x: number, y: number, zoom: number) => void;
}
```

### 5.3 Relationship to existing OwnedParcel
- `MapField.parcelId` links to the existing `OwnedParcel` in `useGameStore`
- When a field is purchased, a new `OwnedParcel` is created and `MapField.owner` → `'player'`
- Crop/status shown in the panel is read from the linked `OwnedParcel`
- Fields without `parcelId` (rivals, for-sale, unowned) show limited info

---

## 6. SVG Map Asset

### 6.1 Approach
- The full map SVG is defined as a static asset (a large `.tsx` or `.svg` file)
- Field paths are pre-defined — no runtime geometry generation
- The SVG contains ~100 field `<path>` elements + roads + rivers + town elements
- Fields are grouped: `<g id="mf-001" onPress={...}>` — each group is a tappable field

### 6.2 Rendering in React Native
- Use `react-native-svg` (`<Svg>`, `<Path>`, `<G>`, `<Pattern>`, etc.)
- The `<Svg>` element has `width` and `height` set to the full canvas size
- It is wrapped in an `Animated.View` that applies `translateX`, `translateY`, `scale` transforms
- Gesture handlers are attached to the outer container, not the SVG itself

### 6.3 Performance
- Fields that are outside the current viewport + margin can be skipped (culling)
- `<Pattern>` defs defined once in `<Defs>`, shared across all fields
- Labels rendered as `<Text>` elements inside each field group — hidden below zoom threshold
- No re-renders of the SVG on pan/zoom — only the Animated transform updates

### 6.4 Map File Structure
```
data/
  mapFields.ts        ← array of MapField objects (id, svgPath, approximateHa, etc.)
components/
  WorldMap/
    index.tsx         ← main component, gesture handlers, animated transforms
    MapCanvas.tsx     ← renders the full SVG (fields, roads, river, town)
    MapField.tsx      ← single tappable field <G> element
    MiniMap.tsx       ← overview thumbnail
    FieldPanel.tsx    ← bottom sheet detail panel
    mapPatterns.tsx   ← SVG <Defs> with fill patterns (shared)
    useMapGestures.ts ← pan + pinch gesture logic
```

---

## 7. Navigation / Tab Integration

- Accessible from the existing **Tierras** tab (`app/(tabs)/tierras.tsx`) via a "World Map" button
- Renders as a full-screen modal or a new stack screen (`app/world-map.tsx`)
- The existing tierras parcel list remains the primary farm management UI; the world map is the exploration/purchase UI
- Tapping "Manage Field →" in the panel navigates back to tierras with that parcel selected
- Tapping "Buy Field →" triggers the land purchase flow (deducts money, creates OwnedParcel, updates MapField owner)

---

## 8. Map Content (seed data)

~100 fields distributed across the canvas:
- **Player starts with:** 6–8 fields (small cluster, represents starting farm)
- **Hacienda Rivera (Rival A):** ~18 fields, concentrated in north/northeast
- **Granja del Norte (Rival B):** ~20 fields, concentrated in east/southeast
- **For Sale:** ~15 fields scattered across the map (newly listed each in-game season)
- **Unowned / wilderness:** remaining fields (~40), can never be purchased unless they go "for sale" via the economy system (Phase 3)

The town(s), river, and main roads divide the map into natural regions, making the geography feel like a real farming valley.

---

## 9. Out of Scope (future phases)

- AI competitors actively buying/selling fields → Phase 2
- Field prices fluctuating with supply/demand → Phase 3
- Weather events affecting field visibility on map → Phase 3
- Multiplayer shared map → not planned
- Procedural map generation → not planned (static asset)

---

## 10. Dependencies

- `react-native-svg` (already used in project? confirm)
- `react-native-gesture-handler` (likely already installed via Expo)
- `react-native-reanimated` (likely already installed via Expo)
- No new external packages expected

---

## 11. Save Key

Map pan/zoom state will be included in the existing Zustand persist store. Save key remains `granja-tycoon-save-v7` (no bump needed for additive data).
