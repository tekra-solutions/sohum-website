import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  promotions, promotionVersions, promotionSignatures, employmentEvents,
  employees, auditLogs, notifications,
} from "@/db/schema";
import type { AuditAction } from "@/lib/audit";
import { isDueToApply, type PromotionStatus } from "./policy";
import { renderOfferPdf } from "@/lib/offers/pdf";
import { letterheadFooterTemplate, letterheadHeaderTemplate } from "@/lib/documents/chrome";
import { sohumLetterheadDataUri } from "@/lib/documents/logo";
import { uploadOfferPdf } from "@/lib/storage/offers";

/**
 * Promotion helpers that are not server actions.
 *
 * They live outside actions.ts because a "use server" module may only export
 * async functions — a plain path builder there fails the build. Keeping them
 * here also lets the effective-date sweep be called from a route or a job
 * without pulling in the action surface.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function record(tx: Tx, adminId: string | null, promotionId: string, action: AuditAction, metadata?: Record<string, unknown>) {
  await tx.insert(auditLogs).values({
    adminId, entityType: "promotion", entityId: promotionId, action, metadata,
  });
}

/** Storage path for a promotion PDF. Reuses the offer bucket and helpers; the
 *  prefix keeps the two document families apart. */
export function buildPromotionPdfPath(promotionId: string, versionNumber: number) {
  return `promotions/${promotionId}/v${versionNumber}.pdf`;
}

/**
 * Applies an accepted promotion to the employee record.
 *
 * This is the ONLY place the employee row changes as a result of a promotion,
 * and it refuses to run before the effective date. Everything happens in one
 * transaction: the employee row moves, an employment_events row records what
 * it moved from, and the promotion becomes EFFECTIVE. The unique index on
 * employment_events.promotion_id makes a second run a no-op rather than a
 * duplicate history entry.
 *
 * Called by the admin action below and by the due-promotions sweep.
 */
export async function applyPromotion(tx: Tx, promotionId: string, adminId: string | null) {
  const [promotion] = await tx.select().from(promotions)
    .where(eq(promotions.id, promotionId)).for("update");
  if (!promotion) throw new Error("Promotion not found.");

  const [version] = await tx.select().from(promotionVersions)
    .where(eq(promotionVersions.id, promotion.acceptedVersionId ?? promotion.currentVersionId!));
  if (!version) throw new Error("Promotion has no accepted version.");

  if (!isDueToApply(promotion.status as PromotionStatus, version.effectiveDate)) {
    throw new Error(
      promotion.status !== "ACCEPTED"
        ? "Only an accepted promotion can take effect."
        : "This promotion's effective date has not arrived yet.",
    );
  }

  const [employee] = await tx.select().from(employees)
    .where(eq(employees.id, promotion.employeeId)).for("update");
  if (!employee) throw new Error("Employee not found.");

  const [signature] = await tx.select().from(promotionSignatures)
    .where(eq(promotionSignatures.promotionId, promotionId));

  // History first: the row records what the employee looked like *before*
  // this change, so nothing is lost when the employee row is overwritten.
  await tx.insert(employmentEvents).values({
    employeeId: employee.id,
    eventType: "PROMOTED",
    promotionId,
    promotionVersionId: version.id,
    previousJobTitle: version.previousJobTitle,
    jobTitle: version.jobTitle,
    previousDepartment: version.previousDepartment,
    department: version.department,
    previousLocation: version.previousLocation,
    location: version.location,
    previousManagerName: version.previousManagerName,
    managerName: version.managerName,
    previousAnnualSalaryCents: version.previousAnnualSalaryCents,
    annualSalaryCents: version.annualSalaryCents,
    previousHourlyRateCents: version.previousHourlyRateCents,
    hourlyRateCents: version.hourlyRateCents,
    effectiveDate: version.effectiveDate,
    signedAt: signature?.signedAt ?? promotion.signedAt,
    createdBy: adminId,
  }).onConflictDoNothing();

  await tx.update(employees).set({
    jobTitle: version.jobTitle,
    department: version.department,
    location: version.location ?? employee.location,
    employmentType: version.employmentType,
    managerId: version.managerId ?? employee.managerId,
    updatedAt: new Date(),
  }).where(eq(employees.id, employee.id));

  await tx.update(promotions).set({
    status: "EFFECTIVE", appliedAt: new Date(), updatedAt: new Date(),
  }).where(eq(promotions.id, promotionId));

  await record(tx, adminId, promotionId, "PROMOTION_APPLIED", {
    employeeId: employee.id,
    from: version.previousJobTitle,
    to: version.jobTitle,
  });
}

/**
 * Applies every accepted promotion whose effective date has arrived.
 *
 * Idempotent, so it is safe to call repeatedly — from a scheduled job, or
 * opportunistically when an admin opens the employees list. Each promotion is
 * applied in its own transaction so one failure cannot block the rest.
 */
export async function applyDuePromotions(adminId: string | null = null) {
  const due = await db.select({ id: promotions.id })
    .from(promotions)
    .innerJoin(promotionVersions, eq(promotionVersions.id, promotions.acceptedVersionId))
    .where(and(eq(promotions.status, "ACCEPTED")));

  let applied = 0;
  for (const row of due) {
    try {
      await db.transaction(tx => applyPromotion(tx, row.id, adminId));
      applied += 1;
    } catch {
      // Not yet due, or already applied by a concurrent run. Both are normal.
    }
  }
  return applied;
}

/* ------------------------------------------------------------------- PDF */

/** Generates and stores the PDF for a version, reusing the offer renderer. */
export async function generatePromotionPdf(promotionId: string, versionId: string) {
  const [version] = await db.select().from(promotionVersions).where(eq(promotionVersions.id, versionId));
  if (!version) throw new Error("Version not found.");
  const pdf = await renderOfferPdf(version.renderedHtml, {
    headerTemplate: letterheadHeaderTemplate(sohumLetterheadDataUri),
    footerTemplate: letterheadFooterTemplate(),
  });
  const path = buildPromotionPdfPath(promotionId, version.versionNumber);
  await uploadOfferPdf({ path, body: pdf });
  await db.update(promotionVersions).set({ pdfStoragePath: path }).where(eq(promotionVersions.id, versionId));
  return { path, bytes: pdf.length };
}

/** Notifies the creator and approvers that an employee has signed. */
export async function notifyPromotionSigned(tx: Tx, promotionId: string, employeeName: string) {
  const [promotion] = await tx.select().from(promotions).where(eq(promotions.id, promotionId));
  if (!promotion) return;
  const recipients = [promotion.createdBy, promotion.approvedBy].filter(
    (id): id is string => Boolean(id),
  );
  for (const adminId of [...new Set(recipients)]) {
    await tx.insert(notifications).values({
      adminId,
      title: `${employeeName} signed their promotion letter`,
      href: `/admin/promotions/${promotionId}`,
    });
  }
}
