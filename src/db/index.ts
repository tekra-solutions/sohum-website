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

function client() {
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

export const db = drizzle(client(), { schema });
export { schema };
