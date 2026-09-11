/**
 * Resume storage.
 *
 * Resumes are private HR data. They live in a private Supabase bucket accessed
 * only with the service-role key, which is server-only. The browser never sees
 * a storage path — admins download through an authenticated route that mints a
 * short-lived signed URL.
 */
import "server-only";
import { serverEnv, isStorageConfigured } from "@/lib/env";
import { ALLOWED_RESUME_EXT } from "@/lib/validation/schemas";
import { storageClient as admin, StorageError } from "@/lib/storage/client";

export { StorageError };

/**
 * Server-generated path; the client never chooses where a file lands.
 *
 * The extension is the one piece derived from the uploaded filename, so it is
 * matched against the allowlist here rather than trusted. validateResume()
 * already rejects bad types upstream, but a filename such as
 * "evil.pdf/../../etc/passwd" slices to "./etc/passwd" — this must not be
 * concatenated into a storage key on the strength of a caller's checks alone.
 */
export function buildResumePath(applicationId: string, originalName: string) {
  const raw = originalName.slice(originalName.lastIndexOf(".")).toLowerCase();
  const ext = (ALLOWED_RESUME_EXT as readonly string[]).includes(raw) ? raw : ".bin";
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
