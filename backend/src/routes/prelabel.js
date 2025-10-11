 // backend/src/routes/prelabel.js
import Fastify from 'fastify';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

export default async function prelabelRoutes(app) {
  app.post('/:recordId', async (request, reply) => {
    const { recordId } = request.params;

    // Temporary dummy record text — in future, this will come from DB or S3
    const dummyText = `
      Customer: "The app keeps crashing whenever I upload a CSV file."
      Agent: "I’m sorry to hear that. Could you tell me the file size?"
      Customer: "About 200MB."
      Agent: "Thank you! I’ll forward this to the technical team."
    `;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an annotation assistant. Read the text and identify key issues, sentiment, and urgency.',
          },
          {
            role: 'user',
            content: dummyText,
          },
        ],
      });

      const suggestion = response.choices[0].message.content;

      return reply.send({
        recordId,
        suggestion,
        model: 'gpt-4o-mini',
      });
    } catch (err) {
      console.error('Error generating prelabel:', err);
      return reply.code(500).send({ error: 'Failed to generate prelabel' });
    }
  });
}

