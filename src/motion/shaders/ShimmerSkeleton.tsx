import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Platform, StyleProp, ViewStyle } from 'react-native';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useTheme } from '../../theme';
import { useMotion } from '../hooks/useMotion';
import { SkiaErrorBoundary } from '../boundaries/SkiaErrorBoundary';
import { colorToVec4 } from './colorUtils';

export interface ShimmerSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  baseColor?: string;
  highlightColor?: string;
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
}

const SKSL_SHIMMER = `
uniform vec2 u_resolution;
uniform float u_progress;
uniform vec4 u_base_color;
uniform vec4 u_highlight_color;

vec4 main(vec2 xy) {
  vec2 uv = xy / u_resolution;
  float band = smoothstep(0.0, 0.2, 0.2 - abs(uv.x - u_progress));
  return mix(u_base_color, u_highlight_color, band * 0.45);
}
`;

let cachedShimmerEffect: any = null;
function getShimmerEffect() {
  if (!cachedShimmerEffect && Skia?.RuntimeEffect) {
    try {
      cachedShimmerEffect = Skia.RuntimeEffect.Make(SKSL_SHIMMER);
    } catch {
      cachedShimmerEffect = null;
    }
  }
  return cachedShimmerEffect;
}

const ShimmerSkeletonInner: React.FC<ShimmerSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius,
  baseColor,
  highlightColor,
  durationMs = 1200,
  style,
}) => {
  const { colors, radius } = useTheme();
  const { reduceMotion, allowShaders, tier } = useMotion();

  const [measuredSize, setMeasuredSize] = useState({ width: 0, height: 0 });
  const [progress, setProgress] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  const activeBaseColor = baseColor ?? colors.surfaceElevated;
  const activeHighlightColor = highlightColor ?? (colors.borderSubtle || colors.border);
  const effectiveRadius = borderRadius ?? radius.card;

  const shaderEffect = useMemo(() => getShimmerEffect(), []);

  const fallbackRequired =
    reduceMotion ||
    !allowShaders ||
    tier === 'low' ||
    !shaderEffect ||
    Platform.OS === 'web';

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) {
      setMeasuredSize({ width: w, height: h });
    }
  };

  useEffect(() => {
    if (fallbackRequired) return;

    const startTime = Date.now();
    const loop = () => {
      const elapsed = (Date.now() - startTime) % durationMs;
      // Progress sweeps linearly from -0.3 to 1.3 across width
      const t = elapsed / durationMs;
      setProgress(-0.3 + t * 1.6);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [fallbackRequired, durationMs]);

  if (fallbackRequired) {
    return (
      <View
        style={[
          styles.container,
          {
            width: width as any,
            height,
            borderRadius: effectiveRadius,
            backgroundColor: activeBaseColor,
          },
          style,
        ]}
      />
    );
  }

  const uniforms = {
    u_resolution: [measuredSize.width || 1, measuredSize.height || 1],
    u_progress: progress,
    u_base_color: colorToVec4(activeBaseColor),
    u_highlight_color: colorToVec4(activeHighlightColor),
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: width as any,
          height,
          borderRadius: effectiveRadius,
          backgroundColor: activeBaseColor,
        },
        style,
      ]}
      onLayout={handleLayout}
    >
      {measuredSize.width > 0 && measuredSize.height > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={shaderEffect} uniforms={uniforms} />
          </Fill>
        </Canvas>
      )}
    </View>
  );
};

export const ShimmerSkeleton: React.FC<ShimmerSkeletonProps> = (props) => {
  const { colors, radius } = useTheme();
  const fallback = (
    <View
      style={[
        styles.container,
        {
          width: props.width as any,
          height: props.height ?? 20,
          borderRadius: props.borderRadius ?? radius.card,
          backgroundColor: props.baseColor ?? colors.surfaceElevated,
        },
        props.style,
      ]}
    />
  );

  return (
    <SkiaErrorBoundary fallback={fallback}>
      <ShimmerSkeletonInner {...props} />
    </SkiaErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
