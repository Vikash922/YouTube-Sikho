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
 * Validates that the caller has one of the specified administrative roles.
 * Role 'owner' always inherits all lower permissions.
 */
export function requireRole(
  request: CallableRequest<any>,
  allowedRoles: ('owner' | 'editor' | 'support' | 'admin')[]
): { uid: string; email?: string; role: string } {
  const auth = requireAuth(request);
  const token = auth.token;
  const role = token?.role || (token?.admin === true ? 'owner' : null);

  if (!role || (!allowedRoles.includes(role as any) && role !== 'owner')) {
    fail(
      'permission-denied',
      `Access restricted. Operation requires one of the following roles: [${allowedRoles.join(', ')}]. Your current role is '${role || 'none'}'.`
    );
  }

  return {
    uid: auth.uid,
    email: auth.email,
    role,
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
