/**
 * Rate limiting for the public application endpoint.
 *
 * In-memory fixed window. This is honest about its limits: on serverless each
 * instance keeps its own counter, so it throttles casual abuse rather than a
 * determined distributed attack. The interface is deliberately async so a
 * shared store (Upstash, Redis) can be dropped in without touching callers.
 */
import "server-only";

type Entry = { count: number; resetAt: number };

const globalForLimit = globalThis as unknown as { __sohumRate?: Map<string, Entry> };
const store = (globalForLimit.__sohumRate ??= new Map<string, Entry>());

function sweep(now: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}

export async function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ ok: boolean; remaining: number; retryAfterSeconds: number }> {
  const now = Date.now();
  sweep(now);

  const entry = store.get(opts.key);
  if (!entry || entry.resetAt <= now) {
    store.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= opts.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { ok: true, remaining: opts.limit - entry.count, retryAfterSeconds: 0 };
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
