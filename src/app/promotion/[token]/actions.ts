"use server";
/**
 * Employee-facing promotion actions.
 *
 * The counterpart to src/app/offer/[token]/actions.ts, and deliberately the
 * same shape: no admin session exists here, so every action re-resolves the
 * secure token, requires a verified OTP session bound to that exact promotion,
 * and re-checks state under a row lock before writing. Nothing trusts the
 * client beyond the token it presents.
 */
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  promotions, promotionVersions, promotionSignatures, promotionOtpCodes,
  auditLogs, recruitingSettings, employees,
} from "@/db/schema";
import { generateOtp, hashOtp } from "@/lib/offers/tokens";
import { resolvePromotionToken } from "@/lib/promotions/data";
import { createPromotionSession, hasVerifiedPromotionSession } from "@/lib/promotions/employee-session";
import {
  canEmployeeAct, promotionDeadline, promotionReferenceFor, ESIGN_CONSENT_TEXT,
  type PromotionStatus,
} from "@/lib/promotions/policy";
import { promotionAcceptSchema, promotionDeclineSchema } from "@/lib/promotions/validation";
import { promotionOtpEmail } from "@/lib/promotions/email-templates";
import { send } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { generateSignedPromotionPdf } from "@/lib/promotions/signed-document";
import { notifyPromotionSigned } from "@/lib/promotions/apply";

export type PromotionPublicState = { error?: string; success?: string };

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

/* ------------------------------------------------------ identity check */

export async function requestPromotionOtpAction(_: PromotionPublicState, form: FormData): Promise<PromotionPublicState> {
  const token = String(form.get("token") ?? "");
  const row = await resolvePromotionToken(token);
  if (!row) return { error: "This link is invalid or has expired." };

  // Limited per IP and per promotion, exactly as the offer flow is: one
  // stops a broad sweep, the other stops hammering a single known link.
  const ip = clientIp(await headers());
  if (!(await rateLimit({ key: `promotion-otp-request:ip:${ip}`, limit: 10, windowMs: 60_000 })).ok) {
    return { error: "Too many attempts. Please try again in a minute." };
  }
  if (!(await rateLimit({ key: `promotion-otp-request:promotion:${row.promotion.id}`, limit: 3, windowMs: 15 * 60_000 })).ok) {
    return { error: "Too many codes requested. Please try again shortly." };
  }

  const code = generateOtp();
  const issued = await db.transaction(async tx => {
    const [promotion] = await tx.select().from(promotions)
      .where(eq(promotions.id, row.promotion.id)).for("update");
    if (!promotion || promotion.secureTokenHash !== row.promotion.secureTokenHash || !promotion.tokenExpiresAt || promotion.tokenExpiresAt <= new Date() || ["WITHDRAWN", "EXPIRED", "DRAFT", "APPROVED", "PENDING_APPROVAL"].includes(promotion.status)) return false;
    // Supersede any outstanding code, so only the newest one works.
    await tx.update(promotionOtpCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(promotionOtpCodes.promotionId, promotion.id), isNull(promotionOtpCodes.consumedAt)));
    await tx.insert(promotionOtpCodes).values({
      promotionId: promotion.id,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });
    return true;
  });

  if (!issued) return { error: "This link changed or expired. Open the current link again." };
  const mail = promotionOtpEmail({ code });
  const result = await send({ to: row.employee.workEmail, ...mail });
  if (!result.sent) return { error: "Could not send the verification code. Please try again shortly." };
  await db.insert(auditLogs).values({ action: "IDENTITY_VERIFICATION_SENT", entityType: "promotion", entityId: row.promotion.id });
  return { success: `We sent a verification code to your work email.` };
}

export async function verifyPromotionOtpAction(_: PromotionPublicState, form: FormData): Promise<PromotionPublicState> {
  const token = String(form.get("token") ?? "");
  const code = String(form.get("code") ?? "").trim();
  const row = await resolvePromotionToken(token);
  if (!row) return { error: "This link is invalid or has expired." };
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code." };

  const ip = clientIp(await headers());
  if (!(await rateLimit({ key: `promotion-otp-verify:ip:${ip}`, limit: 10, windowMs: 60_000 })).ok) {
    return { error: "Too many attempts. Please try again in a minute." };
  }

  let ok = false;
  await db.transaction(async tx => {
    const [promotion] = await tx.select().from(promotions).where(eq(promotions.id, row.promotion.id)).for("update");
    if (!promotion || promotion.secureTokenHash !== row.promotion.secureTokenHash || !promotion.tokenExpiresAt || promotion.tokenExpiresAt <= new Date() || ["WITHDRAWN", "EXPIRED", "DRAFT", "APPROVED", "PENDING_APPROVAL"].includes(promotion.status)) return;
    const [record] = await tx.select().from(promotionOtpCodes)
      .where(and(
        eq(promotionOtpCodes.promotionId, row.promotion.id),
        isNull(promotionOtpCodes.consumedAt),
      )).orderBy(desc(promotionOtpCodes.createdAt)).limit(1)
      .for("update");
    if (!record || (promotion.sentAt && record.createdAt < promotion.sentAt)) return;
    if (record.expiresAt <= new Date() || record.attempts >= MAX_OTP_ATTEMPTS) return;

    if (record.codeHash !== hashOtp(code)) {
      await tx.update(promotionOtpCodes)
        .set({ attempts: record.attempts + 1 })
        .where(eq(promotionOtpCodes.id, record.id));
      return;
    }
    await tx.update(promotionOtpCodes)
      .set({ consumedAt: new Date() })
      .where(eq(promotionOtpCodes.id, record.id));
    await tx.insert(auditLogs).values({
      adminId: null, action: "IDENTITY_VERIFIED",
      entityType: "promotion", entityId: row.promotion.id,
    });
    // First view marks the promotion as seen, exactly as offers do.
    if (promotion.status === "SENT") {
      await tx.update(promotions)
        .set({ status: "VIEWED", viewedAt: new Date() })
        .where(eq(promotions.id, row.promotion.id));
      await tx.insert(auditLogs).values({
        adminId: null, action: "PROMOTION_VIEWED",
        entityType: "promotion", entityId: row.promotion.id,
      });
    }
    ok = true;
  });

  if (!ok) return { error: "That code is incorrect or has expired. Request a new one." };
  await createPromotionSession(row.promotion.id, row.promotion.secureTokenHash);
  revalidatePath(`/promotion/${token}`);
  return { success: "Verified." };
}

/* ------------------------------------------------------------- accept */

export async function acceptPromotionAction(_: PromotionPublicState, form: FormData): Promise<PromotionPublicState> {
  const token = String(form.get("token") ?? "");
  const row = await resolvePromotionToken(token);
  if (!row) return { error: "This link is invalid or has expired." };
  if (!(await hasVerifiedPromotionSession(row.promotion.id, row.promotion.secureTokenHash))) {
    return { error: "Please verify your email before signing." };
  }
  if (!canEmployeeAct(row.promotion.status as PromotionStatus)) {
    return { error: "This promotion letter is no longer available to sign." };
  }

  const parsed = promotionAcceptSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please complete the confirmation." };

  const requestHeaders = await headers();
  const signerIp = clientIp(requestHeaders);
  const signerUserAgent = (requestHeaders.get("user-agent") ?? "").slice(0, 400) || null;
  const signedAt = new Date();

  let versionId: string | null = null;
  try {
    await db.transaction(async tx => {
      const [locked] = await tx.select().from(promotions)
        .where(eq(promotions.id, row.promotion.id)).for("update");
      if (!locked
        || locked.secureTokenHash !== row.promotion.secureTokenHash
        || locked.currentVersionId !== row.promotion.currentVersionId
        || !locked.tokenExpiresAt || locked.tokenExpiresAt <= new Date()) {
        throw new Error("This letter changed. Please open the current link again.");
      }
      if (!canEmployeeAct(locked.status as PromotionStatus)) {
        throw new Error("This promotion letter is no longer available to sign.");
      }
      const [employee] = await tx.select().from(employees).where(eq(employees.id, locked.employeeId)).for("update");
      if (!employee || employee.status === "TERMINATED" || employee.workEmail !== row.employee.workEmail) throw new Error("This employee record has changed. Contact HR before signing.");
      // The structural guarantee that one promotion is signed exactly once.
      if (locked.acceptedVersionId) throw new Error("This letter has already been signed.");

      const [version] = await tx.select().from(promotionVersions)
        .where(eq(promotionVersions.id, locked.currentVersionId!));
      if (!version) throw new Error("This letter is incomplete.");
      if (promotionDeadline(version.expirationDate) <= new Date()) {
        throw new Error("The signing deadline for this letter has passed.");
      }
      versionId = version.id;

      await tx.update(promotions).set({
        // ACCEPTED, not EFFECTIVE: signing records agreement, it does not
        // change the employee's record. That happens on the effective date.
        status: "ACCEPTED",
        acceptedAt: signedAt,
        acceptedVersionId: locked.currentVersionId,
        signedLegalName: parsed.data.legalName,
        signedAt,
        updatedAt: new Date(),
      }).where(eq(promotions.id, locked.id));

      // The unique index on promotion_id makes a replayed accept fail here
      // rather than produce a second signature.
      await tx.insert(promotionSignatures).values({
        promotionId: locked.id,
        promotionVersionId: locked.currentVersionId!,
        signerLegalName: parsed.data.legalName,
        signerEmail: row.employee.workEmail,
        signatureType: "TYPED",
        signatureValue: parsed.data.legalName,
        electronicConsent: true,
        consentText: ESIGN_CONSENT_TEXT,
        consentedAt: signedAt,
        signedAt,
        verificationMethod: "EMAIL_OTP",
        signerIp,
        signerUserAgent,
      });

      for (const action of ["ESIGN_CONSENT_ACCEPTED", "PROMOTION_SIGNED", "PROMOTION_ACCEPTED"] as const) {
        await tx.insert(auditLogs).values({
          adminId: null, action, entityType: "promotion", entityId: locked.id,
          metadata: { employeeId: row.employee.id, versionId: locked.currentVersionId },
        });
      }

      await notifyPromotionSigned(tx, locked.id, `${row.employee.firstName} ${row.employee.lastName}`);
    });
  } catch (error) {
    return { error: error instanceof Error && !("query" in error) ? error.message : "Could not record your signature." };
  }

  // The signed PDF is produced outside the transaction — Chromium and storage
  // are slow and may fail, and a failure here must not undo a valid signature.
  // The acceptance stands either way; the PDF can be regenerated.
  if (versionId) {
    try {
      const [version] = await db.select().from(promotionVersions).where(eq(promotionVersions.id, versionId));
      const [settings] = await db.select().from(recruitingSettings).limit(1);
      if (version) {
        const result = await generateSignedPromotionPdf({
          version,
          employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
          employeeFirstName: row.employee.firstName,
          employeeEmail: row.employee.workEmail,
          employeeNumber: row.employee.employeeId,
          reference: promotionReferenceFor(row.promotion, version),
          authorizedRepresentative: settings?.authorizedRepName
            ? { name: settings.authorizedRepName, title: settings.authorizedRepTitle ?? null }
            : null,
          signature: {
            signerLegalName: parsed.data.legalName,
            signerEmail: row.employee.workEmail,
            signatureValue: parsed.data.legalName,
            signedAt, consentedAt: signedAt,
            consentText: ESIGN_CONSENT_TEXT,
            verificationMethod: "EMAIL_OTP",
          },
        });
        await db.update(promotionSignatures)
          .set({ signedPdfPath: result.path, documentHash: result.documentHash })
          .where(and(eq(promotionSignatures.promotionId, row.promotion.id), isNull(promotionSignatures.signedPdfPath)));
        await db.insert(auditLogs).values({
          adminId: null, action: "SIGNED_PDF_GENERATED",
          entityType: "promotion", entityId: row.promotion.id,
          metadata: { fileHash: result.fileHash, bytes: result.bytes },
        });
      }
    } catch (error) {
      console.error("[promotions] signed PDF generation failed", {
        promotionId: row.promotion.id,
        error: error instanceof Error && !("query" in error) ? error.message : String(error),
      });
    }
  }

  revalidatePath(`/promotion/${token}`);
  revalidatePath("/admin", "layout");
  return { success: "Thank you — your promotion letter has been signed." };
}

/* ------------------------------------------------------------ decline */

export async function declinePromotionAction(_: PromotionPublicState, form: FormData): Promise<PromotionPublicState> {
  const token = String(form.get("token") ?? "");
  const row = await resolvePromotionToken(token);
  if (!row) return { error: "This link is invalid or has expired." };
  if (!(await hasVerifiedPromotionSession(row.promotion.id, row.promotion.secureTokenHash))) {
    return { error: "Please verify your email first." };
  }
  const parsed = promotionDeclineSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Keep the reason under 400 characters." };
  const reason = parsed.data.reason;

  try {
    await db.transaction(async tx => {
      const [locked] = await tx.select().from(promotions)
        .where(eq(promotions.id, row.promotion.id)).for("update");
      if (!locked || !canEmployeeAct(locked.status as PromotionStatus) || locked.secureTokenHash !== row.promotion.secureTokenHash || locked.currentVersionId !== row.promotion.currentVersionId || !locked.tokenExpiresAt || locked.tokenExpiresAt <= new Date()) {
        throw new Error("This promotion letter is no longer available to respond to.");
      }
      const [version] = await tx.select().from(promotionVersions).where(eq(promotionVersions.id, locked.currentVersionId!));
      if (!version || promotionDeadline(version.expirationDate) <= new Date()) throw new Error("The signing deadline has passed.");
      await notifyPromotionSigned(tx, locked.id, `${row.employee.firstName} ${row.employee.lastName}`, "declined");
      await tx.update(promotions).set({
        status: "DECLINED", declinedAt: new Date(),
        declineReason: reason?.slice(0, 40) ?? null, updatedAt: new Date(),
      }).where(eq(promotions.id, locked.id));
      await tx.insert(auditLogs).values({
        adminId: null, action: "PROMOTION_DECLINED",
        entityType: "promotion", entityId: locked.id,
        metadata: { employeeId: row.employee.id, reason: reason ?? null },
      });
    });
  } catch (error) {
    return { error: error instanceof Error && !("query" in error) ? error.message : "Could not record your response." };
  }

  revalidatePath(`/promotion/${token}`);
  revalidatePath("/admin", "layout");
  return { success: "Your response has been recorded." };
}
