/**
 * Node CJS bridge of colors.ts for test-contrast runner
 */
const { clientConfig } = require('../config/client.config.js');

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(
    cleanHex.length === 3
      ? cleanHex.split('').map((c) => c + c).join('')
      : cleanHex,
    16
  );
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function mixColor(hex, targetHex, weight) {
  const c1 = hexToRgb(hex);
  const c2 = hexToRgb(targetHex);
  const p = Math.max(0, Math.min(1, weight));

  const r = Math.round(c1.r * (1 - p) + c2.r * p);
  const g = Math.round(c1.g * (1 - p) + c2.g * p);
  const b = Math.round(c1.b * (1 - p) + c2.b * p);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function desaturate(hex, factor = 0.15) {
  const { r, g, b } = hexToRgb(hex);
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const newR = Math.round(r * (1 - factor) + gray * factor);
  const newG = Math.round(g * (1 - factor) + gray * factor);
  const newB = Math.round(b * (1 - factor) + gray * factor);
  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
}

function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(foreground, background) {
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function generateShades(primaryHex) {
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

function createPalette(primaryHex, isDark) {
  const basePrimary = primaryHex || '#4F46E5';
  const effectivePrimary = isDark ? desaturate(basePrimary, 0.12) : basePrimary;
  const shades = generateShades(effectivePrimary);

  const primary = shades[500];
  const primaryDark = shades[700];
  const primaryLight = shades[400];

  const rgb = hexToRgb(primary);
  const primaryGlow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.25 : 0.16})`;

  if (isDark) {
    const background = '#0B1020';
    const surface = '#151B2E';
    const surfaceElevated = '#1C2440';
    const border = '#26304A';
    const text = '#E8EDF5';
    const textMuted = '#A5B1C5';

    return {
      primary,
      primaryLight,
      primaryDark,
      primaryGlow,
      primaryGradient: [primary, primaryDark],
      accent: '#F59E0B',
      accentText: '#1F2937',
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
      card: surface,
      success: '#16A34A',
      warning: '#F59E0B',
      error: '#DC2626',
      info: '#2563EB',
      shades,
    };
  }

  const background = '#F8FAFC';
  const surface = '#FFFFFF';
  const surfaceElevated = '#F1F5F9';
  const border = '#E2E8F0';
  const text = '#0F172A';
  const textMuted = '#475569';

  return {
    primary,
    primaryLight,
    primaryDark,
    primaryGlow,
    primaryGradient: [primary, primaryDark],
    accent: '#F59E0B',
    accentText: '#1F2937',
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
    card: surface,
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
    info: '#2563EB',
    shades,
  };
}

module.exports = {
  createPalette,
  getContrastRatio,
  generateShades,
  desaturate,
};
