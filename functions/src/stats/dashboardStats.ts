import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { REGION } from '../lib/options';

function getTodayKey(): string {
  const d = new Date();
  return d.toISOString().split('T')[0]; // yyyy-mm-dd
}

/**
 * Trigger: On Order Status Changes (paid / refunded)
 * Maintains live counters in stats/dashboard and daily buckets in stats/daily/{yyyy-mm-dd}
 */
export const onOrderStatsUpdate = onDocumentUpdated(
  {
    document: 'orders/{orderId}',
    region: REGION,
  },
  async (event) => {
    const before = event.data?.before.data() || {};
    const after = event.data?.after.data() || {};

    const beforeStatus = before.status;
    const afterStatus = after.status;

    if (beforeStatus === afterStatus) return;

    const db = admin.firestore();
    const todayKey = getTodayKey();
    const dashboardRef = db.doc('stats/dashboard');
    const dailyRef = db.doc(`stats/daily/${todayKey}`);

    const amountPaise = Number(after.amountPaise !== undefined ? after.amountPaise : (Number(after.amount) || 0) * 100);

    // 1. Order transitioned to PAID
    if (afterStatus === 'paid' && beforeStatus !== 'paid') {
      const inc = admin.firestore.FieldValue.increment;
      const batch = db.batch();

      batch.set(
        dashboardRef,
        {
          totalOrders: inc(1),
          todayOrders: inc(1),
          totalRevenuePaise: inc(amountPaise),
          todayRevenuePaise: inc(amountPaise),
          todayDate: todayKey,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      batch.set(
        dailyRef,
        {
          ordersCount: inc(1),
          revenuePaise: inc(amountPaise),
          date: todayKey,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await batch.commit();
    }

    // 2. Order transitioned to REFUNDED
    if (afterStatus === 'refunded' && beforeStatus === 'paid') {
      const inc = admin.firestore.FieldValue.increment;
      const refundPaise = Number(after.refundAmount !== undefined ? after.refundAmount * 100 : amountPaise);
      const batch = db.batch();

      batch.set(
        dashboardRef,
        {
          totalRefunds: inc(1),
          totalRevenuePaise: inc(-refundPaise),
          todayRevenuePaise: inc(-refundPaise),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      batch.set(
        dailyRef,
        {
          refundsCount: inc(1),
          revenuePaise: inc(-refundPaise),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await batch.commit();
    }
  }
);

/**
 * Trigger: On User Registration
 */
export const onUserCreatedStats = onDocumentCreated(
  {
    document: 'users/{uid}',
    region: REGION,
  },
  async () => {
    const db = admin.firestore();
    const todayKey = getTodayKey();
    const inc = admin.firestore.FieldValue.increment;
    const batch = db.batch();

    batch.set(
      db.doc('stats/dashboard'),
      {
        totalStudents: inc(1),
        todaySignups: inc(1),
        todayDate: todayKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    batch.set(
      db.doc(`stats/daily/${todayKey}`),
      {
        signupsCount: inc(1),
        date: todayKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
  }
);

/**
 * Trigger: On User Deletion
 */
export const onUserDeletedStats = onDocumentDeleted(
  {
    document: 'users/{uid}',
    region: REGION,
  },
  async () => {
    const db = admin.firestore();
    await db.doc('stats/dashboard').set(
      {
        totalStudents: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
);
