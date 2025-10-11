 // backend/src/routes/datasets.js
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Dataset routes
 * - POST /v1/datasets/:projectId/upload-init
 *   Body: { fileName: string, fileType: string, fileSize: number }
 *   Returns: { key, uploadUrl }
 *
 * Frontend will PUT the file directly to S3 using the returned uploadUrl.
 */
export default async function datasetsRoutes(app) {
  const REGION = process.env.AWS_REGION || 'ca-central-1';
  const BUCKET = process.env.S3_BUCKET;
  if (!BUCKET) {
    app.log.error('Missing S3_BUCKET in environment');
  }

  const s3 = new S3Client({ region: REGION });

  app.post('/:projectId/upload-init', async (req, reply) => {
    try {
      const { projectId } = req.params;
      const { fileName, fileType, fileSize } = req.body ?? {};

      // Basic validations
      const allowed = [
        'text/csv',
        'application/json',
        'application/x-ndjson',
        'application/pdf',
        'text/plain',
      ];
      if (!fileName || !fileType || typeof fileSize !== 'number') {
        return reply.code(400).send({ error: 'fileName, fileType, fileSize are required' });
      }
      if (!allowed.includes(fileType)) {
        return reply.code(400).send({ error: `Invalid file type: ${fileType}` });
      }
      if (fileSize > 100 * 1024 * 1024) {
        return reply.code(400).send({ error: 'File too large (max 100MB for MVP)' });
      }

      // Object key: project/{projectId}/{uuid}-{originalName}
      const uuid = crypto.randomUUID();
      // very simple filename clean
      const safeName = String(fileName).replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 120);
      const key = `project/${projectId}/${uuid}-${safeName}`;

      // Prepare S3 PUT with server-side encryption (SSE-S3) for MVP
      const putCmd = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: fileType,
        // If your bucket enforces KMS, you can switch to:
        // ServerSideEncryption: 'aws:kms',
        // SSEKMSKeyId: process.env.KMS_KEY_ID,
        ServerSideEncryption: 'AES256',
      });

      // Presign the PUT URL
      const uploadUrl = await getSignedUrl(s3, putCmd, { expiresIn: 60 * 5 }); // 5 minutes

      return reply.send({ key, uploadUrl });
    } catch (err) {
      req.log.error({ err }, 'upload-init failed');
      return reply.code(500).send({ error: 'upload-init failed' });
    }
  });
}
