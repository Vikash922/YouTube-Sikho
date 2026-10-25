/**
 * FIREBASE FUNCTIONS CONFIGURATION & SECRETS (asia-south1)
 * -------------------------------------------------------------
 * Uses Google Cloud Secret Manager via defineSecret.
 */

import { defineSecret } from 'firebase-functions/params';

export const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
export const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');
export const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');
export const bunnyApiKey = defineSecret('BUNNY_API_KEY');
export const bunnyTokenAuthKey = defineSecret('BUNNY_TOKEN_AUTH_KEY');
export const bunnyLibraryId = defineSecret('BUNNY_LIBRARY_ID');
export const bunnyCdnHostname = defineSecret('BUNNY_CDN_HOSTNAME');

export const allSecrets = [
  razorpayKeyId,
  razorpayKeySecret,
  razorpayWebhookSecret,
  bunnyApiKey,
  bunnyTokenAuthKey,
  bunnyLibraryId,
  bunnyCdnHostname,
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

const getSecretValue = (secretParam: any, envName: string, fallback: string = ''): string => {
  try {
    const val = secretParam.value();
    if (val) return val;
  } catch {
    // Secret not available in local test execution
  }
  return process.env[envName] || fallback;
};

const isEmulatedOrTest = !process.env.K_SERVICE;

export const getSecrets = (): AppSecrets => {
  return {
    BUNNY_API_KEY: getSecretValue(bunnyApiKey, 'BUNNY_API_KEY', isEmulatedOrTest ? 'test_bunny_api_key' : ''),
    BUNNY_TOKEN_AUTH_KEY: getSecretValue(bunnyTokenAuthKey, 'BUNNY_TOKEN_AUTH_KEY', isEmulatedOrTest ? 'test_bunny_token_auth_key' : ''),
    BUNNY_LIBRARY_ID: getSecretValue(bunnyLibraryId, 'BUNNY_LIBRARY_ID', isEmulatedOrTest ? '123456' : ''),
    BUNNY_CDN_HOSTNAME: getSecretValue(bunnyCdnHostname, 'BUNNY_CDN_HOSTNAME', isEmulatedOrTest ? 'video.youtubesikho.com' : ''),
    RAZORPAY_KEY_ID: getSecretValue(razorpayKeyId, 'RAZORPAY_KEY_ID', isEmulatedOrTest ? 'rzp_test_placeholder' : ''),
    RAZORPAY_KEY_SECRET: getSecretValue(razorpayKeySecret, 'RAZORPAY_KEY_SECRET', isEmulatedOrTest ? 'rzp_test_secret_placeholder' : ''),
    RAZORPAY_WEBHOOK_SECRET: getSecretValue(razorpayWebhookSecret, 'RAZORPAY_WEBHOOK_SECRET', isEmulatedOrTest ? 'rzp_webhook_secret_placeholder' : ''),
  };
};
