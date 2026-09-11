"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, recruitingSettings, auditLogs, applications } from "@/db/schema";
import { jobInputSchema } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/ats/access";
import { z } from "zod";
import { uniqueSlug } from "@/lib/services/jobs";

export type JobFormState = {
  errors?: Record<string, string>;
  message?: string;
  /**
   * The raw submitted fields, echoed back so a rejected save can re-render
   * what the user actually typed instead of resetting to the stored record
   * (or, for a new job, to empty). Raw strings rather than parsed values:
   * the point is to hand back exactly what was in the form, including input
   * that failed validation and list text the parser would normalise away.
   */
  values?: Record<string, string>;
};

/** Form fields echoed back on a failed save. `id` and `intent` are excluded:
 *  the form supplies those itself and they are not user-edited content. */
function submittedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "id" || key === "intent") continue;
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

/** Refreshes every surface a job change can affect. */
function revalidateJob(slug?: string) {
  revalidatePath("/careers");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin");
  if (slug) revalidatePath(`/careers/${slug}`);
}

export async function saveJobAction(
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const admin = await requirePermission("manage");

  const id = String(formData.get("id") ?? "") || null;
  if (id && !z.uuid().safeParse(id).success) return { message: "Invalid job." };
  const submitted = submittedValues(formData);
  // Which button was pressed decides the status, not a client-supplied field.
  const intent = String(formData.get("intent") ?? "draft");

  const parsed = jobInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors, message: "Please correct the highlighted fields.", values: submitted };
  }
  const v = parsed.data;

  const [settings] = await db.select().from(recruitingSettings).limit(1);
  if (settings?.requireJobApproval && intent === "publish") return { message: "Approval is enabled. Save as a draft, submit for approval, then use Publish on the approved job.", values: submitted };
  const status: "PUBLISHED" | "DRAFT" = intent === "publish" ? "PUBLISHED" : "DRAFT";
  const slug = await uniqueSlug(v.slug || v.title, id ?? undefined);

  const values = {
    title: v.title,
    slug,
    department: v.department,
    location: v.location,
    employmentType: v.employmentType,
    remoteType: v.remoteType,
    experienceLevel: v.experienceLevel,
    summary: v.summary || null,
    description: v.description,
    responsibilities: v.responsibilities,
    qualifications: v.qualifications,
    preferredQualifications: v.preferredQualifications,
    skills: v.skills,
    salaryRange: v.salaryRange || null,
    status,
    updatedAt: new Date(),
  };

  let jobId = id;
  try {
    await db.transaction(async tx => {
      const [currentSettings] = await tx.select().from(recruitingSettings).limit(1).for("share");
      if (currentSettings?.requireJobApproval && status === "PUBLISHED") throw new Error("Save a draft and obtain approval before publishing.");
      if (id) {
        const [existing] = await tx.select().from(jobs).where(eq(jobs.id, id)).for("update");
        if (!existing) throw new Error("Job not found.");
        await tx.update(jobs).set({ ...values,
          publishedAt: status === "PUBLISHED" ? existing.publishedAt ?? new Date() : existing.publishedAt,
        }).where(eq(jobs.id, id));
        await tx.insert(auditLogs).values({ adminId: admin.id,
          action: intent === "publish" ? "ADMIN_PUBLISHED_JOB" : "ADMIN_UPDATED_JOB",
          entityType: "job", entityId: id, metadata: { title: v.title, status } });
      } else {
        const [row] = await tx.insert(jobs).values({ ...values, createdBy: admin.id,
          publishedAt: status === "PUBLISHED" ? new Date() : null }).returning({ id: jobs.id });
        jobId = row.id;
        await tx.insert(auditLogs).values({ adminId: admin.id, action: "ADMIN_CREATED_JOB",
          entityType: "job", entityId: jobId, metadata: { title: v.title, status } });
      }
    });
  } catch (err) {
    // Log the cause so failures are diagnosable; the user-facing message
    // stays generic so no backend detail leaks to the browser.
    console.error("[jobs] save failed", { error: err instanceof Error ? err.message : String(err) });
    return { message: "Could not save this job. Please try again.", values: submitted };
  }

  revalidateJob(slug);
  redirect(`/admin/jobs/${jobId}?saved=1`);
}

/** Publish / unpublish / close / archive. */
export async function setJobStatusAction(formData: FormData) {
  const admin = await requirePermission("manage");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!z.uuid().safeParse(id).success || !["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"].includes(status)) return;
  const slug = await db.transaction(async tx => {
    const [settings] = await tx.select().from(recruitingSettings).limit(1).for("share");
    const [job] = await tx.select().from(jobs).where(eq(jobs.id, id)).for("update");
    if (!job || job.status === status) return null;
    if (status === "PUBLISHED" && settings?.requireJobApproval && job.status !== "APPROVED") return null;
    await tx.update(jobs).set({ status: status as "PUBLISHED",
      publishedAt: status === "PUBLISHED" ? job.publishedAt ?? new Date() : job.publishedAt,
      updatedAt: new Date() }).where(eq(jobs.id, id));
    await tx.insert(auditLogs).values({ adminId: admin.id,
      action: status === "PUBLISHED" ? "ADMIN_PUBLISHED_JOB" : status === "ARCHIVED" ? "ADMIN_ARCHIVED_JOB" : "ADMIN_UNPUBLISHED_JOB",
      entityType: "job", entityId: id, metadata: { title: job.title, status } });
    return job.slug;
  });
  if (slug) revalidateJob(slug);
}

/**
 * Deletes a job. Refuses when applications exist — those must be preserved, so
 * the job is archived instead. The database enforces this too via ON DELETE
 * RESTRICT; this check exists to give a clear message rather than an error.
 */
export async function deleteJobAction(formData: FormData) {
  const admin = await requirePermission("manage");
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  const slug = await db.transaction(async tx => {
    const [job] = await tx.select().from(jobs).where(eq(jobs.id, id)).for("update");
    if (!job) return null;
    const existing = await tx.select({ id: applications.id }).from(applications).where(eq(applications.jobId, id)).limit(1);
    if (existing.length) await tx.update(jobs).set({ status: "ARCHIVED", updatedAt: new Date() }).where(eq(jobs.id, id));
    else await tx.delete(jobs).where(eq(jobs.id, id));
    await tx.insert(auditLogs).values({ adminId: admin.id,
      action: existing.length ? "ADMIN_ARCHIVED_JOB" : "ADMIN_DELETED_JOB",
      entityType: "job", entityId: id, metadata: { title: job.title } });
    return job.slug;
  });
  if (slug) revalidateJob(slug);
  redirect("/admin/jobs");
}
