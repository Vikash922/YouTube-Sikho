/**
 * SPACING TOKENS (8-Point Grid)
 * -------------------------------------------------------------
 * Screen horizontal padding: 20px (standard across all screens)
 * Macro section gaps: 24-32px
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  screen: 20, // 20px screen side margins
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export type Spacing = typeof spacing;
