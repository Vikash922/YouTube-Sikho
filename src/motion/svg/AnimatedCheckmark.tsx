import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
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

export interface AnimatedCheckmarkProps {
  size?: number; // Size of the checkmark bounding square (default: 24)
  color?: string; // Stroke color (defaults to colors.success)
  strokeWidth?: number; // Path stroke width (default: 2.5)
  durationMs?: number; // Draw duration in ms (default: 300)
  delayMs?: number; // Optional delay before drawing starts
  style?: StyleProp<ViewStyle>;
}

const CHECKMARK_PATH_LENGTH = 24;

export const AnimatedCheckmark: React.FC<AnimatedCheckmarkProps> = ({
  size = 24,
  color,
  strokeWidth = 2.5,
  durationMs = 300,
  delayMs = 0,
  style,
}) => {
  const { colors } = useTheme();
  const { reduceMotion, springs } = useMotion();

  const strokeDashoffset = useSharedValue(CHECKMARK_PATH_LENGTH);
  const scale = useSharedValue(reduceMotion ? 1 : 0.7);

  useEffect(() => {
    if (reduceMotion) {
      strokeDashoffset.value = 0;
      scale.value = 1;
    } else {
      scale.value = withDelay(delayMs, withSpring(1, springs.bouncy));
      strokeDashoffset.value = withDelay(
        delayMs,
        withTiming(0, {
          duration: durationMs,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
  }, [reduceMotion, durationMs, delayMs, springs.bouncy, strokeDashoffset, scale]);

  const animatedPathProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const strokeColor = color ?? colors.success;

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <AnimatedPath
          d="M 4 12 L 9 17 L 20 6"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECKMARK_PATH_LENGTH}
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
