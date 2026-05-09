import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Look up an env var by trying multiple names in order. Lets the same
// codebase work whether the project uses unprefixed names or the
// NEXT_PUBLIC_* convention installed by Supabase's Vercel integration.
function firstSet(names: string[]): { name: string; value: string } | null {
  const env = import.meta.env as Record<string, string | undefined>;
  for (const name of names) {
    const v = env[name];
    if (v) return { name, value: v };
  }
  return null;
}

function requireEnv(names: string[]): string {
  const found = firstSet(names);
  if (!found) {
    throw new Error(
      `Missing required env var. Set one of: ${names.join(', ')}`,
    );
  }
  return found.value;
}

let _admin: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

// Server-only: bypasses RLS. Use for webhook upserts/deletes.
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = requireEnv(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
  const key = requireEnv(['SUPABASE_SERVICE_ROLE_KEY']);
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

// Read-only via RLS. Use for SSR page loads.
export function getSupabaseAnon(): SupabaseClient {
  if (_anon) return _anon;
  const url = requireEnv(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
  const key = requireEnv([
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]);
  _anon = createClient(url, key, { auth: { persistSession: false } });
  return _anon;
}
