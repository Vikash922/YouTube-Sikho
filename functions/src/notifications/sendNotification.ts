import * as admin from 'firebase-admin';

export interface SendNotificationPayload {
  target: 'all' | 'course' | 'user';
  targetId?: string; // courseId if target == 'course', uid if target == 'user'
  title: string;
  body: string;
  imageUrl?: string;
  actionType?: 'course' | 'live' | 'notifications' | 'url';
  actionData?: string;
}

export interface SendNotificationResponse {
  success: boolean;
  recipients?: number;
  totalRecipients: number;
  tokensTargeted: number;
  fcmSuccessCount: number;
  fcmFailureCount: number;
  inAppDeliveredCount: number;
}

const ALLOWED_ACTION_TYPES = ['course', 'live', 'notifications', 'url'];

export async function sendNotificationHandler(
  data: SendNotificationPayload,
  callerUid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<SendNotificationResponse> {
  if (!callerUid) {
    throw new Error('Unauthenticated: Authentication required.');
  }

  // Admin Privilege Check
  const adminDoc = await db.doc(`admins/${callerUid}`).get();
  if (!adminDoc.exists) {
    throw new Error('Permission denied. Admin privilege required.');
  }

  const { target, targetId, title, body, imageUrl, actionType = 'notifications', actionData = '' } = data;

  // 1. Strict Input Validation
  if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 100) {
    throw new Error('Invalid-argument: Title must be a non-empty string under 100 characters.');
  }
  if (!body || typeof body !== 'string' || body.trim().length === 0 || body.length > 500) {
    throw new Error('Invalid-argument: Body must be a non-empty string under 500 characters.');
  }
  if (imageUrl && !imageUrl.startsWith('https://')) {
    throw new Error('Invalid-argument: Notification imageUrl must use secure HTTPS.');
  }
  if (!ALLOWED_ACTION_TYPES.includes(actionType)) {
    throw new Error(`Invalid-argument: actionType must be one of: ${ALLOWED_ACTION_TYPES.join(', ')}`);
  }

  // 2. Collect Recipient UIDs and FCM Tokens via Cursor-Based Pagination (Zero Silent 500 Limit)
  const recipientMap = new Map<string, string | null>(); // uid -> fcmToken

  if (target === 'user') {
    if (!targetId) throw new Error('Invalid-argument: targetId required for user target.');
    const uDoc = await db.collection('users').doc(targetId).get();
    if (uDoc.exists) {
      recipientMap.set(targetId, uDoc.data()?.fcmToken || null);
    }
  } else if (target === 'course') {
    if (!targetId) throw new Error('Invalid-argument: targetId (courseId) required for course target.');

    // Query enrollments with status 'active' using cursor pagination
    let lastDoc: admin.firestore.DocumentSnapshot | null = null;
    let hasMore = true;
    const enrolledUids: string[] = [];

    while (hasMore) {
      let q = db
        .collection('enrollments')
        .where('courseId', '==', targetId)
        .where('status', '==', 'active')
        .limit(500);

      if (lastDoc) {
        q = q.startAfter(lastDoc);
      }

      const snap = await q.get();
      if (snap.empty) {
        hasMore = false;
        break;
      }

      for (const d of snap.docs) {
        const u = d.data().uid;
        if (u && !enrolledUids.includes(u)) {
          enrolledUids.push(u);
        }
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < 500) {
        hasMore = false;
      }
    }

    // Also include backward compatible documents with active: true
    if (enrolledUids.length === 0) {
      const fallbackSnap = await db
        .collection('enrollments')
        .where('courseId', '==', targetId)
        .where('active', '==', true)
        .limit(500)
        .get();

      for (const d of fallbackSnap.docs) {
        const u = d.data().uid;
        if (u && !enrolledUids.includes(u)) enrolledUids.push(u);
      }
    }

    // Batch read users in chunks of 200 to prevent N+1 queries
    for (let i = 0; i < enrolledUids.length; i += 200) {
      const chunk = enrolledUids.slice(i, i + 200);
      const refs = chunk.map((u) => db.collection('users').doc(u));
      const userSnaps = typeof db.getAll === 'function'
        ? await db.getAll(...refs)
        : await Promise.all(refs.map((r: any) => r.get()));
      userSnaps.forEach((s: any) => {
        if (s.exists) {
          recipientMap.set(s.id, s.data()?.fcmToken || null);
        } else {
          recipientMap.set(s.id, null);
        }
      });
    }
  } else {
    // target === 'all': Paginate through entire users collection
    let lastUserDoc: admin.firestore.DocumentSnapshot | null = null;
    let hasMore = true;

    while (hasMore) {
      let q = db.collection('users').limit(500);
      if (lastUserDoc) {
        q = q.startAfter(lastUserDoc);
      }

      const snap = await q.get();
      if (snap.empty) {
        hasMore = false;
        break;
      }

      for (const d of snap.docs) {
        recipientMap.set(d.id, d.data()?.fcmToken || null);
      }

      lastUserDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < 500) {
        hasMore = false;
      }
    }
  }

  // 3. Dispatch FCM Push Notifications in Chunks of 500 Tokens
  const validTokensWithUid: Array<{ uid: string; token: string }> = [];
  recipientMap.forEach((token, uid) => {
    if (token && typeof token === 'string' && token.trim().length > 10) {
      validTokensWithUid.push({ uid, token: token.trim() });
    }
  });

  let fcmSuccessCount = 0;
  let fcmFailureCount = 0;
  const deadTokenUids: string[] = [];

  for (let i = 0; i < validTokensWithUid.length; i += 500) {
    const chunk = validTokensWithUid.slice(i, i + 500);
    const tokens = chunk.map((c) => c.token);

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
        imageUrl: imageUrl || undefined,
      },
      data: {
        actionType,
        actionData: actionData || '',
        title,
        body,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'course_alerts',
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      fcmSuccessCount += response.successCount;
      fcmFailureCount += response.failureCount;

      // Identify invalid tokens for cleanup
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const errCode = res.error?.code;
          if (
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-registration-token'
          ) {
            deadTokenUids.push(chunk[idx].uid);
          }
        }
      });
    } catch (fcmErr) {
      console.warn('FCM send chunk error:', fcmErr);
      fcmFailureCount += tokens.length;
    }
  }

  // Asynchronously clean up dead FCM tokens
  if (deadTokenUids.length > 0) {
    const cleanBatch = db.batch();
    deadTokenUids.slice(0, 400).forEach((u) => {
      cleanBatch.update(db.collection('users').doc(u), { fcmToken: admin.firestore.FieldValue.delete() });
    });
    cleanBatch.commit().catch((e) => console.warn('Dead token cleanup note:', e.message));
  }

  // 4. Batch Write In-App Notifications in Chunks of 400 Writes
  const recipientUidsList = Array.from(recipientMap.keys());
  let inAppDeliveredCount = 0;

  for (let i = 0; i < recipientUidsList.length; i += 400) {
    const chunk = recipientUidsList.slice(i, i + 400);
    const writeBatch = db.batch();

    chunk.forEach((uid) => {
      const itemRef = db.collection('userNotifications').doc(uid).collection('items').doc();
      writeBatch.set(itemRef, {
        title,
        body,
        imageUrl: imageUrl || null,
        actionType,
        actionData: actionData || null,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    try {
      await writeBatch.commit();
      inAppDeliveredCount += chunk.length;
    } catch (batchErr) {
      console.error('In-app notification write chunk failed:', batchErr);
    }
  }

  // 5. Record broadcast document in /notifications
  await db.collection('notifications').add({
    title,
    body,
    imageUrl: imageUrl || null,
    target,
    targetId: targetId || null,
    actionType,
    actionData: actionData || null,
    totalRecipients: recipientUidsList.length,
    tokensTargeted: validTokensWithUid.length,
    fcmSuccessCount,
    fcmFailureCount,
    inAppDeliveredCount,
    sentBy: callerUid,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    recipients: recipientUidsList.length,
    totalRecipients: recipientUidsList.length,
    tokensTargeted: validTokensWithUid.length,
    fcmSuccessCount,
    fcmFailureCount,
    inAppDeliveredCount,
  };
}
