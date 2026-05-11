import { getSupabaseAdmin } from '../supabase';
import type { SnapMediaItem } from './types';

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

// Fetch a single image and upload it to the snaps bucket at a deterministic
// key (<snapId>/<index>.<ext>) so re-publishes overwrite the same object.
// Returns the public URL on success, or null on any failure — callers should
// drop the failed item but keep going with the rest.
export async function mirrorImage(
  snapId: string,
  index: number,
  originalUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(originalUrl);
    if (!res.ok) {
      console.error(`[mirror] fetch ${res.status} for ${originalUrl}`);
      return null;
    }
    const ct = res.headers.get('content-type');
    const ext = extFromContentType(ct);
    const contentType = contentTypeFromExt(ext);
    const key = `${snapId}/${index}.${ext}`;
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
    console.error(`[mirror] error for ${originalUrl}`, err);
    return null;
  }
}

// Mirror every media item in parallel. Items whose mirror failed are dropped
// from the returned array — better to publish a snap with partial photos
// than to fail the whole upsert.
export async function mirrorMedia(
  snapId: string,
  media: SnapMediaItem[],
): Promise<SnapMediaItem[]> {
  if (!media || media.length === 0) return [];
  const results = await Promise.all(
    media.map(async (item, idx) => {
      const newUrl = await mirrorImage(snapId, idx, item.url);
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
