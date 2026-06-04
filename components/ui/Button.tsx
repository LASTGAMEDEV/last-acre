import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { C, R, F } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const VARIANT: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: C.amberDark,  text: '#fff' },
  secondary: { bg: C.bgElevated, text: C.text,    border: C.border },
  danger:    { bg: C.redDark,    text: '#fff' },
  ghost:     { bg: 'transparent', text: C.textDim, border: C.border },
  success:   { bg: C.greenDark,  text: '#fff' },
};

const SIZE: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number; minHeight: number }> = {
  sm: { paddingV: 6,  paddingH: 12, fontSize: F.size.sm,   minHeight: 32 },
  md: { paddingV: 10, paddingH: 16, fontSize: F.size.body, minHeight: 40 },
  lg: { paddingV: 14, paddingH: 20, fontSize: F.size.xl,   minHeight: 48 },
};

export default function Button({
  label, onPress, variant = 'primary', size = 'md', disabled = false, style, textStyle,
}: ButtonProps) {
  const v = VARIANT[variant];
  const s = SIZE[size];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: disabled ? C.bgElevated : v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          paddingVertical: s.paddingV,
          paddingHorizontal: s.paddingH,
          minHeight: s.minHeight,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { fontSize: s.fontSize, color: disabled ? C.textFaint : v.text },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: F.weight.bold,
  },
});
