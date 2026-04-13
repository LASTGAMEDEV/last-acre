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
    lg:    14,
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
  md:   8,
  lg:   12,
  xl:   16,
  pill: 999,
} as const;

// ── Touch target minimum (mobile) ─────────────────────────────────────────────
export const MIN_TOUCH = 44;

// ── Season theming ───────────────────────────────────────────────────────────

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASON_THEME: Record<Season, {
  icon: string;
  accent: string;       // primary season color
  accentSoft: string;   // tinted background panels
  tabBar: string;       // tab bar background
  badge: string;        // season badge bg
  badgeText: string;
}> = {
  spring: {
    icon: '🌸',
    accent:     '#4caf50',
    accentSoft: '#0d1f0d',
    tabBar:     '#0a1a0a',
    badge:      '#1b3a1b',
    badgeText:  '#81c784',
  },
  summer: {
    icon: '☀️',
    accent:     '#c8860a',
    accentSoft: '#1f1600',
    tabBar:     '#1a1200',
    badge:      '#3a2800',
    badgeText:  '#ffd54f',
  },
  autumn: {
    icon: '🍂',
    accent:     '#e64a19',
    accentSoft: '#1f0d00',
    tabBar:     '#1a0d00',
    badge:      '#3a1500',
    badgeText:  '#ffab91',
  },
  winter: {
    icon: '❄️',
    accent:     '#42a5f5',
    accentSoft: '#001525',
    tabBar:     '#001020',
    badge:      '#001f35',
    badgeText:  '#90caf9',
  },
};

// ── Shared palette ───────────────────────────────────────────────────────────

export const C = {
  // Backgrounds
  bg:        '#0d1a0d',
  bgCard:    '#142014',
  bgDeep:    '#0a1a0a',
  bgInput:   '#0a1a0a',

  // Text
  text:      '#c8e6c9',
  textDim:   '#81c784',
  textMuted: '#6a9a6a',
  textFaint: '#4a6e4a',

  // Legacy aliases (backwards compat — same values as text/textDim)
  gold:      '#c8e6c9',
  goldDim:   '#81c784',
  white:     '#ffffff',
  muted:     '#6a9a6a',
  faint:     '#4a6e4a',
  dim:       '#81c784',

  // Semantic
  green:     '#4caf50',
  greenDark: '#2e7d32',
  greenSoft: '#81c784',
  red:       '#ef5350',
  redDark:   '#b71c1c',
  amber:     '#ffa726',
  blue:      '#2196f3',
  purple:    '#9c27b0',
  orange:    '#ff9800',
  gray:      '#9e9e9e',

  // Dividers
  divider:   '#1b3a1b',
  border:    '#1b3a1b',
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
