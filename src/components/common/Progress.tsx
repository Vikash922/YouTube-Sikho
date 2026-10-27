import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import { AnimatedProgressBar } from '../../motion/svg/AnimatedProgressBar';

export interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  showPercentage?: boolean;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const ProgressBar: React.FC<ProgressProps> = ({
  value,
  label,
  showPercentage = true,
  height = 8,
  color,
  trackColor,
  style,
}) => {
  return (
    <AnimatedProgressBar
      value={value}
      label={label}
      showPercentage={showPercentage}
      height={height}
      color={color}
      trackColor={trackColor}
      style={style}
    />
  );
};

export { AnimatedProgressBar };
