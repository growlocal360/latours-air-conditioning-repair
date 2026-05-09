import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

let _admin: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

// Server-only: bypasses RLS. Use for webhook upserts/deletes.
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = required('SUPABASE_URL', import.meta.env.SUPABASE_URL);
  const key = required(
    'SUPABASE_SERVICE_ROLE_KEY',
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

// Read-only via RLS. Use for SSR page loads.
export function getSupabaseAnon(): SupabaseClient {
  if (_anon) return _anon;
  const url = required('SUPABASE_URL', import.meta.env.SUPABASE_URL);
  const key = required('SUPABASE_ANON_KEY', import.meta.env.SUPABASE_ANON_KEY);
  _anon = createClient(url, key, { auth: { persistSession: false } });
  return _anon;
}
