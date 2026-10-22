import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

export interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  showPercentage?: boolean;
  height?: number;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressProps> = ({
  value,
  label,
  showPercentage = true,
  height = 8,
  style,
}) => {
  const { colors, typography, radius, spacing } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View style={[styles.container, style]}>
      {label || showPercentage ? (
        <View style={styles.labelRow}>
          {label ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {label}
            </Text>
          ) : null}
          {showPercentage ? (
            <Text
              style={[
                typography.caption,
                typography.tabular,
                { color: colors.primary, fontWeight: '600' },
              ]}
            >
              {Math.round(clamped)}%
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.full,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              height: '100%',
              backgroundColor: colors.primary,
              borderRadius: radius.full,
            },
          ]}
        />
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
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
