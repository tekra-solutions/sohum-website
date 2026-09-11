import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, auditLogs, interviews, jobs } from "@/db/schema";
import { getSessionAdmin } from "@/lib/auth/session";
import { csvCell, permits } from "@/lib/ats/policy";
import { reportDates } from "@/lib/ats/reports";
export async function GET(request: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!permits(admin.role, "reports")) return Response.json({ error: "Forbidden" }, { status: 403 });
  const sp = new URL(request.url).searchParams; const type = sp.get("type") ?? "applications";
  if (!["applications", "candidates", "jobs", "interviews"].includes(type)) return Response.json({ error: "Invalid export" }, { status: 400 });
  const { start, end } = reportDates(sp.get("from") ?? undefined, sp.get("to") ?? undefined);
  if (start > end) return Response.json({ error: "Invalid date range" }, { status: 400 });
  await db.insert(auditLogs).values({ adminId: admin.id, action: "RECRUITING_EXPORT_STARTED", entityType: "export", metadata: { type, from: start.toISOString(), to: end.toISOString() } });
  const encode = new TextEncoder(); let page = 0; let headers = false; let cancelled = false;
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const rows = type === "jobs" ? await db.select({ title: jobs.title, department: jobs.department, location: jobs.location, status: jobs.status, created: jobs.createdAt }).from(jobs).where(sql`${jobs.createdAt} between ${start} and ${end}`).orderBy(asc(jobs.id)).limit(500).offset(page*500)
          : type === "interviews" ? await db.select({ candidate: sql<string>`concat(${applications.firstName}, ' ', ${applications.lastName})`, job: jobs.title, type: interviews.type, status: interviews.status, start: interviews.startsAt, end: interviews.endsAt, timezone: interviews.timezone, interviewers: interviews.interviewers }).from(interviews).innerJoin(applications, eq(interviews.applicationId, applications.id)).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(and(sql`${interviews.startsAt} between ${start} and ${end}`)).orderBy(asc(interviews.id)).limit(500).offset(page*500)
          : await db.select({ reference: applications.reference, firstName: applications.firstName, lastName: applications.lastName, email: applications.email, job: jobs.title, status: applications.status, source: applications.source, applied: applications.createdAt }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(sql`${applications.createdAt} between ${start} and ${end}`).orderBy(asc(applications.id)).limit(500).offset(page*500);
        if (cancelled) return;
        if (!headers) { controller.enqueue(encode.encode((rows[0] ? Object.keys(rows[0]) : ["No results"]).map(csvCell).join(",")+"\r\n")); headers = true; }
        for (const row of rows) controller.enqueue(encode.encode(Object.values(row).map(v => csvCell(v instanceof Date ? v.toISOString() : v)).join(",")+"\r\n"));
        if (rows.length < 500) { await db.insert(auditLogs).values({ adminId: admin.id, action: "RECRUITING_EXPORT_COMPLETED", entityType: "export", metadata: { type, count: page*500+rows.length } }); controller.close(); } else page++;
      } catch { if (!cancelled) controller.error(new Error("Export interrupted. Please retry.")); }
    }, cancel() { cancelled = true; },
  });
  return new Response(stream, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="sohum-${type}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
