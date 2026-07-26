import express from 'express';
import { getAuth, clerkClient } from '@clerk/express';
import { requireAuth } from '../lib/requireAuth.js';
import { getSupabase } from '../lib/supabase.js';

const router = express.Router();

// Roles allowed to access analytics (staff-only feature).
const STAFF_ROLES = ['admin', 'mod'];

async function requireStaff(req, res, next) {
  try {
    const { userId } = getAuth(req);
    const user = await clerkClient.users.getUser(userId);
    if (!STAFF_ROLES.includes(user.publicMetadata?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (err) {
    console.error('[requireStaff] error:', err.message);
    res.status(403).json({ error: 'Forbidden' });
  }
}

// GET /api/analytics/me
// Returns usage statistics for the authenticated user:
//   { total, perDay, topRoles }
router.get('/me', requireAuth(), requireStaff, async (req, res) => {
  const userId = getAuth(req).userId;

  // --- Query 1: total row count for this user ---
  const { count, error: countError } = await getSupabase()
    .from('history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    return res.status(500).json({ error: countError.message });
  }

  // --- Query 2: role + created_at for the last 30 days ---
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error: dataError } = await getSupabase()
    .from('history')
    .select('role, created_at')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true });

  if (dataError) {
    return res.status(500).json({ error: dataError.message });
  }

  // --- Aggregate perDay ---
  // Build a map of date string -> count from the raw rows.
  const dayMap = {};
  for (const row of data) {
    const date = row.created_at.slice(0, 10); // "YYYY-MM-DD"
    dayMap[date] = (dayMap[date] ?? 0) + 1;
  }

  // Fill in zeros for every day in the 30-day window so the client always
  // receives a complete, gapless series.
  const perDay = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    perDay.push({ date: dateStr, count: dayMap[dateStr] ?? 0 });
  }

  // --- Aggregate topRoles ---
  const roleMap = {};
  for (const row of data) {
    const role = (row.role ?? '').trim();
    if (role) {
      roleMap[role] = (roleMap[role] ?? 0) + 1;
    }
  }

  const topRoles = Object.entries(roleMap)
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.json({ total: count ?? 0, perDay, topRoles });
});

export default router;
