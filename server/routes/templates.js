import express from 'express';
import { requireAuth } from '../lib/requireAuth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fillSampleTemplate, injectFitToPage } from '../lib/templateRender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, '..', 'templates');

const router = express.Router();

// Only these style families exist as HTML templates; the regex also guards the
// :file param against path traversal.
const FILE_RE = /^(classic|modern|creative|minimal)(-\d+)?\.html$/;

// Display metadata per style. Variant number is appended at request time.
const STYLE_META = {
  classic: {
    label: 'Classic',
    desc: 'Clean, serif, ATS-safe layout that fits any conservative industry.',
    accent: '#1a1a1a',
    tags: ['ats-safe', 'serif', 'traditional', 'conservative'],
  },
  modern: {
    label: 'Modern',
    desc: 'Polished sans-serif with an accent header and crisp section dividers.',
    accent: '#2563eb',
    tags: ['accent color', 'polished', 'sans-serif', 'tech'],
  },
  creative: {
    label: 'Creative',
    desc: 'Bold two-column design with a colored sidebar for standout roles.',
    accent: '#6366f1',
    tags: ['sidebar', 'two-column', 'bold', 'design'],
  },
  minimal: {
    label: 'Minimal',
    desc: 'Executive whitespace and restrained typography for senior profiles.',
    accent: '#0f172a',
    tags: ['minimal', 'whitespace', 'executive', 'elegant'],
  },
};

// GET /api/templates — metadata for every HTML template on disk.
router.get('/', requireAuth(), (req, res) => {
  try {
    const files = fs.readdirSync(templatesDir).filter(f => FILE_RE.test(f));
    const list = files.map(file => {
      const [, style, variantPart] = file.match(FILE_RE);
      const variant = variantPart ? parseInt(variantPart.slice(1), 10) : 1;
      const meta = STYLE_META[style];
      return {
        file,
        style,
        variant,
        name: `${meta.label} · Variant ${variant}`,
        desc: meta.desc,
        accent: meta.accent,
        tags: meta.tags,
      };
    });
    // Group by style, then by variant, so the gallery reads consistently.
    const order = Object.keys(STYLE_META);
    list.sort((a, b) =>
      order.indexOf(a.style) - order.indexOf(b.style) || a.variant - b.variant);
    res.json({ templates: list });
  } catch (err) {
    console.error('[templates] list error:', err.message);
    res.status(500).json({ error: 'Failed to list templates.' });
  }
});

// GET /api/templates/:file/preview — the template filled with sample data,
// ready to drop into an iframe as a gallery thumbnail.
router.get('/:file/preview', requireAuth(), (req, res) => {
  const { file } = req.params;
  if (!FILE_RE.test(file)) {
    return res.status(400).json({ error: 'Invalid template name.' });
  }
  const fullPath = path.join(templatesDir, file);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Template not found.' });
  }
  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const html = injectFitToPage(fillSampleTemplate(raw));
    res.json({ html });
  } catch (err) {
    console.error('[templates] preview error:', err.message);
    res.status(500).json({ error: 'Failed to render template preview.' });
  }
});

export default router;
