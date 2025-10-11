 import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';

// Payload validation
const RegisterSchema = z.object({
  dataset_id: z.string().min(1, 'dataset_id is required'),
  uri_s3: z.string().url('uri_s3 must be a valid URL'),
  meta: z.record(z.any()).optional()
});

export default async function (app) {
  // POST /v1/records/register
  app.post('/register', async (req, reply) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid payload',
        details: parsed.error.flatten()
      });
    }

    const { dataset_id, uri_s3, meta } = parsed.data;

    // Placeholder content hash (real system would hash file contents)
    const text_blob_hash = createHash('sha256').update(uri_s3).digest('hex');

    const record = {
      id: randomUUID(),
      dataset_id,
      uri_s3,
      text_blob_hash,
      status: 'queued',
      meta: meta ?? {},
      created_at: new Date().toISOString()
    };

    // Log for observability
    app.log.info({ record }, 'record.registered');

    // TODO: persist to DB (Supabase/Postgres) in a future step
    return reply.code(201).send({ data: record });
  });
}
