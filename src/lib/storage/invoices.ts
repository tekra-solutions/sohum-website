/**
 * Invoice PDF storage. Private bucket, service-role access only; the browser
 * never sees a storage path and there is no permanent public URL.
 */
import "server-only";
import { serverEnv, isStorageConfigured } from "@/lib/env";
import { storageClient as admin, StorageError } from "@/lib/storage/client";

export { StorageError };

/** Server-generated path; nothing about it comes from user input. */
export function buildInvoicePdfPath(invoiceId: string) {
  return `invoices/${invoiceId}/invoice-${crypto.randomUUID()}.pdf`;
}

export async function uploadInvoicePdf(params: { path: string; body: Buffer | Uint8Array }) {
  const bucket = serverEnv().invoicesStorageBucket;
  const { error } = await admin().storage.from(bucket).upload(params.path, params.body, {
    contentType: "application/pdf", upsert: false, cacheControl: "private, max-age=0",
  });
  if (error) throw new StorageError(error.message);
  return params.path;
}

export async function downloadInvoicePdf(path: string) {
  const bucket = serverEnv().invoicesStorageBucket;
  const { data, error } = await admin().storage.from(bucket).download(path);
  if (error || !data) throw new StorageError(error?.message ?? "Could not read file");
  return data;
}

export { isStorageConfigured };
