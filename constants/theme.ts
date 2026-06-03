import { Platform } from 'react-native';

// ── Spacing scale ─────────────────────────────────────────────────────────────
export const S = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const;

// ── Font scale ────────────────────────────────────────────────────────────────
export const F = {
  size: {
    xs:    10,
    sm:    12,
    md:    13,
    body:  14,
    lg:    15,
    xl:    16,
    xxl:   18,
    title: 22,
  },
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    bold:   '600' as const,
    heavy:  'bold' as const,
  },
} as const;

// ── Border radii ──────────────────────────────────────────────────────────────
export const R = {
  xs:   4,
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  pill: 999,
} as const;

// ── Touch target minimum (mobile) ─────────────────────────────────────────────
export const MIN_TOUCH = 44;

// ── Season theming ───────────────────────────────────────────────────────────

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASON_THEME: Record<Season, {
  icon: string;
  accent: string;
  accentSoft: string;
  tabBar: string;
  badge: string;
  badgeText: string;
}> = {
  spring: {
    icon: '🌸',
    accent:     '#22c55e',
    accentSoft: '#0a1f0d',
    tabBar:     '#060e0a',
    badge:      '#0f2a14',
    badgeText:  '#86efac',
  },
  summer: {
    icon: '☀️',
    accent:     '#f59e0b',
    accentSoft: '#1a1200',
    tabBar:     '#0e0a00',
    badge:      '#2a1a00',
    badgeText:  '#fcd34d',
  },
  autumn: {
    icon: '🍂',
    accent:     '#f97316',
    accentSoft: '#1a0c00',
    tabBar:     '#0e0600',
    badge:      '#2a0f00',
    badgeText:  '#fdba74',
  },
  winter: {
    icon: '❄️',
    accent:     '#3b82f6',
    accentSoft: '#001525',
    tabBar:     '#00060e',
    badge:      '#001a2e',
    badgeText:  '#93c5fd',
  },
};

// ── Shared palette ───────────────────────────────────────────────────────────

export const C = {
  // ── Backgrounds ──────────────────────────────────────────────
  bg:          '#0a0e1a',
  bgCard:      '#111827',
  bgDeep:      '#060a14',
  bgInput:     '#0f1729',
  bgElevated:  '#1e293b',
  surface:     '#162032',

  // ── Text ─────────────────────────────────────────────────────
  text:        '#f1f5f9',
  textDim:     '#94a3b8',
  textMuted:   '#64748b',
  textFaint:   '#475569',

  // ── Legacy aliases ───────────────────────────────────────────
  gold:        '#f1f5f9',
  goldDim:     '#94a3b8',
  white:       '#ffffff',
  muted:       '#64748b',
  faint:       '#475569',
  dim:         '#94a3b8',

  // ── Semantic ─────────────────────────────────────────────────
  green:       '#22c55e',
  greenDark:   '#15803d',
  greenSoft:   '#86efac',
  amber:       '#f59e0b',
  amberDark:   '#b45309',
  amberSoft:   '#fcd34d',
  red:         '#ef4444',
  redDark:     '#991b1b',
  blue:        '#3b82f6',
  purple:      '#a855f7',
  orange:      '#f97316',
  gray:        '#9e9e9e',

  // ── Borders ──────────────────────────────────────────────────
  border:      '#2d4060',
  divider:     '#2d4060',
  // border and divider are intentionally identical — both kept for backwards compat
};

// ── Tier colors ──────────────────────────────────────────────────────────────

export const TIER_COLOR: Record<string, string> = {
  D: '#9e9e9e',
  C: '#4caf50',
  B: '#2196f3',
  A: '#9c27b0',
  S: '#ff9800',
};

// ── Fonts ────────────────────────────────────────────────────────────────────

// ── Light/Dark color tokens (for legacy themed components) ───────────────────

export const Colors = {
  light: {
    text:       '#11181C',
    background: '#fff',
    icon:       '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text:       '#ECEDEE',
    background: '#151718',
    icon:       '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});
