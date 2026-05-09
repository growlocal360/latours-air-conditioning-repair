# Integrations status

Working doc for the HighLevel + Google Analytics + Search Console + Job Snaps wiring on this site. Update as we go.

**Last updated:** 2026-04-30

---

## What we're building

1. **HighLevel Social Planner** — Claude generates social posts from assets dropped in `social-assets/inbox/`, schedules them via the GHL v2 API, archives results.
2. **Google Analytics 4** — wire the GA4 loader into the site, then give Claude API access to pull metrics for ongoing site improvements.
3. **Google Search Console** — verify the property + give Claude API access to pull queries/CTR/indexing data.
4. **Job Snaps (GrowLocal 360)** — receive webhook pushes of published job snaps and render each as a server-rendered SEO page at `/work/<slug>`.

The schedule-service form ([src/pages/schedule-service/index.astro](src/pages/schedule-service/index.astro)) is **not part of this work** — it uses an independent webhook URL, was unaffected by the v1 API key regeneration, and should keep working as-is.

### Architectural note: Astro `static` → `hybrid`

Adding the Job Snaps webhook required server execution. [astro.config.mjs](astro.config.mjs) now uses `output: 'hybrid'` with the `@astrojs/vercel` adapter. **All existing pages remain pre-rendered static HTML** (default behavior). Only the routes under `/api/*` and `/work/*` opt into SSR via `export const prerender = false`. This means:

- Build output now goes through the Vercel adapter (creates serverless functions for SSR routes alongside the static assets).
- Existing static pages, redirects, and headers in [vercel.json](vercel.json) all keep working.
- New runtime cost: only the SSR routes invoke functions. Everything else still serves from CDN.

---

## Status by integration

### HighLevel — credentials verified ✅

| Item | Status |
|---|---|
| v2 Private Integration Token created | ✅ in `.env` as `GHL_PIT` |
| Scopes granted | ✅ `socialplanner/post.{read,write}`, `socialplanner/account.readonly`, `socialplanner/oauth.readonly`, `socialplanner/statistics.readonly`, `medias.{read,write}`, `locations.readonly` |
| Location ID | ✅ in `.env` as `GHL_LOCATION_ID` |
| Live API test (`GET /social-media-posting/{loc}/accounts`) | ✅ HTTP 200, accounts returned |
| `scripts/list-social-accounts.mjs` | ⏳ pending (curl works, just need the wrapper) |
| `scripts/schedule-social-post.mjs` | ⏳ pending |
| First test post end-to-end | ⏳ pending |

#### Connected social accounts (from live API)

| Platform | Name | Token expires | Notes |
|---|---|---|---|
| Google Business Profile | Latour's Air Conditioning & Heating, LLC (2898 Saucier Rd, Lake Charles, LA 70605) | **2026-05-01** | ⚠️ Expires tomorrow — reconnect in HighLevel ASAP |
| Facebook Page | Latour's Air Conditioning & Heating | 2026-06-27 | OK |

`hasStatisticsPermissions: false` on both accounts — `socialplanner/statistics.readonly` won't return post-performance data until each account is reconnected with stats permission enabled. Non-blocking; revisit when we want post analytics.

No Instagram connected. TBD whether to add.

### Google Analytics 4 — not started ⏳

| Item | Status |
|---|---|
| GA4 property exists | ✅ user-confirmed |
| GA4 Measurement ID (`G-XXXXXXX`) | ⏳ need from user |
| GA4 Property ID (numeric) | ⏳ need from user |
| GA4 loader added to [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro) | ⏳ pending |
| Google Cloud project + service account | ⏳ need to create or confirm exists |
| GA4 Data API enabled in GCP | ⏳ pending |
| Service account email added as Viewer in GA4 | ⏳ pending |
| Service account JSON saved to `~/.config/latours-hvac/ga-service-account.json` | ⏳ pending |
| `scripts/ga-report.mjs` | ⏳ pending |

Existing `gtag('event', ...)` calls in [public/js/main.js:308](public/js/main.js#L308) and the schedule-service page will start working automatically once the GA4 loader is in place.

### Job Snaps (GrowLocal 360) — code shipped, awaiting Supabase + secret 🟡

| Item | Status |
|---|---|
| `output: 'hybrid'` + `@astrojs/vercel` adapter wired | ✅ |
| `@supabase/supabase-js` installed | ✅ |
| SQL migration [db/migrations/001_snaps.sql](db/migrations/001_snaps.sql) | ✅ written, ⏳ needs to be run against Supabase project |
| Lib helpers ([src/lib/jobsnaps/](src/lib/jobsnaps/), [src/lib/supabase.ts](src/lib/supabase.ts)) | ✅ |
| Webhook handler [src/pages/api/jobsnaps-webhook.ts](src/pages/api/jobsnaps-webhook.ts) | ✅ |
| Listing page [src/pages/work/index.astro](src/pages/work/index.astro) | ✅ |
| Detail page [src/pages/work/[slug].astro](src/pages/work/%5Bslug%5D.astro) | ✅ |
| `JOBSNAPS_API_KEY`, `JOBSNAPS_WEBHOOK_SECRET`, `JOBSNAPS_API_BASE` in `.env` + Vercel | ⏳ user to set |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env` + Vercel | ⏳ user to confirm/set (brief said "configured" — verify) |
| Webhook URL `https://latours-air-conditioning-repair.vercel.app/api/jobsnaps-webhook` | ✅ on GrowLocal side already |
| End-to-end test (publish a snap → verify it lands at `/work/<slug>`) | ⏳ pending |

#### Job Snaps security model

- HMAC-SHA256 over `${timestamp}.${rawBody}` using `JOBSNAPS_WEBHOOK_SECRET`. Constant-time compared in [src/lib/jobsnaps/signature.ts](src/lib/jobsnaps/signature.ts).
- Replays > 5 minutes old are rejected.
- Writes use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS); reads use `SUPABASE_ANON_KEY` (RLS allows public SELECT only).
- No on-demand cache invalidation. SSR pages set short `s-maxage` so new snaps appear within ~30–60s without manual purges.

### Google Search Console — not started ⏳

| Item | Status |
|---|---|
| GSC property verified | ✅ user-confirmed |
| GSC verified site URL (exact form, e.g. `sc-domain:...` or `https://...`) | ⏳ need from user |
| GSC verification meta tag in [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro) | ⏳ optional (only if currently DNS-verified and we want belt + suspenders) |
| Search Console API enabled in GCP | ⏳ pending |
| Service account email added as Full user in GSC | ⏳ pending |
| `scripts/gsc-report.mjs` | ⏳ pending |

---

## What's already in place (files)

| Path | Purpose |
|---|---|
| [.gitignore](.gitignore) | Now ignores `.env`, `social-assets/`, `.DS_Store` |
| [.env.example](.env.example) | Committed template documenting every env var |
| `.env` | Local secrets (gitignored) |
| `social-assets/inbox/` | Drop assets + briefs here |
| `social-assets/drafts/` | Claude-generated post JSON awaiting approval |
| `social-assets/posted/` | Archive of scheduled posts with GHL post IDs |
| `scripts/` | (empty — scripts go here) |

---

## Action items for the user

**Now (high priority):**
- [ ] **Reconnect Google Business Profile in HighLevel** before 2026-05-01 token expiry. (`Settings → Integrations`, find GBP, click reconnect/re-auth.)
- [ ] Decide whether to connect Instagram in HighLevel (optional).
- [ ] **Job Snaps:** run [db/migrations/001_snaps.sql](db/migrations/001_snaps.sql) in the Supabase SQL Editor for the project linked to this site.
- [ ] **Job Snaps:** set `JOBSNAPS_API_KEY`, `JOBSNAPS_WEBHOOK_SECRET`, `JOBSNAPS_API_BASE` in `.env` *and* Vercel project env vars.
- [ ] **Job Snaps:** confirm `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel (brief said they are; double-check).
- [ ] **Job Snaps:** publish one snap from GrowLocal admin and verify it appears at `/work` and `/work/<slug>` within ~30s.

**When ready for Google work:**
- [ ] GA4 Measurement ID (`G-XXXXXXX`) — GA4 Admin → Data Streams
- [ ] GA4 Property ID (numeric, e.g. `123456789`) — GA4 Admin → Property Settings
- [ ] GSC verified site URL (paste exactly as Search Console shows it)
- [ ] Confirm: do you have an existing Google Cloud project? If not, I'll provide click-by-click for creating one + a service account.

---

## Next decision — pick a path

**A.** Finish HighLevel — write `scripts/schedule-social-post.mjs`, run a test post end-to-end. Validates the full posting loop.

**B.** Pivot to Google — start collecting GA4 + Search Console data immediately by getting the IDs above and wiring the loader in `BaseLayout.astro`.

Both are independent. Either order works.

---

## Reference — how the live HighLevel API call works

For future debugging, the test call that verified everything was:

```sh
set -a && source .env && set +a
curl -sS -H "Authorization: Bearer $GHL_PIT" \
        -H "Version: $GHL_API_VERSION" \
        -H "Accept: application/json" \
        "https://services.leadconnectorhq.com/social-media-posting/$GHL_LOCATION_ID/accounts"
```

If this stops returning HTTP 200, the token has been rotated/revoked or the location is wrong — re-check `.env` first.
