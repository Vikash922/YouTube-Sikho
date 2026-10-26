import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../lib';

/**
 * Daily Maintenance Job:
 * - Purges expired rate-limit tracking documents older than 24 hours
 * - Purges idempotent processedEvents older than 30 days
 */
export const dailyMaintenance = onSchedule(
  {
    schedule: 'every 24 hours',
    region: REGION,
    timeZone: 'Asia/Kolkata',
  },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    console.log('[Daily Maintenance] Starting scheduled purge of expired temporary data...');

    // 1. Purge expired rate limits
    try {
      const expiredLimitsSnap = await db
        .collection('rateLimits')
        .where('resetAtMs', '<', oneDayAgo)
        .limit(400)
        .get();

      if (!expiredLimitsSnap.empty) {
        const batch = db.batch();
        expiredLimitsSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`[Daily Maintenance] Cleaned ${expiredLimitsSnap.size} expired rateLimits.`);
      }
    } catch (err: any) {
      console.warn('[Daily Maintenance] Error pruning rateLimits:', err.message);
    }

    // 2. Purge stale processed events
    try {
      const staleEventsSnap = await db
        .collection('processedEvents')
        .where('processedAt', '<', new Date(thirtyDaysAgo))
        .limit(400)
        .get();

      if (!staleEventsSnap.empty) {
        const batch = db.batch();
        staleEventsSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`[Daily Maintenance] Cleaned ${staleEventsSnap.size} stale processedEvents.`);
      }
    } catch (err: any) {
      console.warn('[Daily Maintenance] Error pruning processedEvents:', err.message);
    }

    console.log('[Daily Maintenance] Maintenance run complete.');
  }
);
