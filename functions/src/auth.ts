import * as admin from 'firebase-admin';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

/**
 * Validates that the caller has custom claim admin === true
 */
export function requireAdmin(request: CallableRequest<any>): { uid: string; email?: string } {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const token = request.auth.token;
  const isAdmin = token && (token.admin === true || token.role === 'owner');

  if (!isAdmin) {
    throw new HttpsError(
      'permission-denied',
      'Administrator privileges required. You do not have permission to execute this operation.'
    );
  }

  return {
    uid: request.auth.uid,
    email: token.email,
  };
}

export interface SetAdminClaimRequest {
  targetUid: string;
  admin?: boolean;
  role?: 'owner' | 'admin';
}

/**
 * Callable handler that allows ONLY an existing admin with role "owner"
 * to promote or demote administrator custom claims.
 */
export async function setAdminClaimHandler(
  data: SetAdminClaimRequest,
  request: CallableRequest<any>
) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const callerToken = request.auth.token;
  const isOwner = callerToken && (callerToken.role === 'owner' || callerToken.admin === true);

  if (!isOwner) {
    throw new HttpsError(
      'permission-denied',
      'Permission denied: Only administrator accounts with role "owner" can assign administrator claims.'
    );
  }

  const { targetUid, admin: grantAdmin = true, role = 'admin' } = data;
  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'Missing required parameter: targetUid');
  }

  const auth = admin.auth();
  const db = admin.firestore();

  // 1. Fetch user to confirm existence
  const targetUser = await auth.getUser(targetUid);
  const currentClaims = targetUser.customClaims || {};

  // 2. Update custom claims
  const newClaims = {
    ...currentClaims,
    admin: grantAdmin,
    role: grantAdmin ? role : undefined,
  };
  await auth.setCustomUserClaims(targetUid, newClaims);

  // 3. Keep Firestore /admins document updated for tracking
  const adminDocRef = db.doc(`admins/${targetUid}`);
  if (grantAdmin) {
    await adminDocRef.set({
      email: targetUser.email || '',
      role,
      active: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
    }, { merge: true });
  } else {
    await adminDocRef.set({
      active: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
    }, { merge: true });
  }

  // 4. Audit Log entry
  try {
    const { writeAuditLog } = await import('./lib');
    await writeAuditLog(
      request.auth.uid,
      grantAdmin ? 'grant_admin_claim' : 'revoke_admin_claim',
      'claim',
      targetUid,
      {
        targetEmail: targetUser.email || '',
        role: grantAdmin ? role : null,
      }
    );
  } catch (auditErr: any) {
    console.warn('[setAdminClaim] Audit log note:', auditErr.message);
  }

  return {
    success: true,
    uid: targetUid,
    admin: grantAdmin,
    role: grantAdmin ? role : null,
  };
}
