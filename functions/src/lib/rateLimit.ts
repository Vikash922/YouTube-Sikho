import * as admin from 'firebase-admin';
import { fail } from './errors';

/**
 * Server-authoritative rate limiting backed by Firestore rateLimits collection.
 * 
 * @param uid User ID or IP address
 * @param key Action namespace (e.g., 'submit_quiz', 'create_order')
 * @param max Maximum allowed requests within the window
 * @param windowSeconds Window length in seconds
 */
export async function rateLimit(
  uid: string,
  key: string,
  max: number,
  windowSeconds: number,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<void> {
  const docId = `${uid}_${key}`.replace(/[\/\s]/g, '_');
  const ref = db.collection('rateLimits').doc(docId);
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) {
      t.set(ref, {
        uid,
        key,
        count: 1,
        resetAtMs: now + windowMs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const data = snap.data()!;
    const resetAtMs = data.resetAtMs || 0;

    if (now > resetAtMs) {
      // Window expired, reset counter
      t.set(ref, {
        uid,
        key,
        count: 1,
        resetAtMs: now + windowMs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Within window
      if (data.count >= max) {
        const retryAfterSec = Math.max(1, Math.ceil((resetAtMs - now) / 1000));
        fail(
          'resource-exhausted',
          `Too many requests for '${key}'. Please wait ${retryAfterSec} seconds before trying again.`
        );
      }
      t.update(ref, {
        count: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
}
