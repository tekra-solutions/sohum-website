import "server-only";
import { renderPromotionHtml, type PromotionHtmlInput } from "./render-html";
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
  const v = input.version;
  const args: PromotionHtmlInput = {
    employeeName: input.employeeName,
    employeeFirstName: input.employeeFirstName ?? input.employeeName.split(" ")[0],
    employeeEmail: input.employeeEmail,
    employeeNumber: input.employeeNumber ?? null,

    previousJobTitle: v.previousJobTitle,
    previousDepartment: v.previousDepartment,
    previousLocation: v.previousLocation,
    previousManagerName: v.previousManagerName,
    previousAnnualSalaryCents: v.previousAnnualSalaryCents,
    previousHourlyRateCents: v.previousHourlyRateCents,

    jobTitle: v.jobTitle,
    department: v.department,
    location: v.location,
    employmentType: v.employmentType,
    remoteType: v.remoteType,
    managerName: v.managerName,
    annualSalaryCents: v.annualSalaryCents,
    hourlyRateCents: v.hourlyRateCents,
    bonusCents: v.bonusCents,
    otherCompensation: v.otherCompensation,
    benefitsSummary: v.benefitsSummary,
    ptoSummary: v.ptoSummary,
    additionalTerms: v.additionalTerms,

    effectiveDate: v.effectiveDate,
    expirationDate: v.expirationDate,

    // Frozen with the version, never re-read from a template that may since
    // have changed.
    templateBodyHtml: v.templateBodyHtml ?? "<p>Your employment terms have been updated as set out below.</p>",
    templateTermsHtml: v.templateTermsHtml,
    templateAcknowledgementsHtml: v.templateAcknowledgementsHtml,
    authorizedRepresentative: input.authorizedRepresentative ?? null,
    versionNumber: v.versionNumber,
    reference: input.reference ?? null,
    signature: {
      ...input.signature,
      versionNumber: v.versionNumber,
      promotionId: v.promotionId,
    },
  };
  return renderPromotionHtml(args);
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
