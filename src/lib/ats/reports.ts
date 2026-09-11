import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, applicationEvents, jobs, jobViews } from "@/db/schema";
import { candidateScope, requirePermission } from "./access";
export function reportDates(from?: string, to?: string, range?: string) {
  const end = to && /^\d{4}-\d{2}-\d{2}$/.test(to) && !isNaN(Date.parse(to)) ? new Date(`${to}T23:59:59.999Z`) : new Date();
  const start = from && /^\d{4}-\d{2}-\d{2}$/.test(from) && !isNaN(Date.parse(from)) ? new Date(`${from}T00:00:00Z`) : range === "year" ? new Date(Date.UTC(end.getUTCFullYear(), 0, 1)) : new Date(end.getTime() - (range === "7" ? 7 : range === "90" ? 90 : 30) * 86400000);
  return { start, end };
}
export async function recruitingReport(from?: string, to?: string, range?: string, jobId?: string) {
  const admin = await requirePermission("reports");
  const { start, end } = reportDates(from, to, range);
  const scope = and(candidateScope(admin), sql`${applications.createdAt} between ${start} and ${end}`, jobId ? eq(applications.jobId, jobId) : undefined);
  const [byStatus, bySource, byJob, overTime, timing, views, reached] = await Promise.all([
    db.select({ label: applications.status, value: sql<number>`count(*)::int` }).from(applications).where(scope).groupBy(applications.status),
    db.select({ label: sql<string>`coalesce(${applications.source}, 'Company Website')`, value: sql<number>`count(*)::int` }).from(applications).where(scope).groupBy(applications.source),
    db.select({ label: jobs.title, value: sql<number>`count(*)::int` }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(scope).groupBy(jobs.id, jobs.title),
    db.select({ label: sql<string>`to_char(${applications.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`, value: sql<number>`count(*)::int` }).from(applications).where(scope).groupBy(sql`to_char(${applications.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`).orderBy(sql`to_char(${applications.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`),
    db.select({ interview: sql<number | null>`avg(extract(epoch from ((select min(e.created_at) from application_events e where e.application_id = ${applications.id} and e.to_status = 'INTERVIEW') - ${applications.createdAt})) / 86400)::float`, hire: sql<number | null>`avg(extract(epoch from ((select min(e.created_at) from application_events e where e.application_id = ${applications.id} and e.to_status = 'HIRED') - ${applications.createdAt})) / 86400)::float` }).from(applications).where(scope),
    db.select({ n: sql<number>`coalesce(sum(${jobViews.views}),0)::int` }).from(jobViews).where(and(sql`${jobViews.day} between ${start.toISOString().slice(0,10)} and ${end.toISOString().slice(0,10)}`, jobId ? eq(jobViews.jobId, jobId) : undefined)),
    db.select({ label: applicationEvents.toStatus, value: sql<number>`count(distinct ${applicationEvents.applicationId})::int` }).from(applicationEvents).innerJoin(applications, eq(applicationEvents.applicationId, applications.id)).where(scope).groupBy(applicationEvents.toStatus),
  ]);
  return { byStatus, bySource, byJob, overTime, timing: timing[0], views: views[0]?.n ?? 0, reached, start, end };
}
