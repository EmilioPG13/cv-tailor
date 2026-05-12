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
Reglas:
- Conserva EXACTAMENTE los mismos títulos de sección que aparecen en el CV original.
- Mantén el mismo símbolo de viñeta que usa el usuario (•, -, *).
- Solo actualiza el contenido — no añadas ni elimines secciones.
- Usa verbos de acción y cuantifica logros cuando sea posible.

Devuelve EXACTAMENTE dos secciones con estos encabezados en su propia línea (sin número, sin puntuación extra):

CV ADAPTADO
[CV completo reescrito aquí]

CARTA DE PRESENTACIÓN
[carta de presentación aquí]`,
      user: `CV ACTUAL:\n${cv}\n\nDESCRIPCIÓN DEL TRABAJO:\n${jobDescription}`
    };
  }
  return {
    system: `You are an expert HR consultant and professional CV writer.
Your task is to tailor the user's CV to the provided job description.
Rules:
- Preserve ALL section headings exactly as they appear in the original CV.
- Keep the same bullet symbol the user uses (•, -, *).
- Only update the wording — do not add or remove sections.
- Use strong action verbs and quantify achievements where possible.

Return EXACTLY two sections with these headers on their own line (no number, no extra punctuation):

TAILORED CV
[full rewritten CV here]

COVER LETTER
[cover letter here]`,
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
      max_tokens: 2048,
    });

    const result = response.choices[0].message.content;
    res.json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong with the AI call.' });
  }
});

export default router;
