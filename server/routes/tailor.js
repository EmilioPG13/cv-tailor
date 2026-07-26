import express from 'express';
import OpenAI from 'openai';
import { requireAuth } from '../lib/requireAuth.js';
import { getSupabase } from '../lib/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { settingsCache } from '../settingsCache.js';
import { injectFitToPage } from '../lib/templateRender.js';
import { splitTailorSections } from '../lib/tailorSections.js';
import { rateLimit } from '../lib/rateLimit.js';
import { computeFit } from '../lib/fitScore.js';
import { getAuth } from '@clerk/express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const FALLBACK_SETTINGS = {
  llm_model:        'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  design_model:     'deepseek-ai/deepseek-v4-flash',
  tailor_prompt_en: `You are an expert HR consultant and professional CV writer.
Your task is to tailor the user's CV to the provided job description.

FACTUAL RULES (never violate):
- Reproduce the candidate's NAME exactly — same spelling and accents, no added or removed words.
- Never change job titles, employer/company names, dates, or the candidate's stated years of experience.
- Do NOT invent seniority, roles, or experience the candidate does not have.

REWRITE RULES:
- Preserve ALL section headings exactly as they appear in the original CV.
- Keep the same bullet symbol the user uses (•, -, *).
- Only update the wording — do not add or remove sections.
- Rephrase bullets toward the job description using strong action verbs; quantifying achievements with reasonable metrics is allowed.
- {{tone}}

BE CONCISE — the result must fit on ONE page:
- Professional summary: at most 3 sentences.
- Each work experience role: at most 3-4 bullets — keep only the strongest, most relevant points.
- Each project: at most 2 bullets.
- Tighten wording; cut filler.

Return EXACTLY two sections with these headers on their own line (no number, no extra punctuation):

TAILORED CV
[full rewritten CV here]

COVER LETTER
[cover letter here]`,
  tailor_prompt_es: `Eres un experto en recursos humanos y redacción de CVs profesionales.
Tu tarea es adaptar el CV del usuario a la descripción de trabajo proporcionada.

REGLAS DE VERACIDAD (nunca las incumplas):
- Reproduce el NOMBRE del candidato exactamente — misma ortografía y acentos, sin añadir ni quitar palabras.
- Nunca cambies los títulos de puesto, nombres de empresa, fechas ni los años de experiencia declarados.
- NO inventes seniority, puestos ni experiencia que el candidato no tenga.

REGLAS DE REDACCIÓN:
- Conserva EXACTAMENTE los mismos títulos de sección que aparecen en el CV original.
- Mantén el mismo símbolo de viñeta que usa el usuario (•, -, *).
- Solo actualiza el contenido — no añadas ni elimines secciones.
- Reescribe las viñetas hacia la descripción del puesto con verbos de acción; se permite cuantificar logros con métricas razonables.
- {{tone}}

SÉ CONCISO — el resultado debe caber en UNA página:
- Resumen profesional: máximo 3 frases.
- Cada puesto de experiencia: máximo 3-4 viñetas — solo los puntos más fuertes y relevantes.
- Cada proyecto: máximo 2 viñetas.
- Ajusta la redacción; elimina el relleno.

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
3. Reproduce all text content VERBATIM — especially the candidate's name and all proper nouns. Do NOT add, remove, or change any words; only place the provided text into the template.
4. Output ONLY the completed HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown, no code fences, no commentary.
5. Use proper Unicode characters directly — output á, é, ñ, ·, – as-is. Do NOT use Latin-1 escapes or HTML entities for accented characters.`,
  style_prompt_es: `Eres un motor de plantillas HTML preciso.
Recibes una plantilla HTML completa de CV con marcadores {{PLACEHOLDER}} y un TEXTO DEL CV ADAPTADO.

TU TAREA: Reemplaza cada {{PLACEHOLDER}} con el contenido correspondiente del texto del CV.
Para bloques repetidos (experiencia, educación, proyectos, habilidades), copia el patrón HTML proporcionado para cada entrada del CV, siguiendo los comentarios HTML de la plantilla.
Si el CV no tiene contenido para una sección opcional (marcada como tal en los comentarios), omite esa sección por completo.
Elimina todos los comentarios HTML del resultado final.

REGLAS ESTRICTAS:
1. NO cambies ningún CSS, nombre de clase, estructura HTML ni atributos.
2. NO añadas CSS nuevo, estilos en línea ni elementos nuevos más allá de repetir los patrones dados.
3. Reproduce todo el texto TAL CUAL — especialmente el nombre del candidato y todos los nombres propios. NO añadas, quites ni cambies ninguna palabra; solo coloca el texto proporcionado en la plantilla.
4. Genera ÚNICAMENTE el documento HTML completado, comenzando con <!DOCTYPE html> y terminando con </html>. Sin markdown, sin bloques de código, sin comentarios.
5. Usa caracteres Unicode correctos directamente — escribe á, é, ñ, ·, – tal cual. NO uses escapes Latin-1 ni entidades HTML para caracteres acentuados.`,
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

// Token budget for the tailoring call.
//
// A one-page CV plus a cover letter is ~1,200-1,600 tokens of visible output, so
// the old 2048 ceiling looked generous. It wasn't: the default tailor model is a
// reasoning model, and its internal thinking is billed against this same budget.
// That overhead varies run to run, so an unchanged CV/job-description pair could
// come back whole one time and cut mid-word the next, losing the COVER LETTER
// section entirely. Sizing this at roughly 5x the visible output keeps a variable
// reasoning cost from eating into the answer.
const TAILOR_MAX_TOKENS = 8192;

// Report how a completion ended so a clipped response reads as a truncation
// rather than as a short answer. finish_reason === 'length' means the model was
// cut off mid-generation; 'stop' means it finished on its own terms.
// Returns true when the response was truncated.
function logCompletion(label, response) {
  const finishReason = response.choices?.[0]?.finish_reason ?? 'unknown';
  const usage = response.usage ?? {};
  const reasoning = usage.completion_tokens_details?.reasoning_tokens;
  const tokens = `completion=${usage.completion_tokens ?? '?'}`
    + (reasoning != null ? ` (reasoning=${reasoning})` : '')
    + ` prompt=${usage.prompt_tokens ?? '?'}`;

  if (finishReason === 'length') {
    console.warn(`[${label}] TRUNCATED — hit the token ceiling. ${tokens}`);
    return true;
  }
  console.log(`[${label}] finish_reason=${finishReason} ${tokens}`);
  return false;
}

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

// Each of these fans out to a metered upstream call, so they are limited per
// signed-in user. The limiters sit after requireAuth() so getAuth() has a userId
// to key on. Ceilings are set well above real interactive use — a session is a
// handful of runs — and are only meant to stop a loop from draining the quota.
const perUser = req => getAuth(req).userId;

const tailorLimit = rateLimit({
  name: 'tailor', windowMs: 15 * 60 * 1000, max: 15, key: perUser,
  message: 'Too many tailoring runs. Please wait a few minutes and try again.',
});

// Runs automatically after every tailor, so it must be at least as permissive,
// plus headroom for restyling an existing result.
const styleLimit = rateLimit({
  name: 'style', windowMs: 15 * 60 * 1000, max: 25, key: perUser,
  message: 'Too many design renders. Please wait a few minutes and try again.',
});

// Fires from a debounced watcher as the user types, so it is naturally chattier.
const toneLimit = rateLimit({
  name: 'tone', windowMs: 5 * 60 * 1000, max: 30, key: perUser,
});

// Unauthenticated and proxies a live upstream listing, so it is keyed by IP.
// Behind a proxy this needs `app.set('trust proxy', 1)` for req.ip to be the
// real client address rather than the load balancer's.
const modelsLimit = rateLimit({
  name: 'models', windowMs: 5 * 60 * 1000, max: 30, key: req => req.ip,
});

router.get('/info', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ llm_model: settings.llm_model, design_model: settings.design_model });
  } catch {
    res.json({ llm_model: FALLBACK_SETTINGS.llm_model, design_model: FALLBACK_SETTINGS.design_model });
  }
});

router.get('/models', modelsLimit, async (req, res) => {
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

router.post('/', requireAuth(), tailorLimit, async (req, res) => {
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
      temperature: 0.5,
      max_tokens: TAILOR_MAX_TOKENS,
    });

    const truncated = logCompletion('tailor', response);
    const result = response.choices[0].message.content;
    const { tailoredCv, coverLetter } = splitTailorSections(result);

    if (!coverLetter) {
      console.warn(
        `[tailor] no COVER LETTER section in the response${truncated ? ' (response was truncated)' : ''}`
      );
    }

    // Computed here rather than in the client so every consumer — and the row
    // written to history — sees the same number. `fit` is null when the posting
    // had too little distinctive vocabulary to score honestly.
    const { fit, matchedKeywords, missingKeywords } = computeFit(jobDescription, tailoredCv);

    // `result` is the raw two-section text, kept for backward compatibility.
    // New callers should read tailoredCv/coverLetter and ignore it.
    res.json({
      result, tailoredCv, coverLetter, truncated,
      fit, matchedKeywords, missingKeywords,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong with the AI call.' });
  }
});

router.post('/style', requireAuth(), styleLimit, async (req, res) => {
  const {
    language = 'en',
    cvStyle  = 'modern',
    templateFile,
  } = req.body;

  // `tailoredCV` is the older spelling; still accepted so an existing client
  // keeps working against a newer server.
  const tailoredCV = req.body.tailoredCv ?? req.body.tailoredCV;

  if (!tailoredCV) {
    return res.status(400).json({ error: 'tailoredCv is required.' });
  }

  const settings = await getSettings();

  const allowed = ['classic', 'modern', 'creative', 'minimal'];
  const style = allowed.includes(cvStyle) ? cvStyle : 'modern';
  const templatesDir = path.join(__dirname, '..', 'templates');
  // A specific variant the user pinned from the gallery, e.g. "modern-3.html".
  const pinned = typeof templateFile === 'string'
    && /^(classic|modern|creative|minimal)(-\d+)?\.html$/.test(templateFile)
    && fs.existsSync(path.join(templatesDir, templateFile))
      ? templateFile
      : null;
  let template;
  try {
    let pick;
    if (pinned) {
      pick = pinned;
    } else {
      // Each style has multiple variants (style.html, style-2.html, …) — pick one at random
      const variants = fs.readdirSync(templatesDir)
        .filter(f => f === `${style}.html` || new RegExp(`^${style}-\\d+\\.html$`).test(f));
      pick = variants.length > 0
        ? variants[Math.floor(Math.random() * variants.length)]
        : `${style}.html`;
    }
    template = fs.readFileSync(path.join(templatesDir, pick), 'utf8');
  } catch {
    return res.status(500).json({ error: `Template "${style}" could not be loaded.` });
  }
  const { system, user } = buildTemplateStylePrompt(template, tailoredCV, language, settings);
  const messages = [
    { role: 'system', content: system },
    { role: 'user',   content: user },
  ];

  try {
    const response = await client.chat.completions.create({
      model: settings.design_model,
      messages,
      temperature: 0,
      max_tokens: 6000,
    });

    // The doctype check below only inspects the start of the document, so a
    // clipped HTML document would otherwise pass through and render broken.
    logCompletion('style', response);

    let html = response.choices[0].message.content.trim();
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
    html = fixEncodingArtifacts(html);
    if (!html.toLowerCase().startsWith('<!doctype')) {
      const idx = html.toLowerCase().indexOf('<!doctype');
      if (idx > -1) html = html.slice(idx);
      else return res.status(422).json({ error: 'AI did not return a valid HTML document.' });
    }
    html = injectFitToPage(html);

    res.json({ html });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong generating the styled CV.' });
  }
});

const VALID_TONES = ['professional', 'conversational', 'enthusiastic'];

router.post('/detect-tone', requireAuth(), toneLimit, async (req, res) => {
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
