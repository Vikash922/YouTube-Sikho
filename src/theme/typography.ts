import { TextStyle, Platform } from 'react-native';

/**
 * TYPOGRAPHY TOKENS (Poppins + Inter)
 * -------------------------------------------------------------
 * Strict 6-level scale:
 *  - Display: 32/38 Bold (Tight tracking: -0.6)
 *  - Title: 24/30 SemiBold (Tracking: -0.4)
 *  - Heading: 18/24 SemiBold (Tracking: -0.2)
 *  - Body: 16/24 Regular
 *  - Small: 14/20 Regular
 *  - Caption: 12/16 Medium
 * Tabular numbers enabled for price, timer, and progress data.
 */

export const fontFamilies = {
  headingBold: 'Inter_700Bold',
  headingSemiBold: 'Inter_600SemiBold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
};

export const typography = {
  families: fontFamilies,

  // Display: 32/38 Bold
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    fontFamily: fontFamilies.headingBold,
    letterSpacing: -0.6,
  } as TextStyle,

  // Title: 24/30 SemiBold
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
    fontFamily: fontFamilies.headingSemiBold,
    letterSpacing: -0.4,
  } as TextStyle,

  // Heading: 18/24 SemiBold
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: fontFamilies.headingSemiBold,
    letterSpacing: -0.2,
  } as TextStyle,

  // Body: 16/24 Regular
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    fontFamily: fontFamilies.bodyRegular,
    letterSpacing: 0,
  } as TextStyle,

  // Small: 14/20 Regular
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    fontFamily: fontFamilies.bodyRegular,
    letterSpacing: 0.1,
  } as TextStyle,

  // Caption: 12/16 Medium
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    fontFamily: fontFamilies.bodyMedium,
    letterSpacing: 0.2,
  } as TextStyle,

  // Tabular Numbers (Timer, Price, Progress metrics)
  tabular: {
    fontVariant: ['tabular-nums'],
  } as TextStyle,

  // Backwards compatibility aliases
  headline: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
    fontFamily: fontFamilies.headingSemiBold,
    letterSpacing: -0.4,
  } as TextStyle,

  subhead: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: fontFamilies.headingSemiBold,
    letterSpacing: -0.2,
  } as TextStyle,

  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    fontFamily: fontFamilies.bodyRegular,
  } as TextStyle,

  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    fontFamily: fontFamilies.headingSemiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
} as const;

export type Typography = typeof typography;
