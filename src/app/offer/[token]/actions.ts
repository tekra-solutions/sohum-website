"use server";
/**
 * Candidate-facing offer actions. Deliberately separate from
 * src/lib/offers/actions.ts — those are admin-authenticated (requireOffer);
 * these are token-authenticated, so every one of them starts by resolving
 * the token to an offer itself rather than trusting a session.
 */
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, and, desc, gte, count } from "drizzle-orm";
import { db } from "@/db";
import { offers, offerVersions, applications, applicationEvents, auditLogs, offerOtpCodes, notifications } from "@/db/schema";
import { generateOtp, hashOtp } from "@/lib/offers/tokens";
import { resolveOfferToken as resolveToken } from "@/lib/offers/data";
import { createOfferSession, hasVerifiedOfferSession } from "@/lib/offers/candidate-session";
import { canCandidateAct, offerDeadline } from "@/lib/offers/policy";
import { canTransition } from "@/lib/ats/transitions";
import { otpVerifySchema, declineSchema, acceptSchema } from "@/lib/offers/validation";
import { offerOtpEmail } from "@/lib/offers/email-templates";
import { send } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export type OfferPublicState = { error?: string; success?: string };

const OTP_MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60_000;

export async function requestOtpAction(_: OfferPublicState, form: FormData): Promise<OfferPublicState> {
  const token = String(form.get("token") ?? "");
  const ip = clientIp(await headers());
  if (!(await rateLimit({ key: `offer-otp-request:ip:${ip}`, limit: 10, windowMs: 60_000 })).ok) {
    return { error: "Too many requests. Please wait a moment." };
  }
  const row = await resolveToken(token);
  if (!row) return { error: "This offer link is invalid or has expired." };

  if (!(await rateLimit({ key: `offer-otp-request:offer:${row.offer.id}`, limit: 3, windowMs: 15 * 60_000 })).ok) {
    return { error: "Too many code requests for this offer. Please wait 15 minutes." };
  }

  const code = generateOtp();
  const issued = await db.transaction(async tx => {
    const [offer] = await tx.select().from(offers).where(eq(offers.id, row.offer.id)).for("update");
    if (!offer || offer.secureTokenHash !== row.offer.secureTokenHash || !offer.tokenExpiresAt || offer.tokenExpiresAt <= new Date()) return false;
    const [recent] = await tx.select({ n: count() }).from(offerOtpCodes).where(and(eq(offerOtpCodes.offerId, offer.id), gte(offerOtpCodes.createdAt, new Date(Date.now() - 15 * 60_000))));
    if (recent.n >= 3) return false;
    await tx.insert(offerOtpCodes).values({ offerId: offer.id, codeHash: hashOtp(code), expiresAt: new Date(Date.now() + OTP_TTL_MS), requestedIp: ip.slice(0,64) });
    return true;
  });
  if (!issued) return { error: "Too many code requests or this link is no longer valid. Please wait 15 minutes." };
  const message = offerOtpEmail({ code });
  const result = await send({ to: row.application.email, ...message });
  if (!result.sent) return { error: "Could not send a verification code. Please try again shortly." };
  return { success: "A verification code has been sent to the email on file." };
}

export async function verifyOtpAction(_: OfferPublicState, form: FormData): Promise<OfferPublicState> {
  const token = String(form.get("token") ?? "");
  const ip = clientIp(await headers());
  if (!(await rateLimit({ key: `offer-otp-verify:ip:${ip}`, limit: 10, windowMs: 60_000 })).ok) {
    return { error: "Too many attempts. Please wait a moment." };
  }
  const row = await resolveToken(token);
  if (!row) return { error: "This offer link is invalid or has expired." };

  const parsed = otpVerifySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter the 6-digit code." };

  const verified = await db.transaction(async tx => {
    const [offer] = await tx.select().from(offers).where(eq(offers.id, row.offer.id)).for("update");
    if (!offer || offer.secureTokenHash !== row.offer.secureTokenHash || !offer.tokenExpiresAt || offer.tokenExpiresAt <= new Date()) return false;
    const [live] = await tx.select().from(offerOtpCodes)
      .where(and(eq(offerOtpCodes.offerId, row.offer.id)))
      .orderBy(desc(offerOtpCodes.createdAt))
      .limit(1)
      .for("update");
    if (!live || (offer.sentAt && live.createdAt < offer.sentAt) || live.consumedAt || live.expiresAt < new Date() || live.attemptCount >= OTP_MAX_ATTEMPTS) return false;
    if (live.codeHash !== hashOtp(parsed.data.code)) {
      await tx.update(offerOtpCodes).set({ attemptCount: live.attemptCount + 1 }).where(eq(offerOtpCodes.id, live.id));
      return false;
    }
    await tx.update(offerOtpCodes).set({ consumedAt: new Date() }).where(eq(offerOtpCodes.id, live.id));
    return true;
  });

  if (!verified) return { error: "That code is incorrect or has expired. Request a new one." };
  await createOfferSession(row.offer.id, row.offer.secureTokenHash);
  return { success: "Verified." };
}

export async function acceptOfferAction(_: OfferPublicState, form: FormData): Promise<OfferPublicState> {
  const token = String(form.get("token") ?? "");
  const row = await resolveToken(token);
  if (!row) return { error: "This offer link is invalid or has expired." };
  if (!(await hasVerifiedOfferSession(row.offer.id, row.offer.secureTokenHash))) {
    return { error: "Please verify your email before responding to this offer." };
  }
  if (!canCandidateAct(row.offer.status as "SENT" | "VIEWED")) return { error: "This offer is no longer available to respond to." };

  const parsed = acceptSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please complete the confirmation." };

  const [version] = await db.select().from(offerVersions).where(eq(offerVersions.id, row.offer.currentVersionId!));
  if (!version || offerDeadline(version.expirationDate) < new Date()) return { error: "This offer has expired." };

  try {
    await db.transaction(async tx => {
      const [app] = await tx.select().from(applications).where(eq(applications.id, row.application.id)).for("update");
      const [locked] = await tx.select().from(offers).where(eq(offers.id, row.offer.id)).for("update");
      if (!app || app.archivedAt || app.status !== "OFFER" || !locked || locked.secureTokenHash !== row.offer.secureTokenHash || locked.currentVersionId !== row.offer.currentVersionId || !locked.tokenExpiresAt || locked.tokenExpiresAt <= new Date()) throw new Error("This offer changed or expired. Open the current offer link again.");
      const [currentVersion] = await tx.select().from(offerVersions).where(eq(offerVersions.id, locked.currentVersionId!));
      if (!currentVersion || offerDeadline(currentVersion.expirationDate) <= new Date()) throw new Error("This offer has expired.");
      if (!locked || !canCandidateAct(locked.status as "SENT" | "VIEWED")) throw new Error("This offer is no longer available to respond to.");
      if (locked.acceptedVersionId) throw new Error("This offer has already been accepted.");

      // SELECT ... FOR UPDATE above already serializes concurrent accept
      // attempts on this row, and the acceptedVersionId null-check just
      // above refuses a second accept — this update cannot race.
      await tx.update(offers).set({
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedVersionId: locked.currentVersionId,
        signedLegalName: parsed.data.legalName,
        signedAt: new Date(),
      }).where(eq(offers.id, row.offer.id));

      // Candidate-initiated: no admin actor, so adminId/changedBy are null —
      // both columns are nullable for exactly this case.
      await tx.insert(auditLogs).values({
        adminId: null, action: "OFFER_ACCEPTED", entityType: "offer", entityId: row.offer.id,
        metadata: { applicationId: row.application.id, acceptedVersionId: locked.currentVersionId },
      });

      // Accepting an offer is the normal route into HIRED, but still goes
      // through the central rule — if a recruiter rejected this application
      // after the offer went out, a stale link must not hire the candidate.
      {
        const verdict = canTransition(app.status, "HIRED", { viaOfferAcceptance: true });
        if (!verdict.ok) throw new Error("This offer is no longer available to respond to.");
        await tx.update(applications).set({ status: "HIRED", updatedAt: new Date() }).where(eq(applications.id, row.application.id));
        await tx.insert(applicationEvents).values({
          applicationId: row.application.id, fromStatus: app.status, toStatus: "HIRED", changedBy: null,
          note: "Candidate accepted offer.",
        });
      }
      await tx.insert(auditLogs).values({ action: "ADMIN_CHANGED_APPLICATION_STATUS", entityType: "application", entityId: app.id, metadata: { from: app.status, to: "HIRED", offerId: locked.id, actor: "candidate" } });
      await tx.insert(notifications).values({ adminId: app.assignedTo ?? locked.createdBy, applicationId: app.id, title: "Candidate accepted the offer", href: `/admin/applications/${app.id}` });
    });
  } catch (err) {
    return { error: err instanceof Error && !("query" in err) ? err.message : "Could not record your acceptance. Please try again." };
  }
  revalidatePath(`/offer/${token}`);
  revalidatePath(`/admin/applications/${row.application.id}`);
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/offers");
  return { success: "Your acceptance has been recorded." };
}

export async function declineOfferAction(_: OfferPublicState, form: FormData): Promise<OfferPublicState> {
  const token = String(form.get("token") ?? "");
  const row = await resolveToken(token);
  if (!row) return { error: "This offer link is invalid or has expired." };
  if (!(await hasVerifiedOfferSession(row.offer.id, row.offer.secureTokenHash))) {
    return { error: "Please verify your email before responding to this offer." };
  }
  if (!canCandidateAct(row.offer.status as "SENT" | "VIEWED")) return { error: "This offer is no longer available to respond to." };

  const parsed = declineSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Please try again." };

  try {
    await db.transaction(async tx => {
      const [app] = await tx.select().from(applications).where(eq(applications.id, row.application.id)).for("update");
      const [locked] = await tx.select().from(offers).where(eq(offers.id, row.offer.id)).for("update");
      if (!app || app.archivedAt || app.status !== "OFFER" || !locked || locked.secureTokenHash !== row.offer.secureTokenHash || locked.currentVersionId !== row.offer.currentVersionId || !locked.tokenExpiresAt || locked.tokenExpiresAt <= new Date()) throw new Error("This offer changed or expired. Open the current offer link again.");
      const [currentVersion] = await tx.select().from(offerVersions).where(eq(offerVersions.id, locked.currentVersionId!));
      if (!currentVersion || offerDeadline(currentVersion.expirationDate) <= new Date()) throw new Error("This offer has expired.");
      if (!locked || !canCandidateAct(locked.status as "SENT" | "VIEWED")) throw new Error("This offer has already been responded to.");
      await tx.update(offers).set({
        status: "DECLINED", declinedAt: new Date(), declineReason: parsed.data.reason ?? null,
      }).where(eq(offers.id, row.offer.id));
      await tx.insert(auditLogs).values({
        adminId: null, action: "OFFER_DECLINED", entityType: "offer", entityId: row.offer.id,
        metadata: { applicationId: row.application.id, reason: parsed.data.reason, note: parsed.data.note },
      });
    });
  } catch (err) {
    return { error: err instanceof Error && !("query" in err) ? err.message : "Could not record your response. Please try again." };
  }

  revalidatePath(`/offer/${token}`);
  revalidatePath(`/admin/applications/${row.application.id}`);
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/offers");
  return { success: "Your response has been recorded." };
}

