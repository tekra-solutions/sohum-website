import { JobWorkspace } from "@/components/admin/JobWorkspace";
import { permits } from "@/lib/ats/policy";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { AdminHeader, StatusPill } from "@/components/admin/ui";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { JobForm } from "@/components/admin/JobForm";
import { getJobById, countApplicationsForJob } from "@/lib/services/jobs";
import { requiresJobApproval } from "@/lib/ats/data";
import { deleteJobAction, setJobStatusAction } from "@/lib/services/job-actions";
import { jobStatusLabel } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit job" };

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const job = await getJobById(id);
  if (!job) notFound();

  const applicationCount = await countApplicationsForJob(job.id);
  const saved = sp.saved === "1";
  // With approval enabled, setJobStatusAction refuses to publish anything that
  // is not APPROVED, so the button has to reflect that rather than no-op.
  const needsApproval = await requiresJobApproval();
  const canPublish = !needsApproval || job.status === "APPROVED";

  return (
    <>
      <AdminHeader
        title={job.title}
        description={`${job.department} · ${job.location}`}
        action={
          <>
            <StatusPill status={job.status} label={jobStatusLabel[job.status]} />
            {job.status === "PUBLISHED" && (
              <Link
                href={`/careers/${job.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-[3px] border border-paper-300 bg-white px-4 py-2.5 text-[0.875rem] font-medium text-ink-900 hover:border-ink-500"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                View public page
              </Link>
            )}
          </>
        }
      />

      <div className="p-5 sm:p-6 lg:p-8">
        <Link href="/admin/jobs" className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-graphite-700 hover:text-ink-900">
          <ArrowLeft className="size-4" aria-hidden="true" />
          All jobs
        </Link>

        {saved && (
          <div role="status" className="mt-5 flex max-w-3xl gap-3 rounded-[3px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.06] p-4">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1e7a4d]" aria-hidden="true" />
            <p className="text-[0.875rem] text-[#14603b]">Changes saved.</p>
          </div>
        )}

        <JobWorkspace job={job} />
        {permits(admin.role, "manage") && <div className="mt-5 max-w-3xl space-y-5">
          <div className="rounded-[4px] border border-paper-300 bg-white p-6 sm:p-8">
            <JobForm job={job} />
          </div>

          {/* ---- Status + lifecycle ---- */}
          <div className="rounded-[4px] border border-paper-300 bg-white p-6">
            <h2 className="text-[1.0625rem] font-medium text-ink-900">Status</h2>
            <p className="mt-1.5 text-[0.875rem] text-graphite-600">
              {applicationCount > 0
                ? `${applicationCount} application${applicationCount === 1 ? "" : "s"} received. This job can be archived but not deleted, so those records are preserved.`
                : "No applications yet."}
            </p>
            {needsApproval && !canPublish && job.status !== "PUBLISHED" && (
              <p className="mt-3 rounded-[3px] border border-[#7a5c00]/30 bg-[#f0a93c]/[0.12] p-3 text-[0.8125rem] text-[#7a5c00]">
                {job.status === "PENDING_APPROVAL"
                  ? "Awaiting approval. A super admin approves it in the job workflow above, then it can be published."
                  : "Approval is required before publishing. Submit this job for approval in the job workflow above."}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {job.status !== "PUBLISHED" && canPublish && (
                <form action={setJobStatusAction}>
                  <input type="hidden" name="id" value={job.id} />
                  <input type="hidden" name="status" value="PUBLISHED" />
                  <button type="submit" className="rounded-[3px] bg-ink-900 px-4 py-2.5 text-[0.875rem] font-medium text-white hover:bg-ink-700">Publish</button>
                </form>
              )}
              {job.status === "PUBLISHED" && (
                <form action={setJobStatusAction}>
                  <input type="hidden" name="id" value={job.id} />
                  <input type="hidden" name="status" value="DRAFT" />
                  <button type="submit" className="rounded-[3px] border border-paper-300 px-4 py-2.5 text-[0.875rem] font-medium text-ink-900 hover:border-ink-500">Unpublish</button>
                </form>
              )}
              {job.status === "PUBLISHED" && (
                <form action={setJobStatusAction}>
                  <input type="hidden" name="id" value={job.id} />
                  <input type="hidden" name="status" value="CLOSED" />
                  <ConfirmSubmit label="Close job" message="Closing removes this job from the public careers site immediately. Existing applications are kept and stay workable." />
                </form>
              )}
              {job.status !== "ARCHIVED" && (
                <form action={setJobStatusAction}>
                  <input type="hidden" name="id" value={job.id} />
                  <input type="hidden" name="status" value="ARCHIVED" />
                  <ConfirmSubmit label="Archive" message="Archiving hides this job from the careers site and the default admin views. All applications and their history are retained." />
                </form>
              )}
              {applicationCount === 0 && (
                <form action={deleteJobAction}>
                  <input type="hidden" name="id" value={job.id} />
                  <ConfirmSubmit label="Delete" tone="danger" message="This permanently deletes the job. It has no applications, so nothing else is affected — but the job cannot be recovered." />
                </form>
              )}
            </div>
          </div>
        </div>}
      </div>
    </>
  );
}
