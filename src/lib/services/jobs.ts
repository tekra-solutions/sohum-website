import { requireAdmin } from "@/lib/auth/session";
import { jobScope, candidateScope } from "@/lib/ats/access";
import "server-only";
import { and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { applications, jobs } from "@/db/schema";

/**
 * Public reads must not take the marketing site down. If the database is
 * unconfigured or unreachable we log and fall back, so /careers still renders.
 */
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isDatabaseConfigured()) return fallback;
  try {
    return await fn();
  } catch (err) {
    console.error(`[jobs] ${label} failed`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/** URL-safe slug; uniqueness is enforced separately against the table. */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

/** Appends -2, -3 … until the slug is free. `excludeId` allows in-place edits. */
export async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "role";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await db.query.jobs.findFirst({
      where: excludeId
        ? and(eq(jobs.slug, candidate), ne(jobs.id, excludeId))
        : eq(jobs.slug, candidate),
      columns: { id: true },
    });
    if (!clash) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/* --------------------------------------------------------------- public */

export type PublicJobFilters = {
  q?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  experienceLevel?: string;
};

/** Only PUBLISHED jobs are ever returned here. */
export async function listPublishedJobs(filters: PublicJobFilters = {}) {
  return safe("listPublishedJobs", () => queryPublishedJobs(filters), []);
}

async function queryPublishedJobs(filters: PublicJobFilters) {
  const where = [eq(jobs.status, "PUBLISHED" as const)];

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    where.push(
      or(ilike(jobs.title, term), ilike(jobs.department, term), ilike(jobs.summary, term))!,
    );
  }
  if (filters.department) where.push(eq(jobs.department, filters.department));
  if (filters.location) where.push(eq(jobs.location, filters.location));
  if (filters.employmentType)
    where.push(eq(jobs.employmentType, filters.employmentType as "FULL_TIME"));
  if (filters.experienceLevel)
    where.push(eq(jobs.experienceLevel, filters.experienceLevel as "MID"));

  return db
    .select()
    .from(jobs)
    .where(and(...where))
    .orderBy(desc(jobs.publishedAt), desc(jobs.createdAt));
}

export async function getPublishedJobBySlug(slug: string) {
  return safe("getPublishedJobBySlug", () => queryJobBySlug(slug), undefined);
}

async function queryJobBySlug(slug: string) {
  return db.query.jobs.findFirst({
    where: and(eq(jobs.slug, slug), eq(jobs.status, "PUBLISHED" as const)),
  });
}

/** Distinct values for the public filter controls. */
export async function jobFacets() {
  return safe(
    "jobFacets",
    () => queryFacets(),
    { departments: [], locations: [], employmentTypes: [], experienceLevels: [] },
  );
}

async function queryFacets() {
  const rows = await db
    .select({
      department: jobs.department,
      location: jobs.location,
      employmentType: jobs.employmentType,
      experienceLevel: jobs.experienceLevel,
    })
    .from(jobs)
    .where(eq(jobs.status, "PUBLISHED" as const));

  const uniq = <T>(xs: T[]) => [...new Set(xs)].filter(Boolean).sort();
  return {
    departments: uniq(rows.map((r) => r.department)),
    locations: uniq(rows.map((r) => r.location)),
    employmentTypes: uniq(rows.map((r) => r.employmentType)),
    experienceLevels: uniq(rows.map((r) => r.experienceLevel)),
  };
}

/* ---------------------------------------------------------------- admin */

export async function listAdminJobs(opts: {
  q?: string;
  status?: string;
  sort?: "newest" | "oldest" | "title";
}) {
  const admin = await requireAdmin();
  const where = [jobScope(admin)];
  if (opts.q?.trim()) {
    const raw = opts.q.trim();
    const term = `%${raw}%`;
    // The job number is an integer, so it is cast to text to be matched as a
    // prefix — typing "5012" finds 501283. An exact number is matched as an
    // equality too, so pasting a full reference always lands on that job.
    const clauses = [ilike(jobs.title, term), ilike(jobs.department, term)];
    if (/^\d+$/.test(raw)) {
      clauses.push(sql`${jobs.reference}::text like ${`${raw}%`}`);
    }
    where.push(or(...clauses)!);
  }
  if (opts.status && opts.status !== "ALL") {
    where.push(eq(jobs.status, opts.status as "DRAFT"));
  }

  const order =
    opts.sort === "oldest" ? asc(jobs.createdAt)
    : opts.sort === "title" ? asc(jobs.title)
    : desc(jobs.createdAt);

  const jobRows = await db
    .select()
    .from(jobs)
    .where(where.length ? and(...where) : undefined)
    .orderBy(order);

  if (jobRows.length === 0) return [];

  // Counts are fetched in a single grouped query rather than a correlated
  // sub-select: an inline sql`` fragment came back under the column name
  // "count", so the mapped field was silently undefined and every row showed 0.
  const counts = await db
    .select({ jobId: applications.jobId, n: count() })
    .from(applications)
    .where(candidateScope(admin))
    .groupBy(applications.jobId);

  const byJob = new Map(counts.map((c) => [c.jobId, Number(c.n)]));

  return jobRows.map((job) => ({
    ...job,
    applicationCount: byJob.get(job.id) ?? 0,
  }));
}

/**
 * Resolves a job by its short reference (e.g. "501283") or its UUID.
 *
 * Admin URLs use the reference, but UUIDs still resolve so links saved before
 * references existed — bookmarks, notification hrefs, pasted links — keep
 * working. The two forms are told apart by shape rather than tried in turn:
 * comparing a UUID against an integer column is a Postgres type error, not a
 * miss, so a combined OR would throw instead of returning nothing.
 */
export function jobIdentifier(value: string) {
  const trimmed = value.trim();
  if (/^\d{1,9}$/.test(trimmed)) return eq(jobs.reference, Number(trimmed));
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return eq(jobs.id, trimmed);
  return null;
}

export async function getJobById(id: string) {
  const admin = await requireAdmin();
  const match = jobIdentifier(id);
  if (!match) return undefined;
  return db.query.jobs.findFirst({ where: and(match, jobScope(admin)) });
}

export async function countApplicationsForJob(jobId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(applications)
    .where(eq(applications.jobId, jobId));
  return row?.n ?? 0;
}
