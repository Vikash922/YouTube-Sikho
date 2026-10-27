import * as admin from 'firebase-admin';
import { CallableRequest } from 'firebase-functions/v2/https';
import { requireAdmin, fail, assertString, assertEnum, writeAuditLog } from '../lib';

export type NotificationActionType = 'course' | 'live' | 'url' | 'none';

export interface SendNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  actionType?: NotificationActionType;
  actionValue?: string;
  actionData?: string; // backward-compatibility alias
  target:
    | {
        type: 'all' | 'course' | 'user';
        id?: string;
      }
    | 'all'
    | 'course'
    | 'user';
  targetId?: string; // backward-compatibility alias
}

export interface SendNotificationResult {
  success: boolean;
  recipients: number;
  totalRecipients: number;
  delivered: number;
  tokensTargeted: number;
  fcmSuccessCount: number;
  fcmFailureCount: number;
  inAppDeliveredCount: number;
  failed: number;
}

const ALLOWED_ACTION_TYPES: readonly NotificationActionType[] = ['course', 'live', 'url', 'none'];

/**
 * Internal reusable helper for dispatching notifications
 * (used by Admin callable and automated system triggers)
 */
export async function sendNotificationInternal(params: {
  title: string;
  body: string;
  imageUrl?: string;
  actionType: NotificationActionType;
  actionValue?: string;
  targetType: 'all' | 'course' | 'user';
  targetId?: string;
  senderUid: string;
  db?: admin.firestore.Firestore;
}): Promise<SendNotificationResult> {
  const db = params.db || admin.firestore();
  const { title, body, imageUrl, actionType, actionValue = '', targetType, targetId, senderUid } = params;

  // 1. Gather recipient UIDs and FCM tokens without N+1 queries
  const recipientMap = new Map<string, string | null>(); // uid -> fcmToken

  if (targetType === 'user') {
    if (!targetId) fail('invalid-argument', 'Target user ID is required when target is user.');
    const uDoc = await db.collection('users').doc(targetId).get();
    if (uDoc.exists) {
      recipientMap.set(targetId, uDoc.data()?.fcmToken || null);
    }
  } else if (targetType === 'course') {
    if (!targetId) fail('invalid-argument', 'Target course ID is required when target is course.');

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

    // Chunked batch read of users in chunks of 200 to prevent N+1 queries
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
    // targetType === 'all': Paginate through entire users collection
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

  const recipientUidsList = Array.from(recipientMap.keys());

  // 2. Dispatch FCM in chunks of 500 tokens
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
        actionValue,
        actionData: actionValue, // backward-compatibility
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

      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const errCode = res.error?.code;
          if (
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/invalid-argument'
          ) {
            deadTokenUids.push(chunk[idx].uid);
          }
        }
      });
    } catch (fcmErr) {
      console.warn('[FCM] Chunk send error:', fcmErr);
      fcmFailureCount += tokens.length;
    }
  }

  // Prune invalid tokens asynchronously
  if (deadTokenUids.length > 0) {
    const cleanBatch = db.batch();
    deadTokenUids.slice(0, 400).forEach((u) => {
      cleanBatch.update(db.collection('users').doc(u), {
        fcmToken: admin.firestore.FieldValue.delete(),
      });
    });
    cleanBatch.commit().catch((e) => console.warn('[FCM] Dead token prune error:', e.message));
  }

  // 3. Batch write in-app notifications in chunks of 400 (per recipient in userNotifications/{uid}/items/{id})
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
        actionValue,
        actionData: actionValue, // backward-compat
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    try {
      await writeBatch.commit();
      inAppDeliveredCount += chunk.length;
    } catch (batchErr) {
      console.error('[Notification] In-app write chunk failed:', batchErr);
    }
  }

  // 4. Record single administrative history entry in /notifications
  await db.collection('notifications').add({
    title,
    body,
    imageUrl: imageUrl || null,
    target: targetType,
    targetType,
    targetId: targetId || null,
    actionType,
    actionValue,
    actionData: actionValue,
    totalRecipients: recipientUidsList.length,
    tokensTargeted: validTokensWithUid.length,
    fcmSuccessCount,
    fcmFailureCount,
    inAppDeliveredCount,
    sentBy: senderUid,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    recipients: recipientUidsList.length,
    totalRecipients: recipientUidsList.length,
    delivered: inAppDeliveredCount,
    tokensTargeted: validTokensWithUid.length,
    fcmSuccessCount,
    fcmFailureCount,
    inAppDeliveredCount,
    failed: fcmFailureCount,
  };
}

/**
 * Callable Handler for sendNotification
 */
export async function sendNotificationHandler(
  data: SendNotificationPayload,
  request: CallableRequest<any>,
  db?: admin.firestore.Firestore
): Promise<SendNotificationResult> {
  const caller = requireAdmin(request);

  // Validate inputs
  const title = assertString(data.title, 'title', 1, 100);
  const body = assertString(data.body, 'body', 1, 500);

  let imageUrl: string | undefined = undefined;
  if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.trim().length > 0) {
    const trimmedImg = data.imageUrl.trim();
    if (!trimmedImg.startsWith('https://')) {
      fail('invalid-argument', 'Image URL must use secure HTTPS.');
    }
    imageUrl = trimmedImg;
  }

  const rawActionType = (data.actionType === ('notifications' as any) ? 'none' : data.actionType) || 'none';
  const actionType = assertEnum(rawActionType, 'actionType', ALLOWED_ACTION_TYPES);
  const actionValue = data.actionValue || data.actionData || '';

  let targetType: 'all' | 'course' | 'user' = 'all';
  let targetId: string | undefined = undefined;

  if (typeof data.target === 'object' && data.target !== null) {
    targetType = assertEnum(data.target.type, 'target.type', ['all', 'course', 'user'] as const);
    targetId = data.target.id;
  } else if (typeof data.target === 'string') {
    targetType = assertEnum(data.target, 'target', ['all', 'course', 'user'] as const);
    targetId = data.targetId;
  }

  const result = await sendNotificationInternal({
    title,
    body,
    imageUrl,
    actionType,
    actionValue,
    targetType,
    targetId,
    senderUid: caller.uid,
    db,
  });

  // Write to Audit Log
  await writeAuditLog(
    caller.uid,
    'send_notification',
    'notification',
    targetId || 'broadcast_all',
    {
      title,
      targetType,
      targetId: targetId || null,
      totalRecipients: result.totalRecipients,
      fcmSuccessCount: result.fcmSuccessCount,
    },
    db
  );

  return result;
}
