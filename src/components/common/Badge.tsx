import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

export type BadgeVariant =
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'subtle'
  | 'neutral';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  icon,
  style,
  textStyle,
  size = 'md',
}) => {
  const { colors, typography, radius, spacing } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.shades[50] || colors.surfaceElevated, text: colors.primary, border: colors.shades[200] || colors.border };
      case 'accent':
        return { bg: colors.accent, text: colors.accentText, border: 'transparent' };
      case 'success':
        return { bg: colors.successBg, text: colors.success, border: 'transparent' };
      case 'warning':
        return { bg: colors.warningBg, text: colors.warning, border: 'transparent' };
      case 'error':
        return { bg: colors.errorBg, text: colors.error, border: 'transparent' };
      case 'info':
        return { bg: colors.infoBg, text: colors.info, border: 'transparent' };
      case 'subtle':
      default:
        return { bg: colors.surfaceElevated, text: colors.textMuted, border: colors.border };
    }
  };

  const scheme = getColors();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
          borderRadius: radius.full,
          paddingHorizontal: isSm ? spacing.xs + 2 : spacing.sm + 2,
          paddingVertical: isSm ? 2 : spacing.xs,
        },
        style,
      ]}
    >
      {icon ? <View style={{ marginRight: 4 }}>{icon}</View> : null}
      <Text
        style={[
          typography.caption,
          styles.text,
          {
            color: scheme.text,
            fontSize: isSm ? 10 : 12,
            lineHeight: isSm ? 13 : 16,
            fontWeight: '600',
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  text: {
    letterSpacing: 0.4,
  },
});
