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

export async function sendNotificationHandler(
  data: SendNotificationPayload,
  callerUid: string | null,
  db: any = admin.firestore()
) {
  if (!callerUid) {
    throw new Error('Authentication required.');
  }

  // 1. Verify Caller is Admin
  const adminDoc = await db.collection('admins').doc(callerUid).get();
  if (!adminDoc.exists) {
    throw new Error('Permission denied. Admin privilege required.');
  }

  const { target, targetId, title, body, imageUrl, actionType = 'notifications', actionData = '' } = data;

  if (!title || !body) {
    throw new Error('Title and body are required.');
  }

  // 2. Identify Recipient User IDs & FCM Tokens
  const recipientUids: string[] = [];
  const fcmTokens: string[] = [];

  if (target === 'user') {
    if (!targetId) throw new Error('User ID required for user target.');
    const userDoc = await db.collection('users').doc(targetId).get();
    if (userDoc.exists) {
      recipientUids.push(targetId);
      const token = userDoc.data()?.fcmToken;
      if (token) fcmTokens.push(token);
    }
  } else if (target === 'course') {
    if (!targetId) throw new Error('Course ID required for course target.');
    const enrollmentsSnap = await db
      .collection('enrollments')
      .where('courseId', '==', targetId)
      .where('active', '==', true)
      .get();

    for (const doc of enrollmentsSnap.docs) {
      const u = doc.data().uid;
      if (u && !recipientUids.includes(u)) {
        recipientUids.push(u);
      }
    }

    // Fetch FCM tokens for enrolled students
    for (const uid of recipientUids) {
      const uDoc = await db.collection('users').doc(uid).get();
      const token = uDoc.data()?.fcmToken;
      if (token && !fcmTokens.includes(token)) {
        fcmTokens.push(token);
      }
    }
  } else {
    // target === 'all'
    const usersSnap = await db.collection('users').limit(500).get();
    for (const doc of usersSnap.docs) {
      recipientUids.push(doc.id);
      const token = doc.data().fcmToken;
      if (token) fcmTokens.push(token);
    }
  }

  // 3. Dispatch FCM Push Notifications (if tokens available)
  let successCount = 0;
  let failureCount = 0;

  if (fcmTokens.length > 0) {
    try {
      const multicastMessage: admin.messaging.MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title,
          body,
          imageUrl: imageUrl || undefined,
        },
        data: {
          actionType,
          actionData: actionData || '',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      };

      const response = await admin.messaging().sendEachForMulticast(multicastMessage);
      successCount = response.successCount;
      failureCount = response.failureCount;
    } catch (fcmError: any) {
      console.warn('FCM dispatch warning (running in emulator/test mode):', fcmError.message);
    }
  }

  // 4. Record to Global Notifications Collection (Admin Broadcast History)
  const notificationRecord = {
    title,
    body,
    imageUrl: imageUrl || null,
    target,
    targetId: targetId || null,
    actionType,
    actionData: actionData || null,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    sentBy: callerUid,
    recipientCount: recipientUids.length,
    fcmSuccessCount: successCount,
    fcmFailureCount: failureCount,
  };

  const createdNotifRef = await db.collection('notifications').add(notificationRecord);

  // 5. Populate User In-App Notification Center
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const uid of recipientUids) {
    const itemRef = db
      .collection('userNotifications')
      .doc(uid)
      .collection('items')
      .doc();

    batch.set(itemRef, {
      id: itemRef.id,
      title,
      body,
      imageUrl: imageUrl || null,
      actionType,
      actionData: actionData || null,
      read: false,
      createdAt: now,
      sourceNotificationId: createdNotifRef.id,
    });
  }

  if (recipientUids.length > 0) {
    await batch.commit();
  }

  return {
    success: true,
    notificationId: createdNotifRef.id,
    recipients: recipientUids.length,
    fcmSent: successCount,
  };
}
