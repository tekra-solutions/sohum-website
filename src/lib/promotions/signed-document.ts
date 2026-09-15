import "server-only";
import { appendElectronicSignature } from "@/lib/documents/signature";
import { renderOfferPdf } from "@/lib/offers/pdf";
import { hashDocument } from "@/lib/offers/signed-document";
import { uploadOfferPdf } from "@/lib/storage/offers";
import { letterheadFooterTemplate, letterheadHeaderTemplate } from "@/lib/documents/chrome";
import { sohumLetterheadDataUri } from "@/lib/documents/logo";
import type { PromotionVersion } from "@/db/schema";

/**
 * The countersigned promotion letter.
 *
 * Mirrors offers/signed-document.ts exactly, including the two-pass hash: the
 * value printed inside the document is the SHA-256 of the signed *content*,
 * computed before it is embedded, because a PDF cannot contain a hash of its
 * own bytes. Re-rendering the same frozen version and signature reproduces the
 * printed value, which is what makes it verifiable after the fact.
 */
export type SignedPromotionInput = {
  version: PromotionVersion;
  employeeName: string;
  employeeFirstName?: string | null;
  employeeEmail: string;
  employeeNumber?: string | null;
  reference?: string | null;
  authorizedRepresentative?: { name: string; title: string | null } | null;
  signature: {
    signerLegalName: string;
    signerEmail: string;
    signatureValue: string;
    signedAt: Date;
    consentedAt: Date;
    consentText: string;
    verificationMethod: string;
    documentHash?: string | null;
  };
};

/** Renders the signed HTML from frozen version data alone, so the acceptance
 *  path and any later verification produce the identical document. */
export function renderSignedPromotionHtml(input: SignedPromotionInput): string {
  return appendElectronicSignature(input.version.renderedHtml, {
    name: input.signature.signerLegalName, email: input.signature.signerEmail,
    value: input.signature.signatureValue, signedAt: input.signature.signedAt,
    consentText: input.signature.consentText, verificationMethod: input.signature.verificationMethod,
    reference: `${input.version.promotionId} / version ${input.version.versionNumber}`,
    documentHash: input.signature.documentHash,
  });
}

/** A random segment means an upload can never collide with, and so never
 *  replace, an existing signed document. */
export function buildSignedPromotionPdfPath(promotionId: string, versionNumber: number) {
  return `promotions/${promotionId}/v${versionNumber}/promotion-signed-${crypto.randomUUID()}.pdf`;
}

/**
 * Renders, hashes and stores the signed PDF. Performed outside the acceptance
 * transaction — Chromium and the upload are slow and can fail, and holding row
 * locks across them would serialize unrelated acceptances. The caller records
 * the returned path and hash inside the transaction.
 */
export async function generateSignedPromotionPdf(input: SignedPromotionInput) {
  const contentHtml = renderSignedPromotionHtml({
    ...input, signature: { ...input.signature, documentHash: null },
  });
  const documentHash = hashDocument(Buffer.from(contentHtml, "utf8"));

  const html = renderSignedPromotionHtml({
    ...input, signature: { ...input.signature, documentHash },
  });
  const pdf = await renderOfferPdf(html, {
    headerTemplate: letterheadHeaderTemplate(sohumLetterheadDataUri),
    footerTemplate: letterheadFooterTemplate(),
  });
  const fileHash = hashDocument(pdf);
  const path = buildSignedPromotionPdfPath(input.version.promotionId, input.version.versionNumber);
  await uploadOfferPdf({ path, body: pdf });
  return { path, documentHash, fileHash, bytes: pdf.length };
}
