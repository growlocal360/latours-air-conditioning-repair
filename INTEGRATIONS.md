# Integrations status

Working doc for everything we've shipped on this site. Read this first when picking up a session — it's the canonical "where are we" document.

**Last updated:** 2026-05-10
**Production deploy:** `latours-air-conditioning-repair.vercel.app` (auto-deploys from `main`)
**Custom domain:** `latourshvac.com` ⚠️ **still pointed at the old WordPress site**, NOT Vercel. Do not test on the apex domain — use the `*.vercel.app` URL.

---

## Big-picture project shape

This started as a static Astro site. We added a Job Snaps feature that needed a webhook + DB-backed pages, so the build mode was switched to `hybrid`:

- All existing marketing pages (50+) remain pre-rendered static HTML — no runtime cost, served from the CDN.
- Only `/api/*`, `/work`, `/work/[slug]`, and `/sitemap-snaps.xml` opt into SSR via `export const prerender = false`. They run as a single Vercel serverless function (`_render`).
- Edge cache (`s-maxage=30/60/300`) keeps the SSR routes effectively as fast as static after the first hit.

The schedule-service form is **client-side only** — it POSTs straight to a HighLevel webhook URL hardcoded in the page. It does not touch Supabase or our `/api/*` routes.

---

## What's working in production today

### Job Snaps (GrowLocal 360) — ✅ live end-to-end

| Item | Status |
|---|---|
| Astro hybrid mode + `@astrojs/vercel/serverless` adapter | ✅ |
| Supabase `public.snaps` table created (with RLS + GRANTs) | ✅ |
| Webhook handler [src/pages/api/jobsnaps-webhook.ts](src/pages/api/jobsnaps-webhook.ts) — HMAC-SHA256 verify, 5-min replay window | ✅ |
| Listing page [src/pages/work/index.astro](src/pages/work/index.astro) | ✅ |
| Detail page [src/pages/work/[slug].astro](src/pages/work/%5Bslug%5D.astro) — Article JSON-LD, dynamic OG image, canonical URL | ✅ |
| Dynamic snap sitemap [src/pages/sitemap-snaps.xml.ts](src/pages/sitemap-snaps.xml.ts) — 5-min edge cache, picks up new/deleted snaps automatically | ✅ |
| [public/robots.txt](public/robots.txt) advertising both sitemaps to crawlers | ✅ |
| "View Our Work" link in header dropdown + footer Resources | ✅ |
| `JOBSNAPS_*` env vars in Vercel | ✅ |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel (or the `NEXT_PUBLIC_*` versions — code accepts either) | ✅ |
| First end-to-end test snap published | 🟡 webhook delivery from GrowLocal still needs verification — see "Open verification step" below |

#### Production gotchas we hit (and fixed)

If anything similar comes up again, these are the patches that resolved them:

1. **`nodejs18.x` runtime rejected by Vercel.** The Astro Vercel v7 adapter supports Node 18 / 20 only. Vercel builds default to Node 22 → adapter falls back to `nodejs18.x` → Vercel rejects. Fix: `engines.node: "20.x"` in [package.json](package.json).
2. **`Node.js 20 detected without native WebSocket support`.** Supabase JS client eagerly initializes a Realtime client at construction time, which needs a WebSocket constructor. Fix: install `ws` and pass it via `realtime.transport` in [src/lib/supabase.ts](src/lib/supabase.ts). We don't use Realtime, but the init still runs.
3. **`permission denied for table snaps`.** RLS policy alone isn't enough — newer Supabase projects don't auto-grant on new tables. Fix: explicit `GRANT SELECT ON public.snaps TO anon, authenticated; GRANT ALL ON public.snaps TO service_role` in the migration.
4. **`Missing required env var: SUPABASE_URL`.** Supabase's Vercel integration installs vars under `NEXT_PUBLIC_*` (Next.js convention). Fix: [src/lib/supabase.ts](src/lib/supabase.ts) reads either `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` — same for the anon key.
5. **`@astrojs/sitemap@3.7.x` crash under Astro 4.** That release uses `astro:routes:resolved` (Astro 5+ hook). Fix: pin to `^3.2.1`.

#### Open verification step

The user published a "HVAC Service Call Fuel Stop - Coffee:30" snap in GrowLocal admin and it didn't appear on `/work`. Three possibilities, in priority order:

1. GrowLocal's "Connect Your Website" tab on their side may need to be enabled per-account (the brief said the webhook was already configured, but worth re-checking)
2. GrowLocal sent the webhook but it failed signature verification (check Vercel logs for a `POST /api/jobsnaps-webhook` entry — 401 = secret mismatch)
3. GrowLocal didn't fire a webhook at all on publish

If the user provides the Vercel function log line for the publish event, we can pinpoint which.

#### How to verify locally
```sh
# Sitemap with all currently-published snaps
curl https://latours-air-conditioning-repair.vercel.app/sitemap-snaps.xml

# robots.txt advertising both sitemaps
curl https://latours-air-conditioning-repair.vercel.app/robots.txt

# Listing page
curl -I https://latours-air-conditioning-repair.vercel.app/work
```

---

### Schedule Service form — ✅ converted to 3-step flow

[src/pages/schedule-service/index.astro](src/pages/schedule-service/index.astro) was a single flat form. It is now a 3-step multi-step form with progress bar:

1. **What Do You Need Help With?** — service_type, urgency, preferred_date, preferred_time, equipment_info, problem_description
2. **Where Should We Send Your Appointment Options?** — first_name, last_name, phone, email
3. **Where Is Service Needed?** — address, city/state/zip, consent + final submit

**Critical:** every field's `id`, `name`, `required`, default value, and dropdown option preserved exactly. The submit handler — including the GHL webhook URL `services.leadconnectorhq.com/hooks/R611puAaZDQp12dpdWA3/webhook-trigger/82b2a49e-1216-40c5-aa3c-35672eeb15a6` and the full payload (first_name, last_name, name, phone, email, address1, city, state, postal_code, service_type, urgency, preferred_date, preferred_time, **appointment_datetime** in `MM-DD-YYYY HH:MM A` format, equipment_info, message, source, tags, additional_info, notes) — is unchanged. **Data sent to HighLevel is byte-identical to the previous form.**

Per-step validation uses native `checkValidity()` on the current step's fields only; final submit uses normal browser validation across the whole form.

This form's webhook URL is **independent** of any HighLevel API key. Regenerating the v1 API key in HighLevel does not affect this form.

---

### HighLevel — ✅ credentials verified, posting script not yet built

| Item | Status |
|---|---|
| v2 Private Integration Token (`GHL_PIT`) created with the lean scope set | ✅ in `.env` |
| Sub-account Location ID (`GHL_LOCATION_ID`) | ✅ in `.env` |
| Live API call returned HTTP 200 with two connected accounts | ✅ |
| `scripts/list-social-accounts.mjs` (Node wrapper for the curl) | ⏳ not yet written |
| `scripts/schedule-social-post.mjs` (creates posts via Social Planner API) | ⏳ not yet written |
| First test post end-to-end | ⏳ pending |

**Connected social accounts (last verified 2026-04-30):**

| Platform | Name | Token expires | Notes |
|---|---|---|---|
| Google Business Profile | Latour's Air Conditioning & Heating, LLC (2898 Saucier Rd, Lake Charles, LA 70605) | 2026-05-01 | ⚠️ **EXPIRED 2026-05-01** — needs reconnect in HighLevel before posting will work |
| Facebook Page | Latour's Air Conditioning & Heating | 2026-06-27 | OK |

`hasStatisticsPermissions: false` on both — `socialplanner/statistics.readonly` won't return performance data until each account is reconnected with stats permission ticked on.

No Instagram connected. User TBD whether to add.

#### How to re-verify the GHL connection

```sh
set -a && source .env && set +a
curl -sS -H "Authorization: Bearer $GHL_PIT" \
        -H "Version: $GHL_API_VERSION" \
        -H "Accept: application/json" \
        "https://services.leadconnectorhq.com/social-media-posting/$GHL_LOCATION_ID/accounts"
```

If this stops returning HTTP 200, the token was rotated/revoked or the location is wrong — re-check `.env` first.

---

### Google Analytics 4 — ⏳ not started

| Item | Status |
|---|---|
| GA4 property exists (per user) | ✅ |
| GA4 Measurement ID (`G-XXXXXXX`) | ⏳ need from user |
| GA4 Property ID (numeric) | ⏳ need from user |
| GA4 loader added to [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro) | ⏳ pending |
| Google Cloud project + service account | ⏳ need to create or confirm |
| GA4 Data API enabled in GCP | ⏳ pending |
| Service account email added as Viewer in GA4 | ⏳ pending |
| Service account JSON saved at `~/.config/latours-hvac/ga-service-account.json` | ⏳ pending |
| `scripts/ga-report.mjs` | ⏳ pending |

Existing `gtag('event', ...)` calls in [public/js/main.js:308](public/js/main.js#L308) and on the schedule-service page will start firing into a real property as soon as the GA4 loader is wired up.

### Google Search Console — ⏳ not started

| Item | Status |
|---|---|
| GSC property verified (per user) | ✅ |
| GSC verified site URL (need exact form, e.g. `sc-domain:...` or `https://...`) | ⏳ need from user |
| Search Console API enabled in GCP | ⏳ pending |
| Service account email added as user in GSC | ⏳ pending |
| `scripts/gsc-report.mjs` | ⏳ pending |

---

## Other site changes shipped this round

- **Header & footer nav:** "View Our Work" link added to the About dropdown (after Reviews) and the footer Resources column.
- **Home page:** Emergency AC Repair card image swapped to `24-hr-emergency-air-conditioning-repair-service-lake-charles.jpg`. Thermostat Repair card already used the requested image.
- **Missing images committed:** 3 image files were on disk but untracked in git, so they 404'd in production. Fixed for `24-hr-emergency-air-conditioning-repair-service-lake-charles.jpg`, `thermostat-repair-lake-charles.jpg`, `thermostat-replacement-lake-charles-la.jpg`.
- **Still missing — files don't exist on disk anywhere** (home page references them but they 404 in production):
  - `public/images/hvac-contractor-lake-charles-la.jpg` (hero background)
  - `public/images/ac-not-cooling-repair-lake-charles.jpg`
  - `public/images/ac-not-turning-on-lake-charles.jpg`
  - `public/images/compressor-repair-lake-charles.jpg`
  - `public/images/frozen-evaporator-coil-repair-lake-charles.jpg`
  - `public/images/refrigerant-leak-repair-lake-charles.jpg`

  User needs to provide these or we swap card refs to existing images.

---

## File inventory

| Path | Purpose |
|---|---|
| [.gitignore](.gitignore) | Ignores `.env`, `social-assets/`, `.DS_Store`, `.vercel/`, `dist/` |
| [.env.example](.env.example) | Committed env-var template (no secrets) |
| `.env` | Local secrets (gitignored) — has GHL_PIT, GHL_LOCATION_ID at minimum |
| [package.json](package.json) | `engines.node: "20.x"` pin + Supabase + Vercel + ws deps |
| [astro.config.mjs](astro.config.mjs) | `output: 'hybrid'` + Vercel adapter |
| [public/robots.txt](public/robots.txt) | Tells crawlers about both sitemaps |
| [db/migrations/001_snaps.sql](db/migrations/001_snaps.sql) | Snaps table + indexes + RLS + GRANTs (already run in Supabase) |
| [src/lib/supabase.ts](src/lib/supabase.ts) | Lazy admin + anon clients, with `ws` Realtime polyfill, NEXT_PUBLIC_* fallback |
| [src/lib/jobsnaps/types.ts](src/lib/jobsnaps/types.ts) | TypeScript types for webhook + rows |
| [src/lib/jobsnaps/signature.ts](src/lib/jobsnaps/signature.ts) | HMAC-SHA256 signature verification |
| [src/lib/jobsnaps/slug.ts](src/lib/jobsnaps/slug.ts) | Slug generator + collision-dedupe helper |
| [src/lib/jobsnaps/queries.ts](src/lib/jobsnaps/queries.ts) | listPublishedSnaps, getSnapBySlug, upsertSnap, deleteSnapById |
| [src/pages/api/jobsnaps-webhook.ts](src/pages/api/jobsnaps-webhook.ts) | POST handler — verifies signature, upserts/deletes |
| [src/pages/work/index.astro](src/pages/work/index.astro) | Listing grid (SSR, 30s cache) |
| [src/pages/work/[slug].astro](src/pages/work/%5Bslug%5D.astro) | Detail page (SSR, 60s cache, Article JSON-LD) |
| [src/pages/sitemap-snaps.xml.ts](src/pages/sitemap-snaps.xml.ts) | Dynamic snap sitemap (SSR, 5-min cache) |
| `social-assets/inbox/`, `drafts/`, `posted/` | Workflow folders for HighLevel social posting (gitignored, awaiting scripts) |

---

## What's next — pick a path

The Job Snaps integration is functionally done; only the GrowLocal-side webhook delivery needs verifying. Three independent fronts to push on:

**A. Verify Job Snaps end-to-end.** Check Vercel function logs for the test snap publish, debug the delivery chain. Smallest unit of work.

**B. HighLevel social posting.** Build `scripts/list-social-accounts.mjs` and `scripts/schedule-social-post.mjs` so we can schedule social posts via the v2 API. Asset workflow is ready in `social-assets/`.

**C. Google Analytics + Search Console.** User provides the IDs (Measurement ID, Property ID, GSC site URL), I wire the GA4 loader, set up a Google Cloud service account, and build report scripts.

User decides priority. All three can ship independently without touching each other.
