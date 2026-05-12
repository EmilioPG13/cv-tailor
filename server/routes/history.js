import express from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '../data');
const DATA_FILE = join(DATA_DIR, 'history.json');

async function readHistory() {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeHistory(entries) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

// GET /api/history — all entries, newest first
router.get('/', async (req, res) => {
  const entries = await readHistory();
  res.json(entries);
});

// POST /api/history — prepend new entry, keep last 50
router.post('/', async (req, res) => {
  const { role, company, lang, fit, cv, jd, tailoredCV, cover } = req.body;
  if (!role || !tailoredCV) {
    return res.status(400).json({ error: 'role and tailoredCV are required.' });
  }
  const entries = await readHistory();
  const newEntry = {
    id: Date.now().toString(),
    role,
    company: company || '',
    lang: lang || 'en',
    fit: fit ?? null,
    cv:        cv        || '',
    jd:        jd        || '',
    tailoredCV,
    cover:     cover     || '',
    createdAt: new Date().toISOString(),
  };
  const updated = [newEntry, ...entries].slice(0, 50);
  await writeHistory(updated);
  res.status(201).json(newEntry);
});

// DELETE /api/history/:id
router.delete('/:id', async (req, res) => {
  const entries = await readHistory();
  const filtered = entries.filter(e => e.id !== req.params.id);
  if (filtered.length === entries.length) {
    return res.status(404).json({ error: 'Entry not found.' });
  }
  await writeHistory(filtered);
  res.json({ ok: true });
});

export default router;
