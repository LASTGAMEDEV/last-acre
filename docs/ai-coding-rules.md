# AI Coding Rules — granja-tycoon

Paste this at the start of any AI coding session (Kimi, Claude, Copilot, etc.)
to prevent recurring mistakes in this project.

---

## CRITICAL RULES — read before touching any file

### 1. Never double-encode emoji or Unicode characters

When writing emoji (🌿 🌾 🔵 etc.) into `.tsx` or `.ts` files, paste the
actual emoji character directly — do NOT encode it as UTF-8 bytes or let your
editor re-encode it.

The project has had a recurring bug where emoji get stored as Windows-1252
mojibake — e.g. `ðŸŒ¿` instead of `🌿`, `â¬œ` instead of `⬜`, `Â·` instead
of `·`. If you write a file and the emoji look like multi-character garbage
sequences starting with `ð`, `â`, or `Â`, the file encoding is wrong.

**Always write files as clean UTF-8 without BOM.**

---

### 2. When a tab screen is renamed or moved, update every `router.push()` that references it

This project uses Expo Router file-based routing. If a screen like
`app/(tabs)/tierras.tsx` gets moved or prefixed (e.g. renamed to `_tierras.tsx`
as a sub-tab inside `farm.tsx`), the route `/(tabs)/tierras` no longer exists
and any `router.push('/(tabs)/tierras')` will break.

Before finishing any navigation refactor:
- `grep` the entire codebase for every old route string and update them all
- Run `npx tsc --noEmit` — TypeScript will error on invalid Expo Router route strings

---

### 3. Escape special characters in JSX text nodes

Inside JSX markup (between `<Text>` tags etc.), `"` and `'` must be escaped:

- `"` → `&quot;`
- `'` → `&apos;`

Failing to do this causes `react/no-unescaped-entities` ESLint errors.

---

### 4. Always verify after changes

```bash
npx tsc --noEmit    # must produce no errors
npx expo lint       # must produce no errors (warnings OK)
```

Fix all **errors** before committing. Never commit with TypeScript errors.
