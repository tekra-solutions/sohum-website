/** Shared, atomic throttling in PostgreSQL; memory fallback for offline tests. */
import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

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
  if (process.env.DATABASE_URL || process.env.NODE_ENV === "production") {
    try {
      const hash = createHash("sha256").update(opts.key).digest("hex");
      const rows = await db.execute<{ count: number; retry: number }>(sql`
        insert into rate_limit_buckets (key_hash, count, reset_at)
        values (${hash}, 1, now() + ${opts.windowMs} * interval '1 millisecond')
        on conflict (key_hash) do update set
          count = case when rate_limit_buckets.reset_at <= now() then 1
            else least(rate_limit_buckets.count + 1, ${opts.limit + 1}) end,
          reset_at = case when rate_limit_buckets.reset_at <= now()
            then now() + ${opts.windowMs} * interval '1 millisecond' else rate_limit_buckets.reset_at end
        returning count, greatest(1, ceil(extract(epoch from (reset_at - now()))))::int as retry
      `);
      const row = rows[0];
      // Buckets are never revisited once their window lapses, so without this
      // the table grows by one permanent row per unique key — and on the
      // public careers routes the key includes the visitor's IP. Reap on a
      // small fraction of calls rather than on a schedule (there is no cron
      // here); the reset_at index makes it cheap, and it is fire-and-forget
      // so a failed sweep never affects the throttle decision.
      if (Math.random() < 0.01) {
        void db.execute(sql`delete from rate_limit_buckets where reset_at <= now() - interval '1 hour'`)
          .catch(() => { /* best effort: stale rows are harmless, a throw here is not */ });
      }
      return { ok: row.count <= opts.limit, remaining: Math.max(0, opts.limit - row.count), retryAfterSeconds: row.count > opts.limit ? row.retry : 0 };
    } catch {
      console.error("[rate-limit] shared throttle unavailable");
      return { ok: false, remaining: 0, retryAfterSeconds: 60 };
    }
  }
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
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  return (headers.get("x-real-ip") ?? "unknown").slice(0, 64);
}
