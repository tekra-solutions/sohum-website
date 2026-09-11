/**
 * Offer letter PDF storage.
 *
 * Same model as resumes.ts: a private Supabase bucket accessed only with the
 * service-role key. The browser never sees a storage path — candidates and
 * admins alike download through an authenticated/token-gated route that
 * mints a short-lived signed URL, never a public link.
 */
import "server-only";
import { serverEnv, isStorageConfigured } from "@/lib/env";
import { storageClient as admin, StorageError } from "@/lib/storage/client";

export { StorageError };

/** Server-generated path; nothing about it is client-influenced. */
export function buildOfferPdfPath(offerId: string, versionNumber: number) {
  return `offers/${offerId}/v${versionNumber}-${crypto.randomUUID()}.pdf`;
}

export async function uploadOfferPdf(params: { path: string; body: Buffer | Uint8Array }) {
  const bucket = serverEnv().offersStorageBucket;
  const { error } = await admin()
    .storage.from(bucket)
    .upload(params.path, params.body, {
      contentType: "application/pdf",
      upsert: false,
      cacheControl: "private, max-age=0",
    });
  if (error) throw new StorageError(error.message);
  return params.path;
}

/** Short-lived signed URL. Default 60s — long enough to view/download, not to share. */
export async function signedOfferPdfUrl(path: string, expiresInSeconds = 60) {
  const bucket = serverEnv().offersStorageBucket;
  const { data, error } = await admin()
    .storage.from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new StorageError(error?.message ?? "Could not sign URL");
  return data.signedUrl;
}

export async function downloadOfferPdf(path: string) {
  const bucket = serverEnv().offersStorageBucket;
  const { data, error } = await admin().storage.from(bucket).download(path);
  if (error || !data) throw new StorageError(error?.message ?? "Could not read file");
  return data;
}

export { isStorageConfigured };
