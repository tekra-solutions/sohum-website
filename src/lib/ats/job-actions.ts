"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { admins, auditLogs, jobAssignments, jobs, jobTemplates, notifications, recruitingSettings } from "@/db/schema";
import { requirePermission } from "./access";
import type { ActionState } from "./actions";
export async function configureRecruitingAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requirePermission("settings");
  const enabled = form.get("requireJobApproval") === "1";
  await db.transaction(async tx => {
    await tx.insert(recruitingSettings).values({ id: 1, requireJobApproval: enabled }).onConflictDoUpdate({ target: recruitingSettings.id, set: { requireJobApproval: enabled } });
    await tx.insert(auditLogs).values({ adminId: admin.id, action: "RECRUITING_SETTINGS_UPDATED", entityType: "settings", metadata: { requireJobApproval: enabled } });
  });
  revalidatePath("/admin", "layout"); return { success: "Recruiting settings saved." };
}
/**
 * Company-level offer defaults, configured once so recruiters never retype
 * them. Kept separate from configureRecruitingAction so saving one group of
 * settings cannot silently reset the other.
 *
 * These are copied onto each offer version at creation, so editing them here
 * never alters an offer that has already been issued.
 */
export async function configureOfferDefaultsAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requirePermission("settings");
  const text = (name: string, max: number) => {
    const value = String(form.get(name) ?? "").trim();
    return value ? value.slice(0, max) : null;
  };
  const email = text("hrContactEmail", 255);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid HR contact email address." };
  }
  const values = {
    authorizedRepName: text("authorizedRepName", 200),
    authorizedRepTitle: text("authorizedRepTitle", 200),
    defaultBenefitsSummary: text("defaultBenefitsSummary", 4000),
    defaultPtoSummary: text("defaultPtoSummary", 2000),
    hrContactEmail: email,
  };
  await db.transaction(async tx => {
    await tx.insert(recruitingSettings).values({ id: 1, ...values })
      .onConflictDoUpdate({ target: recruitingSettings.id, set: values });
    // The representative's name is recorded; the free-text bodies are not, to
    // keep the audit metadata small and free of pasted policy text.
    await tx.insert(auditLogs).values({
      adminId: admin.id, action: "RECRUITING_SETTINGS_UPDATED", entityType: "settings",
      metadata: { scope: "offer_defaults", authorizedRepName: values.authorizedRepName },
    });
  });
  revalidatePath("/admin", "layout");
  return { success: "Offer defaults saved. New offers will use them automatically." };
}

export async function jobWorkflowAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requirePermission("manage");
  const id = z.uuid().safeParse(form.get("jobId"));
  if (!id.success) return { error: "Invalid job." };
  const kind = String(form.get("kind"));
  try {
    await db.transaction(async tx => {
      const [job] = await tx.select().from(jobs).where(eq(jobs.id, id.data)).for("update");
      if (!job) throw new Error("Job not found.");
      if (kind === "template") {
        const name = z.string().trim().min(1).max(120).parse(form.get("name"));
        const content = { title: job.title, department: job.department, location: job.location, employmentType: job.employmentType, remoteType: job.remoteType, experienceLevel: job.experienceLevel, summary: job.summary, description: job.description, responsibilities: job.responsibilities, qualifications: job.qualifications, preferredQualifications: job.preferredQualifications, skills: job.skills, salaryRange: job.salaryRange };
        await tx.insert(jobTemplates).values({ name, content });
      } else if (kind === "assign-job") {
        const adminId = z.uuid().parse(form.get("adminId"));
        const [person] = await tx.select().from(admins).where(and(eq(admins.id, adminId), eq(admins.isActive, true)));
        if (!person) throw new Error("Choose an active team member.");
        if (form.get("remove") === "1") await tx.delete(jobAssignments).where(and(eq(jobAssignments.jobId, job.id), eq(jobAssignments.adminId, adminId)));
        else await tx.insert(jobAssignments).values({ jobId: job.id, adminId }).onConflictDoNothing();
      } else if (kind === "approval") {
        const status = z.enum(["PENDING_APPROVAL", "APPROVED"]).parse(form.get("status"));
        if (status === "APPROVED" && job.status !== "PENDING_APPROVAL") throw new Error("Submit the job for approval first.");
        if (status === "PENDING_APPROVAL" && !["DRAFT", "CLOSED"].includes(job.status)) throw new Error("Only draft or closed jobs can be submitted for approval.");
        await tx.update(jobs).set({ status, updatedAt: new Date() }).where(eq(jobs.id, job.id));
        if (status === "PENDING_APPROVAL") {
          const recipients = await tx.select({ id: admins.id }).from(admins).where(and(eq(admins.isActive, true), eq(admins.role, "SUPER_ADMIN")));
          if (recipients.length) await tx.insert(notifications).values(recipients.map(r => ({ adminId: r.id, title: "Job approval required", href: `/admin/jobs/${job.reference}` })));
        }
      } else throw new Error("Unsupported job action.");
      await tx.insert(auditLogs).values({ adminId: admin.id, action: `JOB_${kind.toUpperCase().replaceAll("-", "_")}`, entityType: "job", entityId: job.id });
    });
  } catch (error) { return { error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error && !('query' in error) ? error.message : "Could not save. Template names must be unique." }; }
  revalidatePath("/admin", "layout"); return { success: "Saved." };
}
