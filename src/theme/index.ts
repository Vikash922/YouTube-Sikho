import { useMemo } from 'react';
import { createPalette, ColorPalette } from './colors';
import { spacing, Spacing } from './spacing';
import { radius, Radius } from './radius';
import { typography, Typography } from './typography';
import { createShadows } from './shadows';
import { motion, Motion } from './motion';
import { useThemeStore, ThemeMode } from '../store/useThemeStore';
import { useConfigStore } from '../store/useConfigStore';
import { clientConfig } from '../config/client.config';

export interface Theme {
  mode: ThemeMode;
  colors: ColorPalette;
  spacing: Spacing;
  radius: Radius;
  typography: Typography;
  shadows: ReturnType<typeof createShadows>;
  motion: Motion;
  toggleTheme: () => void;
  isDark: boolean;
}

export function useTheme(): Theme {
  const mode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const remotePrimary = useConfigStore((state) => state.config?.primaryColor);
  const isDark = mode === 'dark';

  return useMemo(() => {
    const activePrimary = remotePrimary || clientConfig.colors.primary || '#4F46E5';
    const colors = createPalette(activePrimary, isDark);
    const shadows = createShadows(isDark);

    return {
      mode,
      colors,
      spacing,
      radius,
      typography,
      shadows,
      motion,
      toggleTheme,
      isDark,
    };
  }, [mode, toggleTheme, remotePrimary, isDark]);
}

export function useThemeColors(): ColorPalette {
  return useTheme().colors;
}

export * from './colors';
export * from './spacing';
export * from './radius';
export * from './typography';
export * from './shadows';
export * from './motion';
