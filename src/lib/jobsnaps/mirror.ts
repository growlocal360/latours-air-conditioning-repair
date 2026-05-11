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
// SEO-safe filename per image — use it verbatim when present. Otherwise fall
// back to a slug-derived name, then to a plain index. Always prefix with the
// snap id so cleanup-by-prefix on unpublish is one list+remove call.
function keyForItem(
  snap: SnapPayload,
  index: number,
  media: SnapMediaItem,
  ext: string,
): string {
  if (media.filename) return `${snap.id}/${media.filename}`;
  if (snap.slug) return `${snap.id}/${snap.slug}-${index}.${ext}`;
  return `${snap.id}/${index}.${ext}`;
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

// On unpublish, sweep every mirrored file under the snap's prefix so we
// don't accumulate orphans.
export async function cleanupSnapImages(snapId: string): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    const { data: files, error: listErr } = await sb.storage
      .from(BUCKET)
      .list(snapId);
    if (listErr) {
      console.error('[mirror] cleanup list failed', listErr);
      return;
    }
    if (!files || files.length === 0) return;
    const keys = files.map((f) => `${snapId}/${f.name}`);
    const { error: rmErr } = await sb.storage.from(BUCKET).remove(keys);
    if (rmErr) console.error('[mirror] cleanup remove failed', rmErr);
  } catch (err) {
    console.error('[mirror] cleanup unexpected error', err);
  }
}
