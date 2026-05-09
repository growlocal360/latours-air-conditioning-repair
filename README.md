# Latour's HVAC website

Astro site for Latour's Air Conditioning & Heating, deployed to Vercel.

- **Framework:** Astro 4 (`hybrid` output — most pages are pre-rendered static HTML; `/api/*` routes and `/work/*` are SSR'd on Vercel functions).
- **Repo:** [growlocal360/latours-air-conditioning-repair](https://github.com/growlocal360/latours-air-conditioning-repair)
- **Production:** https://latourshvac.com

## Local development

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # production build
npm run preview  # preview the build locally
```

## Environment variables

Copy [.env.example](.env.example) to `.env` (gitignored) and fill in the values you need. The site builds without them, but specific integrations will fail at runtime if the vars they need are missing.

| Var | Used by | Required for |
|---|---|---|
| `GHL_PIT` | HighLevel Social Planner scripts | Social posting |
| `GHL_LOCATION_ID` | HighLevel scripts | Social posting |
| `GA_PROPERTY_ID` | `scripts/ga-report.mjs` | GA4 reporting |
| `GSC_SITE_URL` | `scripts/gsc-report.mjs` | Search Console reporting |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | GA + GSC scripts | GA / GSC API access |
| `SUPABASE_URL` | `/work` pages, webhook | Job Snaps |
| `SUPABASE_ANON_KEY` | `/work` pages | Job Snaps reads |
| `SUPABASE_SERVICE_ROLE_KEY` | webhook | Job Snaps writes |
| `JOBSNAPS_WEBHOOK_SECRET` | webhook | Job Snaps signature verification |
| `JOBSNAPS_API_KEY` | (future, outbound calls) | Optional |
| `JOBSNAPS_API_BASE` | (future, outbound calls) | Optional |

For Vercel, mirror the same vars under **Project Settings → Environment Variables**.

See [INTEGRATIONS.md](INTEGRATIONS.md) for current integration status, action items, and reference URLs.

## Job Snaps

The site receives webhook events from GrowLocal 360's Job Snaps and renders each published snap as its own server-rendered page for SEO.

### How it flows

1. A Job Snap is published in GrowLocal admin.
2. GrowLocal POSTs `https://latours-air-conditioning-repair.vercel.app/api/jobsnaps-webhook` with the event payload.
3. The webhook ([src/pages/api/jobsnaps-webhook.ts](src/pages/api/jobsnaps-webhook.ts)) verifies the `X-Webhook-Signature` HMAC, rejects replays older than 5 minutes, then upserts (or deletes) the snap in Supabase.
4. Within ~30 seconds (edge cache window), the snap appears on [/work](https://latourshvac.com/work) and at `/work/<slug>` as fully server-rendered HTML with Article JSON-LD for rich results.

### Database

- Supabase Postgres. One-time setup: run [db/migrations/001_snaps.sql](db/migrations/001_snaps.sql) against the project (Supabase SQL Editor).
- Schema lives in [src/lib/jobsnaps/types.ts](src/lib/jobsnaps/types.ts).

### Webhook security

- HMAC-SHA256 over `${timestamp}.${rawBody}` with `JOBSNAPS_WEBHOOK_SECRET`. Constant-time compared against the `v1=` value in the header.
- Timestamp must be within 5 minutes of server time (replay protection).
- Returns 401 on any verification failure, 200 with `{ok:true}` on success.

### Cache strategy

`/work` and `/work/[slug]` set `Cache-Control: public, s-maxage=30/60, stale-while-revalidate=...` so Vercel's edge serves cached HTML for short windows. New snaps appear within ~30s of the webhook firing without a deploy. There is no `revalidatePath`-style on-demand purge — short s-maxage replaces it.

### Curl-test the detail page (after a snap is published)

```sh
curl -sS https://latourshvac.com/work/<slug> | grep -E '<title>|<h1>'
```

Should return the rendered title and H1 — confirming SEO crawlers see the content.

## Other integrations

| Integration | Status |
|---|---|
| HighLevel Social Planner (v2 PIT, scheduled posts) | API verified — posting script pending |
| Google Analytics 4 | IDs pending — loader not yet wired |
| Google Search Console | URL pending — service account access pending |

See [INTEGRATIONS.md](INTEGRATIONS.md) for the live punch list.
