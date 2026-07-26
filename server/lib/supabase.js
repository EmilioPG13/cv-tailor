// Shared Supabase client.
//
// This lazy singleton was copy-pasted verbatim into four route files. Built on
// first use rather than at import so a missing credential surfaces as a failed
// request instead of preventing the module from loading at all — which also
// keeps the routes importable from tests.
//
// Uses the service-role key and therefore bypasses row-level security. Every
// query must scope itself to the caller (`.eq('user_id', …)`); the database will
// not do it for you.
import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabase() {
  if (!client) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    }
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return client;
}

// Test seam — lets a suite point the client at a stub server after import.
export function resetSupabase() {
  client = null;
}
