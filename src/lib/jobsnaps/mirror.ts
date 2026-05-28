import { getSupabaseAdmin } from '../supabase';
import type { SnapMediaItem, SnapPayload } from './types';

const BUCKET = 'snaps';

function extFromContentType(ct: string | null | undefined): string {
  if (!ct) return 'jpg';
  const lower = ct.toLowerCase();
  if (lower.includes('png')) return 'png';
  if (lower.includes('webp')) return 'webp';
  return 'jpg';
}

function contentTypeFromExt(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

// Resolve the storage key for a single media item. GL360 pre-computes an
// SEO-safe filename per image (already globally unique — includes a short
// hash) and we use it verbatim when present. Legacy fallbacks use slug or
// snap id to stay globally unique. Storage is flat (no per-snap folder) so
// the served URL is `/images/snaps/<filename>` with no UUID in the path —
// see ../lib/jobsnaps/public-url.ts for why.
function keyForItem(
  snap: SnapPayload,
  index: number,
  media: SnapMediaItem,
  ext: string,
): string {
  if (media.filename) return media.filename;
  if (snap.slug) return `${snap.slug}-${index}.${ext}`;
  return `${snap.id}-${index}.${ext}`;
}

// Fetch a single image and upload it to the snaps bucket. Returns the public
// URL on success, or null on any failure — callers should drop the failed
// item but keep going with the rest of the media array.
export async function mirrorImage(
  snap: SnapPayload,
  index: number,
  media: SnapMediaItem,
): Promise<string | null> {
  try {
    const res = await fetch(media.url);
    if (!res.ok) {
      console.error(`[mirror] fetch ${res.status} for ${media.url}`);
      return null;
    }
    const ct = res.headers.get('content-type');
    const ext = extFromContentType(ct);
    const contentType = contentTypeFromExt(ext);
    const key = keyForItem(snap, index, media, ext);
    const buffer = await res.arrayBuffer();

    const sb = getSupabaseAdmin();
    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType, upsert: true });
    if (uploadErr) {
      console.error(`[mirror] upload failed for ${key}`, uploadErr);
      return null;
    }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(key);
    return data.publicUrl;
  } catch (err) {
    console.error(`[mirror] error for ${media.url}`, err);
    return null;
  }
}

// Mirror every media item in parallel. Items whose mirror failed are dropped
// from the returned array — better to publish a snap with partial photos
// than to fail the whole upsert.
export async function mirrorMedia(snap: SnapPayload): Promise<SnapMediaItem[]> {
  const media = snap.media ?? [];
  if (media.length === 0) return [];
  const results = await Promise.all(
    media.map(async (item, idx) => {
      const newUrl = await mirrorImage(snap, idx, item);
      if (!newUrl) return null;
      return { ...item, url: newUrl };
    }),
  );
  return results.filter((r): r is SnapMediaItem => r !== null);
}

// On unpublish, sweep every mirrored file for the snap. Flat storage means we
// can't list-by-prefix anymore, so we read the snap's media URLs from the row
// (still present at this point — the webhook calls us before deleteSnapById)
// and derive the storage keys from each public URL. Also sweeps any legacy
// nested files under `<snapId>/` so prior-format mirrors get cleaned up too.
export async function cleanupSnapImages(snapId: string): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    const keys: string[] = [];

    const { data: row, error: fetchErr } = await sb
      .from('snaps')
      .select('media')
      .eq('id', snapId)
      .maybeSingle();
    if (fetchErr) {
      console.error('[mirror] cleanup fetch failed', fetchErr);
    } else {
      const media = (row?.media as { url?: string }[] | null) ?? [];
      for (const item of media) {
        const m = item.url?.match(/\/storage\/v1\/object\/public\/snaps\/(.+)$/);
        if (m) keys.push(m[1]);
      }
    }

    // Legacy nested files (pre-flat-storage). Harmless no-op for snaps that
    // were always flat — list() just returns [] for a non-existent prefix.
    const { data: legacy } = await sb.storage.from(BUCKET).list(snapId);
    if (legacy && legacy.length > 0) {
      for (const f of legacy) keys.push(`${snapId}/${f.name}`);
    }

    if (keys.length === 0) return;
    const { error: rmErr } = await sb.storage.from(BUCKET).remove(keys);
    if (rmErr) console.error('[mirror] cleanup remove failed', rmErr);
  } catch (err) {
    console.error('[mirror] cleanup unexpected error', err);
  }
}
