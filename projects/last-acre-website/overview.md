# Last Acre Website — Overview

**Type**: Marketing + devlog website for the Last Acre farming simulation game  
**Stack**: Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Jest  
**Repo**: https://github.com/joseechavarrimarin-ctrl/last-acre-website  
**Local path**: `C:\Users\SanGi\.antigravity\last-acre-website`  
**Branch**: `main` (clean, up to date with origin)

---

## What It Is

A solo-built game marketing website for **Last Acre**, a deep farming tycoon simulation. The site serves as:
- A public-facing campaign page (hero, gallery, mission, roadmap)
- A devlog feed (markdown posts documenting development)
- A changelog feed (versioned release notes)
- A feedback collection form (Formspree integration)

**Tagline**: "A solo-built farming tycoon. Every crop, every animal, every decision — yours."

---

## Pages / Routes

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Homepage: Hero, Gallery, Mission, Roadmap, SocialLinks |
| `/devlog` | `app/devlog/page.tsx` | List of all devlog posts |
| `/devlog/[slug]` | `app/devlog/[slug]/page.tsx` | Individual devlog post (SSG) |
| `/changelog` | `app/changelog/page.tsx` | List of all changelog entries |
| `/changelog/[version]` | `app/changelog/[version]/page.tsx` | Individual changelog entry (SSG) |
| `/feedback` | `app/feedback/page.tsx` | Feature request form |

---

## Content (Markdown)

Stored in `content/[type]/[slug].md` with YAML frontmatter (`title`, `date`, `excerpt`).

**Devlog posts**:
- `2026-03-31-week-one.md` — "Week One — Getting Started" (core farming loop, economy, seasons)

**Changelog entries**:
- `v0-2-1.md` — "Animal Genetics & Memory Fix" (genetics system F→S grades, memory crash fix)

---

## Design System

Farm-themed earthy color palette defined in `app/globals.css` via `@theme {}`:

| Token | Hex |
|-------|-----|
| `farm-brown` | `#3d2b1f` |
| `farm-brown-light` | `#5a3e28` |
| `farm-green` | `#7c9a5e` |
| `farm-tan` | `#b5956a` |
| `farm-cream` | `#f5ede0` (page background) |
| `farm-cream-dark` | `#eee5d3` |
| `farm-border` | `#d4c5ae` |
| `farm-text` | `#e8d5b0` |

**Fonts**: Lora (serif) + Inter (sans-serif) via `next/font/google`  
**Prose styling**: `@tailwindcss/typography` for markdown-rendered content

---

## Git History (key commits)

| Hash | Message |
|------|---------|
| `8b573f9` | content: add real game screenshots |
| `6cd1d7e` | content: add game screenshots |
| `33d9ccb` | Update Formspree endpoint in FeedbackForm |
| `c345cdb` | feat: feedback form with Formspree |
| `9809783` | feat: changelog feed and entry pages |
| `a3bb17b` | feat: devlog feed and post pages |
| `c34f1a9` | feat: homepage (hero, gallery, mission, roadmap, social) |
| `01d7151` | feat: root layout with persistent nav |
| `17286a4` | feat: content utility for markdown |

---

## Related Notes

- [[architecture]] — Components, lib utilities, folder structure
- [[tech-stack]] — Dependencies and config details
- [[design-system]] — Color palette and typography detail
