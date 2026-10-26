import { setGlobalOptions } from 'firebase-functions/v2';
import { CallableOptions } from 'firebase-functions/v2/https';

export const REGION = 'asia-south1';

/**
 * Configure global defaults across all Cloud Functions v2
 */
setGlobalOptions({
  region: REGION,
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 60,
});

/**
 * App Check enforcement configuration.
 * Default false until mobile app and web tokens are wired in Part 10.
 */
export const ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true';

/**
 * Standard CORS origins permitted to access callables & API endpoints
 */
export const ALLOWED_ORIGINS = [
  'https://sikho-77341.web.app',
  'https://sikho-77341.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:8081',
];

/**
 * Default Callable Options
 */
export const defaultCallableOptions: CallableOptions = {
  region: REGION,
  cors: true,
  enforceAppCheck: ENFORCE_APP_CHECK,
  maxInstances: 15,
};

/**
 * Heavy Callable Options (e.g. notifications, account deletion, bulk operations)
 */
export const heavyCallableOptions: CallableOptions = {
  region: REGION,
  cors: true,
  enforceAppCheck: ENFORCE_APP_CHECK,
  memory: '512MiB',
  timeoutSeconds: 300,
  maxInstances: 5,
};
