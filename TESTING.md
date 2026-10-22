# Automated Testing & Quality Assurance Guide

This project includes a strict, automated verification pipeline designed to catch accessibility violations, color regressions, and touch ergonomics issues before runtime.

---

## 1. Test Commands

Run the full automated check suite in sequence:
```bash
npm run check
```
Or run individual verification commands:

| Command | Suite | What It Catches | Expected Result |
| :--- | :--- | :--- | :--- |
| `npm run test:contrast` | WCAG AA/AAA Suite | Detects any foreground/background color pair with a contrast ratio below **4.5:1** (normal text) or **3.0:1** (large text/borders). Tests 4 client brand themes in both Light and Dark modes. | `✓ 58 contrast checks passed (0 failures)` |
| `npm run lint` | Token Compliance Scan | Scans all `.tsx` and `.ts` files in `src/components/` and `app/`. Fails if any arbitrary hex colors (`#...`) are hardcoded outside `src/theme/`. | `✓ All UI components exclusively consume theme tokens` |
| `npm run test` | Full QA Suite | Runs all automated verification suites (contrast, token compliance, accessibility). | `✓ Total Suites: 3 \| Passed: 3 \| Failed: 0` |
| `npm run doctor` | Expo Doctor | Checks for incompatible native dependencies or mismatched SDK versions. | `✓ Expo Doctor: No issues detected` |
| `npm run e2e` | Maestro E2E Flows | End-to-end automation flows in `e2e/flows/` for smoke, authentication, tab switching, and theme changes. | `Maestro flows pass` |

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
   - Denies non-enrolled students requesting paid lesson HLS tokens.
   - Allows enrolled students and lessons marked with `isFreePreview: true`.
   - Returns valid Bunny signed token with 3600s expiration.
5. **`refundPayment` Access Revocation**:
   - Calls Razorpay Refund API and immediately deletes `/enrollments/{uid_courseId}` document upon confirmation.

### B. Firestore Security Rules Suite (`scripts/test-firestore-rules.js`)
- **Enrollments Protection**:
  - `allow write: if false;` (Writable ONLY by Cloud Functions / Admin SDK).
  - Students can read only their own enrollments (`resource.data.uid == request.auth.uid`).
- **Orders Protection**:
  - `allow write: if false;` (Created and updated exclusively by Cloud Functions).
  - Students can read only their own orders.
- **Coupons Protection**:
  - Students can read active coupons for checkout preview, but CANNOT write, edit, or reset usage counters.
- **Progress Protection**:
  - Students can update only their own progress document (`uid == request.auth.uid`).

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

### B. Cloud Functions Test Suite (`scripts/test-cloud-functions.js`)
- Runs 21 end-to-end backend function tests across 9 test suites:
  - `createOrder`: Server-side price calculation, coupon validation (expiry, usage limits).
  - `verifyPayment` & `razorpayWebhook`: Cryptographic HMAC signatures, idempotency, parallel webhook events.
  - `getVideoToken`: Bunny Stream signed playback token authorization (free preview vs enrolled).
  - `refundPayment` & `manageEnrollment`: Immediate access revocation and manual enroll/revoke.
  - `sendNotification`: Multi-audience targeting (`all`, `course`, `user`), FCM multicast, user feed population.
  - `submitQuiz`: Server scoring, negative marking penalties, and retry prevention.
  - `deleteAccount`: Google Play Store compliant complete data wipe (progress, notifications, user doc, auth).
- **Expected Result**: `21 PASSED | 0 FAILED (TOTAL: 21)`.

