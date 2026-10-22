import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  count?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  style,
  textStyle,
  count,
}) => {
  const { colors, radius, typography, spacing } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shouldReduceMotion ? 1 : scale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withSpring(0.95, { damping: 15, stiffness: 350 });
  };

  const handlePressOut = () => {
    if (!onPress) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  };

  const handlePress = () => {
    if (!onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[
        styles.chip,
        {
          borderRadius: radius.full,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.sm,
        },
        animatedStyle,
        style,
      ]}
    >
      {icon ? <View style={{ marginRight: spacing.xs }}>{icon}</View> : null}
      <Text
        style={[
          typography.small,
          {
            color: selected ? '#FFFFFF' : colors.text,
            fontWeight: selected ? '600' : '500',
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
      {count !== undefined ? (
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: selected
                ? 'rgba(255,255,255,0.25)'
                : colors.surfaceElevated,
              borderRadius: radius.full,
            },
          ]}
        >
          <Text
            style={[
              typography.caption,
              {
                color: selected ? '#FFFFFF' : colors.textMuted,
                fontWeight: '600',
              },
            ]}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 36,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
