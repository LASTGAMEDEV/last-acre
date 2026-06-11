# Last Acre Website — Tech Stack

## Framework & Runtime

| Package | Version | Role |
|---------|---------|------|
| `next` | 16.2.1 | App Router, SSG, image optimization, font loading |
| `react` | 19.2.4 | UI library |
| `react-dom` | 19.2.4 | React DOM renderer |
| `typescript` | 5.x | Static typing |

## Styling

| Package | Version | Role |
|---------|---------|------|
| `tailwindcss` | 4.x | Utility-first CSS (v4 CSS-native config) |
| `@tailwindcss/postcss` | 4 | PostCSS integration for Tailwind v4 |
| `@tailwindcss/typography` | 0.5.19 | Prose styling for markdown-rendered HTML |
| `postcss` | 4.x | CSS transformation pipeline |

**Config note**: Tailwind v4 uses `@theme {}` in CSS instead of `tailwind.config.ts` for token definitions.

## Content / Markdown

| Package | Version | Role |
|---------|---------|------|
| `gray-matter` | 4.0.3 | Parse YAML frontmatter from markdown files |
| `remark` | 15.0.1 | Markdown processor / AST builder |
| `remark-html` | 16.0.1 | Remark plugin: converts markdown AST to HTML string |

**ESM note**: remark and its ~40 transitive packages are pure ESM. `next.config.ts` uses `transpilePackages` to make them work with Jest/CommonJS.

## Testing

| Package | Version | Role |
|---------|---------|------|
| `jest` | 30.3.0 | Test runner |
| `ts-jest` | 29.4.6 | TypeScript support for Jest |
| `jest-environment-node` | 30.3.0 | Node test environment (needed for ESM markdown) |
| `@types/jest` | 30.0.0 | Jest type definitions |

## Linting

| Package | Version | Role |
|---------|---------|------|
| `eslint` | 9 | Linter (flat config format via `eslint.config.mjs`) |
| `eslint-config-next` | 16.2.1 | Next.js ESLint ruleset |

## Type Definitions

| Package | Role |
|---------|------|
| `@types/node` | Node.js types |
| `@types/react` | React types |
| `@types/react-dom` | React DOM types |

---

## Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js config — `transpilePackages` list for remark ESM |
| `tailwind.config.ts` | Content paths for Tailwind scanning |
| `postcss.config.mjs` | PostCSS with `@tailwindcss/postcss` plugin |
| `tsconfig.json` | TypeScript config with `@/*` path alias |
| `jest.config.ts` | Jest with ts-jest, node env, ESM transform patterns |
| `eslint.config.mjs` | ESLint flat config |

---

## Related Notes

- [[overview]] — Project summary
- [[architecture]] — Folder structure and component details
