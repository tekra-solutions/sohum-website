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
  canSend, canWithdraw, offerEditConsequence, offerDeadline, type OfferStatus,
} from "./policy";
import { generateOfferToken, hashOfferToken } from "./tokens";
import { renderOfferHtml } from "./render-html";
import { renderOfferTemplate } from "./variables";
import { renderOfferPdf } from "./pdf";
import { uploadOfferPdf, buildOfferPdfPath } from "@/lib/storage/offers";
import { offerSentEmail } from "./email-templates";
import { send } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import type { SessionAdmin } from "@/lib/auth/session";
import { site, contact } from "@/lib/site";

export type OfferActionState = { error?: string; success?: string };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Same shape as ats/actions.ts's record() — one audit row per offer event. */
async function record(tx: Tx, adminId: string, offerId: string, action: AuditAction, metadata?: Record<string, unknown>) {
  await tx.insert(auditLogs).values({ adminId, entityType: "offer", entityId: offerId, action, metadata });
}

function refresh(offerId?: string, applicationId?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/offers");
  if (offerId) revalidatePath(`/admin/offers/${offerId}`);
  if (applicationId) revalidatePath(`/admin/applications/${applicationId}`);
}

async function lockOffer(tx: Tx, id: string, admin: SessionAdmin, applicationId: string) {
  const [app] = await tx.select().from(applications).where(and(eq(applications.id, applicationId), candidateScope(admin))).for("update");
  if (!app) throw new Error("Candidate is no longer accessible.");
  const [offer] = await tx.select().from(offers).where(eq(offers.id, id)).for("update");
  return { app, offer };
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
async function buildRenderedHtml(tx: Tx, app: typeof applications.$inferSelect, v: VersionInput, versionNumber?: number) {
  let templateBodyHtml = "<p>Terms as described above.</p>";
  let templateTermsHtml: string | null = null;
  let templateAcknowledgementsHtml: string | null = null;
  if (v.templateId) {
    const [template] = await tx.select().from(offerTemplates).where(eq(offerTemplates.id, v.templateId));
    if (!template || !template.isActive) throw new Error("Choose an active offer template.");
    if (template) {
      const variables = {
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
      };
      templateBodyHtml = renderOfferTemplate(template.bodyHtml, variables);
      // Pages 2 and 3 are optional on a template; when absent the renderer
      // says so rather than substituting invented legal language.
      if (template.termsHtml?.trim()) templateTermsHtml = renderOfferTemplate(template.termsHtml, variables);
      if (template.acknowledgementsHtml?.trim()) templateAcknowledgementsHtml = renderOfferTemplate(template.acknowledgementsHtml, variables);
    }
  }
  const renderedHtml = renderOfferHtml({
    candidateName: `${app.firstName} ${app.lastName}`,
    candidateEmail: app.email,
    candidateAddress: [app.address, [app.city, app.state, app.zipCode].filter(Boolean).join(", ")].filter(Boolean).join("\n") || null,
    templateBodyHtml,
    templateTermsHtml,
    templateAcknowledgementsHtml,
    offerVersionNumber: versionNumber ?? null,
    ...versionColumns(v),
  });
  // The fragments are frozen with the version so the signed document can be
  // re-rendered later from this row alone, without re-reading offer_templates.
  return { renderedHtml, templateBodyHtml, templateTermsHtml, templateAcknowledgementsHtml };
}

export async function createOfferAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const applicationId = String(form.get("applicationId") ?? "");
  const { admin, app } = await requireApplication(applicationId, "offers");
  if (app.status !== "OFFER") return { error: "This candidate is not at the offer stage." };

  const parsed = offerVersionInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields." };
  const v = parsed.data;

  let offerId: string;
  try {
    offerId = await db.transaction(async tx => {
      const [locked] = await tx.select().from(applications).where(and(eq(applications.id, applicationId), candidateScope(admin))).for("update");
      if (!locked) throw new Error("Candidate is no longer accessible.");
      if (locked.status !== "OFFER" || locked.archivedAt) throw new Error("Candidate must be active and at the Offer stage.");

      const existingActive = await tx.select({ id: offers.id }).from(offers).where(and(
        eq(offers.applicationId, applicationId),
        notInArray(offers.status, ["DECLINED", "WITHDRAWN", "EXPIRED"]),
      ));
      if (existingActive.length) throw new Error("An offer already exists for this candidate. Withdraw it before creating a new one.");

      const [offer] = await tx.insert(offers).values({
        applicationId, templateId: v.templateId ?? null, createdBy: admin.id,
        secureTokenHash: hashOfferToken(generateOfferToken()),
      }).returning();

      const rendered = await buildRenderedHtml(tx, locked, v, 1);
      const [version] = await tx.insert(offerVersions).values({
        offerId: offer!.id, versionNumber: 1, createdBy: admin.id, ...rendered,
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
  const { admin, offer, application } = await requireOffer(offerId, "offers");
  if (!canEditOffer(offer.status as OfferStatus)) return { error: "This offer can no longer be edited." };

  const parsed = offerVersionInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields." };
  const v = parsed.data;

  try {
    await db.transaction(async tx => {
      const { offer: locked, app: liveApplication } = await lockOffer(tx, offerId, admin, application.id);
    if (liveApplication.status !== "OFFER" || liveApplication.archivedAt) throw new Error("Candidate is no longer at the Offer stage.");
      if (!locked || !canEditOffer(locked.status as OfferStatus)) throw new Error("This offer can no longer be edited.");

      const versions = await tx.select({ n: offerVersions.versionNumber }).from(offerVersions).where(eq(offerVersions.offerId, offerId));
      const nextVersion = Math.max(...versions.map(r => r.n)) + 1;

      const rendered = await buildRenderedHtml(tx, liveApplication, v, nextVersion);
      const [version] = await tx.insert(offerVersions).values({
        offerId, versionNumber: nextVersion, createdBy: admin.id, ...rendered,
        ...versionColumns(v),
      }).returning();

      const consequence = offerEditConsequence(locked.status as OfferStatus);
      const patch: Partial<typeof offers.$inferInsert> = {
        currentVersionId: version!.id,
        status: consequence.nextStatus, approvedBy: null, approvedAt: null, updatedAt: new Date(),
        templateId: v.templateId ?? null,
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
  const { admin, offer, application } = await requireOffer(offerId, "offers");
  if (!canSubmitForApproval(offer.status as OfferStatus)) return { error: "Only a draft offer can be submitted for approval." };

  try {
  await db.transaction(async tx => {
    const { offer: locked, app: liveApplication } = await lockOffer(tx, offerId, admin, application.id);
    if (liveApplication.status !== "OFFER" || liveApplication.archivedAt) throw new Error("Candidate is no longer at the Offer stage.");
    if (!locked || !canSubmitForApproval(locked.status as OfferStatus)) throw new Error("Only a draft offer can be submitted for approval.");
    await tx.update(offers).set({ status: "PENDING_APPROVAL" }).where(eq(offers.id, offerId));
    await record(tx, admin.id, offerId, "OFFER_SUBMITTED_FOR_APPROVAL", { applicationId: application.id });

    const approvers = await tx.select({ id: admins.id }).from(admins).where(and(eq(admins.isActive, true), notInArray(admins.role, ["RECRUITER", "HIRING_MANAGER"])));
    if (approvers.length) await tx.insert(notifications).values(approvers.map(a => ({ adminId: a.id, title: "Offer awaiting approval", href: `/admin/offers/${offerId}` })));
  });
  } catch (err) {
    return { error: err instanceof Error && !("query" in err) ? err.message : "Could not save this offer. Please refresh and try again." };
  }
  refresh(offerId, application.id);
  return { success: "Submitted for approval." };
}

export async function approveOfferAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const offerId = String(form.get("offerId") ?? "");
  const { admin, offer, application } = await requireOffer(offerId, "manage");
  if (!canApprove(offer.status as OfferStatus)) return { error: "Only an offer pending approval can be approved." };

  try {
  await db.transaction(async tx => {
    const { offer: locked, app: liveApplication } = await lockOffer(tx, offerId, admin, application.id);
    if (liveApplication.status !== "OFFER" || liveApplication.archivedAt) throw new Error("Candidate is no longer at the Offer stage.");
    if (!locked || !canApprove(locked.status as OfferStatus)) throw new Error("Only an offer pending approval can be approved.");
    await tx.update(offers).set({ status: "APPROVED", approvedBy: admin.id, approvedAt: new Date() }).where(eq(offers.id, offerId));
    await record(tx, admin.id, offerId, "OFFER_APPROVED", { applicationId: application.id });
  });
  } catch (err) {
    return { error: err instanceof Error && !("query" in err) ? err.message : "Could not save this offer. Please refresh and try again." };
  }
  refresh(offerId, application.id);
  return { success: "Offer approved." };
}

async function rejectOrRequestChanges(form: FormData, note: string): Promise<OfferActionState> {
  const offerId = String(form.get("offerId") ?? "");
  const { admin, offer, application } = await requireOffer(offerId, "manage");
  if (!canRejectOrRequestChanges(offer.status as OfferStatus)) return { error: "Only an offer pending approval can be sent back." };

  try {
  await db.transaction(async tx => {
    const { offer: locked, app: liveApplication } = await lockOffer(tx, offerId, admin, application.id);
    if (liveApplication.status !== "OFFER" || liveApplication.archivedAt) throw new Error("Candidate is no longer at the Offer stage.");
    if (!locked || !canRejectOrRequestChanges(locked.status as OfferStatus)) throw new Error("Only an offer pending approval can be sent back.");
    await tx.update(offers).set({ status: "DRAFT", approvedBy: null, approvedAt: null, updatedAt: new Date() }).where(eq(offers.id, offerId));
    await record(tx, admin.id, offerId, "OFFER_REJECTED", { applicationId: application.id, note });
  });
  } catch (err) {
    return { error: err instanceof Error && !("query" in err) ? err.message : "Could not save this offer. Please refresh and try again." };
  }
  refresh(offerId, application.id);
  return { success: "Returned to draft." };
}

export async function rejectOfferAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const note = z.string().trim().max(1000).safeParse(form.get("note") ?? "Rejected.");
  if (!note.success) return { error: "Keep the reason under 1,000 characters." };
  return rejectOrRequestChanges(form, note.data);
}

export async function requestOfferChangesAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const note = z.string().trim().min(1).max(1000).safeParse(form.get("note"));
  if (!note.success) return { error: "Describe what needs to change." };
  return rejectOrRequestChanges(form, note.data);
}

export async function sendOfferAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const offerId = String(form.get("offerId") ?? "");
  const { admin, offer, application } = await requireOffer(offerId, "offers");
  if (!canSend(offer.status as OfferStatus)) return { error: "Only an approved offer can be sent." };

  const [version] = await db.select().from(offerVersions).where(eq(offerVersions.id, offer.currentVersionId!));
  if (!version) return { error: "This offer has no content to send." };

  const deadline = offerDeadline(version.expirationDate);
  if (deadline <= new Date()) return { error: "This offer has expired. Update the dates and obtain approval again." };
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
  const tokenExpiresAt = new Date(deadline.getTime() + 5 * 86_400_000);
  const message = offerSentEmail({ firstName: application.firstName, jobTitle: version.jobTitle,
    offerUrl: `${serverEnv().appUrl.replace(/\/$/, "")}/offer/${token}`, expirationDate: version.expirationDate });
  let delivered = false;
  try {
    await db.transaction(async tx => {
      const { offer: locked, app } = await lockOffer(tx, offerId, admin, application.id);
      if (!locked || !canSend(locked.status as OfferStatus) || locked.currentVersionId !== version.id)
        throw new Error("This offer changed while preparing the PDF. Review the current version before sending.");
      if (app.status !== "OFFER" || app.archivedAt) throw new Error("Candidate must be active and at the Offer stage.");
      if (deadline <= new Date()) throw new Error("This offer has expired.");
      await tx.update(offerVersions).set({ pdfStoragePath: path }).where(eq(offerVersions.id, version.id));
      await record(tx, admin.id, offerId, "OFFER_PDF_GENERATED", { applicationId: app.id, versionNumber: version.versionNumber });
      // The row lock serializes duplicate clicks. A failed send leaves approval
      // intact and no live token, so the administrator can safely retry.
      const result = await send({ to: app.email, ...message });
      delivered = result.sent;
      if (!result.sent) {
        await tx.insert(auditLogs).values({ adminId: admin.id, entityType: "offer", entityId: offerId, action: "OFFER_EMAIL_FAILED", metadata: { applicationId: app.id, reason: result.reason ?? "send_failed" } });
        return;
      }
      await tx.update(offers).set({ status: "SENT", sentAt: new Date(), viewedAt: null, secureTokenHash: tokenHash, tokenExpiresAt, updatedAt: new Date() }).where(eq(offers.id, offerId));
      await record(tx, admin.id, offerId, "OFFER_SENT", { applicationId: app.id, versionId: version.id });
    });
  } catch (err) {
    return { error: delivered ? "The email provider accepted the message, but recording the result failed. Check delivery before attempting another send." : err instanceof Error && !("query" in err) ? err.message : "Could not send the offer. Please try again." };
  }
  refresh(offerId, application.id);
  return delivered ? { success: "Offer sent." } : { error: "Email was not sent. The offer remains approved; check email configuration and retry." };
}

export async function withdrawOfferAction(_: OfferActionState, form: FormData): Promise<OfferActionState> {
  const offerId = String(form.get("offerId") ?? "");
  const { admin, offer, application } = await requireOffer(offerId, "manage");
  if (!canWithdraw(offer.status as OfferStatus)) return { error: "This offer cannot be withdrawn." };

  try {
  await db.transaction(async tx => {
    const { offer: locked } = await lockOffer(tx, offerId, admin, application.id);
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
  } catch (err) {
    return { error: err instanceof Error && !("query" in err) ? err.message : "Could not save this offer. Please refresh and try again." };
  }
  refresh(offerId, application.id);
  return { success: "Offer withdrawn." };
}
