import "server-only";
import { and, asc, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, applications, auditLogs, candidateNotes, candidateStars, emailEvents, emailTemplates, employees, interviewFeedback, interviews, jobs, notifications, recruitingSettings, reminders, offers, offerVersions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { candidateScope, requireApplication } from "./access";
import { permits } from "./policy";
import { offerForApplication } from "@/lib/offers/data";
/** Whether jobs must be approved before they can be published. Read by the job
 * screens so the lifecycle buttons match what setJobStatusAction will allow. */
export async function requiresJobApproval() {
  const [settings] = await db.select().from(recruitingSettings).limit(1);
  return settings?.requireJobApproval ?? false;
}
export async function recruiterOptions() {
  await requireAdmin();
  return db.select({ id: admins.id, name: admins.name, role: admins.role }).from(admins).where(eq(admins.isActive, true)).orderBy(asc(admins.name));
}
export async function candidateWorkspace(id: string) {
  const { admin, app } = await requireApplication(id);
  const [notes, meetings, activity, messages, templates, stars, duplicates, staff, linkedEmployees, feedback, tasks, offer] = await Promise.all([
    db.select({ note: candidateNotes, author: admins.name }).from(candidateNotes).leftJoin(admins, eq(candidateNotes.createdBy, admins.id)).where(eq(candidateNotes.applicationId, id)).orderBy(asc(candidateNotes.createdAt)).limit(100),
    db.select().from(interviews).where(eq(interviews.applicationId, id)).orderBy(desc(interviews.startsAt)).limit(100),
    db.select({ event: auditLogs, author: admins.name }).from(auditLogs).leftJoin(admins, eq(auditLogs.adminId, admins.id)).where(and(eq(auditLogs.entityType, "application"), eq(auditLogs.entityId, id))).orderBy(desc(auditLogs.createdAt)).limit(100),
    db.select({ message: emailEvents, author: admins.name }).from(emailEvents).leftJoin(admins, eq(emailEvents.createdBy, admins.id)).where(eq(emailEvents.applicationId, id)).orderBy(desc(emailEvents.createdAt)).limit(100),
    db.select().from(emailTemplates).where(eq(emailTemplates.isActive, true)).orderBy(asc(emailTemplates.name)),
    db.select().from(candidateStars).where(and(eq(candidateStars.applicationId, id), eq(candidateStars.adminId, admin.id))),
    db.select({ id: applications.id, firstName: applications.firstName, lastName: applications.lastName, reference: applications.reference, job: jobs.title }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(and(candidateScope(admin), ne(applications.id, id), sql`(lower(${applications.email}) = ${app.email.toLowerCase()} or (${app.linkedinUrl ?? ""} <> '' and lower(${applications.linkedinUrl}) = lower(${app.linkedinUrl ?? ""})))`)).limit(10),
    recruiterOptions(),
    db.select({ id: employees.id }).from(employees).where(eq(employees.sourceApplicationId, id)).limit(1),
    db.select({ feedback: interviewFeedback, author: admins.name }).from(interviewFeedback).innerJoin(interviews, eq(interviewFeedback.interviewId, interviews.id)).leftJoin(admins, eq(interviewFeedback.createdBy, admins.id)).where(eq(interviews.applicationId, id)).orderBy(desc(interviewFeedback.createdAt)).limit(100),
    db.select().from(reminders).where(and(eq(reminders.applicationId, id), eq(reminders.adminId, admin.id))).orderBy(asc(reminders.dueAt)).limit(50),
    // Compensation is only fetched for roles permitted to see it — a
    // hiring manager's payload never contains offer data at all.
    permits(admin.role, "offers") ? offerForApplication(id) : Promise.resolve(null),
  ]);
  return { notes, meetings, activity, messages, templates, starred: stars.length > 0, duplicates, staff, employeeId: linkedEmployees[0]?.id, feedback, tasks, offer };
}
export async function upcomingInterviews() {
  const admin = await requireAdmin();
  return db.select({ interview: interviews, name: sql<string>`concat(${applications.firstName}, ' ', ${applications.lastName})`, job: jobs.title })
    .from(interviews).innerJoin(applications, eq(interviews.applicationId, applications.id)).innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(and(candidateScope(admin), sql`${interviews.status} in ('Scheduled', 'Rescheduled')`, sql`${interviews.endsAt} >= now()`))
    .orderBy(asc(interviews.startsAt)).limit(12);
}
/**
 * Unread notifications only. The admin shell renders the notification panel
 * on every page, so it must not pay for the full actionCenter() fan-out —
 * that query set belongs to the dashboard, not the chrome.
 */
export async function unreadNotifications() {
  const admin = await requireAdmin();
  return db.select().from(notifications)
    .where(and(eq(notifications.adminId, admin.id), sql`${notifications.readAt} is null`,
      sql`(${notifications.applicationId} is null or exists (select 1 from ${applications} where ${applications.id} = ${notifications.applicationId} and ${candidateScope(admin)}))`))
    .orderBy(desc(notifications.createdAt)).limit(20);
}

export async function actionCenter() {
  const admin = await requireAdmin();
  const seesOffers = permits(admin.role, "offers");
  const [tasks, feedbackDue, alerts, offerApprovals, offerExpiring] = await Promise.all([
    db.select({ task: reminders, name: sql<string>`concat(${applications.firstName}, ' ', ${applications.lastName})` }).from(reminders).innerJoin(applications, eq(reminders.applicationId, applications.id)).where(and(candidateScope(admin), eq(reminders.adminId, admin.id), sql`${reminders.completedAt} is null`)).orderBy(asc(reminders.dueAt)).limit(12),
    db.select({ id: applications.id, name: sql<string>`concat(${applications.firstName}, ' ', ${applications.lastName})`, type: interviews.type }).from(interviews).innerJoin(applications, eq(interviews.applicationId, applications.id)).where(and(candidateScope(admin), eq(interviews.status, "Completed"), sql`not exists (select 1 from ${interviewFeedback} where ${interviewFeedback.interviewId} = ${interviews.id})`)).limit(12),
    db.select().from(notifications).where(and(eq(notifications.adminId, admin.id), sql`${notifications.readAt} is null`, sql`(${notifications.applicationId} is null or exists (select 1 from ${applications} where ${applications.id} = ${notifications.applicationId} and ${candidateScope(admin)}))`)).orderBy(desc(notifications.createdAt)).limit(20),
    // Offers waiting on *this* admin to approve them. Only approvers see
    // these, so a recruiter is not nagged about an action they cannot take.
    seesOffers && permits(admin.role, "manage")
      ? db.select({ id: offers.id, name: sql<string>`concat(${applications.firstName}, ' ', ${applications.lastName})`, job: jobs.title })
          .from(offers)
          .innerJoin(applications, eq(offers.applicationId, applications.id))
          .innerJoin(jobs, eq(applications.jobId, jobs.id))
          .where(and(candidateScope(admin), eq(offers.status, "PENDING_APPROVAL")))
          .orderBy(asc(offers.createdAt)).limit(12)
      : Promise.resolve([]),
    // Sent offers nearing expiry, so someone follows up before they lapse.
    seesOffers
      ? db.select({ id: offers.id, name: sql<string>`concat(${applications.firstName}, ' ', ${applications.lastName})`, expiresAt: offerVersions.expirationDate })
          .from(offers)
          .innerJoin(offerVersions, eq(offers.currentVersionId, offerVersions.id))
          .innerJoin(applications, eq(offers.applicationId, applications.id))
          .where(and(
            candidateScope(admin),
            sql`${offers.status} in ('SENT','VIEWED')`,
            gte(offerVersions.expirationDate, new Date()),
            lte(offerVersions.expirationDate, new Date(Date.now() + 3 * 86_400_000)),
          ))
          .orderBy(asc(offerVersions.expirationDate)).limit(12)
      : Promise.resolve([]),
  ]);
  return { tasks, feedbackDue, alerts, offerApprovals, offerExpiring };
}
