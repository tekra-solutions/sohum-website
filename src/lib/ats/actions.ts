"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { admins, applications, applicationEvents, auditLogs, candidateNotes, candidateStars, emailEvents, emailTemplates, employees, interviewFeedback, interviews, notifications, reminders } from "@/db/schema";
import { canTransition } from "./transitions";
import { requireApplication, requirePermission, candidateScope } from "./access";
import { requireAdmin } from "@/lib/auth/session";
import { stages, permits, escapeHtml } from "./policy";
import { emailTemplateSchema, feedbackSchema, interviewSchema } from "./validation";
import { send } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
export type ActionState = { error?: string; success?: string };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function record(tx: Tx, adminId: string, id: string, action: string, metadata?: Record<string, unknown>) {
  await tx.insert(auditLogs).values({ adminId, entityType: "application", entityId: id, action, metadata });
}
function refresh(id?: string) {
  revalidatePath("/admin", "layout");
  if (id) revalidatePath(`/admin/applications/${id}`);
}
export async function candidateAction(_: ActionState, form: FormData): Promise<ActionState> {
  const kind = String(form.get("kind") ?? "");
  const id = String(form.get("applicationId") ?? "");
  const { admin } = await requireApplication(id, ["note", "feedback"].includes(kind) ? "feedback" : "candidates");
  if (!(await rateLimit({ key: `ats-action:${admin.id}`, limit: 120, windowMs: 60_000 })).ok) return { error: "Too many updates. Please wait a minute." };
  const data = Object.fromEntries(form);
  try {
    await db.transaction(async tx => {
      // Lock and recheck access in the transaction to avoid assignment/status races.
      const [app] = await tx.select().from(applications).where(and(eq(applications.id, id), candidateScope(admin))).for("update");
      if (!app) throw new Error("Candidate is no longer assigned to you.");
      if (kind === "status") {
        const status = z.enum(stages).parse(data.status);
        if (status === app.status) return;
        // Central rule check, not just "is this a valid enum member" — see
        // src/lib/ats/transitions.ts for why a bare enum check was unsafe.
        const [employee] = await tx.select({ id: employees.id }).from(employees).where(eq(employees.sourceApplicationId, id)).limit(1);
        const verdict = canTransition(app.status, status, {
          hasEmployee: Boolean(employee),
          allowDirectHire: data.allowDirectHire === "1" && permits(admin.role, "manage"),
        });
        if (!verdict.ok) throw new Error(verdict.reason);
        await tx.update(applications).set({ status, updatedAt: new Date() }).where(eq(applications.id, id));
        await tx.insert(applicationEvents).values({ applicationId: id, fromStatus: app.status, toStatus: status, changedBy: admin.id });
        await record(tx, admin.id, id, "ADMIN_CHANGED_APPLICATION_STATUS", { from: app.status, to: status });
      } else if (kind === "note") {
        const noteId = data.noteId ? z.uuid().parse(data.noteId) : undefined;
        if (noteId) {
          const [existing] = await tx.select().from(candidateNotes).where(and(eq(candidateNotes.id, noteId), eq(candidateNotes.applicationId, id)));
          if (!existing || (existing.createdBy !== admin.id && !permits(admin.role, "manage"))) throw new Error("You can only change your own notes.");
          if (data.intent === "delete") await tx.delete(candidateNotes).where(eq(candidateNotes.id, noteId));
          else await tx.update(candidateNotes).set({ note: z.string().trim().min(1).max(20000).parse(data.note), updatedAt: new Date() }).where(eq(candidateNotes.id, noteId));
        } else await tx.insert(candidateNotes).values({ applicationId: id, createdBy: admin.id, note: z.string().trim().min(1).max(20000).parse(data.note) });
        await record(tx, admin.id, id, data.intent === "delete" ? "NOTE_DELETED" : noteId ? "NOTE_EDITED" : "NOTE_ADDED");
      } else if (kind === "profile") {
        const skills = z.string().trim().max(4000).parse(data.skills ?? "");
        const tags = z.array(z.string().trim().min(1).max(50)).max(30).parse(String(data.tags ?? "").split(",").map(t => t.trim()).filter(Boolean));
        const source = z.string().trim().min(1).max(160).parse(data.source);
        await tx.update(applications).set({ skills, tags: [...new Set(tags)], source, updatedAt: new Date() }).where(eq(applications.id, id));
        await record(tx, admin.id, id, "CANDIDATE_PROFILE_UPDATED");
      } else if (kind === "assign") {
        if (!permits(admin.role, "manage")) throw new Error("Only recruiting administrators can assign candidates.");
        const assignedTo = data.assignedTo ? z.uuid().parse(data.assignedTo) : null;
        if (assignedTo) {
          const [owner] = await tx.select().from(admins).where(and(eq(admins.id, assignedTo), eq(admins.isActive, true)));
          if (!owner || !permits(owner.role, "candidates")) throw new Error("Choose an active recruiter.");
          await tx.insert(notifications).values({ adminId: assignedTo, applicationId: id, title: "Candidate assigned to you", href: `/admin/applications/${id}` });
        }
        await tx.update(applications).set({ assignedTo, updatedAt: new Date() }).where(eq(applications.id, id));
        await record(tx, admin.id, id, "CANDIDATE_ASSIGNED", { from: app.assignedTo, to: assignedTo });
      } else if (kind === "star") {
        if (data.starred === "1") await tx.insert(candidateStars).values({ adminId: admin.id, applicationId: id }).onConflictDoNothing();
        else await tx.delete(candidateStars).where(and(eq(candidateStars.adminId, admin.id), eq(candidateStars.applicationId, id)));
      } else if (kind === "archive") {
        await tx.update(applications).set({ archivedAt: data.restore === "1" ? null : new Date(), updatedAt: new Date() }).where(eq(applications.id, id));
        await record(tx, admin.id, id, data.restore === "1" ? "CANDIDATE_RESTORED" : "CANDIDATE_ARCHIVED");
      } else if (kind === "interview") {
        // Scheduling against a closed-out candidate is almost always a
        // mistake (wrong row, stale tab). Updating an existing interview is
        // still allowed so outcomes can be recorded after the fact.
        const interviewIdRaw = data.interviewId ? String(data.interviewId) : "";
        if (!interviewIdRaw && (app.status === "REJECTED" || app.status === "HIRED")) {
          throw new Error(`${app.firstName} is already ${app.status === "HIRED" ? "hired" : "rejected"}. Move them back to an active stage before scheduling an interview.`);
        }
        const values = interviewSchema.parse(data);
        const interviewId = data.interviewId ? z.uuid().parse(data.interviewId) : undefined;
        if (interviewId) {
          const [updated] = await tx.update(interviews).set({ ...values, updatedAt: new Date() }).where(and(eq(interviews.id, interviewId), eq(interviews.applicationId, id))).returning();
          if (!updated) throw new Error("Interview not found.");
        } else await tx.insert(interviews).values({ ...values, applicationId: id, createdBy: admin.id });
        await record(tx, admin.id, id, interviewId ? "INTERVIEW_UPDATED" : "INTERVIEW_SCHEDULED", { type: values.type, status: values.status, startsAt: values.startsAt.toISOString() });
        await tx.insert(notifications).values({ adminId: app.assignedTo ?? admin.id, applicationId: id, title: interviewId ? "Interview updated" : "Interview scheduled", href: `/admin/applications/${id}#interviews` });
      } else if (kind === "feedback") {
        const values = feedbackSchema.parse(data);
        const [meeting] = await tx.select().from(interviews).where(and(eq(interviews.id, values.interviewId), eq(interviews.applicationId, id)));
        if (!meeting || meeting.status === "Cancelled") throw new Error("Choose an active or completed interview.");
        await tx.insert(interviewFeedback).values({ ...values, createdBy: admin.id }).onConflictDoUpdate({ target: [interviewFeedback.interviewId, interviewFeedback.createdBy], set: { ...values, updatedAt: new Date() } });
        await record(tx, admin.id, id, "INTERVIEW_FEEDBACK_SAVED", { interviewId: values.interviewId });
      } else if (kind === "reminder") {
        if (data.reminderId) {
          await tx.update(reminders).set({ completedAt: new Date() }).where(and(eq(reminders.id, z.uuid().parse(data.reminderId)), eq(reminders.adminId, admin.id), eq(reminders.applicationId, id)));
        } else await tx.insert(reminders).values({ adminId: admin.id, applicationId: id, title: z.string().trim().min(1).max(200).parse(data.title), dueAt: z.coerce.date().parse(data.dueAt) });
        await record(tx, admin.id, id, "REMINDER_UPDATED");
      } else throw new Error("Unsupported action.");
    });
  } catch (err) {
    return { error: err instanceof z.ZodError ? err.issues[0]?.message : err instanceof Error && !('query' in err) ? err.message : "Could not save. Please try again." };
  }
  refresh(id);
  return { success: "Saved." };
}
export async function emailCandidateAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("applicationId"));
  const { admin, app } = await requireApplication(id, "candidates");
  const limited = await rateLimit({ key: `candidate-email:${admin.id}`, limit: 30, windowMs: 60_000 });
  if (!limited.ok) return { error: "Too many messages. Please wait a minute." };
  const parsed = z.object({ subject: z.string().trim().min(1).max(300).refine(v => !/[\r\n]/.test(v)), body: z.string().trim().min(1).max(20000), requestKey: z.uuid(), templateName: z.string().max(120) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Complete the subject and message before sending." };
  const v = parsed.data;
  if (/{{|}}/.test(v.subject + v.body)) return { error: "Replace all template variables before sending." };
  const [event] = await db.insert(emailEvents).values({ applicationId: id, createdBy: admin.id, subject: v.subject, templateName: v.templateName, requestKey: v.requestKey }).onConflictDoNothing().returning();
  if (!event) return { error: "This message has already been submitted. Check email history before composing another." };
  const result = await send({ to: app.email, subject: v.subject, text: v.body, html: `<div style="white-space:pre-wrap">${escapeHtml(v.body)}</div>` });
  await db.transaction(async tx => {
    await tx.update(emailEvents).set({ status: result.sent ? "Sent" : "Failed", updatedAt: new Date() }).where(eq(emailEvents.id, event.id));
    await record(tx, admin.id, id, result.sent ? "CANDIDATE_EMAIL_SENT" : "CANDIDATE_EMAIL_FAILED", { emailEventId: event.id });
  });
  refresh(id);
  return result.sent ? { success: "Message sent." } : { error: result.reason === "not_configured" ? "Email is not configured. The message was not sent." : "Email failed. Review history before retrying." };
}
export async function saveEmailTemplateAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requirePermission("settings");
  const parsed = emailTemplateSchema.safeParse({ ...Object.fromEntries(form), isActive: form.get("isActive") === "1" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const id = String(form.get("id") ?? "");
  if (id && !z.uuid().safeParse(id).success) return { error: "Invalid template." };
  try {
    await db.transaction(async tx => {
      if (id) await tx.update(emailTemplates).set({ ...parsed.data, updatedAt: new Date() }).where(eq(emailTemplates.id, id));
      else await tx.insert(emailTemplates).values(parsed.data);
      await tx.insert(auditLogs).values({ adminId: admin.id, action: "EMAIL_TEMPLATE_SAVED", entityType: "email_template", entityId: id || null });
    });
  } catch { return { error: "Could not save. Template names must be unique." }; }
  refresh(); return { success: "Template saved." };
}
export async function markNotificationAction(form: FormData) {
  const admin = await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id.data), eq(notifications.adminId, admin.id)));
  refresh();
}
export async function bulkCandidateAction(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requirePermission("candidates");
  const ids = z.array(z.uuid()).min(1).max(100).safeParse(form.getAll("ids"));
  if (!ids.success) return { error: "Select between 1 and 100 candidates." };
  const kind = String(form.get("kind"));
  if (!["status", "archive", "assign"].includes(kind)) return { error: "Unsupported bulk action." };
  if (kind === "assign" && !permits(admin.role, "manage")) return { error: "Administrator permission required." };
  const status = z.enum(stages).safeParse(form.get("status"));
  if (kind === "status" && !status.success) return { error: "Choose a valid status." };
  const assignedTo = String(form.get("assignedTo") ?? "") || null;
  if (assignedTo && !z.uuid().safeParse(assignedTo).success) return { error: "Invalid recruiter." };
  try {
    await db.transaction(async tx => {
      const rows = await tx.select().from(applications).where(and(inArray(applications.id, ids.data), candidateScope(admin))).for("update");
      if (rows.length !== new Set(ids.data).size) throw new Error("One or more candidates are no longer accessible. Refresh and select again.");
      if (kind === "assign" && assignedTo) {
        const [owner] = await tx.select().from(admins).where(and(eq(admins.id, assignedTo), eq(admins.isActive, true)));
        if (!owner || !permits(owner.role, "candidates")) throw new Error("Choose an active recruiter.");
      }
      // Bulk moves are all-or-nothing: if any single candidate cannot legally
      // make this move, the whole batch is refused rather than silently
      // applying to a subset and leaving the recruiter guessing which.
      if (kind === "status" && status.success) {
        const converted = await tx.select({ source: employees.sourceApplicationId }).from(employees)
          .where(inArray(employees.sourceApplicationId, rows.map(r => r.id)));
        const hasEmployee = new Set(converted.map(c => c.source));
        for (const app of rows) {
          if (status.data === app.status) continue;
          const verdict = canTransition(app.status, status.data, { hasEmployee: hasEmployee.has(app.id) });
          if (!verdict.ok) throw new Error(`${app.firstName} ${app.lastName}: ${verdict.reason}`);
        }
      }
      for (const app of rows) {
        if (kind === "status" && status.success && status.data !== app.status) {
          await tx.update(applications).set({ status: status.data, updatedAt: new Date() }).where(eq(applications.id, app.id));
          await tx.insert(applicationEvents).values({ applicationId: app.id, fromStatus: app.status, toStatus: status.data, changedBy: admin.id });
          await record(tx, admin.id, app.id, "ADMIN_CHANGED_APPLICATION_STATUS", { from: app.status, to: status.data, bulk: true });
        } else if (kind === "archive") {
          await tx.update(applications).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(applications.id, app.id));
          await record(tx, admin.id, app.id, "CANDIDATE_ARCHIVED", { bulk: true });
        } else if (kind === "assign") {
          await tx.update(applications).set({ assignedTo, updatedAt: new Date() }).where(eq(applications.id, app.id));
          await record(tx, admin.id, app.id, "CANDIDATE_ASSIGNED", { from: app.assignedTo, to: assignedTo, bulk: true });
          if (assignedTo) await tx.insert(notifications).values({ adminId: assignedTo, applicationId: app.id, title: "Candidate assigned to you", href: `/admin/applications/${app.id}` });
        }
      }
    });
  } catch (err) { return { error: err instanceof Error && !('query' in err) ? err.message : "Bulk change could not be saved." }; }
  refresh(); return { success: `${ids.data.length} candidates updated.` };
}
