import { getSupabaseAdmin, getSupabaseAnon } from '../supabase';
import { dedupeSlug, slugify } from './slug';
import type { SnapPayload, SnapRow } from './types';

const COLUMNS =
  'id, title, slug, description, service_type, brand, location, media, published_at, created_at, updated_at';

export async function listPublishedSnaps(limit = 60): Promise<SnapRow[]> {
  const sb = getSupabaseAnon();
  const { data, error } = await sb
    .from('snaps')
    .select(COLUMNS)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SnapRow[];
}

export async function getSnapBySlug(slug: string): Promise<SnapRow | null> {
  const sb = getSupabaseAnon();
  const { data, error } = await sb
    .from('snaps')
    .select(COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as SnapRow | null) ?? null;
}

async function existingSnapIdForSlug(slug: string): Promise<string | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('snaps')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function existingSlugForId(id: string): Promise<string | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('snaps')
    .select('slug')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data?.slug ?? null;
}

// Returns the slug that ends up persisted.
export async function upsertSnap(snap: SnapPayload): Promise<string> {
  const existingSlug = await existingSlugForId(snap.id);
  // Once a snap is live, keep its slug stable for SEO even if the title changes.
  let slug = existingSlug;
  if (!slug) {
    const desired = slugify(snap.title ?? snap.id);
    slug = await dedupeSlug(desired, snap.id, existingSnapIdForSlug);
  }

  const sb = getSupabaseAdmin();
  const row = {
    id: snap.id,
    title: snap.title,
    slug,
    description: snap.description,
    service_type: snap.service_type,
    brand: snap.brand,
    location: snap.location,
    media: snap.media,
    published_at: snap.published_at,
    created_at: snap.created_at,
  };
  const { error } = await sb.from('snaps').upsert(row, { onConflict: 'id' });
  if (error) throw error;
  return slug;
}

// Returns the slug that was deleted (if any), so callers can revalidate it.
export async function deleteSnapById(id: string): Promise<string | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('snaps')
    .delete()
    .eq('id', id)
    .select('slug')
    .maybeSingle();
  if (error) throw error;
  return data?.slug ?? null;
}
