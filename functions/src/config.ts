/**
 * FIREBASE FUNCTIONS CONFIGURATION & SECRETS
 * -------------------------------------------------------------
 * Accesses environment secrets securely on the server.
 */

export interface AppSecrets {
  BUNNY_API_KEY: string;
  BUNNY_TOKEN_AUTH_KEY: string;
  BUNNY_LIBRARY_ID: string;
  BUNNY_CDN_HOSTNAME: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
}

export const getSecrets = (): AppSecrets => {
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.K_SERVICE;
  if (isProduction && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)) {
    console.error('CRITICAL: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in Cloud Functions environment.');
  }

  return {
    BUNNY_API_KEY: process.env.BUNNY_API_KEY || '',
    BUNNY_TOKEN_AUTH_KEY: process.env.BUNNY_TOKEN_AUTH_KEY || '',
    BUNNY_LIBRARY_ID: process.env.BUNNY_LIBRARY_ID || '',
    BUNNY_CDN_HOSTNAME: process.env.BUNNY_CDN_HOSTNAME || '',
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  };
};
