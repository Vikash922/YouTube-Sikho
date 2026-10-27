import React from 'react';
import { View, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { Canvas, BackdropFilter, Blur, Fill } from '@shopify/react-native-skia';
import { useTheme } from '../../theme';
import { useMotion } from '../hooks/useMotion';
import { SkiaErrorBoundary } from '../boundaries/SkiaErrorBoundary';

export interface GlassBlurProps {
  blur?: number;
  tintColor?: string;
  borderColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const GlassBlurInner: React.FC<GlassBlurProps> = ({
  blur = 12,
  tintColor,
  borderColor,
  borderRadius,
  borderWidth = 1,
  style,
  children,
}) => {
  const { colors, radius } = useTheme();
  const { reduceMotion, allowShaders, tier } = useMotion();

  const effectiveRadius = borderRadius ?? radius.card;
  const activeTint = tintColor ?? colors.glass ?? colors.surfaceElevated;
  const activeBorder = borderColor ?? colors.borderSubtle ?? colors.border;

  const fallbackRequired =
    reduceMotion ||
    !allowShaders ||
    tier === 'low' ||
    Platform.OS === 'web';

  if (fallbackRequired) {
    return (
      <View
        style={[
          styles.container,
          {
            borderRadius: effectiveRadius,
            borderColor: activeBorder,
            borderWidth,
            backgroundColor: activeTint,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius: effectiveRadius,
          borderColor: activeBorder,
          borderWidth,
        },
        style,
      ]}
    >
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackdropFilter filter={<Blur blur={blur} />}>
          <Fill color={activeTint} />
        </BackdropFilter>
      </Canvas>
      {children}
    </View>
  );
};

export const GlassBlur: React.FC<GlassBlurProps> = (props) => {
  const { colors, radius } = useTheme();
  const fallback = (
    <View
      style={[
        styles.container,
        {
          borderRadius: props.borderRadius ?? radius.card,
          borderColor: props.borderColor ?? colors.border,
          borderWidth: props.borderWidth ?? 1,
          backgroundColor: props.tintColor ?? colors.glass ?? colors.surfaceElevated,
        },
        props.style,
      ]}
    >
      {props.children}
    </View>
  );

  return (
    <SkiaErrorBoundary fallback={fallback}>
      <GlassBlurInner {...props} />
    </SkiaErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
});
