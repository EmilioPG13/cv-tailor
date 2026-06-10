import express from 'express';
import OpenAI from 'openai';
import { requireAuth } from '@clerk/express';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { settingsCache } from '../settingsCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1'
});

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    }
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

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

const FALLBACK_SETTINGS = {
  llm_model:        'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  design_model:     'deepseek-ai/deepseek-v4-flash',
  tailor_prompt_en: `You are an expert HR consultant and professional CV writer.
Your task is to tailor the user's CV to the provided job description.
Rules:
- Preserve ALL section headings exactly as they appear in the original CV.
- Keep the same bullet symbol the user uses (•, -, *).
- Only update the wording — do not add or remove sections.
- Use strong action verbs and quantify achievements where possible.
- {{tone}}

Return EXACTLY two sections with these headers on their own line (no number, no extra punctuation):

TAILORED CV
[full rewritten CV here]

COVER LETTER
[cover letter here]`,
  tailor_prompt_es: `Eres un experto en recursos humanos y redacción de CVs profesionales.
Tu tarea es adaptar el CV del usuario a la descripción de trabajo proporcionada.
Reglas:
- Conserva EXACTAMENTE los mismos títulos de sección que aparecen en el CV original.
- Mantén el mismo símbolo de viñeta que usa el usuario (•, -, *).
- Solo actualiza el contenido — no añadas ni elimines secciones.
- Usa verbos de acción y cuantifica logros cuando sea posible.
- {{tone}}

Devuelve EXACTAMENTE dos secciones con estos encabezados en su propia línea (sin número, sin puntuación extra):

CV ADAPTADO
[CV completo reescrito aquí]

CARTA DE PRESENTACIÓN
[carta de presentación aquí]`,
  style_prompt_en: `You are a precise HTML templating engine.
You receive a complete HTML CV template with {{PLACEHOLDER}} markers and a TAILORED CV TEXT.

YOUR TASK: Replace every {{PLACEHOLDER}} with the matching content from the CV text.
For repeating blocks (experience, education, projects, skills), copy the provided HTML pattern for each entry found in the CV, following the HTML comments in the template.
If the CV has no content for an optional section (marked as such in the comments), omit that section entirely.
Remove all HTML comments from the final output.

STRICT RULES:
1. Do NOT change any CSS, class names, HTML structure, or attributes.
2. Do NOT add new CSS, inline styles, or new elements beyond repeating the given patterns.
3. Output ONLY the completed HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown, no code fences, no commentary.
4. Use proper Unicode characters directly — output á, é, ñ, ·, – as-is. Do NOT use Latin-1 escapes or HTML entities for accented characters.`,
  style_prompt_es: `Eres un motor de plantillas HTML preciso.
Recibes una plantilla HTML completa de CV con marcadores {{PLACEHOLDER}} y un TEXTO DEL CV ADAPTADO.

TU TAREA: Reemplaza cada {{PLACEHOLDER}} con el contenido correspondiente del texto del CV.
Para bloques repetidos (experiencia, educación, proyectos, habilidades), copia el patrón HTML proporcionado para cada entrada del CV, siguiendo los comentarios HTML de la plantilla.
Si el CV no tiene contenido para una sección opcional (marcada como tal en los comentarios), omite esa sección por completo.
Elimina todos los comentarios HTML del resultado final.

REGLAS ESTRICTAS:
1. NO cambies ningún CSS, nombre de clase, estructura HTML ni atributos.
2. NO añadas CSS nuevo, estilos en línea ni elementos nuevos más allá de repetir los patrones dados.
3. Genera ÚNICAMENTE el documento HTML completado, comenzando con <!DOCTYPE html> y terminando con </html>. Sin markdown, sin bloques de código, sin comentarios.
4. Usa caracteres Unicode correctos directamente — escribe á, é, ñ, ·, – tal cual. NO uses escapes Latin-1 ni entidades HTML para caracteres acentuados.`,
};

const SETTINGS_TTL_MS = 5 * 60 * 1000;

async function getSettings() {
  if (settingsCache.data && settingsCache.expiry > Date.now()) {
    return settingsCache.data;
  }
  try {
    const { data, error } = await getSupabase()
      .from('app_settings')
      .select('key, value');
    if (error || !data) throw error ?? new Error('No data');
    const merged = { ...FALLBACK_SETTINGS };
    for (const row of data) merged[row.key] = row.value;
    settingsCache.data = merged;
    settingsCache.expiry = Date.now() + SETTINGS_TTL_MS;
    return merged;
  } catch {
    return FALLBACK_SETTINGS;
  }
}

const buildPrompt = (cv, jobDescription, language, tone, settings) => {
  const isEs = language === 'es';
  const toneInstruction = TONE_INSTRUCTIONS[isEs ? 'es' : 'en'][tone]
    ?? TONE_INSTRUCTIONS[isEs ? 'es' : 'en'].professional;
  const systemTemplate = isEs ? settings.tailor_prompt_es : settings.tailor_prompt_en;
  const system = systemTemplate.replace('{{tone}}', toneInstruction);
  const user = isEs
    ? `CV ACTUAL:\n${cv}\n\nDESCRIPCIÓN DEL TRABAJO:\n${jobDescription}`
    : `CURRENT CV:\n${cv}\n\nJOB DESCRIPTION:\n${jobDescription}`;
  return { system, user };
};

const buildTemplateStylePrompt = (template, tailoredCV, language, settings) => {
  const isEs = language === 'es';
  const system = isEs ? settings.style_prompt_es : settings.style_prompt_en;
  const user = isEs
    ? `PLANTILLA HTML:\n${template}\n\nTEXTO DEL CV ADAPTADO:\n${tailoredCV}`
    : `HTML TEMPLATE:\n${template}\n\nTAILORED CV TEXT:\n${tailoredCV}`;
  return { system, user };
};

// Fix common double-encoded UTF-8 artifacts the LLM sometimes emits
function fixEncodingArtifacts(html) {
  return html
    .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ã±/g, 'ñ')
    .replace(/Ã‰/g, 'É').replace(/Ã“/g, 'Ó').replace(/Ãš/g, 'Ú')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/â€¢/g, '•').replace(/â€“/g, '–').replace(/â€”/g, '—')
    .replace(/â€™/g, '’').replace(/â€˜/g, '‘')
    .replace(/â€œ/g, '“').replace(/â€/g, '”')
    .replace(/Â·/g, '·').replace(/Â /g, ' ');
}

const buildVisionStylePrompt = (tailoredCV, language) => {
  const isEs = language === 'es';
  return {
    system: isEs
      ? `Eres un experto en diseño de CVs y desarrollo front-end.
La imagen adjunta muestra el CV original del usuario.
Tu tarea es crear un documento HTML completo y autocontenido con CSS embebido que replique fielmente ese diseño visual, usando el contenido del CV ADAPTADO.

REGLAS ESTRICTAS:
1. Estudia la imagen: disposición (columnas, barra lateral), colores, tipografía, estilo de encabezados de sección, alineación del contacto — y replícalo exactamente.
2. Usa ÚNICAMENTE el contenido del TEXTO DEL CV ADAPTADO.
3. Genera ÚNICAMENTE el documento HTML. Comienza con <!DOCTYPE html> y termina con </html>. Sin markdown, sin bloques de código.
4. Sin activos externos (sin fuentes CDN, sin imágenes externas). 100% autocontenido.
5. @page { size: A4; margin: 18mm 16mm; } @media print { body { margin: 0; } }`
      : `You are an expert CV designer and front-end developer.
The attached image shows the user's original CV.
Your task is to create a complete, self-contained HTML document with embedded CSS that faithfully replicates that visual design, using the content from TAILORED CV TEXT.

STRICT RULES:
1. Study the image: layout (columns, sidebar), colors, typography, section heading style, contact alignment — and replicate it exactly.
2. Use ONLY the content from TAILORED CV TEXT.
3. Output ONLY the HTML document. Start with <!DOCTYPE html> and end with </html>. No markdown, no code fences.
4. No external assets (no CDN fonts, no external images). 100% self-contained.
5. @page { size: A4; margin: 18mm 16mm; } @media print { body { margin: 0; } }`,
    user: isEs
      ? `TEXTO DEL CV ADAPTADO (usa este contenido):\n${tailoredCV}`
      : `TAILORED CV TEXT (use this content):\n${tailoredCV}`
  };
};

const NVIDIA_MODELS_FALLBACK = [
  'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  'deepseek-ai/deepseek-v4-flash',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'deepseek-ai/deepseek-v4-pro',
  'meta/llama-3.3-70b-instruct',
  'meta/llama-4-maverick-17b-128e-instruct',
  'meta/llama-3.1-70b-instruct',
  'meta/llama-3.1-8b-instruct',
  'mistralai/mistral-large-2-instruct',
  'mistralai/mixtral-8x7b-instruct-v0.1',
  'mistralai/mistral-7b-instruct-v0.3',
  'qwen/qwen3.5-397b-a17b',
  'google/gemma-3-12b-it',
  'microsoft/phi-4-mini-instruct',
].map(id => ({ id }));

router.get('/info', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ llm_model: settings.llm_model, design_model: settings.design_model });
  } catch {
    res.json({ llm_model: FALLBACK_SETTINGS.llm_model, design_model: FALLBACK_SETTINGS.design_model });
  }
});

router.get('/models', async (req, res) => {
  try {
    const seen = new Set();
    const models = [];
    for await (const model of client.models.list()) {
      if (!model.id.includes('embed') && !model.id.includes('rerank') && !seen.has(model.id)) {
        seen.add(model.id);
        models.push({ id: model.id });
      }
    }
    res.json({ models: models.length > 0 ? models : NVIDIA_MODELS_FALLBACK });
  } catch (error) {
    console.error('Models fetch error:', error.message);
    res.json({ models: NVIDIA_MODELS_FALLBACK });
  }
});

router.post('/', requireAuth(), async (req, res) => {
  const { cv, jobDescription, language = 'en', tone = 'professional' } = req.body;

  if (!cv || !jobDescription) {
    return res.status(400).json({ error: 'CV and job description are required.' });
  }

  const settings = await getSettings();
  const { system, user } = buildPrompt(cv, jobDescription, language, tone, settings);

  try {
    const response = await client.chat.completions.create({
      model: settings.llm_model,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user }
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
  const {
    tailoredCV,
    language      = 'en',
    cvStyle       = 'modern',
    cvPreviewImage = null,
  } = req.body;

  if (!tailoredCV) {
    return res.status(400).json({ error: 'tailoredCV is required.' });
  }

  const settings = await getSettings();
  let messages;
  let activeModel = settings.design_model;

  if (cvPreviewImage) {
    activeModel = 'meta/llama-3.2-90b-vision-instruct';
    const { system, user } = buildVisionStylePrompt(tailoredCV, language);
    messages = [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${cvPreviewImage}` } },
          { type: 'text', text: user },
        ],
      },
    ];
  } else {
    const allowed = ['classic', 'modern', 'creative', 'minimal'];
    const style = allowed.includes(cvStyle) ? cvStyle : 'modern';
    const templatePath = path.join(__dirname, '..', 'templates', `${style}.html`);
    let template;
    try {
      template = fs.readFileSync(templatePath, 'utf8');
    } catch {
      return res.status(500).json({ error: `Template "${style}" could not be loaded.` });
    }
    const { system, user } = buildTemplateStylePrompt(template, tailoredCV, language, settings);
    messages = [
      { role: 'system', content: system },
      { role: 'user',   content: user },
    ];
  }

  try {
    const response = await client.chat.completions.create({
      model: activeModel,
      messages,
      temperature: 0.2,
      max_tokens: 6000,
    });

    let html = response.choices[0].message.content.trim();
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
    html = fixEncodingArtifacts(html);
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

const VALID_TONES = ['professional', 'conversational', 'enthusiastic'];

router.post('/detect-tone', requireAuth(), async (req, res) => {
  const { jobDescription, language = 'en' } = req.body;

  if (!jobDescription || typeof jobDescription !== 'string') {
    return res.status(400).json({ error: 'jobDescription is required.' });
  }

  const snippet = jobDescription.slice(0, 600);
  const prompt = language === 'es'
    ? `Analiza la siguiente descripción de trabajo y determina qué tono encaja mejor con la cultura de la empresa.
Elige exactamente uno:
- professional: formal, corporativo, finanzas, legal, B2B empresarial
- conversational: cercano, startup, remote-first, centrado en las personas
- enthusiastic: creativo, marketing, gaming, productos de consumo de alta energía

Responde con UNA SOLA palabra en inglés — sin puntuación, sin explicación.

DESCRIPCIÓN DEL TRABAJO:
${snippet}`
    : `Analyze the following job description and determine which tone best fits the company culture.
Choose exactly one:
- professional: formal, corporate, finance, legal, enterprise B2B
- conversational: friendly, startup, remote-first, people-focused
- enthusiastic: creative, marketing, gaming, high-energy consumer products

Respond with ONLY one word — no punctuation, no explanation.

JOB DESCRIPTION:
${snippet}`;

  try {
    const settings = await getSettings();
    const response = await client.chat.completions.create({
      model: settings.llm_model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 10,
    });

    const raw = (response.choices[0].message.content || '').trim().toLowerCase();
    const tone = VALID_TONES.find(v => raw.includes(v));
    if (!tone) {
      return res.status(422).json({ error: 'Could not determine tone.' });
    }
    res.json({ tone });
  } catch (error) {
    console.error('Tone detection error:', error.message);
    res.status(500).json({ error: 'Tone detection failed.' });
  }
});

export default router;
