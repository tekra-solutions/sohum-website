"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { offers, offerVersions, offerTemplates, applications, admins, notifications, auditLogs } from "@/db/schema";
import { candidateScope, requireApplication } from "@/lib/ats/access";
import { requireOffer } from "./access";
import type { AuditAction } from "@/lib/audit";
import { offerVersionInputSchema } from "./validation";
import {
  canEditOffer, canSubmitForApproval, canApprove, canRejectOrRequestChanges,
  canSend, canWithdraw, offerEditConsequence, type OfferStatus,
} from "./policy";
import { generateOfferToken, hashOfferToken } from "./tokens";
import { renderOfferHtml } from "./render-html";
import { renderOfferTemplate } from "./variables";
import { renderOfferPdf } from "./pdf";
import { uploadOfferPdf, buildOfferPdfPath } from "@/lib/storage/offers";
import { offerSentEmail } from "./email-templates";
import { send } from "@/lib/email";
import { site, contact } from "@/lib/site";

export type OfferActionState = { error?: string; success?: string };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Same shape as ats/actions.ts's record() — one audit row per offer event. */
async function record(tx: Tx, adminId: string, offerId: string, action: AuditAction, metadata?: Record<string, unknown>) {
  await tx.insert(auditLogs).values({ adminId, entityType: "offer", entityId: offerId, action, metadata });
}

function refresh(offerId?: string, applicationId?: string) {
  revalidatePath("/admin/offers");
  if (offerId) revalidatePath(`/admin/offers/${offerId}`);
  if (applicationId) revalidatePath(`/admin/applications/${applicationId}`);
}

type VersionInput = z.infer<typeof offerVersionInputSchema>;

const versionColumns = (v: VersionInput) => ({
  jobTitle: v.jobTitle, department: v.department, location: v.location,
  employmentType: v.employmentType, remoteType: v.remoteType,
  hiringManagerName: v.hiringManagerName ?? null, reportsTo: v.reportsTo ?? null,
  startDate: v.startDate, expirationDate: v.expirationDate,
  annualSalaryCents: v.annualSalaryCents ?? null, hourlyRateCents: v.hourlyRateCents ?? null,
  bonusCents: v.bonusCents ?? null, signOnBonusCents: v.signOnBonusCents ?? null,
  otherCompensation: v.otherCompensation ?? null, benefitsSummary: v.benefitsSummary ?? null,
  ptoSummary: v.ptoSummary ?? null, workLocation: v.workLocation ?? null,
  additionalTerms: v.additionalTerms ?? null,
});

/**
 * Builds the frozen renderedHtml for a version, resolving candidate/company
 * info the same way regardless of whether this is version 1 (creation) or
 * version N+1 (an edit) — the caller supplies only the form fields, this
 * fills in everything else.
 */
async function buildRenderedHtml(tx: Tx, app: typeof applications.$inferSelect, v: VersionInput) {
  let templateBodyHtml = "<p>Terms as described above.</p>";
  if (v.templateId) {
    const [template] = await tx.select().from(offerTemplates).where(eq(offerTemplates.id, v.templateId));
    if (template) {
      templateBodyHtml = renderOfferTemplate(template.bodyHtml, {
        candidate_name: `${app.firstName} ${app.lastName}`,
        candidate_first_name: app.firstName,
        job_title: v.jobTitle,
        department: v.department,
        location: v.location,
        employment_type: v.employmentType,
        start_date: v.startDate.toLocaleDateString("en-US", { timeZone: "UTC" }),
        salary: v.annualSalaryCents != null ? String(v.annualSalaryCents / 100) : "",
        hourly_rate: v.hourlyRateCents != null ? String(v.hourlyRateCents / 100) : "",
        bonus: v.bonusCents != null ? String(v.bonusCents / 100) : "",
        manager_name: v.hiringManagerName ?? v.reportsTo ?? "",
        company_name: site.name,
        company_address: contact.address,
        offer_expiration_date: v.expirationDate.toLocaleDateString("en-US", { timeZone: "UTC" }),
      });
    }
  }
  return renderOfferHtml({
    candidateName: `${app.firstName} ${app.lastName}`,
    candidateAddress: [app.address, [app.city, app.state, app.zipCode].filter(Boolean).join(", ")].filter(Boolean).join("\n") || null,
    templateBodyHtml,
    ...versionColumns(v),
  });
}

export async function createOfferAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const applicationId = String(form.get("applicationId") ?? "");
  const { admin, app } = await requireApplication(applicationId, "candidates");
  if (app.status !== "OFFER") return { error: "This candidate is not at the offer stage." };

  const parsed = offerVersionInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields." };
  const v = parsed.data;

  let offerId: string;
  try {
    offerId = await db.transaction(async tx => {
      const [locked] = await tx.select().from(applications).where(and(eq(applications.id, applicationId), candidateScope(admin))).for("update");
      if (!locked) throw new Error("Candidate is no longer accessible.");

      const existingActive = await tx.select({ id: offers.id }).from(offers).where(and(
        eq(offers.applicationId, applicationId),
        notInArray(offers.status, ["DECLINED", "WITHDRAWN", "EXPIRED"]),
      ));
      if (existingActive.length) throw new Error("An offer already exists for this candidate. Withdraw it before creating a new one.");

      const [offer] = await tx.insert(offers).values({
        applicationId, templateId: v.templateId ?? null, createdBy: admin.id,
        secureTokenHash: hashOfferToken(generateOfferToken()),
      }).returning();

      const renderedHtml = await buildRenderedHtml(tx, locked, v);
      const [version] = await tx.insert(offerVersions).values({
        offerId: offer!.id, versionNumber: 1, createdBy: admin.id, renderedHtml,
        ...versionColumns(v),
      }).returning();

      await tx.update(offers).set({ currentVersionId: version!.id }).where(eq(offers.id, offer!.id));
      await record(tx, admin.id, offer!.id, "OFFER_CREATED", { applicationId });
      return offer!.id;
    });
  } catch (err) {
    return { error: err instanceof z.ZodError ? err.issues[0]?.message : err instanceof Error && !("query" in err) ? err.message : "Could not create this offer." };
  }
  refresh(offerId, applicationId);
  redirect(`/admin/offers/${offerId}`);
}

export async function updateOfferAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const offerId = String(form.get("offerId") ?? "");
  const { admin, offer, application } = await requireOffer(offerId, "candidates");
  if (!canEditOffer(offer.status as OfferStatus)) return { error: "This offer can no longer be edited." };

  const parsed = offerVersionInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields." };
  const v = parsed.data;

  try {
    await db.transaction(async tx => {
      const [locked] = await tx.select().from(offers).where(eq(offers.id, offerId)).for("update");
      if (!locked || !canEditOffer(locked.status as OfferStatus)) throw new Error("This offer can no longer be edited.");

      const versions = await tx.select({ n: offerVersions.versionNumber }).from(offerVersions).where(eq(offerVersions.offerId, offerId));
      const nextVersion = Math.max(...versions.map(r => r.n)) + 1;

      const renderedHtml = await buildRenderedHtml(tx, application, v);
      const [version] = await tx.insert(offerVersions).values({
        offerId, versionNumber: nextVersion, createdBy: admin.id, renderedHtml,
        ...versionColumns(v),
      }).returning();

      const consequence = offerEditConsequence(locked.status as OfferStatus);
      const patch: Partial<typeof offers.$inferInsert> = {
        currentVersionId: version!.id,
        status: consequence.nextStatus,
        templateId: v.templateId ?? locked.templateId,
      };
      if (consequence.rotateToken) {
        patch.secureTokenHash = hashOfferToken(generateOfferToken());
        patch.tokenExpiresAt = null;
      }
      await tx.update(offers).set(patch).where(eq(offers.id, offerId));
      await record(tx, admin.id, offerId, "OFFER_UPDATED", { applicationId: application.id, versionNumber: nextVersion });
    });
  } catch (err) {
    return { error: err instanceof z.ZodError ? err.issues[0]?.message : err instanceof Error && !("query" in err) ? err.message : "Could not save this offer." };
  }
  refresh(offerId, application.id);
  return { success: "Offer updated. Review and resubmit for approval." };
}

export async function submitOfferForApprovalAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const offerId = String(form.get("offerId") ?? "");
  const { admin, offer, application } = await requireOffer(offerId, "candidates");
  if (!canSubmitForApproval(offer.status as OfferStatus)) return { error: "Only a draft offer can be submitted for approval." };

  await db.transaction(async tx => {
    const [locked] = await tx.select().from(offers).where(eq(offers.id, offerId)).for("update");
    if (!locked || !canSubmitForApproval(locked.status as OfferStatus)) throw new Error("Only a draft offer can be submitted for approval.");
    await tx.update(offers).set({ status: "PENDING_APPROVAL" }).where(eq(offers.id, offerId));
    await record(tx, admin.id, offerId, "OFFER_SUBMITTED_FOR_APPROVAL", { applicationId: application.id });

    const approvers = await tx.select({ id: admins.id }).from(admins).where(and(eq(admins.isActive, true), notInArray(admins.role, ["RECRUITER", "HIRING_MANAGER"])));
    if (approvers.length) await tx.insert(notifications).values(approvers.map(a => ({ adminId: a.id, title: "Offer awaiting approval", href: `/admin/offers/${offerId}` })));
  });
  refresh(offerId, application.id);
  return { success: "Submitted for approval." };
}

export async function approveOfferAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const offerId = String(form.get("offerId") ?? "");
  const { admin, offer, application } = await requireOffer(offerId, "manage");
  if (!canApprove(offer.status as OfferStatus)) return { error: "Only an offer pending approval can be approved." };

  await db.transaction(async tx => {
    const [locked] = await tx.select().from(offers).where(eq(offers.id, offerId)).for("update");
    if (!locked || !canApprove(locked.status as OfferStatus)) throw new Error("Only an offer pending approval can be approved.");
    await tx.update(offers).set({ status: "APPROVED", approvedBy: admin.id, approvedAt: new Date() }).where(eq(offers.id, offerId));
    await record(tx, admin.id, offerId, "OFFER_APPROVED", { applicationId: application.id });
  });
  refresh(offerId, application.id);
  return { success: "Offer approved." };
}

async function rejectOrRequestChanges(form: FormData, note: string): Promise<OfferActionState> {
  const offerId = String(form.get("offerId") ?? "");
  const { admin, offer, application } = await requireOffer(offerId, "manage");
  if (!canRejectOrRequestChanges(offer.status as OfferStatus)) return { error: "Only an offer pending approval can be sent back." };

  await db.transaction(async tx => {
    const [locked] = await tx.select().from(offers).where(eq(offers.id, offerId)).for("update");
    if (!locked || !canRejectOrRequestChanges(locked.status as OfferStatus)) throw new Error("Only an offer pending approval can be sent back.");
    await tx.update(offers).set({ status: "DRAFT" }).where(eq(offers.id, offerId));
    await record(tx, admin.id, offerId, "OFFER_REJECTED", { applicationId: application.id, note });
  });
  refresh(offerId, application.id);
  return { success: "Returned to draft." };
}

export async function rejectOfferAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  return rejectOrRequestChanges(form, String(form.get("note") ?? "Rejected."));
}

export async function requestOfferChangesAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const note = z.string().trim().min(1).max(1000).safeParse(form.get("note"));
  if (!note.success) return { error: "Describe what needs to change." };
  return rejectOrRequestChanges(form, note.data);
}

export async function sendOfferAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const offerId = String(form.get("offerId") ?? "");
  const { admin, offer, application } = await requireOffer(offerId, "candidates");
  if (!canSend(offer.status as OfferStatus)) return { error: "Only an approved offer can be sent." };

  const [version] = await db.select().from(offerVersions).where(eq(offerVersions.id, offer.currentVersionId!));
  if (!version) return { error: "This offer has no content to send." };

  let pdf: Buffer;
  try {
    pdf = await renderOfferPdf(version.renderedHtml);
  } catch (err) {
    console.error("[offers] PDF generation failed", { offerId, error: err instanceof Error ? err.message : String(err) });
    return { error: "Could not generate the offer PDF. Please try again." };
  }
  const path = buildOfferPdfPath(offerId, version.versionNumber);
  try {
    await uploadOfferPdf({ path, body: pdf });
  } catch (err) {
    console.error("[offers] PDF upload failed", { offerId, error: err instanceof Error ? err.message : String(err) });
    return { error: "Could not store the offer PDF. Please try again." };
  }

  const token = generateOfferToken();
  const tokenHash = hashOfferToken(token);
  const tokenExpiresAt = new Date(version.expirationDate.getTime() + 5 * 86_400_000);

  try {
    await db.transaction(async tx => {
      const [locked] = await tx.select().from(offers).where(eq(offers.id, offerId)).for("update");
      if (!locked || !canSend(locked.status as OfferStatus)) throw new Error("Only an approved offer can be sent.");
      await tx.update(offerVersions).set({ pdfStoragePath: path }).where(eq(offerVersions.id, version.id));
      await record(tx, admin.id, offerId, "OFFER_PDF_GENERATED", { applicationId: application.id, versionNumber: version.versionNumber });
      await tx.update(offers).set({ status: "SENT", sentAt: new Date(), secureTokenHash: tokenHash, tokenExpiresAt }).where(eq(offers.id, offerId));
      await record(tx, admin.id, offerId, "OFFER_SENT", { applicationId: application.id });
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send this offer." };
  }

  const message = offerSentEmail({
    firstName: application.firstName,
    jobTitle: version.jobTitle,
    offerUrl: `${site.url.replace(/\/$/, "")}/offer/${token}`,
    expirationDate: version.expirationDate,
  });
  const result = await send({ to: application.email, ...message });
  if (!result.sent) {
    console.error("[offers] send email failed", { offerId, reason: result.reason });
  }

  refresh(offerId, application.id);
  return { success: result.sent ? "Offer sent." : "Offer marked sent, but the email could not be delivered. Share the link manually." };
}

export async function withdrawOfferAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const offerId = String(form.get("offerId") ?? "");
  const { admin, offer, application } = await requireOffer(offerId, "manage");
  if (!canWithdraw(offer.status as OfferStatus)) return { error: "This offer cannot be withdrawn." };

  await db.transaction(async tx => {
    const [locked] = await tx.select().from(offers).where(eq(offers.id, offerId)).for("update");
    if (!locked || !canWithdraw(locked.status as OfferStatus)) throw new Error("This offer cannot be withdrawn.");
    // Kill the token immediately (don't wait for lazy expiration) so a
    // withdrawn offer's old link 404s right away.
    await tx.update(offers).set({
      status: "WITHDRAWN", withdrawnAt: new Date(),
      secureTokenHash: hashOfferToken(generateOfferToken()),
      tokenExpiresAt: new Date(0),
    }).where(eq(offers.id, offerId));
    await record(tx, admin.id, offerId, "OFFER_WITHDRAWN", { applicationId: application.id });
  });
  refresh(offerId, application.id);
  return { success: "Offer withdrawn." };
}
