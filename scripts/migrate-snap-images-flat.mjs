// One-off migration: move snap images from legacy nested storage keys
// (`<snap-uuid>/<filename>`) to the new flat layout (`<filename>`) and update
// each snap row's media[].url accordingly. Idempotent — re-running after a
// successful pass is a no-op because no UUID-prefixed keys remain.
//
// Usage:
//   node --env-file=.env scripts/migrate-snap-images-flat.mjs --dry-run   # preview
//   node --env-file=.env scripts/migrate-snap-images-flat.mjs             # apply
//
// Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const BUCKET = 'snaps';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dryRun = process.argv.includes('--dry-run');

const sb = createClient(url, key, { auth: { persistSession: false } });

function extractStorageKey(publicUrl) {
  const m = publicUrl?.match(/\/storage\/v1\/object\/public\/snaps\/(.+)$/);
  return m ? m[1] : null;
}

function flatKeyFor(legacyKey) {
  // Legacy key shape: `<uuid>/<filename>`. Strip the UUID prefix iff the
  // first segment looks like a UUID — anything else (already flat, or some
  // unexpected shape) is left alone.
  const slash = legacyKey.indexOf('/');
  if (slash < 0) return null;
  const prefix = legacyKey.slice(0, slash);
  const rest = legacyKey.slice(slash + 1);
  if (!UUID_RE.test(prefix) || !rest) return null;
  return rest;
}

function newPublicUrl(flatKey) {
  return sb.storage.from(BUCKET).getPublicUrl(flatKey).data.publicUrl;
}

console.log(dryRun ? 'DRY RUN — no changes will be made.' : 'APPLYING changes.');

const { data: snaps, error: listErr } = await sb
  .from('snaps')
  .select('id, slug, media');
if (listErr) {
  console.error('Failed to list snaps:', listErr.message);
  process.exit(1);
}
console.log(`Found ${snaps.length} snap row(s).`);

let movedFiles = 0;
let updatedRows = 0;

for (const snap of snaps) {
  const media = Array.isArray(snap.media) ? snap.media : [];
  const nextMedia = [];
  let rowChanged = false;

  for (const item of media) {
    const legacyKey = extractStorageKey(item?.url);
    const flatKey = legacyKey ? flatKeyFor(legacyKey) : null;
    if (!flatKey) {
      nextMedia.push(item);
      continue;
    }
    console.log(`  [${snap.slug}] move  ${legacyKey}  →  ${flatKey}`);
    if (!dryRun) {
      const { error: moveErr } = await sb.storage
        .from(BUCKET)
        .move(legacyKey, flatKey);
      if (moveErr) {
        console.error(`    ✗ move failed: ${moveErr.message}`);
        nextMedia.push(item);
        continue;
      }
    }
    nextMedia.push({ ...item, url: newPublicUrl(flatKey) });
    rowChanged = true;
    movedFiles += 1;
  }

  if (rowChanged) {
    console.log(`  [${snap.slug}] update row media URLs (${nextMedia.length} items)`);
    if (!dryRun) {
      const { error: upErr } = await sb
        .from('snaps')
        .update({ media: nextMedia })
        .eq('id', snap.id);
      if (upErr) console.error(`    ✗ row update failed: ${upErr.message}`);
      else updatedRows += 1;
    } else {
      updatedRows += 1;
    }
  }
}

console.log('');
console.log(`Done. files ${dryRun ? 'would-move' : 'moved'}: ${movedFiles}`);
console.log(`      rows  ${dryRun ? 'would-update' : 'updated'}:  ${updatedRows}`);
