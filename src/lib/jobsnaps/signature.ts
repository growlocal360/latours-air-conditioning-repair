import { createHmac, timingSafeEqual } from 'node:crypto';

const TOLERANCE_SECONDS = 5 * 60;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

export function verifyWebhookSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): VerifyResult {
  if (!header) return { ok: false, reason: 'missing X-Webhook-Signature header' };
  if (!secret) return { ok: false, reason: 'webhook secret not configured' };

  const parts = header.split(',').map((p) => p.trim());
  let timestamp: string | null = null;
  let v1: string | null = null;
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq);
    const v = part.slice(eq + 1);
    if (k === 't') timestamp = v;
    else if (k === 'v1') v1 = v;
  }
  if (!timestamp || !v1) return { ok: false, reason: 'malformed signature header' };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'non-numeric timestamp' };
  if (Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) {
    return { ok: false, reason: 'timestamp outside tolerance window' };
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  if (a.length !== b.length || a.length === 0) {
    return { ok: false, reason: 'signature length mismatch' };
  }
  if (!timingSafeEqual(a, b)) return { ok: false, reason: 'signature mismatch' };

  return { ok: true };
}
