import { ViewStyle } from 'react-native';

/**
 * ELEVATION & SHADOW TOKENS
 * -------------------------------------------------------------
 * Light mode: Soft, low-opacity shadows (5-12% opacity).
 * Dark mode: ZERO drop shadows (borders & 2-3 tonal surface levels provide contrast).
 */
export const createShadows = (isDark: boolean) => ({
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,

  // Elevation 1 (Cards, list items)
  sm: isDark
    ? ({
        shadowOpacity: 0,
        elevation: 0,
      } as ViewStyle)
    : ({
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      } as ViewStyle),

  // Elevation 2 (Elevated cards, search bar, active pill)
  md: isDark
    ? ({
        shadowOpacity: 0,
        elevation: 0,
      } as ViewStyle)
    : ({
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
      } as ViewStyle),

  // Elevation 3 (Floating tab bar, bottom sheets, toasts)
  lg: isDark
    ? ({
        shadowOpacity: 0,
        elevation: 0,
      } as ViewStyle)
    : ({
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 4,
      } as ViewStyle),

  brandGlow: (color: string) =>
    isDark
      ? ({
          shadowOpacity: 0,
          elevation: 0,
        } as ViewStyle)
      : ({
          shadowColor: color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 10,
          elevation: 3,
        } as ViewStyle),
});

export const shadows = createShadows(false);
