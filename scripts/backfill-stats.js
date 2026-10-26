#!/usr/bin/env node

/**
 * ONE-TIME STATS BACKFILL SCRIPT
 * -------------------------------------------------------------
 * Aggregates existing orders, users, and courses into stats/dashboard
 * and daily buckets in stats/daily/{yyyy-mm-dd}.
 */

const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  // Use ADC or default app
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'sikho-77341',
  });
}

const db = admin.firestore();

async function backfillStats() {
  console.log('Starting stats backfill...');

  // 1. Calculate orders & revenue
  const ordersSnap = await db.collection('orders').get();
  let totalOrders = 0;
  let totalRevenuePaise = 0;
  let totalRefunds = 0;

  const dailyBuckets = {};

  ordersSnap.forEach((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    const dateKey = createdAt.toISOString().split('T')[0];

    if (!dailyBuckets[dateKey]) {
      dailyBuckets[dateKey] = { ordersCount: 0, revenuePaise: 0, signupsCount: 0, refundsCount: 0 };
    }

    if (data.status === 'paid') {
      totalOrders++;
      const paise = Number(data.amountPaise !== undefined ? data.amountPaise : (Number(data.amount) || 0) * 100);
      totalRevenuePaise += paise;
      dailyBuckets[dateKey].ordersCount++;
      dailyBuckets[dateKey].revenuePaise += paise;
    } else if (data.status === 'refunded') {
      totalRefunds++;
      dailyBuckets[dateKey].refundsCount++;
    }
  });

  // 2. Count users
  const usersSnap = await db.collection('users').get();
  let totalStudents = 0;
  let blockedStudents = 0;

  usersSnap.forEach((doc) => {
    const data = doc.data();
    if (data.isBlocked) {
      blockedStudents++;
    } else {
      totalStudents++;
    }

    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    const dateKey = createdAt.toISOString().split('T')[0];
    if (!dailyBuckets[dateKey]) {
      dailyBuckets[dateKey] = { ordersCount: 0, revenuePaise: 0, signupsCount: 0, refundsCount: 0 };
    }
    dailyBuckets[dateKey].signupsCount++;
  });

  // 3. Write stats/dashboard
  const todayKey = new Date().toISOString().split('T')[0];
  const todayBucket = dailyBuckets[todayKey] || { ordersCount: 0, revenuePaise: 0, signupsCount: 0 };

  await db.doc('stats/dashboard').set(
    {
      totalOrders,
      totalRevenuePaise,
      totalRefunds,
      totalStudents,
      blockedStudents,
      todayOrders: todayBucket.ordersCount,
      todayRevenuePaise: todayBucket.revenuePaise,
      todaySignups: todayBucket.signupsCount,
      todayDate: todayKey,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`Updated stats/dashboard: ${totalOrders} orders, ₹${Math.round(totalRevenuePaise / 100)} revenue, ${totalStudents} students.`);

  // 4. Write daily buckets
  for (const [date, bucket] of Object.entries(dailyBuckets)) {
    await db.doc(`stats/daily/${date}`).set(
      {
        date,
        ...bucket,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  console.log(`Backfilled ${Object.keys(dailyBuckets).length} daily buckets into stats/daily/. Backfill completed!`);
}

backfillStats().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});
