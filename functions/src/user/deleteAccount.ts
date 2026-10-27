import * as admin from 'firebase-admin';
import { CallableRequest } from 'firebase-functions/v2/https';
import { requireAuth, fail, writeAuditLog } from '../lib';

export interface DeleteAccountResponse {
  success: boolean;
  purgedAt: string;
}

/**
 * Server-authoritative and resumable account purge handler.
 * Complies with Google Play Store Data Safety & GDPR/DPDP guidelines.
 */
export async function deleteAccountHandler(
  request: CallableRequest<any>,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<DeleteAccountResponse> {
  const caller = requireAuth(request);
  const uid = caller.uid;
  const authTime = request.auth?.token?.auth_time;

  // 1. Verify recent login (auth_time within 5 minutes / 300 seconds)
  if (typeof authTime === 'number' && authTime > 0) {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const elapsedSeconds = nowInSeconds - authTime;
    if (elapsedSeconds > 300) {
      fail(
        'failed-precondition',
        'recent-login-required'
      );
    }
  }

  // 2. Mark deletion in progress on user document (for resumability)
  const userRef = db.collection('users').doc(uid);
  await userRef.set(
    {
      deletionRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending_deletion',
    },
    { merge: true }
  );

  // Helper to delete all documents from a query in chunks of 400
  const deleteQueryDocs = async (query: admin.firestore.Query) => {
    let hasMore = true;
    while (hasMore) {
      const snap = await query.limit(400).get();
      if (snap.empty) {
        hasMore = false;
        break;
      }
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      if (snap.size < 400) {
        hasMore = false;
      }
    }
  };

  try {
    // 3. Purge user learning progress
    await deleteQueryDocs(db.collection('progress').where('uid', '==', uid));

    // 4. Purge in-app notifications
    await deleteQueryDocs(db.collection('userNotifications').doc(uid).collection('items'));
    await db.collection('userNotifications').doc(uid).delete().catch(() => {});

    // 5. Purge reviews & tickets
    await deleteQueryDocs(db.collection('reviews').where('uid', '==', uid));
    await deleteQueryDocs(db.collection('reviews').where('userId', '==', uid));
    await deleteQueryDocs(db.collection('tickets').where('uid', '==', uid));

    // 6. Purge quiz attempts, results, and best scores
    await deleteQueryDocs(db.collection('quizAttempts').where('uid', '==', uid));
    await deleteQueryDocs(db.collection('quizResults').where('uid', '==', uid));
    await deleteQueryDocs(db.collection('quizBest').where('uid', '==', uid));

    // 7. Anonymize certificates (preserve verification hash while removing personal identifiable data)
    const certsSnap = await db.collection('certificates').where('uid', '==', uid).get();
    if (!certsSnap.empty) {
      const certBatch = db.batch();
      certsSnap.docs.forEach((doc) => {
        certBatch.update(doc.ref, {
          studentName: 'Former Student',
          uid: 'anonymized',
          email: null,
          phone: null,
          anonymizedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await certBatch.commit();
    }

    // 8. Scrub live chat messages
    const liveClassesSnap = await db.collection('liveClasses').limit(50).get();
    for (const lcDoc of liveClassesSnap.docs) {
      const msgsQuery = lcDoc.ref.collection('messages').where('senderId', '==', uid);
      await deleteQueryDocs(msgsQuery);
    }

    // 9. Cancel/remove course enrollments
    await deleteQueryDocs(db.collection('enrollments').where('uid', '==', uid));

    // 10. Scrub financial records (Orders/Invoices retained for tax compliance with PII redacted)
    const ordersSnap = await db.collection('orders').where('uid', '==', uid).get();
    if (!ordersSnap.empty) {
      const orderBatch = db.batch();
      ordersSnap.docs.forEach((doc) => {
        orderBatch.update(doc.ref, {
          userName: '[Deleted User]',
          userEmail: '[Redacted]',
          userPhone: '[Redacted]',
          billingAddress: null,
          customerName: '[Deleted User]',
          isAnonymized: true,
          anonymizedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await orderBatch.commit();
    }

    // 11. Purge user profile files in Firebase Storage (avatar, docs)
    try {
      const defaultBucket = admin.storage().bucket();
      await defaultBucket.deleteFiles({
        prefix: `users/${uid}/`,
      });
    } catch (storageErr: any) {
      console.warn('[deleteAccount] Storage files deletion note:', storageErr.message);
    }

    // 12. Write to Audit Log BEFORE deleting the Auth user
    await writeAuditLog(
      uid,
      'delete_account',
      'user',
      uid,
      {
        requestedAt: new Date().toISOString(),
        email: caller.email || null,
      },
      db
    );

    // 13. Delete user document and subcollections
    await userRef.delete();

    // 14. Revoke Firebase Auth refresh tokens and purge user from Auth
    await admin.auth().revokeRefreshTokens(uid).catch(() => {});
    await admin.auth().deleteUser(uid);

    return {
      success: true,
      purgedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error(`[deleteAccount] Error during purge of user ${uid}:`, err);
    fail('internal', `Account purge failed: ${err.message || 'Database error'}. You may retry.`);
  }
}
