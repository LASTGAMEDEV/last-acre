# Last Acre Website — Architecture

## Folder Structure

```
last-acre-website/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (Nav, fonts, body)
│   ├── page.tsx                # Homepage
│   ├── globals.css             # Tailwind v4 theme tokens
│   ├── devlog/
│   │   ├── page.tsx            # Devlog feed
│   │   └── [slug]/page.tsx     # Individual post (SSG)
│   ├── changelog/
│   │   ├── page.tsx            # Changelog feed
│   │   └── [version]/page.tsx  # Individual entry (SSG)
│   └── feedback/
│       └── page.tsx            # Feedback form page
│
├── components/                 # Reusable React components
├── lib/                        # Utilities (content.ts, content.test.ts)
├── content/                    # Markdown files
│   ├── devlog/
│   └── changelog/
└── public/
    └── screenshots/            # Game screenshots (animals, economy, fields)
```

---

## Components

| Component | Type | Purpose |
|-----------|------|---------|
| `Nav.tsx` | Client (`'use client'`) | Navigation bar; uses `usePathname()` to highlight active route |
| `Hero.tsx` | Server | Hero section with tagline and CTA |
| `Gallery.tsx` | Server | 3-column responsive screenshot grid |
| `Mission.tsx` | Server | Mission statement section |
| `Roadmap.tsx` | Server | Roadmap cards (v0.1 Done, v0.2 In Progress, v0.3 Planned) |
| `PostCard.tsx` | Server | Reusable card for devlog/changelog links. Props: `{ post: PostMeta, type: 'devlog' \| 'changelog' }` |
| `FeedbackForm.tsx` | Client (`'use client'`) | Feature request form; manages own state (selected, message, status); submits to Formspree `xeepkrpy` |
| `SocialLinks.tsx` | Server | Footer with Twitter, Discord, GitHub links |

---

## Library — `lib/content.ts`

Handles all markdown reading, YAML parsing, and HTML rendering.

**Types exported**:
```ts
interface PostMeta { slug: string; title: string; date: string; excerpt?: string }
interface Post extends PostMeta { contentHtml: string }
```

**Functions**:
| Function | Returns | Description |
|----------|---------|-------------|
| `getPostSlugs(type)` | `string[]` | All markdown filenames (without .md) for type |
| `getPostMeta(type, slug)` | `PostMeta` | Single file frontmatter |
| `getAllPostsMeta(type)` | `PostMeta[]` | All posts sorted newest first |
| `getPost(type, slug)` | `Promise<Post>` | Full post with remark-rendered HTML |

**Dependencies**: `gray-matter` (YAML), `remark` + `remark-html` (markdown → HTML)  
**Content path**: `{cwd}/content/[type]/[slug].md`

---

## State Management

No global state. Two client components manage local state via `useState`:

- **Nav**: `usePathname()` for active link highlighting
- **FeedbackForm**: `selected[]`, `message`, `status` (`'idle' | 'submitting' | 'success' | 'error'`)

No Context, Zustand, Redux, or any store.

---

## External Integrations

- **Formspree** (`https://formspree.io/f/xeepkrpy`) — feedback form submission
- **Google Fonts** via `next/font/google` — Lora (serif), Inter (sans-serif)

---

## Testing

- **Runner**: Jest 30 + ts-jest
- **Environment**: `node` (not jsdom) — required for remark ESM compatibility
- **Test file**: `lib/content.test.ts`
- **Coverage**: stored in `coverage/`
- **ESM note**: `next.config.ts` transpiles 40+ remark/micromark packages so they work in Jest

---

## Related Notes

- [[overview]] — Project summary and routes
- [[tech-stack]] — All dependencies
- [[design-system]] — Colors and typography
