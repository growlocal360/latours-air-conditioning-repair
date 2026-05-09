import type { APIRoute } from 'astro';
import { verifyWebhookSignature } from '../../lib/jobsnaps/signature';
import { deleteSnapById, upsertSnap } from '../../lib/jobsnaps/queries';
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
      const slug = await deleteSnapById(event.data.id);
      return json(200, { ok: true, action: 'deleted', slug });
    }
    if (event.type === 'job_snap.published' || event.type === 'job_snap.updated') {
      const slug = await upsertSnap(event.data);
      return json(200, { ok: true, action: 'upserted', slug });
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
