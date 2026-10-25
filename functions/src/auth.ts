import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

/**
 * Validates that the caller has custom claim admin === true
 */
export function requireAdmin(request: CallableRequest<any>): { uid: string; email?: string } {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const token = request.auth.token;
  const isAdmin = token && token.admin === true;

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
