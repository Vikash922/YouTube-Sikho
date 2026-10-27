import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, TextStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { useMotion } from '../hooks/useMotion';

const AnimatedCircle = Animated.createAnimatedComponent
  ? Animated.createAnimatedComponent(Circle)
  : (Circle as any);

export interface AnimatedProgressRingProps {
  progress?: number; // 0 to 1 or 0 to 100
  value?: number; // Optional alias for progress
  targetValue?: number; // Optional numeric target for count-up text (defaults to progress * 100)
  size?: number; // Diameter of the ring (default: 120)
  strokeWidth?: number; // Stroke thickness (default: 10)
  color?: string; // Progress arc color (defaults to colors.primary)
  trackColor?: string; // Background track color (defaults to colors.surfaceElevated)
  textColor?: string; // Text color (defaults to colors.text)
  label?: string; // Optional label displayed under count
  showText?: boolean; // Whether to display count-up text in center (default: true)
  unit?: string; // Unit appended to count-up (default: '%')
  durationMs?: number; // Animation duration in ms (default: 600)
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const AnimatedProgressRing: React.FC<AnimatedProgressRingProps> = ({
  progress = 0,
  value,
  targetValue,
  size = 120,
  strokeWidth = 10,
  color,
  trackColor,
  textColor,
  label,
  showText = true,
  unit = '%',
  durationMs = 600,
  style,
  textStyle,
}) => {
  const { colors, typography } = useTheme();
  const { reduceMotion } = useMotion();

  // Sanitize progress input to safely default to 0 when not finite
  const rawProgress = value !== undefined ? value : progress;
  const safeProgress = typeof rawProgress === 'number' && Number.isFinite(rawProgress) ? rawProgress : 0;

  // Normalize progress to [0, 1]
  const normalizedProgress = safeProgress > 1
    ? Math.min(100, Math.max(0, safeProgress)) / 100
    : Math.min(1, Math.max(0, safeProgress));

  const resolvedTarget = targetValue !== undefined && Number.isFinite(targetValue)
    ? targetValue
    : Math.round(normalizedProgress * 100);

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = useSharedValue(circumference);
  const countShared = useSharedValue(0);
  const [displayCount, setDisplayCount] = useState(0);

  const updateCountState = (val: number) => {
    setDisplayCount(Math.round(val));
  };

  useDerivedValue(() => {
    runOnJS(updateCountState)(countShared.value);
  });

  useEffect(() => {
    const targetOffset = circumference * (1 - normalizedProgress);

    if (reduceMotion) {
      strokeDashoffset.value = targetOffset;
      countShared.value = resolvedTarget;
      setDisplayCount(resolvedTarget);
    } else {
      strokeDashoffset.value = withTiming(targetOffset, {
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
      });
      countShared.value = withTiming(resolvedTarget, {
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [normalizedProgress, resolvedTarget, circumference, durationMs, reduceMotion, strokeDashoffset, countShared]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  const activeColor = color ?? colors.primary;
  const activeTrackColor = trackColor ?? colors.surfaceElevated;
  const activeTextColor = textColor ?? colors.text;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background Track Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={activeTrackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Foreground Progress Circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            fill="transparent"
            animatedProps={animatedCircleProps}
          />
        </G>
      </Svg>

      {showText && (
        <View style={styles.contentOverlay}>
          <Text
            style={[
              typography.tabular,
              styles.countText,
              { color: activeTextColor, fontSize: Math.max(14, Math.round(size * 0.22)) },
              textStyle,
            ]}
          >
            {displayCount}{unit}
          </Text>
          {label ? (
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, fontSize: Math.max(10, Math.round(size * 0.1)), marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontWeight: '700',
  },
});
