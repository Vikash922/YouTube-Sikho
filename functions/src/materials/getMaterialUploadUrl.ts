import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpsError } from 'firebase-functions/v2/https';
import { getR2Client, getR2BucketName } from '../config';
import { assertString, requireAdmin, requireAuth } from '../lib';

export interface GetMaterialUploadUrlRequest {
  courseId: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface GetMaterialUploadUrlResponse {
  uploadUrl: string;
  key: string;
  fileName: string;
  expiresAt: number;
}

const UPLOAD_TTL_SECONDS = 15 * 60; // 15 minutes upload window

function safeFileName(name: string): string {
  return name.replace(/[^\w.\- ]/g, '_').slice(0, 120);
}

export async function getMaterialUploadUrlHandler(
  request: any
): Promise<GetMaterialUploadUrlResponse> {
  requireAuth(request);
  await requireAdmin(request);

  const data = (request.data || {}) as GetMaterialUploadUrlRequest;
  const courseId = assertString(data.courseId, 'courseId');
  const rawFileName = assertString(data.fileName, 'fileName');

  const contentType = data.contentType || 'application/pdf';
  const allowedTypes = [
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ];

  if (!allowedTypes.includes(contentType.toLowerCase())) {
    throw new HttpsError(
      'invalid-argument',
      `Unsupported contentType '${contentType}'. Allowed types: PDF or ZIP.`
    );
  }

  const cleanName = safeFileName(rawFileName);
  const ext = cleanName.includes('.') ? cleanName.split('.').pop() : 'pdf';
  const key = `courses/${courseId}/materials/${randomUUID()}.${ext}`;

  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: UPLOAD_TTL_SECONDS,
  });

  return {
    uploadUrl,
    key,
    fileName: cleanName,
    expiresAt: Date.now() + UPLOAD_TTL_SECONDS * 1000,
  };
}
