 import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function (app, opts) {
  // Save a labeled record to Supabase
  app.post('/save', async (req, reply) => {
    const { recordId, finalLabel, annotator } = req.body;

    if (!recordId || !finalLabel || !annotator) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('labels')
      .insert([{ record_id: recordId, final_label: finalLabel, annotator }])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return reply.code(500).send({ error: 'Failed to save label', details: error.message });
    }

    return reply.send({
      message: 'Label saved successfully to Supabase ✅',
      data: data[0],
    });
  });
}
