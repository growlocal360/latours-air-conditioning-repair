import type { APIRoute } from 'astro';
import { verifyWebhookSignature } from '../../lib/jobsnaps/signature';
import { deleteSnapById, upsertSnap } from '../../lib/jobsnaps/queries';
import { cleanupSnapImages, mirrorMedia } from '../../lib/jobsnaps/mirror';
import type { WebhookEvent } from '../../lib/jobsnaps/types';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.JOBSNAPS_WEBHOOK_SECRET;
  if (!secret) return json(500, { ok: false, error: 'webhook secret not configured' });

  const rawBody = await request.text();
  const sigHeader = request.headers.get('x-webhook-signature');

  const verified = verifyWebhookSignature(rawBody, sigHeader, secret);
  if (!verified.ok) return json(401, { ok: false, error: verified.reason });

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return json(400, { ok: false, error: 'invalid JSON' });
  }

  if (!event?.type || !event?.data?.id) {
    return json(400, { ok: false, error: 'missing event type or data.id' });
  }

  try {
    if (event.type === 'job_snap.unpublished') {
      // Drop mirrored objects first so the bucket stays clean. Cleanup
      // errors are logged inside the helper but do not block the row delete.
      await cleanupSnapImages(event.data.id);
      const slug = await deleteSnapById(event.data.id);
      return json(200, { ok: true, action: 'deleted', slug });
    }
    if (event.type === 'job_snap.published' || event.type === 'job_snap.updated') {
      // Mirror every media item into our snaps bucket and rewrite each
      // url to the public Supabase URL. Failed mirrors are dropped (partial
      // data is better than no data); successful ones use deterministic
      // keys so re-publishes overwrite the same files in place.
      const mirroredMedia = await mirrorMedia(event.data.id, event.data.media || []);
      const patched = { ...event.data, media: mirroredMedia };
      const slug = await upsertSnap(patched);
      return json(200, {
        ok: true,
        action: 'upserted',
        slug,
        media_mirrored: mirroredMedia.length,
        media_total: (event.data.media || []).length,
      });
    }
    return json(200, { ok: true, action: 'ignored', type: event.type });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return json(500, { ok: false, error: message });
  }
};

// Safety net: GET should not 405 silently — return a friendly 405 so any
// human poking the URL knows the route exists and is healthy.
export const GET: APIRoute = () =>
  json(405, { ok: false, error: 'method not allowed; POST a webhook event' });
