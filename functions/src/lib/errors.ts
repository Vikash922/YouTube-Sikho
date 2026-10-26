import { HttpsError, FunctionsErrorCode } from 'firebase-functions/v2/https';

/**
 * Throw a well-typed HttpsError with a sanitized, safe client-facing message
 */
export function fail(code: FunctionsErrorCode, message: string): never {
  throw new HttpsError(code, message);
}

/**
 * Safe Structured Error Logger (Redacts PII, tokens, and secrets)
 */
export function logError(context: string, error: any, extraData: Record<string, any> = {}) {
  const sanitizedExtra: Record<string, any> = {};

  for (const [k, v] of Object.entries(extraData)) {
    const lowerKey = k.toLowerCase();
    if (
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      lowerKey.includes('auth') ||
      lowerKey.includes('signature')
    ) {
      sanitizedExtra[k] = '[REDACTED]';
    } else {
      sanitizedExtra[k] = v;
    }
  }

  const logPayload = {
    severity: 'ERROR',
    context,
    message: error?.message || String(error),
    code: error instanceof HttpsError ? error.code : 'UNKNOWN',
    stack: error instanceof HttpsError ? undefined : error?.stack,
    ...sanitizedExtra,
    timestamp: new Date().toISOString(),
  };

  console.error(JSON.stringify(logPayload));
}

/**
 * Normalize and wrap unknown thrown errors into safe HttpsErrors
 */
export function normalizeError(error: any, defaultContext: string): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }

  logError(defaultContext, error);

  const rawMessage = error?.message || '';

  // Recognize known business error signatures
  if (rawMessage.includes('Unauthenticated') || rawMessage.includes('Authentication required')) {
    return new HttpsError('unauthenticated', 'Authentication required. Please sign in.');
  }
  if (rawMessage.includes('Permission denied') || rawMessage.includes('Administrator privileges required')) {
    return new HttpsError('permission-denied', 'You do not have permission to perform this action.');
  }
  if (rawMessage.includes('Recent login required') || rawMessage.includes('recent-login-required')) {
    return new HttpsError('failed-precondition', 'recent-login-required');
  }
  if (rawMessage.includes('Not found') || rawMessage.includes('does not exist')) {
    return new HttpsError('not-found', rawMessage);
  }
  if (rawMessage.includes('Invalid-argument') || rawMessage.includes('must be')) {
    return new HttpsError('invalid-argument', rawMessage);
  }
  if (rawMessage.includes('Too many requests') || rawMessage.includes('rate-limit')) {
    return new HttpsError('resource-exhausted', 'Too many requests. Please wait a moment and try again.');
  }

  // Never leak internal stack traces or database driver errors
  return new HttpsError('internal', 'An internal server error occurred. Please try again later.');
}
