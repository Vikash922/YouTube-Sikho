/**
 * FIREBASE FUNCTIONS CONFIGURATION & SECRETS (asia-south1)
 * -------------------------------------------------------------
 * Uses Google Cloud Secret Manager via defineSecret.
 */

import { defineSecret } from 'firebase-functions/params';
import Razorpay from 'razorpay';
import { HttpsError } from 'firebase-functions/v2/https';

export const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
export const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');
export const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');
export const bunnyApiKey = defineSecret('BUNNY_API_KEY');
export const bunnyTokenAuthKey = defineSecret('BUNNY_TOKEN_AUTH_KEY');
export const bunnyLibraryId = defineSecret('BUNNY_LIBRARY_ID');
export const bunnyCdnHostname = defineSecret('BUNNY_CDN_HOSTNAME');

export const razorpaySecrets = [
  razorpayKeyId,
  razorpayKeySecret,
  razorpayWebhookSecret,
];

export const bunnySecrets = [
  bunnyApiKey,
  bunnyTokenAuthKey,
  bunnyLibraryId,
  bunnyCdnHostname,
];

export const allSecrets = [
  ...razorpaySecrets,
  ...bunnySecrets,
];

export interface AppSecrets {
  BUNNY_API_KEY: string;
  BUNNY_TOKEN_AUTH_KEY: string;
  BUNNY_LIBRARY_ID: string;
  BUNNY_CDN_HOSTNAME: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
}

const getSecretVal = (param: { value: () => string }, envName: string): string => {
  try {
    const val = param.value();
    if (val) return val;
  } catch {
    // Falls back to process.env in emulator or test runners
  }
  return process.env[envName] || '';
};

export const getSecrets = (): AppSecrets => {
  return {
    BUNNY_API_KEY: getSecretVal(bunnyApiKey, 'BUNNY_API_KEY'),
    BUNNY_TOKEN_AUTH_KEY: getSecretVal(bunnyTokenAuthKey, 'BUNNY_TOKEN_AUTH_KEY'),
    BUNNY_LIBRARY_ID: getSecretVal(bunnyLibraryId, 'BUNNY_LIBRARY_ID'),
    BUNNY_CDN_HOSTNAME: getSecretVal(bunnyCdnHostname, 'BUNNY_CDN_HOSTNAME'),
    RAZORPAY_KEY_ID: getSecretVal(razorpayKeyId, 'RAZORPAY_KEY_ID'),
    RAZORPAY_KEY_SECRET: getSecretVal(razorpayKeySecret, 'RAZORPAY_KEY_SECRET'),
    RAZORPAY_WEBHOOK_SECRET: getSecretVal(razorpayWebhookSecret, 'RAZORPAY_WEBHOOK_SECRET'),
  };
};

export const getRazorpaySecrets = (): { keyId: string; keySecret: string } => {
  const keyId = getSecretVal(razorpayKeyId, 'RAZORPAY_KEY_ID');
  const keySecret = getSecretVal(razorpayKeySecret, 'RAZORPAY_KEY_SECRET');

  if (!keyId || !keySecret) {
    throw new HttpsError(
      'internal',
      'Razorpay secrets (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing or not bound to the function. Configure them using: firebase functions:secrets:set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET'
    );
  }

  return { keyId, keySecret };
};

export const getRazorpayWebhookSecret = (): string => {
  const secret = getSecretVal(razorpayWebhookSecret, 'RAZORPAY_WEBHOOK_SECRET');
  if (!secret) {
    throw new Error(
      'Razorpay webhook secret (RAZORPAY_WEBHOOK_SECRET) is missing or not bound. Configure using: firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET'
    );
  }
  return secret;
};

export const getRazorpayClient = (): Razorpay => {
  const { keyId, keySecret } = getRazorpaySecrets();
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};
