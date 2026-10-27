# Manual Attack Verification Checklist

This checklist documents specific test vectors to verify system defenses against common attack patterns. Each test scenario specifies the attack vector, execution method, and expected safe result.

---

| # | Attack Scenario | Threat Vector | Execution Method | Expected Safe Result | Status |
|---|-----------------|---------------|------------------|----------------------|:------:|
| 1 | **Self-Enrollment Forgery** | Direct client write | Attempt to execute `setDoc(doc(db, 'enrollments', uid + '_' + courseId), { status: 'active' })` | **DENIED**: Firestore Security Rules block write with `PERMISSION_DENIED`. | **PASS** |
| 2 | **Price Tampering** | Price manipulation | Send `{ courseId: 'c1', amount: 1 }` to `createOrder` callable | **IGNORED**: Server ignores client `amount` and recalculates exact price from Firestore `courses/c1`. | **PASS** |
| 3 | **Coupon Brute-Force** | Rapid enumeration | Call `validateCoupon` > 5 times in 60 seconds with arbitrary codes | **BLOCKED**: Server rate-limiting throws `resource-exhausted` (429). | **PASS** |
| 4 | **Forged HMAC Signature** | Payment verification bypass | Invoke `verifyPayment` with crafted signature `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | **DENIED**: `crypto.timingSafeEqual` fails, returns `failed_precondition` without granting enrollment. | **PASS** |
| 5 | **Payment Replay Attack** | Double fulfillment | Re-send identical valid `verifyPayment` payload twice consecutively | **SAFE**: Transaction idempotency recognizes existing paid order, returns success with existing enrollment, no duplicate doc created. | **PASS** |
| 6 | **Quiz Answer Snooping** | Direct collection read | Query `/quizzes/{quizId}/questions` directly from client Firestore SDK | **DENIED**: Firestore rules restrict question bank reads to admin. | **PASS** |
| 7 | **Admin Route Hijack** | Non-admin dashboard visit | Sign in with student account and navigate to Admin panel URL | **DENIED**: AuthContext checks `getIdTokenResult().claims.admin`, signs out user, redirects to Login with access denied message. | **PASS** |
| 8 | **Privilege Escalation** | Profile doc tampering | Call `updateDoc(doc(db, 'users', uid), { role: 'admin', isBlocked: false })` | **DENIED**: Firestore rules reject changes to sensitive profile fields. | **PASS** |
| 9 | **Study Material Theft** | Direct storage download | Unenrolled user attempts to download PDF from `/materials/{courseId}/...` | **DENIED**: Storage rules check `firestore.exists(enrollments/uid_courseId)` and reject request with HTTP 403. | **PASS** |
| 10 | **Account Purge Compliance** | User data persistence | User calls `deleteAccount` callable | **PURGED**: Cloud Function deletes user document, reviews, notifications, watch progress, and quiz attempts; anonymizes orders. | **PASS** |
| 11 | **Clickjacking on Admin** | Iframe embedding | Embed Admin web app URL inside external `<iframe>` | **BLOCKED**: `X-Frame-Options: SAMEORIGIN` and CSP `frame-ancestors` block iframe rendering. | **PASS** |
| 12 | **Replay on Financial API** | App Check token reuse | Capture and replay Firebase App Check token on `createOrder` | **BLOCKED**: `consumeAppCheckToken: true` consumes token on first use; subsequent requests fail with 401. | **PASS** |

---

## Instructions for Red Team / Penetration Testers
1. Ensure tests are executed in a staging Firebase project or against local Firebase emulators.
2. Verify all test vectors through automated integration suites:
   ```bash
   npm run test
   npm run check
   ```
3. Report any deviation from expected behavior immediately to the platform security lead.
