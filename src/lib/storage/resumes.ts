/**
 * Resume storage.
 *
 * Resumes are private HR data. They live in a private Supabase bucket accessed
 * only with the service-role key, which is server-only. The browser never sees
 * a storage path — admins download through an authenticated route that mints a
 * short-lived signed URL.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { serverEnv, isStorageConfigured } from "@/lib/env";

function admin() {
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

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

/** Server-generated path; the client never chooses where a file lands. */
export function buildResumePath(applicationId: string, originalName: string) {
  const ext = originalName.slice(originalName.lastIndexOf(".")).toLowerCase();
  return `applications/${applicationId}/resume-${crypto.randomUUID()}${ext}`;
}

export async function uploadResume(params: {
  path: string;
  body: ArrayBuffer | Buffer | Uint8Array;
  contentType: string;
}) {
  const bucket = serverEnv().storageBucket;
  const { error } = await admin()
    .storage.from(bucket)
    .upload(params.path, params.body, {
      contentType: params.contentType,
      upsert: false,
      cacheControl: "private, max-age=0",
    });
  if (error) throw new StorageError(error.message);
  return params.path;
}

/** Short-lived signed URL. Default 60s — long enough to download, not to share. */
export async function signedResumeUrl(path: string, expiresInSeconds = 60) {
  const bucket = serverEnv().storageBucket;
  const { data, error } = await admin()
    .storage.from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new StorageError(error?.message ?? "Could not sign URL");
  return data.signedUrl;
}

export async function downloadResume(path: string) {
  const bucket = serverEnv().storageBucket;
  const { data, error } = await admin().storage.from(bucket).download(path);
  if (error || !data) throw new StorageError(error?.message ?? "Could not read file");
  return data;
}

/** Best-effort cleanup used when an application insert fails after upload. */
export async function deleteResume(path: string) {
  try {
    await admin().storage.from(serverEnv().storageBucket).remove([path]);
  } catch {
    // Swallow: the caller is already handling a failure and an orphaned
    // object is preferable to masking the original error.
  }
}

export { isStorageConfigured };
