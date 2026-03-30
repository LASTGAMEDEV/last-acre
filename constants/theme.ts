import { Platform } from 'react-native';

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
  bg:        '#1a1a2e',
  bgCard:    '#16213e',
  bgDeep:    '#0f1f3d',
  bgInput:   '#0d1117',

  // Text
  gold:      '#e8d5a3',
  goldDim:   '#c8a96a',
  white:     '#ffffff',
  muted:     '#888888',
  faint:     '#555555',
  dim:       '#aaaaaa',

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
  divider:   '#1e1e3a',
  border:    '#222222',
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
