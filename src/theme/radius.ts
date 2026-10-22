import { ViewStyle } from 'react-native';

/**
 * SHAPE LANGUAGE & BORDER RADIUS TOKENS
 * -------------------------------------------------------------
 * Variety with purpose:
 *  - 14: Inputs & Interactive buttons (tactile, friendly ergonomics)
 *  - 20: Structural cards (standard consistent rhythm)
 *  - 28: Modals & Bottom sheets (spacious organic rounding)
 *  - Asymmetric (28, 28, 28, 8): Hero featured cards (distinctive brand anchor)
 *  - full (9999): Avatars, chips, badges, floating pill tab bar
 */

export const radius = {
  sm: 6,
  md: 8,
  input: 14, // 14 for inputs & buttons
  button: 14,
  card: 20, // 20 for structural cards
  sheet: 28, // 28 for sheets & dialogs
  lg: 20,
  xl: 24,
  '2xl': 28,
  full: 9999, // full for avatars, chips, pills
  // Asymmetric corner style for Hero cards (TopLeft 28, TopRight 28, BottomRight 28, BottomLeft 8)
  heroCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    borderBottomLeftRadius: 8,
  } as ViewStyle,
} as const;

export type Radius = typeof radius;
