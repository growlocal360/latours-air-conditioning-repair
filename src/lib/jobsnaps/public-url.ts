const PUBLIC_BASE = 'https://latourshvac.com/images/snaps/';
const SUPABASE_SNAPS_RE =
  /^https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/snaps\/(.+)$/;

// Convert a Supabase Storage URL for a mirrored snap photo to its public
// brand-domain URL. Falls back to the input unchanged for anything that
// doesn't match the expected shape (defensive — non-mirrored items, etc.).
//
// Why: serving images from latourshvac.com (via a Vercel rewrite that proxies
// bytes from Supabase Storage) keeps every URL Google indexes on the brand's
// own domain. If Supabase is ever swapped out, the public URLs don't change
// and image-search attribution stays with the brand. The storage key after
// `/snaps/` is preserved verbatim, so this works for new flat keys
// (`<filename>`) and legacy nested keys (`<snap-id>/<filename>`) alike — the
// rewrite passes the same path through to Supabase.
export function toPublicImageUrl(url: string): string {
  const m = url.match(SUPABASE_SNAPS_RE);
  return m ? `${PUBLIC_BASE}${m[1]}` : url;
}
