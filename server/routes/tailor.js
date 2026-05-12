import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1'
});

const buildPrompt = (cv, jobDescription, language) => {
  if (language === 'es') {
    return {
      system: `Eres un experto en recursos humanos y redacción de CVs profesionales.
Tu tarea es adaptar el CV del usuario a la descripción de trabajo proporcionada.
Devuelve dos secciones claramente separadas:
1. PUNTOS CV: Los bullet points del CV reescritos para alinearse con el puesto.
2. CARTA DE PRESENTACIÓN: Una carta de presentación profesional y personalizada.
Sé concreto, usa verbos de acción y resalta logros medibles cuando sea posible.`,
      user: `CV ACTUAL:\n${cv}\n\nDESCRIPCIÓN DEL TRABAJO:\n${jobDescription}`
    };
  }
  return {
    system: `You are an expert HR consultant and professional CV writer.
Your task is to tailor the user's CV to the provided job description.
Return two clearly separated sections:
1. CV BULLETS: Rewritten CV bullet points aligned with the role.
2. COVER LETTER: A professional, personalized cover letter.
Be specific, use action verbs, and highlight measurable achievements where possible.`,
    user: `CURRENT CV:\n${cv}\n\nJOB DESCRIPTION:\n${jobDescription}`
  };
};

router.post('/', async (req, res) => {
  const { cv, jobDescription, language = 'en' } = req.body;

  if (!cv || !jobDescription) {
    return res.status(400).json({ error: 'CV and job description are required.' });
  }

  const { system, user } = buildPrompt(cv, jobDescription, language);

  try {
    const response = await client.chat.completions.create({
      model: 'meta/llama-3.3-70b-instruct',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.6,
      max_tokens: 1024,
    });

    const result = response.choices[0].message.content;
    res.json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong with the AI call.' });
  }
});

export default router;
