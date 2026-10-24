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
  YOUPI_GATEWAY_URL: string;
  YOUPI_WEBHOOK_SECRET: string;
  YOUPI_MERCHANT_ID: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
}

export const getSecrets = (): AppSecrets => {
  return {
    BUNNY_API_KEY: process.env.BUNNY_API_KEY || '',
    BUNNY_TOKEN_AUTH_KEY: process.env.BUNNY_TOKEN_AUTH_KEY || '',
    BUNNY_LIBRARY_ID: process.env.BUNNY_LIBRARY_ID || '',
    BUNNY_CDN_HOSTNAME: process.env.BUNNY_CDN_HOSTNAME || '',
    YOUPI_GATEWAY_URL: process.env.YOUPI_GATEWAY_URL || 'http://127.0.0.1:6100',
    YOUPI_WEBHOOK_SECRET: process.env.YOUPI_WEBHOOK_SECRET || 'youpi_sec_test_development_secret',
    YOUPI_MERCHANT_ID: process.env.YOUPI_MERCHANT_ID || '00000000-0000-0000-0000-000000000001',
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder',
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_placeholder',
  };
};
