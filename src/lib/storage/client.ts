/**
 * Shared Supabase Storage client builder, used by every private bucket
 * (resumes, offer PDFs, ...). Factored out so the Node<22 WebSocket
 * workaround and the "storage not configured" error live in exactly one
 * place rather than being copy-pasted per bucket.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { serverEnv } from "@/lib/env";

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export function storageClient() {
  const env = serverEnv();
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new StorageError(
      "Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    // supabase-js eagerly constructs a realtime client even though we only use
    // Storage. On Node < 22 (Vercel's default runtime) that constructor throws
    // without a WebSocket implementation supplied, so every call here — upload,
    // download, signed URL — would crash. `ws` is never actually connected.
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
  });
}
