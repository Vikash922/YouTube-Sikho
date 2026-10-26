import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole, assertString, writeAuditLog } from '../lib';

export const blockUser = onCall(
  { region: 'asia-south1', maxInstances: 10 },
  async (request) => {
    const caller = requireRole(request, ['owner', 'editor', 'admin']);
    const targetUid = assertString(request.data?.uid, 'uid');
    const reason = request.data?.reason || 'Account suspended by administrator';

    const db = admin.firestore();
    const userRef = db.collection('users').doc(targetUid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError('not-found', `Student account ${targetUid} not found.`);
    }

    // 1. Mark isBlocked in Firestore
    await userRef.set(
      {
        isBlocked: true,
        blockedReason: reason,
        blockedAt: admin.firestore.FieldValue.serverTimestamp(),
        blockedBy: caller.uid,
      },
      { merge: true }
    );

    // 2. Revoke Firebase Auth refresh tokens so active sessions are terminated immediately
    try {
      await admin.auth().revokeRefreshTokens(targetUid);
    } catch (err: any) {
      console.warn(`[blockUser] revokeRefreshTokens warning for ${targetUid}:`, err.message);
    }

    // 3. Write audit log
    await writeAuditLog(
      caller.uid,
      'user.blocked',
      'user',
      targetUid,
      {
        reason,
        targetEmail: userSnap.data()?.email,
      },
      db
    );

    return { success: true, message: `Student account ${targetUid} has been blocked.` };
  }
);

export const unblockUser = onCall(
  { region: 'asia-south1', maxInstances: 10 },
  async (request) => {
    const caller = requireRole(request, ['owner', 'editor', 'admin']);
    const targetUid = assertString(request.data?.uid, 'uid');

    const db = admin.firestore();
    const userRef = db.collection('users').doc(targetUid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError('not-found', `Student account ${targetUid} not found.`);
    }

    // 1. Mark isBlocked: false in Firestore
    await userRef.set(
      {
        isBlocked: false,
        unblockedAt: admin.firestore.FieldValue.serverTimestamp(),
        unblockedBy: caller.uid,
      },
      { merge: true }
    );

    // 2. Write audit log
    await writeAuditLog(
      caller.uid,
      'user.unblocked',
      'user',
      targetUid,
      {
        targetEmail: userSnap.data()?.email,
      },
      db
    );

    return { success: true, message: `Student account ${targetUid} has been unblocked.` };
  }
);
