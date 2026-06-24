import express from 'express';
import { getAuth, clerkClient } from '@clerk/express';
import { requireAuth } from '../lib/requireAuth.js';
import { createClient } from '@supabase/supabase-js';
import { invalidateSettingsCache } from '../settingsCache.js';

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

async function requireAdmin(req, res, next) {
  try {
    const { userId } = getAuth(req);
    const user = await clerkClient.users.getUser(userId);
    if (user.publicMetadata?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!user.twoFactorEnabled) {
      return res.status(403).json({ error: 'Admin accounts require two-factor authentication. Enable it in your account settings.' });
    }
    next();
  } catch (err) {
    console.error('[requireAdmin] error:', err.message);
    res.status(403).json({ error: 'Forbidden' });
  }
}

// GET /api/admin/stats
router.get('/stats', requireAuth(), requireAdmin, async (req, res) => {
  const [
    { count: totalCVs, error: e1 },
    { count: totalUsers, error: e2 },
    { count: totalTemplates, error: e3 },
  ] = await Promise.all([
    getSupabase().from('history').select('*', { count: 'exact', head: true }),
    getSupabase().from('history').select('user_id', { count: 'exact', head: true }),
    getSupabase().from('templates').select('*', { count: 'exact', head: true }),
  ]);

  if (e1 || e2 || e3) return res.status(500).json({ error: 'Failed to fetch stats' });

  // unique users: count distinct user_ids
  const { data: uniqueRows, error: e4 } = await getSupabase()
    .from('history')
    .select('user_id')
    .limit(10000);

  if (e4) return res.status(500).json({ error: 'Failed to fetch user count' });

  const uniqueUsers = new Set(uniqueRows.map(r => r.user_id)).size;

  res.json({ totalCVs, uniqueUsers, totalTemplates });
});

// GET /api/admin/templates
router.get('/templates', requireAuth(), requireAdmin, async (req, res) => {
  const { data, error } = await getSupabase()
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/admin/templates
router.post('/templates', requireAuth(), requireAdmin, async (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) {
    return res.status(400).json({ error: 'name and content are required.' });
  }

  const { data, error } = await getSupabase()
    .from('templates')
    .insert({ name, content })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/admin/templates/:id
router.put('/templates/:id', requireAuth(), requireAdmin, async (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) {
    return res.status(400).json({ error: 'name and content are required.' });
  }

  const { data, error } = await getSupabase()
    .from('templates')
    .update({ name, content })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/admin/templates/:id
router.delete('/templates/:id', requireAuth(), requireAdmin, async (req, res) => {
  const { error } = await getSupabase()
    .from('templates')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// GET /api/admin/settings
router.get('/settings', requireAuth(), requireAdmin, async (req, res) => {
  const { data, error } = await getSupabase()
    .from('app_settings')
    .select('key, value, updated_at')
    .order('key');

  if (error) return res.status(500).json({ error: error.message });
  // Return as key→value map for easier consumption
  const map = {};
  for (const row of data) map[row.key] = row.value;
  res.json(map);
});

// PUT /api/admin/settings/:key
router.put('/settings/:key', requireAuth(), requireAdmin, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined || value === null) {
    return res.status(400).json({ error: 'value is required.' });
  }

  const { data, error } = await getSupabase()
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Invalidate the tailor route's in-memory cache so next request picks up new value
  invalidateSettingsCache();

  res.json(data);
});

export default router;
