# Automated Testing & Quality Assurance Guide

This project features a comprehensive, zero-false-assurance quality pipeline covering root mobile app, web admin console, Cloud Functions, and live Firebase emulators.

---

## 1. Master Quality Verification Pipeline

Run the master verification pipeline that executes all 15 stages across the entire monorepo in sequence:
```bash
npm run verify
```
This script stops at the first failure and generates a structured summary table.

### Individual Verification Commands

| Command | Project / Scope | What It Verifies |
| :--- | :--- | :--- |
| `npm run verify` | Whole Monorepo | Executes all 15 quality checks across Root, Admin, Functions, and live Rules emulators. |
| `npm run typecheck` | Root App | Strict TypeScript compilation (`tsc --noEmit`). |
| `npm run lint` | Root App | ESLint static analysis with zero warnings/errors. |
| `npm run test:rules` | Firebase Rules | Live emulator tests against Firestore & Storage with `@firebase/rules-unit-testing`. |
| `npm --prefix functions test` | Cloud Functions | 20 server unit tests for order creation, payments, webhooks, and enrollment. |
| `npm --prefix admin run build` | Web Admin | Production Vite build with source maps and debugger statements dropped. |
| `npm run export:android` | Root App | Validates production React Native Android bundle generation. |
| `npm run doctor` | Root App | Expo Doctor 20-point native dependency compatibility check. |
| `npm run lint:tokens` | Design System | Validates zero hardcoded hex colors; ensures 100% theme token adoption. |
| `npm run lint:contrast` | Accessibility | WCAG AA/AAA automated color contrast verification. |
| `npm run lint:i18n` | Localization | Dual-language dictionary parity between English and Hindi keys. |
| `npm run lint:secrets` | Security | Pre-commit git secret scanner blocking API keys, tokens, or keystores. |

---

## 2. What Each Suite Verifies

### A. WCAG Contrast Test (`scripts/test-contrast.js`)
- **Primary Text on Background**: Asserts `>= 4.5:1` ratio in both Light (`#0F172A` on `#F8FAFC`) and Dark (`#E8EDF5` on `#0B1020`).
- **Surface & Card Text**: Asserts `>= 4.5:1` ratio for body text on `#151B2E` (Dark) and `#FFFFFF` (Light).
- **Muted Text**: Asserts `>= 4.5:1` on cards (`#475569` Light, `#A5B1C5` Dark) so secondary labels remain crisp and readable in direct sunlight.
- **Accent Amber Badge**: Strictly asserts dark text (`#1F2937`) on Amber `#F59E0B`. Fails if white text is ever paired with Amber (which causes illegibility at ~1.8:1).
- **Multi-Brand Immunity**: Automatically iterates over 4 client primary colors (`#4F46E5`, `#059669`, `#E11D48`, `#0284C7`) to verify the dynamic 50-900 tonal scale generator works for any white-label client.

### B. No-Hardcoded-Hex Scan (`scripts/test-no-hardcoded-colors.js`)
- Recursively inspects every component in `src/components/` and screen in `app/`.
- Fails if an engineer writes `backgroundColor: '#1E293B'` or `color: '#FFF'` directly into inline styles or stylesheets.
- Ensures white-label rebranding by client only requires editing `src/config/client.config.ts`.

### C. Touch Target & Accessibility Audit (`scripts/test-accessibility.js`)
- Asserts that all Buttons, Inputs, Country Pickers, TabBar items, and Modal actions maintain a minimum **48px touch target** (`minHeight: 48` or `hitSlop: 12`).
- Prevents touch target shrinkage on small screens (down to 360px viewport width).

---

## 3. Maestro E2E Testing

Flows are located in `e2e/flows/`:
1. **`smoke.yaml`**: App launch from Splash to Login with heading assertions.
2. **`auth.yaml`**: Phone number entry, OTP navigation, auto-focus verification.
3. **`tabs.yaml`**: Navigating through Home, Courses, My Learning, Live, and Profile.
4. **`theme.yaml`**: Toggling Light, Dark, and System appearance preferences.

To run with Maestro CLI:
```bash
maestro test e2e/flows/smoke.yaml
maestro test e2e/flows/auth.yaml
maestro test e2e/flows/tabs.yaml
maestro test e2e/flows/theme.yaml
```

---

## 4. Phase 3: Video, Payment & Security Verification

### A. Cloud Functions Automated Tests (Jest / Emulator)
Tests defined in `functions/__tests__/`:
1. **`createOrder` Server Pricing Guard**:
   - Submitting a forged low price (e.g., `amount: 10`) is ignored; final amount strictly equals `course.discountPrice || course.price`.
   - Expired, depleted, or inactive coupons are rejected with a 400 error.
   - Rate limiting triggers when exceeding 5 order attempts per minute.
2. **`verifyPayment` Idempotency & Cryptography**:
   - Rejects forged or mismatched HMAC signatures.
   - Accepts valid signatures and atomically creates `/enrollments/{uid_courseId}`.
   - Subsequent calls with identical payment parameters return success without duplicate enrollment documents.
3. **`razorpayWebhook` Backup Processor**:
   - Rejects payloads with invalid `X-Razorpay-Signature`.
   - Handles parallel or duplicate `payment.captured` events idempotently.
4. **`getVideoToken` Access Control**:
   - Denies non-enrolled students requesting paid lesson playback.
   - Allows enrolled students and lessons marked with `isFreePreview: true`.
   - Returns valid playback session and video ID.
5. **`refundPayment` Access Revocation**:
   - Calls Razorpay Refund API and immediately deletes `/enrollments/{uid_courseId}` document upon confirmation.

### B. Live Emulator Rules Suite (`npm run test:rules`)
Executed against local Firestore (port 8080) and Storage (port 9199) emulators with `@firebase/rules-unit-testing`:
- **Users PII & Field Protection**: Asserts students can read/update allowed profile fields (`name`, `phone`, `language`), but CANNOT modify protected fields (`role`, `isBlocked`, `coinBalance`) or inspect another student's profile.
- **Courses & Sections**: Unauthenticated callers can only read published courses. Unpublished drafts and private video media documents are completely blocked to students.
- **Enrollments & Orders**: Students can read only their own enrollments and orders; direct client writes, price tampers, and status updates are rejected.
- **Reviews**: Only enrolled students who completed the prerequisite coursework can submit course reviews.
- **Support Tickets**: Students can create `open` tickets and read their own history; unauthorized status elevation to `resolved` is blocked.
- **Storage Rules**: Validates student avatar uploads (<= 5MB image types) while denying uploads to course materials or banner directories.

### C. Mobile Player & Checkout Tests
- **Video Player**:
  - Watermark phone number rendering and periodic positional shift.
  - Auto-retry with refreshed token when HLS manifest returns 403 / token expired.
  - Progress debouncer saving every 10 seconds to Firestore without looping network calls.
- **Checkout & Coupon**:
  - Pay button disabled and displaying spinner during in-flight order creation to prevent double-charging.
  - Live coupon validation correctly calculates flat and percentage discounts.

---

## 5. Real Device Manual Testing Protocol

Execute the following checklist on a physical Android/iOS phone:
1. **Test Payment Flow (Razorpay TEST Mode)**:
   - Tap course -> Tap **Buy Now** -> Apply valid coupon (`SIKHO50`) -> Confirm price updates.
   - Tap **Pay** -> Complete checkout with test UPI handle `success@razorpay`.
   - Confirm immediate success celebration screen and course unlock without pull-to-refresh.
2. **Webhook Resilience (Kill App Mid-Payment)**:
   - Initiate checkout on physical phone -> Once payment succeeds in Razorpay modal, immediately force-kill the app before the success screen renders.
   - Reopen app -> Verify the background webhook caught the event and the course is fully unlocked in **My Learning**.
3. **Anti-Piracy & DRM Checks**:
   - Open a video lesson -> Attempt an Android screenshot (Power + Vol Down) -> Confirm OS displays "Can't take screenshot due to security policy".
   - Start an Android screen recorder -> Confirm recorded video shows a black screen or recording is blocked.
   - Verify student's registered phone number floating as a transparent watermark over the video.
4. **Token Expiry & Free Preview**:
   - Log out of app -> Open course detail -> Tap Lesson 1 (Free Preview) -> Verify it streams without prompting for login or payment.
   - Tap Lesson 2 (Locked) -> Verify playback is blocked with padlock and prompts to buy course.
5. **Refund & Access Revocation**:
   - In Admin Portal Orders page, click **Refund** on the test order.
   - Refresh mobile app -> Verify course immediately locks and moves out of active enrolled courses.

---

## 6. Phase 4: Live Classes, Quizzes & Extras Verification

### A. Firestore Security Rules Suite (`scripts/test-firestore-rules.js`)
- Runs 56 behavioral authorization scenarios covering 17 collections:
  - `liveClasses`, `messages`, `quizzes`, `questions`, `quizResults`, `userNotifications`, `tickets`, `faqs`, `materials`.
- **Anti-Cheat Lock**: Validates that student clients cannot read the `questions` subcollection or forge `quizResults` documents directly.
- **Privacy Isolation**: Confirms student notifications, tickets, and PII are strictly isolated to document owners.
- **Expected Result**: `56 PASSED | 0 FAILED (TOTAL: 56)`.

### B. Cloud Functions Test Suite (`npm --prefix functions test`)
- Runs 21 end-to-end backend function tests across 9 test suites:
  - `createOrder`: Server-side price calculation, coupon validation (expiry, usage limits).
  - `verifyPayment` & `razorpayWebhook`: Cryptographic HMAC signatures, idempotency, parallel webhook events.
  - `getLessonPlayback`: Playback authorization (free preview vs enrolled), session tracking, and private media resolution.
  - `refundPayment` & `manageEnrollment`: Immediate access revocation and manual enroll/revoke.
  - `sendNotification`: Multi-audience targeting (`all`, `course`, `user`), FCM multicast, user feed population.
  - `submitQuiz`: Server scoring, negative marking penalties, and retry prevention.
  - `deleteAccount`: Google Play Store compliant complete data wipe (progress, notifications, user doc, auth).
- **Expected Result**: `21 PASSED | 0 FAILED (TOTAL: 21)`.

