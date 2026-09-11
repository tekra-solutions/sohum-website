import { sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, resumeFiles, interviews, employees } from "@/db/schema";
import { pipelineByStage } from "@/lib/services/applications";
import { listAdminJobs } from "@/lib/services/jobs";
import { requireAdmin } from "@/lib/auth/session";
import { permits, stages } from "@/lib/ats/policy";
import { AdminHeader, adminButtonSecondary } from "@/components/admin/ui";
import { PipelineBoard } from "@/components/admin/PipelineBoard";
import { control } from "@/components/admin/form";
export const dynamic = "force-dynamic";
export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ jobId?: string }> }) {
  const admin = await requireAdmin();
  const { jobId } = await searchParams;
  const [jobs, results] = await Promise.all([listAdminJobs({}), pipelineByStage(jobId)]);
  const ids = results.flatMap(r => r.rows.map(r => r.application.id));
  const indicators = ids.length ? await db.select({ id: applications.id, resume: sql<boolean>`exists(select 1 from ${resumeFiles} where ${resumeFiles.applicationId} = ${applications.id})`, interview: sql<boolean>`exists(select 1 from ${interviews} where ${interviews.applicationId} = ${applications.id} and ${interviews.status} in ('Scheduled','Rescheduled'))`, hasEmployee: sql<boolean>`exists(select 1 from ${employees} where ${employees.sourceApplicationId} = ${applications.id})` }).from(applications).where(sql`${applications.id} in (${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)})`) : [];
  const byId = new Map(indicators.map(row => [row.id, row]));
  const columns = results.map((result, index) => ({ status: stages[index], total: result.total, href: `/admin/applications?status=${stages[index]}${jobId ? `&jobId=${encodeURIComponent(jobId)}` : ""}`, cards: result.rows.map(({ application: a, jobTitle }) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, job: jobTitle, date: a.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }), location: [a.city, a.state].filter(Boolean).join(", "), experience: a.yearsExperience, status: a.status, resume: byId.get(a.id)?.resume ?? false, interview: byId.get(a.id)?.interview ?? false, hasEmployee: byId.get(a.id)?.hasEmployee ?? false })) }));
  return <><AdminHeader title="Candidate pipeline" description="Move every application forward, from first review to hire." /><div className="p-5 sm:p-6 lg:p-8"><form className="mb-6 flex max-w-xl items-end gap-3"><label className="flex-1 text-xs text-graphite-600">Position<select name="jobId" defaultValue={jobId ?? "ALL"} className={`${control} mt-1`}><option value="ALL">All jobs</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></label><button className={adminButtonSecondary}>Apply</button></form><PipelineBoard columns={columns} canMove={permits(admin.role, "candidates")} /></div></>;
}
