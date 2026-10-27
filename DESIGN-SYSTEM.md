# White-Label Academy Design System Architecture
### Distinctive, Premium EdTech Design & Engineering Specification

---

## 0. Design Philosophy & The 5 Hero Moments

Premium design is defined by **restraint + a few memorable moments**. Rather than scattering distracting gradients or animations everywhere, the app remains calm, focused, and fast.

We define **5 "Hero Moments"** that receive rich, expressive motion and bold tactile character:

| Hero Moment | Screen / Interaction | Expressive Character |
| :--- | :--- | :--- |
| **1. Ambient Splash Hand-Off** | `app/index.tsx` | Smooth logo scale + ambient radial gradient bloom that gracefully fades into the login screen without flash or jarring layout shift. |
| **2. OTP Verification Success** | `app/(auth)/otp.tsx` | Auto-advancing inputs with subtle shake physics on error, culminating in an animated green checkmark tick + haptic notification upon successful verification. |
| **3. Fluid Tab Bar Switch** | `app/(tabs)/_layout.tsx` | Floating pill tab bar with a sliding spring indicator that travels seamlessly between tabs and scale-pops the active Lucide vector icon. |
| **4. Hero Card Press Feedback** | `app/(tabs)/index.tsx` | Asymmetric corner geometry (`28/28/28/8`) with subtle 2-shade linear gradient that springs to `0.97` scale with tactile haptic feedback on touch. |
| **5. Engaging Empty States** | `courses.tsx`, `learning.tsx`, `live.tsx` | Spacious vector-styled empty states with soft tinted icon circles, one-line conversational copy, and an immediate primary action. |

---

## 1. Core Principles

- **Text Hierarchy**: Maximum 3 type levels per screen (Title/Display, Body, Caption). One large bold heading per screen for visual anchoring.
- **Layout Balance**: 8-point spatial grid, 20px screen side margins, left-aligned content, varied section density (avoiding monotonous identical card stacks).
- **Repetition**: Unified card, button, radius, shadow, and icon design language across all screens.
- **Contrast**: WCAG AA compliant text contrast (>= 4.5:1 for normal text, >= 3.0:1 for large text/icons/borders).
- **Negative Space**: 24px-32px macro gaps between distinct content sections; content never feels crowded.
- **Ergonomics**: Minimum 48px touch targets, primary actions located in the thumb zone, one main action per screen.

---

## 2. Design Tokens

### Color System (60-30-10 Rule)
Every color serves one specific job:
- **60% Dominant Base**:
  - Light: `#F8FAFC`
  - Dark: `#0B1020` (No pure black backgrounds; deep obsidian calm canvas)
- **30% Secondary Structure**:
  - Light Surface: `#FFFFFF` | Elevated Surface: `#F1F5F9` | Border: `#E2E8F0`
  - Dark Surface: `#151B2E` | Elevated Surface: `#1C2440` (Tonal Level 3) | Border: `#26304A`
- **10% Intentional Accent**:
  - Primary Brand: Indigo `#4F46E5` (Shade 500) paired with `#FFFFFF` text.
  - Subtle Primary Gradient: `['#4F46E5', '#4338CA']` for hero areas and main CTAs.
  - Accent: Amber `#F59E0B` **strictly paired with dark text (`#1F2937`)**, never white (which fails contrast at 1.8:1).
  - Desaturation: Primary and accent saturation reduced by 10-15% in dark mode to prevent retinal fatigue.
- **Semantic Colors** (Never reused for decoration):
  - Success: `#16A34A` (Background: `rgba(22, 163, 74, 0.14)`)
  - Warning: `#F59E0B` (Background: `rgba(245, 158, 11, 0.14)`)
  - Error: `#DC2626` (Background: `rgba(220, 38, 38, 0.14)`)
  - Info: `#2563EB` (Background: `rgba(37, 99, 235, 0.14)`)

### Typography (Poppins + Inter)
Loaded via Expo font system with strict tabular number support for prices, timers, and progress stats:

| Token | Size / LineHeight | Weight | Font Family | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | 32 / 38 | Bold (700) | Poppins | Single hero screen heading, large numbers (tracking: -0.6) |
| **Title** | 24 / 30 | SemiBold (600) | Poppins | Section titles, modal titles (tracking: -0.4) |
| **Heading** | 18 / 24 | SemiBold (600) | Poppins | Card headings, button labels (tracking: -0.2) |
| **Body** | 16 / 24 | Regular (400) | Inter | Primary readable paragraphs, input values |
| **Small** | 14 / 20 | Regular (400) | Inter | Secondary descriptions, mentor names |
| **Caption** | 12 / 16 | Medium (500) | Inter | Badges, timestamps, footers |
| **Tabular** | — | — | Inter/Poppins | `fontVariant: ['tabular-nums']` for counters, timers, prices |

### Spacing (8pt Grid)
- `xs: 4px` | `sm: 8px` | `md: 12px` | `base: 16px` | `screen: 20px` (Screen margin) | `lg: 24px` | `xl: 32px` | `2xl: 48px`

### Shape Language (Variety with Purpose)
- **Inputs & Buttons**: `radius: 14px` (tactile, friendly ergonomics).
- **Cards**: `radius: 20px` (smooth structural containers).
- **Bottom Sheets & Modals**: `radius: 28px` (organic, generous framing).
- **Hero Featured Cards**: Asymmetric corners (`28, 28, 28, 8`) to create an unmistakable brand anchor.
- **Chips, Avatars, Badges, TabBar**: `radius.full: 9999px` (pill geometry).

### Elevation
- **Light Mode**: Elevation 1/2/3 soft low-opacity drop shadows (`#0F172A`, 5%-12% opacity).
- **Dark Mode**: **ZERO drop shadows**. Contrast and structural depth are established exclusively via `#151B2E` / `#1C2440` surface levels and `#26304A` 1px borders.

### Icons
- Lucide React Native vector icons: `24px` (or `18-22px` for inline controls), strokeWidth **1.75**, uniform style throughout.

---

## 3. Motion System (Spring-Based Physics)

Strictly 2 physics presets:
- **`presets.snappy`** (`damping: 15, stiffness: 350`): Buttons, toggles, badges, chips, tactile press feedback.
- **`presets.smooth`** (`damping: 20, stiffness: 180`): Screens, modal sheets, cards, sliding tab bar indicator.
- **Press Scale**: Springs to `0.97` scale with light haptic feedback.
- **Accessibility**: Automatically checks `useReducedMotion()`. When enabled, spatial movements are replaced by a direct 150ms opacity fade.

---

## 4. Component List & State Colors

| Component | Default State | Pressed State | Disabled State | Error State |
| :--- | :--- | :--- | :--- | :--- |
| **Button** | Primary Gradient (`#4F46E5` -> `#4338CA`) | `0.97` scale, `#4338CA` | Muted surface, `textMuted` | Red `#DC2626` (Destructive variant) |
| **Input** | Surface `#FFFFFF` / `#151B2E`, 1px border | Focus ring `#4F46E5` 1.5px | Dimmed background, disabled cursor | Red `#DC2626` border + error helper text |
| **Card** | Surface with 1px border `#26304A` | `0.98` scale (if interactive) | Flat opacity | Red alert border |
| **TabBar** | Floating pill, transparent item | Primary glow pill indicator | — | — |
| **Badge** | 14% tint background | — | — | Red tint with `#DC2626` text |

---

## 5. Do's and Don'ts

| Do | Don't |
| :--- | :--- |
| **DO** consume `useTheme()` tokens for every color, radius, and font. | **DON'T** write raw hex codes (`#...`) in screens or components. |
| **DO** pair dark text (`#1F2937`) with Amber `#F59E0B` badges. | **DON'T** put white text on amber (it fails contrast at 1.8:1). |
| **DO** maintain 20px horizontal margins on all screens. | **DON'T** allow cards or inputs to touch the display edges. |
| **DO** keep touch targets at least 48px for mobile usability. | **DON'T** create tiny tap targets below 44px. |
| **DO** limit screens to maximum 3 typography levels. | **DON'T** stack multiple font sizes and weights arbitrarily. |
| **DO** use 1px borders in dark mode for crisp separation. | **DON'T** use drop-shadows in dark mode. |
| **DO** use Lucide vector icons with strokeWidth 1.75. | **DON'T** use emojis as functional UI icons. |

---

## 6. Phase 3: Video Player Design & Ergonomics

### A. Custom Player HUD Overlay
- **Aspect Ratio**: 16:9 widescreen canvas anchored to the top of the detail screen, with hardware-accelerated landscape rotation.
- **Scrim Gradient**: Top and bottom radial/linear dark gradient (`rgba(11, 16, 32, 0.75)` -> `transparent`) to ensure controls remain 100% legible over bright video frames.
- **Controls**:
  - Center Play/Pause button: 56px circular glass pill (`rgba(255, 255, 255, 0.15)`) with 1-point spring feedback on press.
  - Double-Tap Seek: Left half seek -10s, right half seek +10s with an animated ripple chevron.
  - Scrub Bar: 4px accent line expanding to 8px on active touch scrub, with current position / total duration displayed in tabular numerals (`14:20 / 28:15`).
  - Speed Selector Sheet: Bottom sheet options (0.5x, 0.75x, 1.0x Normal, 1.25x, 1.5x, 2.0x) with active checkmark.

### B. Anti-Piracy Watermark & Screen Security
- **Watermark Overlay**: Displays the student's phone number and masked UID in 30% opacity text, dynamically shifting location across the screen every 20 seconds to deter handheld camera recording.
- **Hardware Capture Blocker**: Native `expo-screen-capture` flag active during player lifecycle to block OS screenshots and screen recorders.

### C. Locked vs. Unlocked Lesson Hierarchy
- **Free Preview Lessons**: Play button icon with green `#16A34A` outline and "Free Preview" pill.
- **Locked Paid Lessons**: Padlock icon with amber `#F59E0B` stroke, dimmed title (60% opacity), and direct tap-to-checkout trigger.
- **Active Lesson**: Highlighted surface card with brand border `#4F46E5` and pulsating equalizer indicator.

---

## 7. Phase 3: Checkout & Payment Flow Design

### A. Order Summary & Price Breakdown
- **60-30-10 Composition**: Clean background `#0B1020` / `#F8FAFC`, surface summary card `#151B2E` / `#FFFFFF` with 1px border.
- **Price Breakdown**:
  - Original Course Price: Strikethrough caption text `#94A3B8`.
  - Discounted Course Price: Large bold display text.
  - Applied Coupon Savings: Highlighted in green `#16A34A` with minus prefix.
  - Final Amount Payable: Prominent bold typography in thumb zone.

### B. Live Coupon Input
- Integrated input pill with `Apply` action button.
- Instant validation state:
  - Valid: Green border `#16A34A`, checkmark icon, and celebratory discount badge.
  - Invalid / Expired: Red border `#DC2626`, alert icon, and human-readable error caption.

### C. Sticky Checkout Bar
- Fixed bottom thumb zone bar with safe area padding.
- Main Action Button: Primary brand gradient button with Razorpay shield badge and price summary. Disabled and showing spinner while order creation/signature verification is in-flight to prevent duplicate transactions.

### D. Celebration Hero Moment (Payment Success)
- Rich Lottie confetti / green tick animation.
- Success haptic notification pattern (`Haptics.notificationAsync(Success)`).
- Friendly positive microcopy: "You're enrolled! Let's start learning."
- Direct single main CTA: "Go to Course".

---

## 8. Phase 4: Live Classes, Notifications, Quizzes & Extras

### A. Live Classes Interface
- **Hero Pulse Moment**: Red pulsating dot badge with "LIVE NOW" semantic alert on active broadcast cards.
- **Provider Abstraction**: Extensible `LiveStreamProvider` architecture initialized with `YouTubeLiveProvider` and ready for 100ms / ZegoCloud RTC engines.
- **Live Classroom HUD**:
  - 16:9 video canvas with floating viewer counter chip in tabular numerals.
  - Real-time live chat feed with auto-scroll and 300-character rate limit guards.
  - Interactive student reaction controls: "Raise Hand" indicator and teacher broadcast pinned messages.
  - Scheduled classes feature live MM:SS countdown timers and one-tap "Remind Me" notifications.

### B. Notification Center
- **Visual Rhythm**: Top app bar notification bell with real-time unread dot badge.
- **Notification Feed**:
  - Filter tabs: "All", "Live Classes", "Announcements", "Tests".
  - Unread items marked with an accent dot and elevated card surface.
  - Mark All Read and swipe-to-delete dismiss actions.
  - Deep-link routing on tap (direct navigation to live classes, quizzes, or course updates).

### C. Quizzes & Tests Experience
- **Server Evaluation & Anti-Cheat**: Questions subcollection and `quizResults` are locked against student client tampering. Submissions are strictly scored via `submitQuiz` Cloud Function with configured negative marking penalties.
- **Exam HUD**:
  - Persistent sticky top bar with tabular countdown timer (`MM:SS`) turning warning amber under 2 minutes.
  - Horizontal question palette chip bar indicating Answered, Unanswered, and Marked-for-Review questions.
  - 4 option cards with bold letter chips (A, B, C, D) and spring selection states.
  - Auto-submission safeguard triggered automatically when the timer reaches 00:00.
  - Post-submission result breakdown with accuracy score, time spent, and detailed question-by-question explanations.

### D. System Extras & Play Store Compliance
- **Account Deletion Flow**: In strict adherence with Google Play Store User Data safety mandates, a dedicated Danger Zone in Settings allows students to permanently delete their account, enrollments, and personal records via the `deleteAccount` Cloud Function.
- **Study Materials & PDF Notes**: Downloadable curated PDF summaries, formulas, and cheatsheets with file-type tags and direct reader links.
- **In-App Legal Center**: Comprehensive, accessible legal reader covering Privacy Policy, Terms of Service, and Refund & Cancellation policies.
- **Completion Certificate**: Elegant gold-foil bordered achievement certificate featuring student name, verification ID, and native download & share capabilities.

