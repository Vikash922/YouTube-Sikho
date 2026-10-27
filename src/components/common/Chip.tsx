import React, { useEffect, useRef } from 'react';
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
  interpolateColor,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { motionSprings, triggerHaptic } from '../../motion';

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
  const selectProgress = useSharedValue(selected ? 1 : 0);
  const badgeScale = useSharedValue(1);
  const prevCountRef = useRef(count);

  useEffect(() => {
    selectProgress.value = withSpring(selected ? 1 : 0, motionSprings.snappy);
  }, [selected, selectProgress]);

  useEffect(() => {
    if (count !== undefined && prevCountRef.current !== undefined && count !== prevCountRef.current) {
      if (!shouldReduceMotion) {
        badgeScale.value = 1.2;
        badgeScale.value = withSpring(1.0, motionSprings.bouncy);
      }
    }
    prevCountRef.current = count;
  }, [count, shouldReduceMotion, badgeScale]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      selectProgress.value,
      [0, 1],
      [colors.surface, colors.primary]
    );
    const borderColor = interpolateColor(
      selectProgress.value,
      [0, 1],
      [colors.border, colors.primary]
    );

    return {
      backgroundColor,
      borderColor,
      transform: [{ scale: shouldReduceMotion ? 1 : scale.value }],
    };
  });

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withSpring(0.95, motionSprings.snappy);
  };

  const handlePressOut = () => {
    if (!onPress) return;
    scale.value = withSpring(1, motionSprings.snappy);
  };

  const handlePress = () => {
    if (!onPress) return;
    triggerHaptic('light', shouldReduceMotion);
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
        <Animated.View
          style={[
            styles.countBadge,
            {
              backgroundColor: selected
                ? 'rgba(255,255,255,0.25)'
                : colors.surfaceElevated,
              borderRadius: radius.full,
            },
            badgeAnimatedStyle,
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
        </Animated.View>
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
