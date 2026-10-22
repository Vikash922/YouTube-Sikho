/**
 * COLOR SYSTEM (60-30-10 Architectural Rule)
 * -------------------------------------------------------------
 * 60% Canvas/Background
 * 30% Structural Surfaces (Cards, Nav, Sheets)
 * 10% Intentional Accent (CTAs, Highlights, Badges)
 *
 * Dark mode is a dedicated calming palette (not a simple color inversion).
 * Accent Amber (#F59E0B) strictly pairs with dark text (#1F2937) to meet WCAG AA.
 */

import { clientConfig } from '../config/client.config';

export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface StateColors {
  default: string;
  pressed: string;
  focused: string;
  disabled: string;
  error: string;
  selected: string;
}

export interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryGlow: string;
  primaryGradient: [string, string];
  accent: string;
  accentText: string; // #1F2937 for WCAG AA compliance on amber
  accentLight: string;
  accentBg: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceElevated: string; // Tonal level 3
  surfaceSubtle: string;
  text: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderFocus: string;
  borderSubtle: string;
  card: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
  info: string;
  infoBg: string;
  backdrop: string;
  glass: string;
  shades: ColorShades;
  // Compatibility tokens
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  semanticError: string;
  semanticSuccess: string;
  semanticWarning: string;
  accentMuted: string;
  surfaceHover: string;
  surfaceHighlight: string;
  states: {
    button: StateColors;
    input: StateColors;
    tab: StateColors;
  };
}

/**
 * Utility: Convert HEX to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex,
    16
  );
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

/**
 * Utility: Mix color with target hex
 */
export function mixColor(hex: string, targetHex: string, weight: number): string {
  const c1 = hexToRgb(hex);
  const c2 = hexToRgb(targetHex);
  const p = Math.max(0, Math.min(1, weight));

  const r = Math.round(c1.r * (1 - p) + c2.r * p);
  const g = Math.round(c1.g * (1 - p) + c2.g * p);
  const b = Math.round(c1.b * (1 - p) + c2.b * p);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Desaturate a hex color by a factor (0-1) for calm dark mode appearance
 */
export function desaturate(hex: string, factor: number = 0.15): string {
  const { r, g, b } = hexToRgb(hex);
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const newR = Math.round(r * (1 - factor) + gray * factor);
  const newG = Math.round(g * (1 - factor) + gray * factor);
  const newB = Math.round(b * (1 - factor) + gray * factor);
  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
}

/**
 * Compute relative luminance for WCAG contrast calculation
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Compute WCAG Contrast Ratio between two hex colors
 */
export function getContrastRatio(foreground: string, background: string): number {
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Generate 50-900 tonal scale from a single base HEX
 */
export function generateShades(primaryHex: string): ColorShades {
  return {
    50: mixColor(primaryHex, '#FFFFFF', 0.92),
    100: mixColor(primaryHex, '#FFFFFF', 0.8),
    200: mixColor(primaryHex, '#FFFFFF', 0.65),
    300: mixColor(primaryHex, '#FFFFFF', 0.45),
    400: mixColor(primaryHex, '#FFFFFF', 0.2),
    500: primaryHex,
    600: mixColor(primaryHex, '#000000', 0.15),
    700: mixColor(primaryHex, '#000000', 0.3),
    800: mixColor(primaryHex, '#000000', 0.45),
    900: mixColor(primaryHex, '#000000', 0.6),
  };
}

export function createPalette(primaryHex: string, isDark: boolean): ColorPalette {
  const basePrimary = primaryHex || '#4F46E5';
  const effectivePrimary = isDark ? desaturate(basePrimary, 0.12) : basePrimary;
  const shades = generateShades(effectivePrimary);

  const primary = shades[500];
  const primaryDark = shades[700];
  const primaryLight = shades[400];

  const rgb = hexToRgb(primary);
  const primaryGlow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.25 : 0.16})`;

  if (isDark) {
    // Calibrated Dark Theme (no pure black, reduced saturation, WCAG AA compliant)
    const background = '#0B1020';
    const surface = '#151B2E';
    const surfaceElevated = '#1C2440'; // Tonal level 3
    const border = '#26304A';
    const text = '#E8EDF5'; // Calibrated off-white (> 14:1 contrast)
    const textMuted = '#A5B1C5'; // (> 7:1 contrast on surface)

    return {
      primary,
      primaryLight,
      primaryDark,
      primaryGlow,
      primaryGradient: [primary, primaryDark],
      accent: '#F59E0B',
      accentText: '#1F2937', // Strict dark text on amber
      accentLight: '#FDE68A',
      accentBg: 'rgba(245, 158, 11, 0.15)',
      secondary: '#1C2440',
      background,
      surface,
      surfaceElevated,
      surfaceSubtle: 'rgba(255, 255, 255, 0.04)',
      text,
      textMuted,
      textInverse: '#0B1020',
      border,
      borderFocus: primary,
      borderSubtle: '#1F2840',
      card: surface,
      success: '#16A34A',
      successBg: 'rgba(22, 163, 74, 0.14)',
      warning: '#F59E0B',
      warningBg: 'rgba(245, 158, 11, 0.14)',
      error: '#DC2626',
      errorBg: 'rgba(220, 38, 38, 0.14)',
      info: '#2563EB',
      infoBg: 'rgba(37, 99, 235, 0.14)',
      backdrop: 'rgba(5, 8, 16, 0.75)',
      glass: 'rgba(21, 27, 46, 0.88)',
      shades,
      textPrimary: text,
      textSecondary: textMuted,
      textTertiary: textMuted,
      semanticError: '#DC2626',
      semanticSuccess: '#16A34A',
      semanticWarning: '#F59E0B',
      accentMuted: 'rgba(245, 158, 11, 0.15)',
      surfaceHover: surfaceElevated,
      surfaceHighlight: surfaceElevated,
      states: {
        button: {
          default: primary,
          pressed: primaryDark,
          focused: primary,
          disabled: 'rgba(255, 255, 255, 0.08)',
          error: '#DC2626',
          selected: primary,
        },
        input: {
          default: surface,
          pressed: surfaceElevated,
          focused: surface,
          disabled: 'rgba(255, 255, 255, 0.04)',
          error: surface,
          selected: surfaceElevated,
        },
        tab: {
          default: 'transparent',
          pressed: 'rgba(255, 255, 255, 0.06)',
          focused: primaryGlow,
          disabled: 'transparent',
          error: 'transparent',
          selected: primaryGlow,
        },
      },
    };
  }

  // Calibrated Light Theme
  const background = '#F8FAFC';
  const surface = '#FFFFFF';
  const surfaceElevated = '#F1F5F9';
  const border = '#E2E8F0';
  const text = '#0F172A';
  const textMuted = '#475569'; // Contrast > 7.5:1 on white

  return {
    primary,
    primaryLight,
    primaryDark,
    primaryGlow,
    primaryGradient: [primary, primaryDark],
    accent: '#F59E0B',
    accentText: '#1F2937', // Strict dark text on amber
    accentLight: '#FEF3C7',
    accentBg: '#FFFBEB',
    secondary: '#F1F5F9',
    background,
    surface,
    surfaceElevated,
    surfaceSubtle: 'rgba(0, 0, 0, 0.02)',
    text,
    textMuted,
    textInverse: '#FFFFFF',
    border,
    borderFocus: primary,
    borderSubtle: '#F1F5F9',
    card: surface,
    success: '#16A34A',
    successBg: '#F0FDF4',
    warning: '#F59E0B',
    warningBg: '#FFFBEB',
    error: '#DC2626',
    errorBg: '#FEF2F2',
    info: '#2563EB',
    infoBg: '#EFF6FF',
    backdrop: 'rgba(15, 23, 42, 0.45)',
    glass: 'rgba(255, 255, 255, 0.92)',
    shades,
    textPrimary: text,
    textSecondary: textMuted,
    textTertiary: textMuted,
    semanticError: '#DC2626',
    semanticSuccess: '#16A34A',
    semanticWarning: '#F59E0B',
    accentMuted: '#FFFBEB',
    surfaceHover: surfaceElevated,
    surfaceHighlight: surfaceElevated,
    states: {
      button: {
        default: primary,
        pressed: primaryDark,
        focused: primary,
        disabled: '#E2E8F0',
        error: '#DC2626',
        selected: primary,
      },
      input: {
        default: surface,
        pressed: surfaceElevated,
        focused: surface,
        disabled: '#F1F5F9',
        error: surface,
        selected: surfaceElevated,
      },
      tab: {
        default: 'transparent',
        pressed: 'rgba(0, 0, 0, 0.04)',
        focused: primaryGlow,
        disabled: 'transparent',
        error: 'transparent',
        selected: primaryGlow,
      },
    },
  };
}

export const darkPalette = createPalette(clientConfig.colors.primary, true);
export const lightPalette = createPalette(clientConfig.colors.primary, false);
