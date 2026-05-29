import express from 'express';
import { requireAuth, clerkClient } from '@clerk/express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAdmin(req, res, next) {
  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    if (user.publicMetadata?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch {
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
    supabase.from('history').select('*', { count: 'exact', head: true }),
    supabase.from('history').select('user_id', { count: 'exact', head: true }),
    supabase.from('templates').select('*', { count: 'exact', head: true }),
  ]);

  if (e1 || e2 || e3) return res.status(500).json({ error: 'Failed to fetch stats' });

  // unique users: count distinct user_ids
  const { data: uniqueRows, error: e4 } = await supabase
    .from('history')
    .select('user_id')
    .limit(10000);

  if (e4) return res.status(500).json({ error: 'Failed to fetch user count' });

  const uniqueUsers = new Set(uniqueRows.map(r => r.user_id)).size;

  res.json({ totalCVs, uniqueUsers, totalTemplates });
});

// GET /api/admin/templates
router.get('/templates', requireAuth(), requireAdmin, async (req, res) => {
  const { data, error } = await supabase
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

  const { data, error } = await supabase
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

  const { data, error } = await supabase
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
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
