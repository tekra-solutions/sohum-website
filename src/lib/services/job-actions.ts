"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, recruitingSettings } from "@/db/schema";
import { jobInputSchema } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/ats/access";
import { audit } from "@/lib/audit";
import { countApplicationsForJob, uniqueSlug } from "@/lib/services/jobs";

export type JobFormState = {
  errors?: Record<string, string>;
  message?: string;
};

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
  // Which button was pressed decides the status, not a client-supplied field.
  const intent = String(formData.get("intent") ?? "draft");

  const parsed = jobInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors, message: "Please correct the highlighted fields." };
  }
  const v = parsed.data;

  const [settings] = await db.select().from(recruitingSettings).limit(1);
  if (settings?.requireJobApproval && intent === "publish") return { message: "Approval is enabled. Save as a draft, submit for approval, then use Publish on the approved job." };
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
    if (id) {
      const existing = await db.query.jobs.findFirst({
        where: eq(jobs.id, id),
        columns: { publishedAt: true },
      });
      await db
        .update(jobs)
        .set({
          ...values,
          // Stamp publishedAt the first time a job goes live, then leave it.
          publishedAt:
            status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null,
        })
        .where(eq(jobs.id, id));

      await audit({
        adminId: admin.id,
        action: intent === "publish" ? "ADMIN_PUBLISHED_JOB" : "ADMIN_UPDATED_JOB",
        entityType: "job",
        entityId: id,
        metadata: { title: v.title, status },
      });
    } else {
      const [row] = await db
        .insert(jobs)
        .values({
          ...values,
          createdBy: admin.id,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        })
        .returning({ id: jobs.id });
      jobId = row!.id;

      await audit({
        adminId: admin.id,
        action: "ADMIN_CREATED_JOB",
        entityType: "job",
        entityId: jobId,
        metadata: { title: v.title, status },
      });
    }
  } catch (err) {
    console.error("[jobs] save failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { message: "Could not save this job. Please try again." };
  }

  revalidateJob(slug);
  redirect(`/admin/jobs/${jobId}?saved=1`);
}

/** Publish / unpublish / close / archive. */
export async function setJobStatusAction(formData: FormData) {
  const admin = await requirePermission("manage");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"].includes(status)) return;

  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, id),
    columns: { slug: true, publishedAt: true, title: true, status: true },
  });
  if (!job) return;
  const [settings] = await db.select().from(recruitingSettings).limit(1);
  if (status === "PUBLISHED" && settings?.requireJobApproval && job.status !== "APPROVED") return;

  await db
    .update(jobs)
    .set({
      status: status as "PUBLISHED",
      publishedAt: status === "PUBLISHED" ? (job.publishedAt ?? new Date()) : job.publishedAt,
      updatedAt: new Date(),
    })
    .where(and(eq(jobs.id, id), eq(jobs.status, job.status)));

  const action =
    status === "PUBLISHED" ? "ADMIN_PUBLISHED_JOB"
    : status === "ARCHIVED" ? "ADMIN_ARCHIVED_JOB"
    : "ADMIN_UNPUBLISHED_JOB";

  await audit({
    adminId: admin.id,
    action,
    entityType: "job",
    entityId: id,
    metadata: { title: job.title, status },
  });

  revalidateJob(job.slug);
}

/**
 * Deletes a job. Refuses when applications exist — those must be preserved, so
 * the job is archived instead. The database enforces this too via ON DELETE
 * RESTRICT; this check exists to give a clear message rather than an error.
 */
export async function deleteJobAction(formData: FormData) {
  const admin = await requirePermission("manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, id),
    columns: { slug: true, title: true },
  });
  if (!job) return;

  const applicationCount = await countApplicationsForJob(id);
  if (applicationCount > 0) {
    await db
      .update(jobs)
      .set({ status: "ARCHIVED", updatedAt: new Date() })
      .where(eq(jobs.id, id));
    await audit({
      adminId: admin.id,
      action: "ADMIN_ARCHIVED_JOB",
      entityType: "job",
      entityId: id,
      metadata: { title: job.title, reason: "delete_blocked_by_applications", applicationCount },
    });
  } else {
    await db.delete(jobs).where(eq(jobs.id, id));
    await audit({
      adminId: admin.id,
      action: "ADMIN_DELETED_JOB",
      entityType: "job",
      entityId: id,
      metadata: { title: job.title },
    });
  }

  revalidateJob(job.slug);
  redirect("/admin/jobs");
}
