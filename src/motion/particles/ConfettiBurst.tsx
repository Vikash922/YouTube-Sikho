import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { Canvas, Rect, Circle, Group } from '@shopify/react-native-skia';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useMotion } from '../hooks/useMotion';
import { SkiaErrorBoundary } from '../boundaries/SkiaErrorBoundary';

export interface ConfettiBurstProps {
  count?: number; // Capped between 60 and 80. Default: 72
  durationMs?: number; // Default: 2500ms
  onComplete?: () => void;
  colors?: string[]; // Theme-safe color array
  origin?: { x: number; y: number };
}

type ParticleShape = 'rect' | 'square' | 'circle' | 'ribbon';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  shape: ParticleShape;
  width: number;
  height: number;
  radius: number;
  color: string;
  opacity: number;
}

export function calculateEffectiveConfettiCount(requestedCount: number = 72): number {
  if (typeof requestedCount !== 'number' || Number.isNaN(requestedCount)) {
    return 72;
  }
  if (requestedCount <= 0) return 0;
  const MIN_CAP = 60;
  const MAX_CAP = 80;
  if (requestedCount < MIN_CAP) return MIN_CAP;
  if (requestedCount > MAX_CAP) return MAX_CAP;
  return requestedCount;
}

const ConfettiBurstInner: React.FC<ConfettiBurstProps> = ({
  count = 72,
  durationMs = 2500,
  onComplete,
  colors: customColors,
  origin,
}) => {
  const { colors } = useTheme();
  const { reduceMotion, allowParticles, tier } = useMotion();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const [isDone, setIsDone] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Fallback / disable check: Reduced motion, tier low, or allowParticles false
  const isDisabled = reduceMotion || !allowParticles || tier === 'low';

  // Palette: 6 theme colors (zero hardcoded hex)
  const defaultColors = useMemo(() => [
    colors.primary,
    colors.accent,
    colors.success,
    colors.warning,
    colors.info,
    colors.secondary || colors.primaryLight || colors.primary,
  ], [colors]);

  const palette = customColors && customColors.length > 0 ? customColors : defaultColors;

  // Initialize particles once on mount if enabled
  useEffect(() => {
    if (isDisabled) {
      onComplete?.();
      setIsDone(true);
      return;
    }

    const effectiveCount = calculateEffectiveConfettiCount(count);
    const startX = origin?.x ?? screenWidth * 0.5;
    const startY = origin?.y ?? screenHeight * 0.35;

    const shapes: ParticleShape[] = ['rect', 'square', 'circle', 'ribbon'];
    const initialParticles: Particle[] = [];

    for (let i = 0; i < effectiveCount; i++) {
      const shape = shapes[i % shapes.length];
      const color = palette[i % palette.length];
      // Physics initialization:
      // vx in [-8, 8], vy in [-18, -6], rotSpeed in [-0.2, 0.2]
      const vx = (Math.random() - 0.5) * 16;
      const vy = -6 - Math.random() * 12;
      const rotSpeed = (Math.random() - 0.5) * 0.4;

      let pWidth = 8;
      let pHeight = 4;
      let radius = 3;

      if (shape === 'square') {
        pWidth = 6;
        pHeight = 6;
      } else if (shape === 'ribbon') {
        pWidth = 12;
        pHeight = 3;
      } else if (shape === 'circle') {
        radius = 3;
      }

      initialParticles.push({
        x: startX + (Math.random() - 0.5) * 20,
        y: startY + (Math.random() - 0.5) * 20,
        vx,
        vy,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed,
        shape,
        width: pWidth,
        height: pHeight,
        radius,
        color,
        opacity: 1,
      });
    }

    setParticles(initialParticles);

    const startTime = Date.now();
    const gravity = 0.22;
    const drag = 0.985;

    const loop = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= durationMs) {
        setIsDone(true);
        onComplete?.();
        return;
      }

      const progress = elapsed / durationMs;
      const fadeProgress = progress > 0.8 ? (progress - 0.8) / 0.2 : 0;
      const currentOpacity = Math.max(0, 1 - fadeProgress);

      setParticles((prev) =>
        prev.map((p) => {
          const nextVx = p.vx * drag;
          const nextVy = p.vy * drag + gravity;
          return {
            ...p,
            x: p.x + nextVx,
            y: p.y + nextVy,
            vx: nextVx,
            vy: nextVy,
            rotation: p.rotation + p.rotSpeed,
            opacity: currentOpacity,
          };
        })
      );

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isDisabled, count, durationMs, origin, palette, screenWidth, screenHeight, onComplete]);

  // Clean auto-unmounting from render tree
  if (isDone) {
    return null;
  }

  // Static celebratory fallback if motion disabled
  if (isDisabled) {
    return (
      <View style={styles.staticFallbackBadge} pointerEvents="none">
        <Sparkles size={24} color={colors.accent} />
      </View>
    );
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, idx) => {
        if (p.shape === 'circle') {
          return (
            <Circle
              key={`confetti-${idx}`}
              cx={p.x}
              cy={p.y}
              r={p.radius}
              color={p.color}
              opacity={p.opacity}
            />
          );
        }

        return (
          <Group
            key={`confetti-${idx}`}
            origin={{ x: p.x, y: p.y }}
            transform={[{ rotate: p.rotation }]}
            opacity={p.opacity}
          >
            <Rect
              x={p.x - p.width / 2}
              y={p.y - p.height / 2}
              width={p.width}
              height={p.height}
              color={p.color}
            />
          </Group>
        );
      })}
    </Canvas>
  );
};

export const ConfettiBurst: React.FC<ConfettiBurstProps> = (props) => {
  return (
    <SkiaErrorBoundary fallback={null}>
      <ConfettiBurstInner {...props} />
    </SkiaErrorBoundary>
  );
};

const styles = StyleSheet.create({
  staticFallbackBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 99,
  },
});
