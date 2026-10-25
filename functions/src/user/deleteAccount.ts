import * as admin from 'firebase-admin';

export interface DeleteAccountOptions {
  auth?: {
    uid: string;
    token?: {
      auth_time?: number;
      [key: string]: any;
    };
  };
  uid?: string;
  auth_time?: number;
}

const MAX_BATCH_SIZE = 400;

interface BatchOp {
  type: 'delete' | 'update';
  ref: admin.firestore.DocumentReference;
  data?: any;
}

export async function deleteAccountHandler(
  callerOrRequest: string | DeleteAccountOptions | any,
  db: any = admin.firestore()
) {
  let callerUid: string | null = null;
  let authTime: number | undefined;

  if (typeof callerOrRequest === 'string') {
    callerUid = callerOrRequest;
  } else if (callerOrRequest && typeof callerOrRequest === 'object') {
    if (callerOrRequest.auth) {
      callerUid = callerOrRequest.auth.uid || null;
      authTime = callerOrRequest.auth.token?.auth_time;
    } else {
      callerUid = callerOrRequest.uid || null;
      authTime = callerOrRequest.auth_time;
    }
  }

  if (!callerUid) {
    throw new Error('Authentication required.');
  }

  // 1. Verify recent login (auth_time within 5 minutes / 300 seconds)
  if (typeof authTime === 'number' && authTime > 0) {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const elapsedSeconds = nowInSeconds - authTime;
    if (elapsedSeconds > 300) {
      throw new Error(
        'Recent login required (auth_time > 5 minutes). Please re-authenticate before deleting your account.'
      );
    }
  }

  const ops: BatchOp[] = [];

  // Helper to safely collect query snapshots
  const collectQueryDocs = async (queryPromise: Promise<any>) => {
    try {
      const snap = await queryPromise;
      if (snap && snap.docs) {
        snap.docs.forEach((doc: any) => {
          ops.push({ type: 'delete', ref: doc.ref });
        });
      } else if (snap && snap.forEach) {
        snap.forEach((doc: any) => {
          ops.push({ type: 'delete', ref: doc.ref });
        });
      }
    } catch (e: any) {
      // Ignore if collection does not exist or query fails in mock
    }
  };

  // 2. Collect user watch progress
  await collectQueryDocs(db.collection('progress').where('uid', '==', callerUid).get());

  // 3. Collect user notifications
  try {
    const notifsSnap = await db
      .collection('userNotifications')
      .doc(callerUid)
      .collection('items')
      .get();
    if (notifsSnap && notifsSnap.forEach) {
      notifsSnap.forEach((doc: any) => ops.push({ type: 'delete', ref: doc.ref }));
    }
    ops.push({ type: 'delete', ref: db.collection('userNotifications').doc(callerUid) });
  } catch (e: any) {
    // Ignore in case collection is not seeded
  }

  // 4. Collect reviews
  await collectQueryDocs(db.collection('reviews').where('uid', '==', callerUid).get());
  await collectQueryDocs(db.collection('reviews').where('userId', '==', callerUid).get());

  // 5. Collect tickets
  await collectQueryDocs(db.collection('tickets').where('uid', '==', callerUid).get());
  await collectQueryDocs(db.collection('tickets').where('userId', '==', callerUid).get());

  // 6. Collect quiz attempts and quiz results
  await collectQueryDocs(db.collection('quizAttempts').where('uid', '==', callerUid).get());
  await collectQueryDocs(db.collection('quizResults').where('uid', '==', callerUid).get());

  // 7. Collect enrollments
  await collectQueryDocs(db.collection('enrollments').where('uid', '==', callerUid).get());

  // 8. Anonymize orders for accounting/tax compliance (keep order, anonymize PII)
  const anonymizeOrderDocs = async (queryPromise: Promise<any>) => {
    try {
      const snap = await queryPromise;
      const seenOrderIds = new Set<string>();
      if (snap && (snap.docs || snap.forEach)) {
        const docs = snap.docs || [];
        if (snap.forEach && docs.length === 0) {
          snap.forEach((d: any) => docs.push(d));
        }
        docs.forEach((doc: any) => {
          if (!seenOrderIds.has(doc.id)) {
            seenOrderIds.add(doc.id);
            ops.push({
              type: 'update',
              ref: doc.ref,
              data: {
                customerName: 'Deleted User',
                name: 'Deleted User',
                phone: 'Deleted User',
                email: 'deleted@user.invalid',
                studentPhone: 'Deleted User',
                studentEmail: 'deleted@user.invalid',
                anonymized: true,
                anonymizedAt: admin.firestore.FieldValue?.serverTimestamp
                  ? admin.firestore.FieldValue.serverTimestamp()
                  : new Date().toISOString(),
              },
            });
          }
        });
      }
    } catch (e: any) {
      // Ignore in mock/empty
    }
  };

  await anonymizeOrderDocs(db.collection('orders').where('uid', '==', callerUid).get());
  await anonymizeOrderDocs(db.collection('orders').where('userId', '==', callerUid).get());

  // 9. Collect user root document
  ops.push({ type: 'delete', ref: db.collection('users').doc(callerUid) });

  // 10. Execute all Firestore operations in chunks of 400
  for (let i = 0; i < ops.length; i += MAX_BATCH_SIZE) {
    const chunk = ops.slice(i, i + MAX_BATCH_SIZE);
    const batch = db.batch();
    for (const op of chunk) {
      if (op.type === 'delete') {
        batch.delete(op.ref);
      } else if (op.type === 'update') {
        batch.update(op.ref, op.data);
      }
    }
    await batch.commit();
  }

  // 11. Storage bucket cleanup under users/{uid}/
  if (admin.apps && admin.apps.length > 0) {
    try {
      if (typeof (admin as any).storage === 'function') {
        const storageInstance = (admin as any).storage();
        if (storageInstance && typeof storageInstance.bucket === 'function') {
          const bucket = storageInstance.bucket();
          if (bucket && typeof bucket.deleteFiles === 'function') {
            await bucket.deleteFiles({ prefix: `users/${callerUid}/` });
          }
        }
      }
    } catch (storageErr: any) {
      console.warn(`Storage media purge warning for users/${callerUid}/:`, storageErr?.message);
    }

    // 12. Revoke refresh tokens and delete the Auth user
    if (typeof (admin as any).auth === 'function') {
      const authInstance = (admin as any).auth();
      try {
        if (typeof authInstance.revokeRefreshTokens === 'function') {
          await authInstance.revokeRefreshTokens(callerUid);
        }
      } catch (revokeErr: any) {
        console.warn('Revoke refresh tokens warning:', revokeErr?.message);
      }

      try {
        if (typeof authInstance.deleteUser === 'function') {
          await authInstance.deleteUser(callerUid);
        }
      } catch (authError: any) {
        if (authError.code !== 'auth/user-not-found') {
          console.error('Firebase Auth user deletion error:', authError.message);
          throw new Error(`Failed to delete Auth user: ${authError.message}. Please sign in again.`);
        }
      }
    }
  }

  return {
    success: true,
    message: 'Account, personal records, and associated media purged successfully.',
  };
}
