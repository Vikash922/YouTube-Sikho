import React, { useEffect } from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { useMotion } from '../hooks/useMotion';

const AnimatedPath = Animated.createAnimatedComponent
  ? Animated.createAnimatedComponent(Path)
  : (Path as any);

export interface AnimatedCrossProps {
  size?: number; // Size of the cross bounding square (default: 24)
  color?: string; // Stroke color (defaults to colors.error)
  strokeWidth?: number; // Path stroke width (default: 2.5)
  durationMs?: number; // Draw duration in ms (default: 250)
  delayMs?: number; // Optional delay before drawing starts
  style?: StyleProp<ViewStyle>;
}

const CROSS_ARM_LENGTH = 17;

export const AnimatedCross: React.FC<AnimatedCrossProps> = ({
  size = 24,
  color,
  strokeWidth = 2.5,
  durationMs = 250,
  delayMs = 0,
  style,
}) => {
  const { colors } = useTheme();
  const { reduceMotion, springs } = useMotion();

  const strokeDashoffset = useSharedValue(CROSS_ARM_LENGTH);
  const scale = useSharedValue(reduceMotion ? 1 : 0.7);

  useEffect(() => {
    if (reduceMotion) {
      strokeDashoffset.value = 0;
      scale.value = 1;
    } else {
      scale.value = withDelay(delayMs, withSpring(1, springs.snappy));
      strokeDashoffset.value = withDelay(
        delayMs,
        withTiming(0, {
          duration: durationMs,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
  }, [reduceMotion, durationMs, delayMs, springs.snappy, strokeDashoffset, scale]);

  const animatedPathProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const strokeColor = color ?? colors.error;

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Arm 1: Top-Left to Bottom-Right */}
        <AnimatedPath
          d="M 6 6 L 18 18"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CROSS_ARM_LENGTH}
          animatedProps={animatedPathProps}
        />
        {/* Arm 2: Top-Right to Bottom-Left */}
        <AnimatedPath
          d="M 18 6 L 6 18"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CROSS_ARM_LENGTH}
          animatedProps={animatedPathProps}
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
