/**
 * The signed offer document.
 *
 * Acceptance freezes a document that must stay provably unchanged: it is the
 * evidence that this candidate agreed to these exact terms. Three properties
 * make that true here.
 *
 *  - It re-renders from the frozen `offerVersions` row alone — the same
 *    columns and the same template fragments the unsigned document was built
 *    from — so a later edit to an offer template cannot change what a signed
 *    document says.
 *  - A SHA-256 of the signed content is printed in the document and recorded
 *    with the signature, so the printed value can be re-derived from the same
 *    frozen row. (The content is hashed rather than the PDF bytes: a PDF
 *    cannot contain its own hash.) The stored file's hash is recorded too,
 *    so tampering with the object in storage is detectable.
 *  - The storage path carries a random segment and is uploaded with
 *    `upsert: false`, so a signed document is never overwritten — not by a
 *    retry, not by a second signature, not by a later version.
 */
import "server-only";
import { createHash } from "node:crypto";
import type { offerVersions } from "@/db/schema";
import { renderOfferHtml, type OfferSignatureBlock } from "./render-html";
import { renderOfferPdf } from "./pdf";
import { pdfFooterTemplate } from "@/lib/documents/chrome";
import { uploadOfferPdf } from "@/lib/storage/offers";

type Version = typeof offerVersions.$inferSelect;

export type SignedDocumentInput = {
  version: Version;
  candidateName: string;
  candidateEmail: string;
  candidateAddress?: string | null;
  offerReference?: string | null;
  signature: OfferSignatureBlock;
};

/**
 * Renders the signed HTML from frozen version data.
 *
 * Exported so the acceptance path and any later verification can produce the
 * exact same document from the same row.
 */
export function renderSignedOfferHtml(input: SignedDocumentInput): string {
  const v = input.version;
  return renderOfferHtml({
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    candidateAddress: input.candidateAddress ?? null,
    // Frozen with the version; falls back to a neutral line for versions
    // written before these columns existed rather than re-reading a template
    // that may since have changed.
    templateBodyHtml: v.templateBodyHtml ?? "<p>Terms as described in this letter.</p>",
    templateTermsHtml: v.templateTermsHtml,
    templateAcknowledgementsHtml: v.templateAcknowledgementsHtml,
    offerVersionNumber: v.versionNumber,
    offerReference: input.offerReference ?? null,
    jobTitle: v.jobTitle,
    department: v.department,
    location: v.location,
    employmentType: v.employmentType,
    remoteType: v.remoteType,
    hiringManagerName: v.hiringManagerName,
    reportsTo: v.reportsTo,
    startDate: v.startDate,
    expirationDate: v.expirationDate,
    annualSalaryCents: v.annualSalaryCents,
    hourlyRateCents: v.hourlyRateCents,
    bonusCents: v.bonusCents,
    signOnBonusCents: v.signOnBonusCents,
    otherCompensation: v.otherCompensation,
    benefitsSummary: v.benefitsSummary,
    ptoSummary: v.ptoSummary,
    workLocation: v.workLocation,
    additionalTerms: v.additionalTerms,
    signature: input.signature,
  });
}

/** sha256 hex, used for both the content hash and the stored-file hash. */
export function hashDocument(bytes: Buffer | Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Server-chosen path. The random segment means an upload can never collide
 * with — and so never replace — an existing signed document.
 */
export function buildSignedOfferPdfPath(offerId: string, versionNumber: number) {
  return `offers/${offerId}/v${versionNumber}/offer-signed-${crypto.randomUUID()}.pdf`;
}

/**
 * Renders, hashes and stores the signed PDF.
 *
 * Deliberately performed outside the acceptance transaction: Chromium and the
 * storage upload are slow and can fail, and holding row locks across them
 * would serialize unrelated acceptances. The caller records the returned path
 * and hash inside the transaction, where the row locks still apply.
 */
export async function generateSignedOfferPdf(input: SignedDocumentInput) {
  // The hash printed inside the document is of the signed *content* (the HTML
  // the PDF is rendered from), not of the PDF bytes: a PDF cannot contain its
  // own hash, since printing it would change the bytes being hashed. Hashing
  // the content is what makes the printed value verifiable — re-rendering the
  // same frozen version and signature reproduces it exactly.
  const contentHtml = renderSignedOfferHtml({ ...input, signature: { ...input.signature, documentHash: null } });
  const documentHash = hashDocument(Buffer.from(contentHtml, "utf8"));

  const html = renderSignedOfferHtml({ ...input, signature: { ...input.signature, documentHash } });
  const reference = input.offerReference ?? `Offer ${input.version.offerId}`;
  const pdf = await renderOfferPdf(html, {
    footerTemplate: pdfFooterTemplate(`${reference} · ${input.candidateName}`),
  });
  // The stored-file hash is recorded separately so the bytes in storage can
  // also be checked for tampering.
  const fileHash = hashDocument(pdf);
  const path = buildSignedOfferPdfPath(input.version.offerId, input.version.versionNumber);
  await uploadOfferPdf({ path, body: pdf });
  return { path, documentHash, fileHash, bytes: pdf.length };
}
