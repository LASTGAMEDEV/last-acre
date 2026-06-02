import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { C, R, S } from '../../constants/theme';

export type CardVariant = 'default' | 'elevated' | 'danger' | 'success' | 'warning' | 'info';

interface CardProps {
  variant?: CardVariant;
  style?: ViewStyle;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<CardVariant, { bg: string; border: string }> = {
  default:  { bg: C.bgCard,    border: C.border },
  elevated: { bg: C.bgElevated, border: 'transparent' },
  danger:   { bg: '#1a0808',   border: '#5a1a1a' },
  success:  { bg: '#081a0a',   border: '#1a5a1a' },
  warning:  { bg: '#1a1200',   border: '#5a3a00' },
  info:     { bg: '#080f1a',   border: '#1a3a5a' },
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
