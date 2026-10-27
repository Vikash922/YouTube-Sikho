import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
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

const AnimatedRect = Animated.createAnimatedComponent
  ? Animated.createAnimatedComponent(Rect)
  : (Rect as any);

export interface AnimatedProgressBarProps {
  value?: number; // 0 to 100
  progress?: number; // Optional alias for value
  label?: string;
  showPercentage?: boolean;
  height?: number;
  color?: string;
  trackColor?: string;
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  value,
  progress,
  label,
  showPercentage = true,
  height = 8,
  color,
  trackColor,
  durationMs = 400,
  style,
}) => {
  const { colors, typography, radius } = useTheme();
  const { reduceMotion } = useMotion();

  // Sanitize progress / value input to safely default to 0 when not finite
  const rawInput = value !== undefined ? value : (progress !== undefined ? progress : 0);
  const safeInput = typeof rawInput === 'number' && Number.isFinite(rawInput) ? rawInput : 0;
  const clamped = Math.max(0, Math.min(100, safeInput));

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const fillWidthShared = useSharedValue(0);
  const countShared = useSharedValue(0);
  const [displayPercent, setDisplayPercent] = useState(0);

  const updateCountState = (val: number) => {
    setDisplayPercent(Math.round(val));
  };

  useDerivedValue(() => {
    runOnJS(updateCountState)(countShared.value);
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== containerWidth) {
      setContainerWidth(w);
    }
  };

  useEffect(() => {
    if (containerWidth <= 0) return;
    const targetWidth = (clamped / 100) * containerWidth;

    if (reduceMotion) {
      fillWidthShared.value = targetWidth;
      countShared.value = clamped;
      setDisplayPercent(clamped);
    } else {
      fillWidthShared.value = withTiming(targetWidth, {
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
      });
      countShared.value = withTiming(clamped, {
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [clamped, containerWidth, durationMs, reduceMotion, fillWidthShared, countShared]);

  const animatedRectProps = useAnimatedProps(() => ({
    width: Math.max(0, fillWidthShared.value),
  }));

  const activeColor = color ?? colors.primary;
  const activeTrackColor = trackColor ?? colors.surfaceElevated;
  const cornerRadius = height / 2;

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {(label || showPercentage) && (
        <View style={styles.labelRow}>
          {label ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {label}
            </Text>
          ) : <View />}
          {showPercentage ? (
            <Text
              style={[
                typography.caption,
                typography.tabular,
                { color: activeColor, fontWeight: '600' },
              ]}
            >
              {displayPercent}%
            </Text>
          ) : null}
        </View>
      )}

      <View
        style={[
          styles.svgWrapper,
          {
            height,
            backgroundColor: activeTrackColor,
            borderRadius: radius.full,
          },
        ]}
      >
        {containerWidth > 0 && (
          <Svg width={containerWidth} height={height}>
            {/* Background Track */}
            <Rect
              x={0}
              y={0}
              width={containerWidth}
              height={height}
              rx={cornerRadius}
              ry={cornerRadius}
              fill={activeTrackColor}
            />
            {/* Animated Fill */}
            <AnimatedRect
              x={0}
              y={0}
              height={height}
              rx={cornerRadius}
              ry={cornerRadius}
              fill={activeColor}
              animatedProps={animatedRectProps}
            />
          </Svg>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  svgWrapper: {
    width: '100%',
    overflow: 'hidden',
  },
});
