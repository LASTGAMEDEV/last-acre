import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { C, R, S } from '../../constants/theme';

export type CardVariant = 'default' | 'elevated' | 'danger' | 'success' | 'warning' | 'info';

interface CardProps {
  variant?: CardVariant;
  style?: ViewStyle;
  children: React.ReactNode;
}

// Semantic variant colours (not in global theme — card-specific)
const CARD_COLORS = {
  dangerBg:    '#1a0808',
  dangerBorder:'#5a1a1a',
  successBg:   '#081a0a',
  successBorder:C.greenDark,
  warningBg:   '#1a1200',
  warningBorder:'#5a3a00',
  infoBg:      '#080f1a',
  infoBorder:  '#1a3a5a',
} as const;

const VARIANT_STYLES: Record<CardVariant, { bg: string; border: string }> = {
  default:  { bg: C.bgCard,           border: C.border },
  elevated: { bg: C.bgElevated,       border: 'transparent' },
  danger:   { bg: CARD_COLORS.dangerBg,  border: CARD_COLORS.dangerBorder },
  success:  { bg: CARD_COLORS.successBg, border: CARD_COLORS.successBorder },
  warning:  { bg: CARD_COLORS.warningBg, border: CARD_COLORS.warningBorder },
  info:     { bg: CARD_COLORS.infoBg,    border: CARD_COLORS.infoBorder },
};

export default function Card({ variant = 'default', style, children }: CardProps) {
  const v = VARIANT_STYLES[variant];
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: v.bg, borderColor: v.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: R.lg,
    borderWidth: 1,
    padding: S.md,
    marginBottom: S.sm,
  },
});
