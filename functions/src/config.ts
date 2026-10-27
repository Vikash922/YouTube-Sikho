/**
 * FIREBASE FUNCTIONS CONFIGURATION & SECRETS (asia-south1)
 * -------------------------------------------------------------
 * Uses Google Cloud Secret Manager via defineSecret.
 */

import { defineSecret } from 'firebase-functions/params';
import Razorpay from 'razorpay';
import { S3Client } from '@aws-sdk/client-s3';
import { HttpsError } from 'firebase-functions/v2/https';

export const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
export const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');
export const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');
export const youtubeApiKey = defineSecret('YOUTUBE_API_KEY');

export const r2AccountId = defineSecret('R2_ACCOUNT_ID');
export const r2AccessKeyId = defineSecret('R2_ACCESS_KEY_ID');
export const r2SecretAccessKey = defineSecret('R2_SECRET_ACCESS_KEY');
export const r2BucketName = defineSecret('R2_BUCKET_NAME');

export const razorpaySecrets = [
  razorpayKeyId,
  razorpayKeySecret,
  razorpayWebhookSecret,
];

export const youtubeSecrets = [
  youtubeApiKey,
];

export const r2Secrets = [
  r2AccountId,
  r2AccessKeyId,
  r2SecretAccessKey,
  r2BucketName,
];

export const allSecrets = [
  ...razorpaySecrets,
  ...youtubeSecrets,
  ...r2Secrets,
];

export interface AppSecrets {
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  YOUTUBE_API_KEY: string;
}

const getSecretVal = (param: { value: () => string }, envName: string): string => {
  if (process.env[envName]) {
    return process.env[envName]!;
  }
  try {
    const val = param.value();
    if (val) return val;
  } catch {
    // Falls back to process.env in emulator or test runners
  }
  return '';
};

export const getSecrets = (): AppSecrets => {
  return {
    RAZORPAY_KEY_ID: getSecretVal(razorpayKeyId, 'RAZORPAY_KEY_ID'),
    RAZORPAY_KEY_SECRET: getSecretVal(razorpayKeySecret, 'RAZORPAY_KEY_SECRET'),
    RAZORPAY_WEBHOOK_SECRET: getSecretVal(razorpayWebhookSecret, 'RAZORPAY_WEBHOOK_SECRET'),
    YOUTUBE_API_KEY: getSecretVal(youtubeApiKey, 'YOUTUBE_API_KEY'),
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
  if (process.env.NODE_ENV === 'test') {
    return {
      orders: {
        create: async (params: any) => ({
          id: 'order_test_mock_123',
          entity: 'order',
          amount: params.amount,
          currency: params.currency,
          receipt: params.receipt,
          status: 'created',
        }),
      },
      payments: {
        fetch: async (paymentId: string) => ({
          id: paymentId,
          entity: 'payment',
          amount: 49900,
          currency: 'INR',
          status: 'captured',
          order_id: 'order_test_mock_123',
          method: 'upi',
          captured: true,
        }),
        refund: async (paymentId: string, params: any) => ({
          id: 'rfnd_test_mock_123',
          entity: 'refund',
          amount: params?.amount || 49900,
          payment_id: paymentId,
          status: 'processed',
        }),
      },
    } as any;
  }
  const { keyId, keySecret } = getRazorpaySecrets();
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export const getR2Client = (): S3Client => {
  const accountId = getSecretVal(r2AccountId, 'R2_ACCOUNT_ID');
  const accessKeyId = getSecretVal(r2AccessKeyId, 'R2_ACCESS_KEY_ID');
  const secretAccessKey = getSecretVal(r2SecretAccessKey, 'R2_SECRET_ACCESS_KEY');

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new HttpsError(
      'failed-precondition',
      'Cloudflare R2 secrets (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not configured. Run: firebase functions:secrets:set ...'
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

export const getR2BucketName = (): string => {
  return getSecretVal(r2BucketName, 'R2_BUCKET_NAME') || 'course-files';
};

