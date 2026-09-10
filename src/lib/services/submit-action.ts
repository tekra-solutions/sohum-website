"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { applicationInputSchema, validateResume } from "@/lib/validation/schemas";
import { findRecentDuplicate, submitApplication } from "@/lib/services/applications";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import { send } from "@/lib/email";
import { adminNotification, applicantConfirmation } from "@/lib/email/templates";

export type ApplyState = {
  ok: boolean;
  reference?: string;
  /** Field-level messages keyed by input name. */
  errors?: Record<string, string>;
  /** A single message shown above the form. */
  message?: string;
  /** Set when a recent duplicate exists; the user may confirm and resubmit. */
  duplicateWarning?: string;
};

/**
 * Public application submission.
 *
 * Every guard runs server-side: rate limit, honeypot, schema validation, file
 * validation, and a re-check that the job is still published. Client-side
 * validation exists only to make the form pleasant.
 */
export async function submitApplicationAction(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const env = serverEnv();

  // ---- rate limit -------------------------------------------------------
  const ip = clientIp(await headers());
  const limited = await rateLimit({
    key: `apply:${ip}`,
    limit: env.rateLimitPerHour,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return {
      ok: false,
      message: `Too many applications from this connection. Please try again in about ${Math.ceil(
        limited.retryAfterSeconds / 60,
      )} minutes.`,
    };
  }

  // ---- validate fields --------------------------------------------------
  const raw = Object.fromEntries(formData.entries());
  const parsed = applicationInputSchema.safeParse({
    ...raw,
    yearsExperience: raw.yearsExperience === "" ? undefined : raw.yearsExperience,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    // The honeypot must never explain itself to a bot.
    if (errors.website) {
      return { ok: false, message: "We could not process this submission." };
    }
    return { ok: false, errors, message: "Please correct the highlighted fields." };
  }
  const values = parsed.data;

  // ---- validate resume --------------------------------------------------
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: { resume: "Please attach your resume." } };
  }
  const fileCheck = validateResume({ name: file.name, type: file.type, size: file.size });
  if (!fileCheck.ok) {
    return { ok: false, errors: { resume: fileCheck.error } };
  }

  // ---- job must still be open ------------------------------------------
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, values.jobId),
    columns: { id: true, title: true, slug: true, status: true },
  });
  if (!job || job.status !== "PUBLISHED") {
    return { ok: false, message: "This position is no longer accepting applications." };
  }

  // ---- duplicate warning (not a hard block) -----------------------------
  const acknowledged = formData.get("confirmDuplicate") === "yes";
  if (!acknowledged) {
    const dup = await findRecentDuplicate(job.id, values.email);
    if (dup) {
      return {
        ok: false,
        duplicateWarning:
          "You have already submitted an application for this position. Submit again only if you meant to update it.",
      };
    }
  }

  // ---- submit -----------------------------------------------------------
  const bytes = await file.arrayBuffer();
  const result = await submitApplication({
    values: {
      jobId: job.id,
      reference: "PENDING",
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      zipCode: values.zipCode || null,
      country: values.country || null,
      linkedinUrl: values.linkedinUrl || null,
      portfolioUrl: values.portfolioUrl || null,
      yearsExperience: values.yearsExperience ?? null,
      coverLetter: values.coverLetter || null,
      workAuthorized: values.workAuthorized,
      sponsorshipRequired: values.sponsorshipRequired,
      source: values.source || null,
    },
    resume: {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      bytes,
    },
  });

  if (!result.ok) {
    return { ok: false, message: result.error };
  }

  // ---- notify (never blocks a successful submission) --------------------
  const applicantName = `${values.firstName} ${values.lastName}`;
  const appliedAt = new Date().toLocaleString("en-US");

  const confirmation = applicantConfirmation({
    firstName: values.firstName,
    jobTitle: job.title,
    reference: result.reference,
  });
  const notification = adminNotification({
    applicantName,
    applicantEmail: values.email,
    jobTitle: job.title,
    reference: result.reference,
    appliedAt,
    adminUrl: `${env.appUrl}/admin/applications/${result.applicationId}`,
  });

  await Promise.allSettled([
    send({ to: values.email, ...confirmation }),
    env.adminEmail ? send({ to: env.adminEmail, ...notification }) : Promise.resolve(),
  ]);

  console.info("[applications] submitted", {
    reference: result.reference,
    jobSlug: job.slug,
  });

  return { ok: true, reference: result.reference };
}
