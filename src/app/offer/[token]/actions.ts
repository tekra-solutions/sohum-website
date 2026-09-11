"use server";
/**
 * Candidate-facing offer actions. Deliberately separate from
 * src/lib/offers/actions.ts — those are admin-authenticated (requireOffer);
 * these are token-authenticated, so every one of them starts by resolving
 * the token to an offer itself rather than trusting a session.
 */
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { offers, offerVersions, applications, applicationEvents, auditLogs, offerOtpCodes } from "@/db/schema";
import { hashOfferToken, generateOtp, hashOtp } from "@/lib/offers/tokens";
import { createOfferSession, hasVerifiedOfferSession } from "@/lib/offers/candidate-session";
import { canCandidateAct } from "@/lib/offers/policy";
import { otpVerifySchema, declineSchema, acceptSchema } from "@/lib/offers/validation";
import { offerOtpEmail } from "@/lib/offers/email-templates";
import { send } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export type OfferPublicState = { error?: string; success?: string };

const OTP_MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60_000;

/** Resolves a token to its offer + application, or null. Never throws — the
 * page renders one uniform "invalid or expired" message either way, never
 * distinguishing not-found from expired from withdrawn. */
async function resolveToken(token: string) {
  if (!token || token.length > 512) return null;
  const [row] = await db
    .select({ offer: offers, application: applications })
    .from(offers)
    .innerJoin(applications, eq(offers.applicationId, applications.id))
    .where(eq(offers.secureTokenHash, hashOfferToken(token)))
    .limit(1);
  return row ?? null;
}

export async function requestOtpAction(_: OfferPublicState, form: FormData): Promise<OfferPublicState> {
  const token = String(form.get("token") ?? "");
  const ip = clientIp(await headers());
  if (!(await rateLimit({ key: `offer-otp-request:ip:${ip}`, limit: 10, windowMs: 60_000 })).ok) {
    return { error: "Too many requests. Please wait a moment." };
  }
  const row = await resolveToken(token);
  if (!row) return { error: "This offer link is invalid or has expired." };
  if (!canCandidateAct(row.offer.status as "SENT" | "VIEWED")) return { error: "This offer link is invalid or has expired." };

  if (!(await rateLimit({ key: `offer-otp-request:offer:${row.offer.id}`, limit: 3, windowMs: 15 * 60_000 })).ok) {
    return { error: "Too many code requests for this offer. Please wait 15 minutes." };
  }

  const code = generateOtp();
  await db.insert(offerOtpCodes).values({
    offerId: row.offer.id,
    codeHash: hashOtp(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    requestedIp: ip,
  });
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
    const [live] = await tx.select().from(offerOtpCodes)
      .where(and(eq(offerOtpCodes.offerId, row.offer.id)))
      .orderBy(desc(offerOtpCodes.createdAt))
      .limit(1)
      .for("update");
    if (!live || live.consumedAt || live.expiresAt < new Date() || live.attemptCount >= OTP_MAX_ATTEMPTS) return false;
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
  if (!version || version.expirationDate < new Date()) return { error: "This offer has expired." };

  try {
    await db.transaction(async tx => {
      const [locked] = await tx.select().from(offers).where(eq(offers.id, row.offer.id)).for("update");
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
        metadata: { applicationId: row.application.id, signedLegalName: parsed.data.legalName },
      });

      if (row.application.status !== "HIRED") {
        await tx.update(applications).set({ status: "HIRED", updatedAt: new Date() }).where(eq(applications.id, row.application.id));
        await tx.insert(applicationEvents).values({
          applicationId: row.application.id, fromStatus: row.application.status, toStatus: "HIRED", changedBy: null,
          note: "Candidate accepted offer.",
        });
      }
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not record your acceptance. Please try again." };
  }
  revalidatePath(`/offer/${token}`);
  revalidatePath(`/admin/applications/${row.application.id}`);
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
      const [locked] = await tx.select().from(offers).where(eq(offers.id, row.offer.id)).for("update");
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
    return { error: err instanceof Error ? err.message : "Could not record your response. Please try again." };
  }

  revalidatePath(`/offer/${token}`);
  revalidatePath(`/admin/applications/${row.application.id}`);
  revalidatePath("/admin/offers");
  return { success: "Your response has been recorded." };
}

export { resolveToken };
export const otpMaxAttempts = OTP_MAX_ATTEMPTS;
