import React, { useEffect, useState, useRef, useMemo } from 'react';
import { StyleSheet, View, LayoutChangeEvent, Platform, StyleProp, ViewStyle } from 'react-native';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { useMotion } from '../hooks/useMotion';
import { SkiaErrorBoundary } from '../boundaries/SkiaErrorBoundary';
import { colorToVec4 } from './colorUtils';

export interface SoftGradientBackgroundProps {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const SKSL_GRADIENT = `
uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec4 u_color3;

vec4 main(vec2 xy) {
  vec2 uv = xy / u_resolution;
  float slowTime = u_time * 0.35;
  vec2 p1 = vec2(0.3 + 0.2 * sin(slowTime), 0.3 + 0.2 * cos(slowTime));
  vec2 p2 = vec2(0.7 + 0.2 * cos(slowTime * 0.7), 0.7 + 0.2 * sin(slowTime * 0.7));
  float d1 = length(uv - p1);
  float d2 = length(uv - p2);
  vec4 c = mix(u_color1, u_color2, smoothstep(0.0, 0.9, d1));
  c = mix(c, u_color3, smoothstep(0.0, 0.8, d2));
  return c;
}
`;

// Lazily compile SkSL runtime effect
let cachedGradientEffect: any = null;
function getGradientEffect() {
  if (!cachedGradientEffect && Skia?.RuntimeEffect) {
    try {
      cachedGradientEffect = Skia.RuntimeEffect.Make(SKSL_GRADIENT);
    } catch {
      cachedGradientEffect = null;
    }
  }
  return cachedGradientEffect;
}

const SoftGradientInner: React.FC<SoftGradientBackgroundProps> = ({
  color1,
  color2,
  color3,
  speed = 1.0,
  style,
  children,
}) => {
  const { colors } = useTheme();
  const { reduceMotion, allowShaders, tier } = useMotion();

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [time, setTime] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  const activeColor1 = color1 ?? colors.surfaceElevated;
  const activeColor2 = color2 ?? colors.background;
  const activeColor3 = color3 ?? colors.surface;

  const shaderEffect = useMemo(() => getGradientEffect(), []);

  const fallbackRequired =
    reduceMotion ||
    !allowShaders ||
    tier === 'low' ||
    !shaderEffect ||
    Platform.OS === 'web';

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ width, height });
    }
  };

  useEffect(() => {
    if (fallbackRequired) return;

    const startTime = Date.now();
    const loop = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      setTime(elapsed * speed);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [fallbackRequired, speed]);

  if (fallbackRequired) {
    return (
      <LinearGradient
        colors={[activeColor1, activeColor2, activeColor3]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  const uniforms = {
    u_resolution: [size.width || 1, size.height || 1],
    u_time: time,
    u_color1: colorToVec4(activeColor1),
    u_color2: colorToVec4(activeColor2),
    u_color3: colorToVec4(activeColor3),
  };

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {size.width > 0 && size.height > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={shaderEffect} uniforms={uniforms} />
          </Fill>
        </Canvas>
      )}
      {children}
    </View>
  );
};

export const SoftGradientBackground: React.FC<SoftGradientBackgroundProps> = (props) => {
  const { colors } = useTheme();
  const activeColor1 = props.color1 ?? colors.surfaceElevated;
  const activeColor2 = props.color2 ?? colors.background;
  const activeColor3 = props.color3 ?? colors.surface;

  const fallback = (
    <LinearGradient
      colors={[activeColor1, activeColor2, activeColor3]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, props.style]}
    >
      {props.children}
    </LinearGradient>
  );

  return (
    <SkiaErrorBoundary fallback={fallback}>
      <SoftGradientInner {...props} />
    </SkiaErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
});
