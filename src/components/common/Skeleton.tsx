import React, { useEffect } from 'react';
import { ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius,
  style,
}) => {
  const { colors, radius } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, [shouldReduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    if (shouldReduceMotion) {
      return { backgroundColor: colors.surfaceElevated };
    }
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.surfaceElevated, colors.border]
    );
    return { backgroundColor };
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius: borderRadius ?? radius.card,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});
