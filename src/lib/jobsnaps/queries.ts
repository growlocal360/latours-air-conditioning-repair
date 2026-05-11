import { getSupabaseAdmin, getSupabaseAnon } from '../supabase';
import { dedupeSlug, slugify } from './slug';
import type { SnapPayload, SnapRow } from './types';

const COLUMNS =
  'id, short_id, title, slug, url_path, description, meta_title, h1, ' +
  'meta_description, alt_text, public_location_label, service_type, brand, ' +
  'primary_problem, equipment_type, location, media, published_at, ' +
  'created_at, updated_at';

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

// Resolve the slug to persist. GL360's pre-computed slug wins when present
// (their canonical SEO scheme handles collisions via short_id suffix already).
// For legacy snaps without a GL360 slug, fall back to: existing-row slug for
// URL stability, else generate from the title with collision dedupe.
async function resolveSlug(snap: SnapPayload): Promise<string> {
  if (snap.slug) return snap.slug;
  const existing = await existingSlugForId(snap.id);
  if (existing) return existing;
  const desired = slugify(snap.title ?? snap.id);
  return dedupeSlug(desired, snap.id, existingSnapIdForSlug);
}

export async function upsertSnap(snap: SnapPayload): Promise<string> {
  const slug = await resolveSlug(snap);

  const sb = getSupabaseAdmin();
  const row = {
    id: snap.id,
    short_id: snap.short_id,
    title: snap.title,
    slug,
    url_path: snap.url_path,
    description: snap.description,
    meta_title: snap.meta_title,
    h1: snap.h1,
    meta_description: snap.meta_description,
    alt_text: snap.alt_text,
    public_location_label: snap.public_location_label,
    service_type: snap.service_type,
    brand: snap.brand,
    primary_problem: snap.primary_problem,
    equipment_type: snap.equipment_type,
    location: snap.location,
    media: snap.media,
    published_at: snap.published_at,
    created_at: snap.created_at,
  };
  const { error } = await sb.from('snaps').upsert(row, { onConflict: 'id' });
  if (error) throw error;
  return slug;
}

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
