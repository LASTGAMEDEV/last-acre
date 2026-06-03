import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { C, R, F } from '../../constants/theme';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const VARIANT: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  success: { bg: C.bgDeep, text: C.greenSoft,  border: C.greenDark },
  warning: { bg: '#2a1a00', text: C.amberSoft,  border: C.amberDark },
  danger:  { bg: '#2a0808', text: '#fca5a5',    border: C.redDark },
  info:    { bg: '#08152a', text: '#93c5fd',    border: '#1e3a5a' },
  neutral: { bg: C.bgElevated, text: C.textDim, border: C.border },
  purple:  { bg: '#1a0a2a', text: '#d8b4fe',    border: '#6b21a8' },
};

export default function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const v = VARIANT[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={[styles.text, { color: v.text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: R.pill,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
    letterSpacing: 0.5,
  },
});
