import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { offerSignatures, offerVersions, promotionSignatures, promotionVersions, auditLogs } from "@/db/schema";
import { generateSignedOfferPdf } from "@/lib/offers/signed-document";
import { generateSignedPromotionPdf } from "@/lib/promotions/signed-document";

/** Called only after the route's authorization; safely retries failed PDF delivery. */
export async function ensureSignedDocument(kind: "offer" | "promotion", id: string): Promise<string | null> {
  if (kind === "offer") {
    const [s] = await db.select().from(offerSignatures).where(eq(offerSignatures.offerId, id));
    if (!s) return null;
    if (s.signedPdfPath) return s.signedPdfPath;
    const [v] = await db.select().from(offerVersions).where(eq(offerVersions.id, s.offerVersionId));
    if (!v) return null;
    const result = await generateSignedOfferPdf({ version: v, candidateName: s.candidateLegalName, candidateEmail: s.candidateEmail,
      signature: { candidateLegalName: s.candidateLegalName, candidateEmail: s.candidateEmail, signatureValue: s.signatureValue,
        signedAt: s.signedAt, consentedAt: s.consentedAt, consentText: s.consentText, verificationMethod: s.verificationMethod,
        offerVersionNumber: v.versionNumber, offerId: id } });
    const changed = await db.update(offerSignatures).set({ signedPdfPath: result.path, documentHash: result.documentHash })
      .where(and(eq(offerSignatures.id, s.id), isNull(offerSignatures.signedPdfPath))).returning();
    if (changed.length) await db.insert(auditLogs).values({ action: "SIGNED_PDF_GENERATED", entityType: kind, entityId: id, metadata: { fileHash: result.fileHash, recovered: true } });
    return changed[0]?.signedPdfPath ?? (await db.select().from(offerSignatures).where(eq(offerSignatures.id, s.id)))[0]?.signedPdfPath ?? null;
  }
  const [s] = await db.select().from(promotionSignatures).where(eq(promotionSignatures.promotionId, id));
  if (!s) return null;
  if (s.signedPdfPath) return s.signedPdfPath;
  const [v] = await db.select().from(promotionVersions).where(eq(promotionVersions.id, s.promotionVersionId));
  if (!v) return null;
  const result = await generateSignedPromotionPdf({ version: v, employeeName: s.signerLegalName, employeeEmail: s.signerEmail,
    signature: { signerLegalName: s.signerLegalName, signerEmail: s.signerEmail, signatureValue: s.signatureValue,
      signedAt: s.signedAt, consentedAt: s.consentedAt, consentText: s.consentText, verificationMethod: s.verificationMethod } });
  const changed = await db.update(promotionSignatures).set({ signedPdfPath: result.path, documentHash: result.documentHash })
    .where(and(eq(promotionSignatures.id, s.id), isNull(promotionSignatures.signedPdfPath))).returning();
  if (changed.length) await db.insert(auditLogs).values({ action: "SIGNED_PDF_GENERATED", entityType: kind, entityId: id, metadata: { fileHash: result.fileHash, recovered: true } });
  return changed[0]?.signedPdfPath ?? (await db.select().from(promotionSignatures).where(eq(promotionSignatures.id, s.id)))[0]?.signedPdfPath ?? null;
}
