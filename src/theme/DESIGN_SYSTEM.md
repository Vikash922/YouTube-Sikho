# White-Label Academy Design System Architecture
### Strict Principles: Text Hierarchy • Font Pairing • Layout Balance • Color Theory • Repetition • Contrast • Negative Space

This document codifies the 8 design fundamentals that govern every screen, component, modal, and interaction in this app.

---

## 1. Text Hierarchy (Visual Weight & Scale)
Every screen must have a clear typographic narrative. Never stack two elements of the same size and weight without clear role distinction.

| Level | Size | Line Height | Weight | Letter Spacing | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | 32px | 38px | Bold (700) | -0.8px | Hero metrics, main price numbers, marketing stats |
| **Headline** | 24px | 30px | Bold (700) | -0.5px | Screen titles, onboarding headings, modal heroes |
| **Title** | 18px | 24px | SemiBold (600) | -0.3px | Section headers, course card titles |
| **Subhead** | 15px | 20px | SemiBold (600) | -0.15px | Card subheadings, list category headers |
| **BodyLarge**| 16px | 24px | Regular (400) | -0.1px | Primary body paragraphs, input field text |
| **Body** | 14px | 20px | Regular (400) | 0px | Secondary descriptions, lesson previews, reviews |
| **Caption** | 12px | 16px | Medium (500) | +0.1px | Timestamps, durations, helper text, footnote |
| **Overline** | 10px | 14px | Bold (700) | +0.8px | Uppercase kicker badges ("FEATURED", "LIVE") |

---

## 2. Font Pairing & Typographic Harmony
- **Heading / Display**: Tight letter spacing (`-0.5px` to `-0.8px`) with strong optical contrast (`Bold 700` / `SemiBold 600`).
- **Body / Content**: Generous line-height (`1.4x` to `1.5x` font size), neutral tracking (`0` to `-0.1px`), highly readable neutral geometry.
- **Fallback Guarantee**: Always pair `fontFamily` with cross-platform `fontWeight` fallback so typography renders flawlessly across iOS, Android, and web without font flash.

---

## 3. Layout Balance (Optical Weight & Grid Alignment)
- **8-Point Spatial Grid**: All paddings, margins, and component dimensions adhere to multiples of 4 and 8 (`4, 8, 12, 16, 20, 24, 32, 40, 48`).
- **Visual Weight Distribution**: Heavy elements (e.g., video thumbnails, bold cards) are counter-balanced with airy, high-contrast labels and concise metrics.
- **Optical Centering**: Icons, text badges, and action chevrons must maintain vertical alignment using flexbox `alignItems: 'center'`.

---

## 4. Color Theory (The 60-30-10 Rule)
A disciplined palette prevents visual noise and directs focus to student actions:

1. **60% Dominant Canvas (Neutral)**:
   - Dark: `#090D16` (Deep Obsidian)
   - Light: `#F8FAFC` (Clean Pearl White)
2. **30% Structural Surfaces (Cards, Modals, Inputs)**:
   - Dark: `#111827` (Card Surface), `#1E293B` (Elevated Surface) with 1px border `#1F2937`
   - Light: `#FFFFFF` (Card Surface), `#F1F5F9` (Elevated Surface) with 1px border `#E2E8F0`
3. **10% Intentional Accent (Brand Primary)**:
   - High-energy primary color (`clientConfig.colors.primary`).
   - Reserved strictly for Primary CTA buttons, active tab indicators, and hero badges.
4. **Semantic Status Spectrum**:
   - Success: `#10B981` (with 12% tint background `rgba(16, 185, 129, 0.12)`)
   - Warning: `#F59E0B` (with 12% tint background `rgba(245, 158, 11, 0.12)`)
   - Error: `#EF4444` (with 12% tint background `rgba(239, 68, 68, 0.12)`)
   - Info: `#38BDF8` (with 12% tint background `rgba(56, 189, 248, 0.12)`)

---

## 5. Repetition & Visual Rhythm
Consistency creates trust and intuitive muscle memory for students:
- **Standardized Border Radii**:
  - Small elements (Tags, badges): `radius.sm` (8px)
  - Interactive elements (Inputs, Buttons, List Items): `radius.lg` (16px)
  - Structural cards & modals: `radius.xl` (20px) or `radius['2xl']` (24px)
  - Circular buttons & avatars: `radius.full` (9999px)
- **Uniform Icon Scale**:
  - Micro / Chevrons: `14px`
  - Inline input / button icons: `18px`
  - Tile / card badges: `22px`
  - Navigation / Hero actions: `24px`
- **Uniform Motion**:
  - Layout entries: `FadeInDown.duration(500)` with progressive `delay(100 * index)`
  - Press feedback: `Haptics.impactAsync(Light)` with opacity/scale feedback

---

## 6. Contrast (Accessible & Functional)
- **WCAG AAA Compliance**: Primary text on dark background has a contrast ratio > 14:1. Primary text on light background has a contrast ratio > 15:1.
- **Hierarchy through Contrast**:
  - `colors.text` (`#F8FAFC` / `#0F172A`): Primary headings and active numbers.
  - `colors.textMuted` (`#94A3B8` / `#64748B`): Secondary subtitles and helper labels.
- **Action Contrast**:
  - Primary button: Solid filled background with `colors.textInverse` (maximum contrast).
  - Secondary button: Subtle border (`colors.border`) with `colors.text` (never competes with primary action).

---

## 7. Negative Space (Intentional Breathing Room)
Whitespace is an active design element, not empty area:
- **Micro Space (`4px - 8px`)**: Between badge icon and badge text; between title and subhead.
- **Component Padding (`16px - 20px`)**: Inside cards, input wrappers, and modals.
- **Macro Space (`24px - 32px`)**: Vertical margins separating distinct course sections, hero banners, and category carousels.
- Content must never feel cramped or touching viewport boundaries.

---

## 8. Theme Implementation Reference
All components use the centralized `useTheme()` hook:
```typescript
import { useTheme } from '../theme';

export function MyComponent() {
  const { colors, typography, spacing, radius, isDark } = useTheme();

  return (
    <View style={{ backgroundColor: colors.surface, padding: spacing.base, borderRadius: radius.xl }}>
      <Text style={[typography.overline, { color: colors.primary }]}>NEW BATCH</Text>
      <Text style={[typography.title, { color: colors.text, marginTop: spacing.xs }]}>
        Course Title
      </Text>
      <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
        Description text with generous breathing room.
      </Text>
    </View>
  );
}
```
