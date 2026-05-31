import express from 'express';
import OpenAI from 'openai';
import { requireAuth } from '@clerk/express';

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1'
});

const TONE_INSTRUCTIONS = {
  en: {
    professional:   'Write in a formal, professional tone.',
    conversational: 'Write in a warm, conversational tone that feels personable.',
    enthusiastic:   'Write in an enthusiastic, energetic tone that conveys passion.',
  },
  es: {
    professional:   'Escribe en un tono formal y profesional.',
    conversational: 'Escribe en un tono cálido y conversacional.',
    enthusiastic:   'Escribe en un tono entusiasta y enérgico.',
  },
};

const buildPrompt = (cv, jobDescription, language, tone = 'professional') => {
  if (language === 'es') {
    const toneInstruction = TONE_INSTRUCTIONS.es[tone] ?? TONE_INSTRUCTIONS.es.professional;
    return {
      system: `Eres un experto en recursos humanos y redacción de CVs profesionales.
Tu tarea es adaptar el CV del usuario a la descripción de trabajo proporcionada.
Reglas:
- Conserva EXACTAMENTE los mismos títulos de sección que aparecen en el CV original.
- Mantén el mismo símbolo de viñeta que usa el usuario (•, -, *).
- Solo actualiza el contenido — no añadas ni elimines secciones.
- Usa verbos de acción y cuantifica logros cuando sea posible.
- ${toneInstruction}

Devuelve EXACTAMENTE dos secciones con estos encabezados en su propia línea (sin número, sin puntuación extra):

CV ADAPTADO
[CV completo reescrito aquí]

CARTA DE PRESENTACIÓN
[carta de presentación aquí]`,
      user: `CV ACTUAL:\n${cv}\n\nDESCRIPCIÓN DEL TRABAJO:\n${jobDescription}`
    };
  }

  const toneInstruction = TONE_INSTRUCTIONS.en[tone] ?? TONE_INSTRUCTIONS.en.professional;
  return {
    system: `You are an expert HR consultant and professional CV writer.
Your task is to tailor the user's CV to the provided job description.
Rules:
- Preserve ALL section headings exactly as they appear in the original CV.
- Keep the same bullet symbol the user uses (•, -, *).
- Only update the wording — do not add or remove sections.
- Use strong action verbs and quantify achievements where possible.
- ${toneInstruction}

Return EXACTLY two sections with these headers on their own line (no number, no extra punctuation):

TAILORED CV
[full rewritten CV here]

COVER LETTER
[cover letter here]`,
    user: `CURRENT CV:\n${cv}\n\nJOB DESCRIPTION:\n${jobDescription}`
  };
};

const buildStylePrompt = (originalCV, tailoredCV, language) => {
  if (language === 'es') {
    return {
      system: `Eres un experto en diseño de CVs y desarrollo front-end.
Tu tarea es convertir un CV en texto plano en un documento HTML completo y autocontenido con CSS embebido.

REGLAS ESTRICTAS:
1. Genera ÚNICAMENTE el documento HTML. Comienza con <!DOCTYPE html> y termina con </html>. Sin markdown, sin bloques de código, sin texto extra.
2. Analiza el TEXTO DEL CV ORIGINAL para inferir el diseño:
   - ¿Es de una o dos columnas?
   - Estilo de encabezados de sección (mayúsculas, subrayado, borde inferior, etc.)
   - Símbolo de viñeta usado (•, -, *, ninguno) — replícalo.
   - ¿La información de contacto está centrada, alineada a la izquierda o en columnas?
3. Usa ÚNICAMENTE el contenido del TEXTO DEL CV ADAPTADO — no el original.
4. Requisitos de diseño:
   - Tamaño A4 (210mm × 297mm). @page { size: A4; margin: 18mm 16mm; }
   - @media print { body { margin: 0; } }
   - Fuente base: 10.5pt. 'Georgia','Times New Roman',serif para cuerpo; 'Arial','Helvetica',sans-serif para encabezados (o todo sans-serif si el original parece moderno).
   - Encabezados de sección: negrita, ligeramente más grandes, con borde inferior o barra de acento.
   - Sin activos externos. 100% autocontenido.
   - Texto negro sobre fondo blanco. Un color de acento opcional (#1a3a5c o #333) solo para bordes/reglas.
   - El nombre debe ser prominente (fuente grande, negrita).
5. HTML5 válido con etiquetas semánticas (header, section, h1, h2, ul, etc.).`,
      user: `TEXTO DEL CV ORIGINAL (solo para inferir diseño — NO uses este contenido):\n${originalCV}\n\nTEXTO DEL CV ADAPTADO (usa este contenido):\n${tailoredCV}`
    };
  }
  return {
    system: `You are an expert CV designer and front-end developer.
Your task is to convert a plain-text CV into a single, self-contained HTML document with embedded CSS.

STRICT RULES:
1. Output ONLY the HTML document. Start with <!DOCTYPE html> and end with </html>. No markdown, no code fences, no explanation text before or after.
2. Study the ORIGINAL CV TEXT to infer the intended layout:
   - Single-column vs two-column sidebar layout.
   - Section heading style (all-caps, title case, underlined, with rule, etc.)
   - Bullet symbol used (•, -, *, none) — replicate it.
   - Whether contact info is centered, left-aligned, or split across columns.
3. Use ONLY the content from TAILORED CV TEXT — not the original.
4. Design requirements:
   - A4 paper size. @page { size: A4; margin: 18mm 16mm; }
   - @media print { body { margin: 0; } }
   - Base font size: 10.5pt. 'Georgia','Times New Roman',serif for body; 'Arial','Helvetica',sans-serif for headings — or all sans-serif if original reads as a modern document.
   - Section headings: visually distinct (bold, slightly larger, with bottom border or left accent bar matching the original's style).
   - No external assets (no CDN fonts, no images, no external CSS). 100% self-contained.
   - Black text on white background. One optional accent color (#1a3a5c or #333) for heading rules only.
   - The name/header at the top should be prominent (large, bold).
5. Clean, valid HTML5 with semantic tags (header, section, h1, h2, ul, etc.).`,
    user: `ORIGINAL CV TEXT (for layout inference only — do NOT use this content):\n${originalCV}\n\nTAILORED CV TEXT (use this content):\n${tailoredCV}`
  };
};

router.get('/models', async (req, res) => {
  try {
    const list = await client.models.list();
    const models = list.data
      .filter(m => !m.id.includes('embed') && !m.id.includes('rerank'))
      .map(m => ({ id: m.id }));
    res.json({ models });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not fetch model list.' });
  }
});

router.post('/', requireAuth(), async (req, res) => {
  const { cv, jobDescription, language = 'en', tone = 'professional', model = 'meta/llama-3.3-70b-instruct' } = req.body;

  if (!cv || !jobDescription) {
    return res.status(400).json({ error: 'CV and job description are required.' });
  }

  const { system, user } = buildPrompt(cv, jobDescription, language, tone);

  try {
    const response = await client.chat.completions.create({
      model,
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

router.post('/style', requireAuth(), async (req, res) => {
  const { cv: originalCV, tailoredCV, language = 'en', model = 'meta/llama-3.3-70b-instruct' } = req.body;

  if (!originalCV || !tailoredCV) {
    return res.status(400).json({ error: 'originalCV and tailoredCV are required.' });
  }

  const { system, user } = buildStylePrompt(originalCV, tailoredCV, language);

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    let html = response.choices[0].message.content.trim();
    // Strip markdown code fences the model may emit despite instructions
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
    // Ensure output starts with a DOCTYPE
    if (!html.toLowerCase().startsWith('<!doctype')) {
      const idx = html.toLowerCase().indexOf('<!doctype');
      if (idx > -1) html = html.slice(idx);
      else return res.status(422).json({ error: 'AI did not return a valid HTML document.' });
    }

    res.json({ html });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong generating the styled CV.' });
  }
});

export default router;
