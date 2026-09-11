import "server-only";
import { requireAdmin } from "@/lib/auth/session";
import { candidateScope, jobScope, requireApplication } from "@/lib/ats/access";
import { positivePage, stages } from "@/lib/ats/policy";
import { z } from "zod";
import { and, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { applicationEvents, applications, jobs, resumeFiles, candidateStars, admins, notifications, jobAssignments, offers } from "@/db/schema";
import { buildResumePath, deleteResume, uploadResume } from "@/lib/storage/resumes";
import { serverEnv } from "@/lib/env";

/** SOH-APP-2026-000123 — derived from the row's own sequence. */
export const formatReference = (sequence: number, year = new Date().getFullYear()) =>
  `SOH-APP-${year}-${String(sequence).padStart(6, "0")}`;

/**
 * Has this email already applied to this job inside the configured window?
 * Used to warn, not to permanently block a legitimate re-application.
 */
export async function findRecentDuplicate(jobId: string, email: string) {
  const days = serverEnv().duplicateWindowDays;
  if (days <= 0) return null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return db.query.applications.findFirst({
    where: and(
      eq(applications.jobId, jobId),
      sql`lower(${applications.email}) = ${email.toLowerCase()}`,
      gte(applications.createdAt, since),
    ),
    columns: { id: true, reference: true, createdAt: true },
  });
}

export type SubmitResult =
  | { ok: true; reference: string; applicationId: string }
  | { ok: false; error: string; code: "JOB_UNAVAILABLE" | "UPLOAD_FAILED" | "DB_FAILED" };

/**
 * Submits an application.
 *
 * Ordering matters: the row is inserted first so the resume path can be keyed
 * by a real application id, then the file is uploaded, then metadata is
 * attached. If the upload or metadata write fails we delete both the row and
 * any uploaded object, so a half-finished application is never left behind.
 */
export async function submitApplication(input: {
  values: typeof applications.$inferInsert;
  resume: { filename: string; mimeType: string; size: number; bytes: ArrayBuffer };
}): Promise<SubmitResult> {
  // The job must still be open at submission time, not just when the page loaded.
  const job = await db.query.jobs.findFirst({
    where: and(eq(jobs.id, input.values.jobId), eq(jobs.status, "PUBLISHED" as const)),
    columns: { id: true, title: true },
  });
  if (!job) {
    return { ok: false, error: "This position is no longer accepting applications.", code: "JOB_UNAVAILABLE" };
  }

  let applicationId: string | undefined;
  let storagePath: string | undefined;

  try {
    // Reference is derived from the row's sequence, so it is unique without
    // a second round trip or a race between concurrent submissions.
    const [row] = await db
      .insert(applications)
      .values({ ...input.values, status: "NEW", source: input.values.source || "Company Website", reference: `P-${crypto.randomUUID().slice(0,24)}` })
      .returning({ id: applications.id, sequence: applications.sequence });
    if (!row) throw new Error("Insert returned no row");

    applicationId = row.id;
    const reference = formatReference(row.sequence);
    await db.update(applications).set({ reference }).where(eq(applications.id, row.id));

    storagePath = buildResumePath(row.id, input.resume.filename);
    await uploadResume({
      path: storagePath,
      body: input.resume.bytes,
      contentType: input.resume.mimeType,
    });

    await db.insert(resumeFiles).values({
      applicationId: row.id,
      originalFilename: input.resume.filename,
      storagePath,
      mimeType: input.resume.mimeType,
      fileSize: input.resume.size,
    });

    await db.insert(applicationEvents).values({
      applicationId: row.id,
      toStatus: "NEW",
      note: "Application submitted",
    });

    try {
      const recipients = await db.select({ id: admins.id }).from(admins).where(and(eq(admins.isActive, true), sql`(${admins.role} in ('ADMIN','SUPER_ADMIN','RECRUITING_ADMIN') or (${admins.role} = 'HIRING_MANAGER' and exists (select 1 from ${jobAssignments} where ${jobAssignments.jobId} = ${input.values.jobId} and ${jobAssignments.adminId} = ${admins.id})))`));
      if (recipients.length) await db.insert(notifications).values(recipients.map(r => ({ adminId: r.id, applicationId: row.id, title: "New application received", href: `/admin/applications/${row.id}` })));
    } catch { console.error("[notifications] new application notification failed"); }
    return { ok: true, reference, applicationId: row.id };
  } catch (err) {
    console.error("[applications] submit failed", {
      jobId: input.values.jobId,
      error: err instanceof Error ? err.message : String(err),
    });

    // Roll back in reverse order. Both steps are best-effort; failing to clean
    // up must not mask the original error.
    if (storagePath) await deleteResume(storagePath);
    if (applicationId) {
      try {
        await db.delete(applications).where(eq(applications.id, applicationId));
      } catch (cleanupErr) {
        console.error("[applications] rollback failed", {
          applicationId,
          error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
        });
      }
    }

    const code = storagePath ? "UPLOAD_FAILED" : "DB_FAILED";
    return {
      ok: false,
      code,
      error: "We could not submit your application. Please try again in a moment.",
    };
  }
}

/* ---------------------------------------------------------------- admin */

export type AdminApplicationFilters = {
  q?: string;
  status?: string;
  jobId?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest" | "name" | "name-desc";
  location?: string; source?: string; minExperience?: string; maxExperience?: string; tag?: string; starred?: string; archived?: string;
  page?: number;
  pageSize?: number;
};

/** Server-side pagination and filtering — never ships the whole table. */
export async function listApplications(f: AdminApplicationFilters) {
  const admin = await requireAdmin();
  const page = positivePage(f.page);
  const pageSize = Math.min(100, Math.max(5, positivePage(f.pageSize ?? 25)));

  const where = [candidateScope(admin)];
  where.push(f.archived === "1" ? sql`${applications.archivedAt} is not null` : sql`${applications.archivedAt} is null`);
  if (f.starred === "1") where.push(sql`exists (select 1 from ${candidateStars} where ${candidateStars.applicationId} = ${applications.id} and ${candidateStars.adminId} = ${admin.id})`);
  if (f.location) where.push(sql`concat_ws(', ', ${applications.city}, ${applications.state}, ${applications.country}) ilike ${"%" + f.location.slice(0, 120) + "%"}`);
  if (f.source) where.push(eq(applications.source, f.source));
  if (f.tag) where.push(sql`${applications.tags} @> ${JSON.stringify([f.tag])}::jsonb`);
  if (f.minExperience && Number.isFinite(Number(f.minExperience))) where.push(sql`${applications.yearsExperience} >= ${Number(f.minExperience)}`);
  if (f.maxExperience && Number.isFinite(Number(f.maxExperience))) where.push(sql`${applications.yearsExperience} <= ${Number(f.maxExperience)}`);
  if (f.q?.trim()) {
    const term = `%${f.q.trim().slice(0, 200)}%`;
    where.push(
      or(
        ilike(applications.firstName, term),
        ilike(applications.lastName, term),
        ilike(applications.email, term),
        ilike(applications.reference, term),
        ilike(applications.phone, term),
        ilike(applications.skills, term),
        sql`${applications.tags}::text ilike ${term}`,
        sql`concat_ws(' ', ${applications.firstName}, ${applications.lastName}) ilike ${term}`,
        ilike(applications.city, term), ilike(applications.state, term),
        ilike(jobs.title, term),
      )!,
    );
  }
  if (f.status && (stages as readonly string[]).includes(f.status)) {
    where.push(eq(applications.status, f.status as "NEW"));
  }
  if (f.jobId && z.uuid().safeParse(f.jobId).success) where.push(eq(applications.jobId, f.jobId));
  if (f.from && !isNaN(Date.parse(f.from))) where.push(gte(applications.createdAt, new Date(f.from)));
  if (f.to && !isNaN(Date.parse(f.to))) {
    const end = new Date(f.to);
    end.setHours(23, 59, 59, 999);
    // A raw Date fails to bind through a sql`` template (only Drizzle's typed
    // operators serialize it); stringify before interpolating.
    where.push(sql`${applications.createdAt} <= ${end.toISOString()}`);
  }

  const clause = where.length ? and(...where) : undefined;

  const order =
    f.sort === "oldest" ? applications.createdAt
    : f.sort === "name-desc" ? desc(applications.lastName)
    : f.sort === "name" ? applications.lastName
    : desc(applications.createdAt);

  const rows = await db
    .select({
      application: applications,
      jobTitle: jobs.title,
      jobLocation: jobs.location,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(clause)
    .orderBy(f.sort === "newest" || !f.sort ? desc(applications.createdAt) : order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [totalRow] = await db
    .select({ n: count() })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(clause);

  const total = totalRow?.n ?? 0;
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getApplicationDetail(id: string) {
  await requireApplication(id);
  const row = await db.query.applications.findFirst({
    where: eq(applications.id, id),
    with: {
      job: true,
      resume: true,
      events: { orderBy: (e, { asc }) => [asc(e.createdAt)] },
    },
  });
  return row ?? null;
}

/**
 * The handful of facts a recruiter needs at a glance on the candidate page:
 * who owns it, when it arrived, and whether an offer exists. Kept separate
 * from getApplicationDetail so the heavier relational load is unchanged, and
 * offer state is only read when the caller is permitted to see it.
 */
export async function applicationSummary(id: string, opts: { includeOffer: boolean }) {
  const [row] = await db
    .select({ assignedName: admins.name, createdAt: applications.createdAt })
    .from(applications)
    .leftJoin(admins, eq(applications.assignedTo, admins.id))
    .where(eq(applications.id, id))
    .limit(1);
  if (!opts.includeOffer) return { ...row, offerStatus: null as string | null };
  const [offerRow] = await db
    .select({ status: offers.status })
    .from(offers)
    .where(eq(offers.applicationId, id))
    .orderBy(desc(offers.createdAt))
    .limit(1);
  return { ...row, offerStatus: offerRow?.status ?? null };
}

/** Dashboard counters, computed in one round trip. */
export async function dashboardStats() {
  const admin = await requireAdmin();
  const [jobRow] = await db
    .select({
      published: sql<number>`count(*) filter (where ${jobs.status} = 'PUBLISHED')::int`,
      draft: sql<number>`count(*) filter (where ${jobs.status} = 'DRAFT')::int`,
    })
    .from(jobs).where(jobScope(admin));

  const [appRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      isNew: sql<number>`count(*) filter (where ${applications.status} = 'NEW')::int`,
      reviewing: sql<number>`count(*) filter (where ${applications.status} = 'SCREENING')::int`,
      shortlisted: sql<number>`count(*) filter (where ${applications.status} = 'SHORTLISTED')::int`,
      interview: sql<number>`count(*) filter (where ${applications.status} = 'INTERVIEW')::int`,
      offer: sql<number>`count(*) filter (where ${applications.status} = 'OFFER')::int`,
      hired: sql<number>`count(*) filter (where ${applications.status} = 'HIRED')::int`,
      rejected: sql<number>`count(*) filter (where ${applications.status} = 'REJECTED')::int`,
    })
    .from(applications).where(candidateScope(admin));

  return {
    publishedJobs: jobRow?.published ?? 0,
    draftJobs: jobRow?.draft ?? 0,
    totalApplications: appRow?.total ?? 0,
    newApplications: appRow?.isNew ?? 0,
    reviewing: appRow?.reviewing ?? 0,
    shortlisted: appRow?.shortlisted ?? 0,
    interview: appRow?.interview ?? 0,
    offer: appRow?.offer ?? 0,
    hired: appRow?.hired ?? 0,
    rejected: appRow?.rejected ?? 0,
  };
}

export async function recentApplications(limit = 6) {
  const admin = await requireAdmin();
  return db
    .select({
      id: applications.id,
      reference: applications.reference,
      firstName: applications.firstName,
      lastName: applications.lastName,
      status: applications.status,
      createdAt: applications.createdAt,
      jobTitle: jobs.title,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(candidateScope(admin))
    .orderBy(desc(applications.createdAt))
    .limit(limit);
}
