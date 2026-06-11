# Last Acre Website — Design System

## Color Palette

Defined in `app/globals.css` using Tailwind v4's `@theme {}` block.

| Token | Hex | Usage |
|-------|-----|-------|
| `farm-brown` | `#3d2b1f` | Primary dark (nav background) |
| `farm-brown-light` | `#5a3e28` | Hover states on dark surfaces |
| `farm-green` | `#7c9a5e` | CTA buttons, accents |
| `farm-tan` | `#b5956a` | Secondary text, hover links |
| `farm-cream` | `#f5ede0` | Page background |
| `farm-cream-dark` | `#eee5d3` | Card/section backgrounds |
| `farm-border` | `#d4c5ae` | Borders, dividers |
| `farm-text` | `#e8d5b0` | Body text on dark backgrounds |

---

## Typography

**Fonts** (loaded via `next/font/google` in `app/layout.tsx`):
- **Lora** — serif, used for headings (`font-serif`)
- **Inter** — sans-serif, used for body text (`font-sans`)

CSS variables set on `<html>`: `--font-serif`, `--font-sans`

Tailwind theme overrides in `globals.css`:
```css
--font-family-serif: var(--font-serif), Georgia, serif;
--font-family-sans: var(--font-sans), system-ui, sans-serif;
```

**Prose styling**: `@tailwindcss/typography` applied as `prose prose-stone max-w-none` on markdown-rendered content pages.

---

## Common Utility Patterns

```
Layout:     flex items-center justify-between
Grid:       grid grid-cols-1 md:grid-cols-3
Spacing:    px-6 py-12 gap-6 space-y-6
Headings:   font-serif text-5xl md:text-6xl
Cards:      border border-farm-border border-l-4
Buttons:    bg-farm-green hover:bg-farm-green/90 transition-colors
Nav links:  hover:text-farm-tan
```

---

## Screenshots (Public Assets)

Located in `public/screenshots/`:
- `animals.png` — Animals tab in-game
- `economy.png` — Economy overview in-game
- `fields.png` — Fields view in-game

Used in `Gallery.tsx` as a 3-column responsive grid.

---

## Related Notes

- [[overview]] — Project summary
- [[architecture]] — Components that use this design system
