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
  style_prompt_en: `You are an expert HTML/CSS developer and CV designer.
You receive three inputs:
1. CSS STYLES — the complete stylesheet that defines the visual identity (colors, layout, typography, spacing).
2. HTML SKELETON — the HTML structure showing element types and class names, without real content.
3. TAILORED CV TEXT — the candidate's information to place into the document.

YOUR TASK: Produce a complete, self-contained HTML document that:
- Embeds the CSS STYLES block verbatim inside a <style> tag in <head> — do not alter any rule.
- Replicates the HTML SKELETON exactly: same elements, same class names, same nesting hierarchy.
- Fills each element with the matching content from TAILORED CV TEXT.
- Adjusts repeating blocks (jobs, education items, skills) to match the actual CV data, always using the same HTML pattern shown in the skeleton.

STRICT RULES:
1. Do NOT invent new CSS classes, IDs, or inline styles beyond what the skeleton shows.
2. Do NOT modify the CSS.
3. Output ONLY the HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown, no code fences, no commentary.`,
  style_prompt_es: `Eres un experto en HTML/CSS y diseño de CVs.
Recibes tres entradas:
1. ESTILOS CSS — la hoja de estilos completa que define la identidad visual (colores, maquetación, tipografía, espaciado).
2. ESQUELETO HTML — la estructura HTML con tipos de elemento y nombres de clase, sin contenido real.
3. TEXTO DEL CV ADAPTADO — la información del candidato que debes insertar en el documento.

TU TAREA: Generar un documento HTML completo y autocontenido que:
- Embeba el bloque ESTILOS CSS tal cual dentro de una etiqueta <style> en <head> — sin alterar ninguna regla.
- Replique el ESQUELETO HTML exactamente: mismos elementos, mismos nombres de clase, misma jerarquía de anidamiento.
- Rellene cada elemento con el contenido correspondiente del TEXTO DEL CV ADAPTADO.
- Ajuste los bloques repetidos (empleos, estudios, habilidades) para coincidir con el CV real, usando siempre el mismo patrón HTML del esqueleto.

REGLAS ESTRICTAS:
1. NO inventes nuevas clases CSS, IDs ni estilos en línea más allá de lo que muestra el esqueleto.
2. NO modifiques el CSS.
3. Genera ÚNICAMENTE el documento HTML, comenzando con <!DOCTYPE html> y terminando con </html>. Sin markdown, sin bloques de código, sin comentarios.`,
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

function extractCssAndSkeleton(html) {
  const cssMatch = html.match(/<style[^>]*>[\s\S]*?<\/style>/i);
  const css = cssMatch ? cssMatch[0] : '';
  const bodyMatch = html.match(/<body[^>]*>[\s\S]*?<\/body>/i);
  if (!bodyMatch) return { css, skeleton: '<body></body>' };
  // Replace non-whitespace text nodes with '…' to strip sample content while preserving structure
  const skeleton = bodyMatch[0].replace(/(?<=>)([^<]+)(?=<)/g, (_, text) =>
    text.trim() ? '…' : text
  );
  return { css, skeleton };
}

const buildTemplateStylePrompt = (template, tailoredCV, language, settings) => {
  const isEs = language === 'es';
  const { css, skeleton } = extractCssAndSkeleton(template);
  const system = isEs ? settings.style_prompt_es : settings.style_prompt_en;
  const user = isEs
    ? `ESTILOS CSS:\n${css}\n\nESQUELETO HTML:\n${skeleton}\n\nTEXTO DEL CV ADAPTADO:\n${tailoredCV}`
    : `CSS STYLES:\n${css}\n\nHTML SKELETON:\n${skeleton}\n\nTAILORED CV TEXT:\n${tailoredCV}`;
  return { system, user };
};

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
