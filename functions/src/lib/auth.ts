import * as admin from 'firebase-admin';
import { CallableRequest } from 'firebase-functions/v2/https';
import { fail } from './errors';

export interface CallerAuth {
  uid: string;
  email?: string;
  token: any;
}

/**
 * Validates that the request has a valid authenticated Firebase Auth token
 */
export function requireAuth(request: CallableRequest<any>): CallerAuth {
  if (!request.auth || !request.auth.uid) {
    fail('unauthenticated', 'Authentication required. Please sign in to continue.');
  }
  return {
    uid: request.auth.uid,
    email: request.auth.token?.email,
    token: request.auth.token,
  };
}

/**
 * Validates that the caller has custom claims admin === true or role === 'owner'
 */
export function requireAdmin(request: CallableRequest<any>): { uid: string; email?: string } {
  const auth = requireAuth(request);
  const token = auth.token;
  const isAdmin = token && (token.admin === true || token.role === 'owner');

  if (!isAdmin) {
    fail(
      'permission-denied',
      'Administrator privileges required. You do not have permission to execute this operation.'
    );
  }

  return {
    uid: auth.uid,
    email: auth.email,
  };
}

/**
 * Validates that the user is not marked as blocked/suspended in Firestore
 */
export async function requireNotBlocked(
  uid: string,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<void> {
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists) {
    const data = userDoc.data();
    if (data?.isBlocked === true || data?.status === 'suspended') {
      fail('permission-denied', 'Your account has been suspended. Please contact support.');
    }
  }
}
