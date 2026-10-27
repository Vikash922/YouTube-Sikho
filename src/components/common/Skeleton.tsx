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
import { useMotion } from '../../motion/hooks/useMotion';
import { ShimmerSkeleton } from '../../motion/shaders/ShimmerSkeleton';

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
  const { allowShaders, reduceMotion: motionReduceMotion, tier } = useMotion();
  const isReduced = shouldReduceMotion || motionReduceMotion;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (isReduced) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, [isReduced, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    if (isReduced) {
      return { backgroundColor: colors.surfaceElevated };
    }
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.surfaceElevated, colors.border]
    );
    return { backgroundColor };
  });

  if (allowShaders && !isReduced && tier !== 'low') {
    return (
      <ShimmerSkeleton
        width={width}
        height={height}
        borderRadius={borderRadius ?? radius.card}
        style={style}
      />
    );
  }

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
