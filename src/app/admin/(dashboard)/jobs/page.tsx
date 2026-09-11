import Link from "next/link";
import { ExternalLink, Pencil, Plus, Search } from "lucide-react";
import {
  AdminHeader, EmptyState, StatusPill, adminButton, adminButtonSecondary,
} from "@/components/admin/ui";
import { listAdminJobs } from "@/lib/services/jobs";
import { setJobStatusAction } from "@/lib/services/job-actions";
import { employmentTypeLabel, jobStatusLabel, shortDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/db";
import { requiresJobApproval } from "@/lib/ats/data";

export const dynamic = "force-dynamic";

// Mirrors the job_status enum so approval-workflow jobs stay reachable.
const statusFilters = ["ALL", "PUBLISHED", "DRAFT", "PENDING_APPROVAL", "APPROVED", "CLOSED", "ARCHIVED"] as const;

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  // Only accept a status the filter actually offers; anything else is "ALL"
  // rather than an unmatched enum comparison.
  const requested = one("status") ?? "ALL";
  const status = (statusFilters as readonly string[]).includes(requested) ? requested : "ALL";
  const q = one("q") ?? "";
  const sort = (one("sort") ?? "newest") as "newest" | "oldest" | "title";

  const rows = isDatabaseConfigured() ? await listAdminJobs({ q, status, sort }) : [];
  // Publishing is refused for unapproved jobs, so offer Review instead of a
  // Publish button that would quietly do nothing.
  const needsApproval = isDatabaseConfigured() ? await requiresJobApproval() : false;

  return (
    <>
      <AdminHeader
        title="Jobs"
        description="Create, publish and archive open positions."
        action={
          <Link href="/admin/jobs/new" className={adminButton}>
            <Plus className="size-3.5" aria-hidden="true" />
            Create job
          </Link>
        }
      />

      <div className="p-5 sm:p-6 lg:p-8">
        {/* ---- Filters (GET form: no JS required) ---- */}
        <form method="get" className="rounded-[4px] border border-paper-300 bg-white p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <div>
              <label htmlFor="q" className="sr-only">Search jobs</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graphite-400" aria-hidden="true" />
                <input
                  id="q" name="q" type="search" defaultValue={q}
                  placeholder="Search title or department"
                  className="w-full rounded-[3px] border border-paper-300 bg-white py-2.5 pl-9 pr-3 text-[0.875rem] focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30"
                />
              </div>
            </div>
            <div>
              <label htmlFor="status" className="sr-only">Status</label>
              <select id="status" name="status" defaultValue={status}
                className="w-full rounded-[3px] border border-paper-300 bg-white px-3 py-2.5 text-[0.875rem] focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30">
                {statusFilters.map((s) => (
                  <option key={s} value={s}>{s === "ALL" ? "All statuses" : jobStatusLabel[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sort" className="sr-only">Sort</label>
              <select id="sort" name="sort" defaultValue={sort}
                className="w-full rounded-[3px] border border-paper-300 bg-white px-3 py-2.5 text-[0.875rem] focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title">Title</option>
              </select>
            </div>
            <button type="submit" className={adminButtonSecondary}>Apply</button>
          </div>
        </form>

        <p className="mt-3 text-[0.8125rem] text-graphite-600" aria-live="polite">
          {rows.length} {rows.length === 1 ? "job" : "jobs"}
        </p>

        <div className="mt-3">
          {rows.length === 0 ? (
            <EmptyState
              title="No jobs found"
              description={q || status !== "ALL" ? "Try a different search or filter." : "Create your first position to start receiving applications."}
              action={<Link href="/admin/jobs/new" className={adminButton}><Plus className="size-3.5" aria-hidden="true" />Create job</Link>}
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto rounded-[4px] border border-paper-300 bg-white lg:block">
                <table className="w-full min-w-[52rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-paper-300">
                      {["Title","Department","Location","Type","Applications","Status","Posted",""].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-graphite-500">
                          {h || <span className="sr-only">Actions</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((j) => (
                      <tr key={j.id} className="border-b border-paper-200 last:border-0">
                        <th scope="row" className="px-3 py-2.5 text-[0.75rem] font-medium text-ink-900">
                          <Link href={`/admin/jobs/${j.id}`} className="hover:underline underline-offset-4">{j.title}</Link>
                        </th>
                        <td className="px-3 py-2.5 text-[0.8125rem] text-graphite-600">{j.department}</td>
                        <td className="px-3 py-2.5 text-[0.8125rem] text-graphite-600">{j.location}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[0.8125rem] text-graphite-600">{employmentTypeLabel[j.employmentType]}</td>
                        <td className="px-3 py-2.5 text-[0.8125rem] tabular-nums text-graphite-700">
                          {j.applicationCount > 0 ? (
                            <Link href={`/admin/applications?jobId=${j.id}`} className="underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500">
                              {j.applicationCount}
                            </Link>
                          ) : "0"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5"><StatusPill status={j.status} label={jobStatusLabel[j.status]} /></td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[0.75rem] text-graphite-600">
                          {j.publishedAt ? shortDate(j.publishedAt) : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            {j.status === "PUBLISHED" && (
                              <Link href={`/careers/${j.slug}`} target="_blank" className="rounded p-1.5 text-graphite-500 hover:bg-paper-100 hover:text-ink-900" aria-label={`View ${j.title} publicly`}>
                                <ExternalLink className="size-4" aria-hidden="true" />
                              </Link>
                            )}
                            <Link href={`/admin/jobs/${j.id}`} className="rounded p-1.5 text-graphite-500 hover:bg-paper-100 hover:text-ink-900" aria-label={`Edit ${j.title}`}>
                              <Pencil className="size-4" aria-hidden="true" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="grid gap-3 lg:hidden">
                {rows.map((j) => (
                  <li key={j.id} className="rounded-[4px] border border-paper-300 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/admin/jobs/${j.id}`} className="text-[0.75rem] font-medium text-ink-900">{j.title}</Link>
                      <StatusPill status={j.status} label={jobStatusLabel[j.status]} />
                    </div>
                    <p className="mt-1 text-[0.75rem] text-graphite-600">{j.department} · {j.location}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-paper-200 pt-3">
                      <span className="text-[0.75rem] text-graphite-600">
                        {j.applicationCount} application{j.applicationCount === 1 ? "" : "s"}
                      </span>
                      <div className="flex gap-2">
                        {needsApproval && j.status !== "PUBLISHED" && j.status !== "APPROVED" ? (
                          <Link href={`/admin/jobs/${j.id}`} className="rounded border border-paper-300 px-3 py-1.5 text-[0.75rem] font-medium text-ink-900">
                            Review
                          </Link>
                        ) : (
                          <form action={setJobStatusAction}>
                            <input type="hidden" name="id" value={j.id} />
                            <input type="hidden" name="status" value={j.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"} />
                            <button type="submit" className="rounded border border-paper-300 px-3 py-1.5 text-[0.75rem] font-medium text-ink-900">
                              {j.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                            </button>
                          </form>
                        )}
                        <Link href={`/admin/jobs/${j.id}`} className="rounded border border-paper-300 px-3 py-1.5 text-[0.75rem] font-medium text-ink-900">Edit</Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}
