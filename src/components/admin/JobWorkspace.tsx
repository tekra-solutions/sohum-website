import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, applications, jobAssignments, jobs, jobViews } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { candidateScope } from "@/lib/ats/access";
import { permits, stages } from "@/lib/ats/policy";
import { applicationStatusLabel } from "@/lib/format";
import { recruiterOptions } from "@/lib/ats/data";
import { jobWorkflowAction } from "@/lib/ats/job-actions";
import { WorkflowForm, WorkflowField as Field } from "./WorkflowForm";
import { adminButtonSecondary } from "./ui";
export async function JobWorkspace({ job }: { job: typeof jobs.$inferSelect }) {
  const admin = await requireAdmin();
  const [counts, views, staff, assigned] = await Promise.all([
    db.select({ status: applications.status, n: sql<number>`count(*)::int` }).from(applications).where(and(eq(applications.jobId, job.id), candidateScope(admin))).groupBy(applications.status),
    db.select({ n: sql<number>`coalesce(sum(${jobViews.views}),0)::int` }).from(jobViews).where(eq(jobViews.jobId, job.id)),
    recruiterOptions(),
    db.select({ id: admins.id, name: admins.name }).from(jobAssignments).innerJoin(admins, eq(jobAssignments.adminId, admins.id)).where(eq(jobAssignments.jobId, job.id)),
  ]);
  return <div className="mt-5 max-w-3xl space-y-5"><section className="rounded-[4px] border border-paper-300 bg-white p-5"><h2 className="text-sm font-medium">Recruiting overview</h2><p className="mt-2 text-xs text-graphite-500">{views[0]?.n ?? 0} recorded views · {counts.reduce((n,c) => n+c.n,0)} applications</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{stages.map(stage => <Link href={`/admin/applications?jobId=${job.id}&status=${stage}`} key={stage} className="border-l-2 border-paper-300 pl-3"><span className="block text-xs text-graphite-500">{applicationStatusLabel[stage]}</span><span className="text-xl text-ink-900">{counts.find(c => c.status === stage)?.n ?? 0}</span></Link>)}</div><Link href={`/admin/pipeline?jobId=${job.id}`} className={`${adminButtonSecondary} mt-4`}>Open pipeline</Link></section>
    {permits(admin.role, "manage") && <section className="space-y-5 rounded-[4px] border border-paper-300 bg-white p-5"><h2 className="text-sm font-medium">Job workflow</h2>{["DRAFT","CLOSED","PENDING_APPROVAL"].includes(job.status) && <WorkflowForm action={jobWorkflowAction} label={job.status === "PENDING_APPROVAL" ? "Approve job" : "Submit for approval"}><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="kind" value="approval" /><input type="hidden" name="status" value={job.status === "PENDING_APPROVAL" ? "APPROVED" : "PENDING_APPROVAL"} /></WorkflowForm>}
      <WorkflowForm action={jobWorkflowAction} label="Save as reusable template"><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="kind" value="template" /><Field name="name" label="Template name" value={job.title} required /></WorkflowForm>
      <h3 className="text-sm font-medium">Assigned hiring team</h3>{assigned.map(person => <div key={person.id} className="flex items-center justify-between gap-2"><span className="text-xs">{person.name}</span><WorkflowForm action={jobWorkflowAction} label="Remove access"><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="kind" value="assign-job" /><input type="hidden" name="adminId" value={person.id} /><input type="hidden" name="remove" value="1" /></WorkflowForm></div>)}<WorkflowForm action={jobWorkflowAction} label="Assign to job"><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="kind" value="assign-job" /><Field name="adminId" label="Team member" options={staff.map(s => ({ value: s.id, label: `${s.name} · ${s.role.replaceAll("_"," ")}` }))} /></WorkflowForm>
    </section>}
  </div>;
}
