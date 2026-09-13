"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  promotions, promotionVersions, employmentEvents,
  employees, offerTemplates, auditLogs, recruitingSettings,
} from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import type { AuditAction } from "@/lib/audit";
import { promotionInputSchema } from "./validation";
import {
  canEditPromotion, canSubmitForApproval, canApprove, canSend, canWithdraw,
  promotionEditConsequence, promotionDeadline, promotionReferenceFor,
  describeChanges, type PromotionStatus,
} from "./policy";
import { applyPromotion } from "./apply";
import { generateOfferToken, hashOfferToken } from "@/lib/offers/tokens";
import { renderPromotionHtml } from "./render-html";
import { DEFAULT_PROMOTION_TEMPLATE, renderPromotionSection } from "./template";
import { send } from "@/lib/email";
import { promotionSentEmail } from "./email-templates";
import { serverEnv } from "@/lib/env";

export type PromotionActionState = { error?: string; success?: string };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** One audit row per promotion event, mirroring offers/actions.ts's record(). */
async function record(tx: Tx, adminId: string | null, promotionId: string, action: AuditAction, metadata?: Record<string, unknown>) {
  await tx.insert(auditLogs).values({
    adminId, entityType: "promotion", entityId: promotionId, action, metadata,
  });
}

function refresh(promotionId?: string, employeeId?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/employees");
  if (promotionId) revalidatePath(`/admin/promotions/${promotionId}`);
  if (employeeId) revalidatePath(`/admin/employees/${employeeId}`);
}

/**
 * Builds one version's frozen HTML from the employee's current state and the
 * requested changes.
 *
 * The previous values are read here, inside the transaction, and written onto
 * the version row — never re-read at render time. That is what lets an
 * employee be promoted repeatedly without their earlier letters rewriting
 * themselves to show a later "current" title.
 */
async function buildVersion(
  tx: Tx,
  employee: typeof employees.$inferSelect,
  input: ReturnType<typeof promotionInputSchema.parse>,
  versionNumber: number,
  reference: string,
) {
  const [settings] = await tx.select().from(recruitingSettings).limit(1);

  // The employee's compensation lives on whatever document last set it: the
  // most recent applied promotion, else the accepted offer. Employees carry
  // no salary column of their own, so this is the authoritative previous pay.
  const [lastEvent] = await tx.select().from(employmentEvents)
    .where(eq(employmentEvents.employeeId, employee.id))
    .orderBy(desc(employmentEvents.effectiveDate), desc(employmentEvents.createdAt))
    .limit(1);

  const manager = input.managerId
    ? (await tx.select().from(employees).where(eq(employees.id, input.managerId)))[0]
    : undefined;
  const previousManager = employee.managerId
    ? (await tx.select().from(employees).where(eq(employees.id, employee.managerId)))[0]
    : undefined;

  const previous = {
    previousJobTitle: employee.jobTitle,
    previousDepartment: employee.department,
    previousLocation: employee.location ?? null,
    previousEmploymentType: employee.employmentType,
    previousManagerName: previousManager ? `${previousManager.firstName} ${previousManager.lastName}` : null,
    previousAnnualSalaryCents: lastEvent?.annualSalaryCents ?? null,
    previousHourlyRateCents: lastEvent?.hourlyRateCents ?? null,
  };

  const managerName = manager
    ? `${manager.firstName} ${manager.lastName}`
    : previous.previousManagerName;

  const templateValues = {
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeeFirstName: employee.firstName,
    employeeEmail: employee.workEmail,
    jobTitle: input.jobTitle,
    department: input.department,
    location: input.location ?? employee.location,
    employmentType: input.employmentType,
    remoteType: input.remoteType ?? null,
    managerName,
    effectiveDate: input.effectiveDate,
    expirationDate: promotionDeadline(input.expirationDate),
    annualSalaryCents: input.annualSalaryCents ?? null,
    hourlyRateCents: input.hourlyRateCents ?? null,
    bonusCents: input.bonusCents ?? null,
    otherCompensation: input.otherCompensation ?? null,
    benefitsSummary: input.benefitsSummary ?? settings?.defaultBenefitsSummary ?? null,
    ptoSummary: input.ptoSummary ?? settings?.defaultPtoSummary ?? null,
    additionalTerms: input.additionalTerms ?? null,
    hrContactEmail: settings?.hrContactEmail ?? null,
    authorizedRepName: settings?.authorizedRepName ?? null,
    authorizedRepTitle: settings?.authorizedRepTitle ?? null,
    reference,
  };

  // A chosen template wins; otherwise the built-in promotion letter is used,
  // so HR never has to write prose for a routine promotion.
  const template = input.templateId
    ? (await tx.select().from(offerTemplates).where(eq(offerTemplates.id, input.templateId)))[0]
    : undefined;
  const source = template?.isActive
    ? { bodyHtml: template.bodyHtml, termsHtml: template.termsHtml, acknowledgementsHtml: template.acknowledgementsHtml }
    : DEFAULT_PROMOTION_TEMPLATE;

  const templateBodyHtml = renderPromotionSection(source.bodyHtml, templateValues)
    ?? "<p>Your employment terms have been updated as set out below.</p>";
  const templateTermsHtml = renderPromotionSection(source.termsHtml, templateValues);
  const templateAcknowledgementsHtml = renderPromotionSection(source.acknowledgementsHtml, templateValues);

  const columns = {
    ...previous,
    jobTitle: input.jobTitle,
    department: input.department,
    location: input.location ?? employee.location ?? null,
    employmentType: input.employmentType,
    remoteType: input.remoteType ?? null,
    managerId: input.managerId ?? employee.managerId ?? null,
    managerName: managerName ?? null,
    effectiveDate: input.effectiveDate,
    expirationDate: promotionDeadline(input.expirationDate),
    annualSalaryCents: input.annualSalaryCents ?? null,
    hourlyRateCents: input.hourlyRateCents ?? null,
    bonusCents: input.bonusCents ?? null,
    otherCompensation: input.otherCompensation ?? null,
    benefitsSummary: templateValues.benefitsSummary,
    ptoSummary: templateValues.ptoSummary,
    additionalTerms: input.additionalTerms ?? null,
  };

  const renderedHtml = renderPromotionHtml({
    employeeName: templateValues.employeeName,
    employeeFirstName: employee.firstName,
    employeeEmail: employee.workEmail,
    employeeNumber: employee.employeeId,
    ...columns,
    templateBodyHtml,
    templateTermsHtml,
    templateAcknowledgementsHtml,
    authorizedRepresentative: settings?.authorizedRepName
      ? { name: settings.authorizedRepName, title: settings.authorizedRepTitle ?? null }
      : null,
    versionNumber,
    reference,
  });

  return { columns, renderedHtml, templateBodyHtml, templateTermsHtml, templateAcknowledgementsHtml };
}

/* ------------------------------------------------------------------ create */

export async function createPromotionAction(_: PromotionActionState, form: FormData): Promise<PromotionActionState> {
  const admin = await requirePermission("employees");
  const parsed = promotionInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields." };
  const input = parsed.data;

  let promotionId: string;
  try {
    promotionId = await db.transaction(async tx => {
      const [employee] = await tx.select().from(employees)
        .where(eq(employees.id, input.employeeId)).for("update");
      if (!employee) throw new Error("Employee not found.");
      if (employee.status === "TERMINATED") throw new Error("A terminated employee cannot be promoted.");

      // promotions_one_active_employee_idx enforces this at the database
      // level; checking here turns a constraint violation into a sentence the
      // admin can act on.
      const existing = await tx.select({ status: promotions.status })
        .from(promotions).where(eq(promotions.employeeId, input.employeeId));
      if (existing.some(p => !["DECLINED", "WITHDRAWN", "EXPIRED", "EFFECTIVE"].includes(p.status))) {
        throw new Error("This employee already has a promotion in progress. Withdraw it before creating another.");
      }

      const [promotion] = await tx.insert(promotions).values({
        employeeId: input.employeeId,
        templateId: input.templateId ?? null,
        createdBy: admin.id,
        secureTokenHash: hashOfferToken(generateOfferToken()),
      }).returning();

      const reference = promotionReferenceFor(promotion!, { versionNumber: 1 });
      const built = await buildVersion(tx, employee, input, 1, reference);

      // A letter that changes nothing is not a promotion.
      if (describeChanges(built.columns).length === 0) {
        throw new Error("Nothing has changed. Update at least one field before creating a promotion.");
      }

      const [version] = await tx.insert(promotionVersions).values({
        promotionId: promotion!.id, versionNumber: 1, createdBy: admin.id,
        ...built.columns,
        renderedHtml: built.renderedHtml,
        templateBodyHtml: built.templateBodyHtml,
        templateTermsHtml: built.templateTermsHtml,
        templateAcknowledgementsHtml: built.templateAcknowledgementsHtml,
      }).returning();

      await tx.update(promotions).set({ currentVersionId: version!.id, updatedAt: new Date() })
        .where(eq(promotions.id, promotion!.id));

      await record(tx, admin.id, promotion!.id, "PROMOTION_CREATED", {
        employeeId: input.employeeId,
        changes: describeChanges(built.columns),
      });
      return promotion!.id;
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the promotion." };
  }

  refresh(promotionId, input.employeeId);
  redirect(`/admin/promotions/${promotionId}`);
}

/* -------------------------------------------------------------------- edit */

export async function updatePromotionAction(_: PromotionActionState, form: FormData): Promise<PromotionActionState> {
  const admin = await requirePermission("employees");
  const promotionId = String(form.get("promotionId") ?? "");
  const parsed = promotionInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields." };
  const input = parsed.data;

  try {
    await db.transaction(async tx => {
      const [promotion] = await tx.select().from(promotions)
        .where(eq(promotions.id, promotionId)).for("update");
      if (!promotion) throw new Error("Promotion not found.");
      if (!canEditPromotion(promotion.status as PromotionStatus)) {
        throw new Error("This promotion can no longer be edited. Withdraw it and create a new one.");
      }
      const [employee] = await tx.select().from(employees).where(eq(employees.id, promotion.employeeId));
      if (!employee) throw new Error("Employee not found.");

      const [latest] = await tx.select({ n: promotionVersions.versionNumber })
        .from(promotionVersions).where(eq(promotionVersions.promotionId, promotionId))
        .orderBy(desc(promotionVersions.versionNumber)).limit(1);
      const nextNumber = (latest?.n ?? 0) + 1;

      const reference = promotionReferenceFor(promotion, { versionNumber: nextNumber });
      const built = await buildVersion(tx, employee, input, nextNumber, reference);
      if (describeChanges(built.columns).length === 0) {
        throw new Error("Nothing has changed. Update at least one field.");
      }

      // Insert-only: the version the employee may already have seen is never
      // touched, a new one is written beside it.
      const [version] = await tx.insert(promotionVersions).values({
        promotionId, versionNumber: nextNumber, createdBy: admin.id,
        ...built.columns,
        renderedHtml: built.renderedHtml,
        templateBodyHtml: built.templateBodyHtml,
        templateTermsHtml: built.templateTermsHtml,
        templateAcknowledgementsHtml: built.templateAcknowledgementsHtml,
      }).returning();

      const consequence = promotionEditConsequence(promotion.status as PromotionStatus);
      await tx.update(promotions).set({
        currentVersionId: version!.id,
        status: consequence.nextStatus,
        templateId: input.templateId ?? null,
        // A sent link must die with the document it pointed at.
        ...(consequence.rotateToken ? { secureTokenHash: hashOfferToken(generateOfferToken()), sentAt: null, viewedAt: null } : {}),
        approvedBy: null, approvedAt: null,
        updatedAt: new Date(),
      }).where(eq(promotions.id, promotionId));

      await record(tx, admin.id, promotionId, "PROMOTION_UPDATED", {
        versionNumber: nextNumber, rotatedToken: consequence.rotateToken,
      });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update the promotion." };
  }

  refresh(promotionId);
  redirect(`/admin/promotions/${promotionId}`);
}

/* ---------------------------------------------------------------- workflow */

/** Shared guard + transition for the simple status-only steps. */
async function transition(
  promotionId: string,
  permission: "employees" | "manage",
  guard: (status: PromotionStatus) => boolean,
  refusal: string,
  patch: (adminId: string) => Partial<typeof promotions.$inferInsert>,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<PromotionActionState> {
  const admin = await requirePermission(permission);
  try {
    await db.transaction(async tx => {
      const [promotion] = await tx.select().from(promotions)
        .where(eq(promotions.id, promotionId)).for("update");
      if (!promotion) throw new Error("Promotion not found.");
      if (!guard(promotion.status as PromotionStatus)) throw new Error(refusal);
      await tx.update(promotions).set({ ...patch(admin.id), updatedAt: new Date() })
        .where(eq(promotions.id, promotionId));
      await record(tx, admin.id, promotionId, action, metadata);
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not complete that step." };
  }
  refresh(promotionId);
  return { success: "Done." };
}

export async function submitPromotionForApprovalAction(_: PromotionActionState, form: FormData) {
  return transition(
    String(form.get("promotionId") ?? ""), "employees",
    canSubmitForApproval, "Only a draft promotion can be submitted for approval.",
    () => ({ status: "PENDING_APPROVAL" }), "PROMOTION_SUBMITTED_FOR_APPROVAL",
  );
}

export async function approvePromotionAction(_: PromotionActionState, form: FormData) {
  return transition(
    String(form.get("promotionId") ?? ""), "manage",
    canApprove, "Only a promotion pending approval can be approved.",
    adminId => ({ status: "APPROVED", approvedBy: adminId, approvedAt: new Date() }),
    "PROMOTION_APPROVED",
  );
}

export async function rejectPromotionAction(_: PromotionActionState, form: FormData) {
  const note = String(form.get("note") ?? "").slice(0, 500);
  return transition(
    String(form.get("promotionId") ?? ""), "manage",
    canApprove, "Only a promotion pending approval can be sent back.",
    () => ({ status: "DRAFT" }), "PROMOTION_REJECTED", { note },
  );
}

export async function withdrawPromotionAction(_: PromotionActionState, form: FormData) {
  return transition(
    String(form.get("promotionId") ?? ""), "manage",
    canWithdraw, "This promotion has already taken effect and cannot be withdrawn.",
    () => ({ status: "WITHDRAWN", withdrawnAt: new Date() }), "PROMOTION_WITHDRAWN",
  );
}

/* -------------------------------------------------------------------- send */

export async function sendPromotionAction(_: PromotionActionState, form: FormData): Promise<PromotionActionState> {
  const admin = await requirePermission("employees");
  const promotionId = String(form.get("promotionId") ?? "");

  let token: string | null = null;
  let recipient: { email: string; name: string; title: string } | null = null;
  let deadline: Date | null = null;
  try {
    await db.transaction(async tx => {
      const [promotion] = await tx.select().from(promotions)
        .where(eq(promotions.id, promotionId)).for("update");
      if (!promotion) throw new Error("Promotion not found.");
      if (!canSend(promotion.status as PromotionStatus)) {
        throw new Error("Only an approved promotion can be sent.");
      }
      const [employee] = await tx.select().from(employees).where(eq(employees.id, promotion.employeeId));
      const [version] = await tx.select().from(promotionVersions)
        .where(eq(promotionVersions.id, promotion.currentVersionId!));
      if (!employee || !version) throw new Error("Promotion is incomplete.");

      // A fresh token per send, so a previously distributed link never works.
      const raw = generateOfferToken();
      token = raw;
      recipient = { email: employee.workEmail, name: employee.firstName, title: version.jobTitle };
      deadline = version.expirationDate;

      await tx.update(promotions).set({
        status: "SENT",
        secureTokenHash: hashOfferToken(raw),
        tokenExpiresAt: version.expirationDate,
        sentAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(promotions.id, promotionId));

      await record(tx, admin.id, promotionId, "PROMOTION_SENT", { employeeId: employee.id });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not send the promotion." };
  }

  // Email outside the transaction: a mail failure must not roll back the send,
  // and the letter can be re-sent. Same posture as the offer flow.
  if (token && recipient && deadline) {
    const r = recipient as { email: string; name: string; title: string };
    const url = `${serverEnv().appUrl.replace(/\/$/, "")}/promotion/${token}`;
    const mail = promotionSentEmail({
      firstName: r.name, jobTitle: r.title, promotionUrl: url, expirationDate: deadline,
    });
    await send({ to: r.email, ...mail }).catch(() => ({ sent: false }));
  }

  refresh(promotionId);
  return { success: "Promotion letter sent to the employee." };
}

/* ----------------------------------------------------- effective-date apply */

export async function applyPromotionAction(_: PromotionActionState, form: FormData): Promise<PromotionActionState> {
  const admin = await requirePermission("employees");
  const promotionId = String(form.get("promotionId") ?? "");
  try {
    await db.transaction(tx => applyPromotion(tx, promotionId, admin.id));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not apply the promotion." };
  }
  refresh(promotionId);
  return { success: "Promotion applied. The employee record has been updated." };
}
