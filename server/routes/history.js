import express from 'express';
import { getAuth } from '@clerk/express';
import { requireAuth } from '../lib/requireAuth.js';
import { createClient } from '@supabase/supabase-js';
import { toHistoryEntry } from '../lib/historyEntry.js';

const router = express.Router();

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

// GET /api/history — user's entries, newest first
router.get('/', requireAuth(), async (req, res) => {
  const { data, error } = await getSupabase()
    .from('history')
    .select('*')
    .eq('user_id', getAuth(req).userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(toHistoryEntry));
});

// POST /api/history — save a new entry
router.post('/', requireAuth(), async (req, res) => {
  const { role, company, lang, fit, cv, jd, cover } = req.body;
  // `tailoredCV` is the older spelling; still accepted so an existing client
  // keeps working against a newer server.
  const tailoredCv = req.body.tailoredCv ?? req.body.tailoredCV;
  if (!role || !tailoredCv) {
    return res.status(400).json({ error: 'role and tailoredCv are required.' });
  }

  const { data, error } = await getSupabase()
    .from('history')
    .insert({
      user_id:     getAuth(req).userId,
      role,
      company:     company     || '',
      lang:        lang        || 'en',
      fit:         fit ?? null,
      cv:          cv          || '',
      jd:          jd          || '',
      tailored_cv: tailoredCv,
      cover:       cover       || '',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json(toHistoryEntry(data));
});

// DELETE /api/history/:id — only the owner can delete
router.delete('/:id', requireAuth(), async (req, res) => {
  const { error, count } = await getSupabase()
    .from('history')
    .delete({ count: 'exact' })
    .eq('id', req.params.id)
    .eq('user_id', getAuth(req).userId);

  if (error) return res.status(500).json({ error: error.message });
  if (count === 0) return res.status(404).json({ error: 'Entry not found.' });
  res.json({ ok: true });
});

export default router;
