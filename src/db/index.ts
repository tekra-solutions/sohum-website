/**
 * Database client.
 *
 * `postgres` is configured for serverless: a small pool, and prepared
 * statements disabled because Supabase's transaction pooler does not support
 * them. The client is cached on globalThis so hot reload does not exhaust
 * connections in development.
 */
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { serverEnv } from "@/lib/env";

const globalForDb = globalThis as unknown as {
  __sohumSql?: ReturnType<typeof postgres>;
};

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set. See docs/DEPLOYMENT.md.");
    this.name = "DatabaseNotConfiguredError";
  }
}

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

/**
 * Hard ceiling on how long any single query may occupy a pool connection.
 *
 * The server's statement_timeout is 2 minutes and cannot be lowered from the
 * client: Supabase's transaction pooler ignores connection startup
 * parameters, a `SET` on connect does not survive backend reuse, and the URL
 * `options` parameter is stripped. All three were tested against the real
 * pooler. What does work is cancelling the query client-side — postgres.js
 * sends a real cancel request, so the statement is aborted server-side too
 * and the connection is genuinely released rather than abandoned.
 *
 * Without this, one stuck query holds a slot for two minutes; five exhaust
 * `max` and every later request queues behind them, which is why pages hung
 * intermittently instead of erroring. 15s is far above any healthy query here
 * (the slowest measured is well under a second).
 */
const QUERY_TIMEOUT_MS = 15_000;

/** Attaches the cancel-on-timeout guard to a postgres.js query object. */
function guard<T>(query: T): T {
  const q = query as { cancel?: () => void; then?: (a: () => void, b: () => void) => void };
  // Only real query objects are cancellable; fragment builders pass through.
  if (!q || typeof q.cancel !== "function" || typeof q.then !== "function") return query;
  const timer = setTimeout(() => {
    try { q.cancel!(); } catch { /* already settled */ }
  }, QUERY_TIMEOUT_MS);
  // Clearing on settle keeps the timer from holding the event loop open.
  q.then!(() => clearTimeout(timer), () => clearTimeout(timer));
  return query;
}

function withTimeout(sql: ReturnType<typeof postgres>) {
  return new Proxy(sql, {
    // Tagged-template calls: sql`select ...`
    apply(target, thisArg, args: Parameters<typeof sql>) {
      return guard(Reflect.apply(target, thisArg, args));
    },
    // Drizzle does not use the tagged template — it calls client.unsafe(),
    // so guarding only `apply` above would protect almost nothing. Verified
    // against drizzle-orm/postgres-js/session.js, which uses unsafe/begin/
    // savepoint. `begin` is left alone: a transaction's lifetime is bounded
    // by the statements inside it, which are themselves guarded.
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === "unsafe" && typeof value === "function") {
        return (...args: unknown[]) => guard((value as (...a: unknown[]) => unknown).apply(target, args));
      }
      return value;
    },
  });
}

function client() {
  if (!process.env.DATABASE_URL) throw new DatabaseNotConfiguredError();
  if (!globalForDb.__sohumSql) {
    globalForDb.__sohumSql = withTimeout(postgres(serverEnv().databaseUrl, {
      // A single page can legitimately need many connections at once (the
      // pipeline board queries every stage in parallel). At max: 5 those
      // queries queued behind each other until they hit the server's
      // two-minute statement_timeout, which surfaced as pages that hung
      // intermittently rather than erroring. Supabase's transaction pooler
      // allows far more than this per client.
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    }));
  }
  return globalForDb.__sohumSql;
}

/**
 * Lazily constructed. Importing this module must never throw: a missing
 * DATABASE_URL should fail the query that needs it, not the whole build.
 */
type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDrizzle = globalThis as unknown as { __sohumDb?: Db };

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    globalForDrizzle.__sohumDb ??= drizzle(client(), { schema });
    return Reflect.get(globalForDrizzle.__sohumDb, prop, receiver);
  },
});

export { schema };
