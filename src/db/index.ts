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

function client() {
  if (!process.env.DATABASE_URL) throw new DatabaseNotConfiguredError();
  if (!globalForDb.__sohumSql) {
    globalForDb.__sohumSql = postgres(serverEnv().databaseUrl, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
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
