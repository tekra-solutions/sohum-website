import { BulkCandidates } from "@/components/admin/BulkCandidates";
import { recruiterOptions } from "@/lib/ats/data";
import { permits, sources } from "@/lib/ats/policy";
import { control } from "@/components/admin/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { AdminHeader, EmptyState, StatusPill, adminButtonSecondary } from "@/components/admin/ui";
import { listApplications } from "@/lib/services/applications";
import { listAdminJobs } from "@/lib/services/jobs";
import { applicationStatusLabel, formatDate, relativeTime } from "@/lib/format";
import { applicationStatuses } from "@/lib/validation/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Applications" };

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminHeader title="Applications" />
        <div className="p-5 sm:p-6 lg:p-8">
          <EmptyState title="Database not configured" description="See docs/DEPLOYMENT.md to connect Supabase." />
        </div>
      </>
    );
  }

  const filters = {
    q: one("q"),
    status: one("status") ?? "ALL",
    jobId: one("jobId") ?? "ALL",
    from: one("from"),
    to: one("to"),
    sort: (one("sort") ?? "newest") as "newest" | "oldest" | "name" | "name-desc",
    page: Number(one("page") ?? 1),
    location: one("location"), source: one("source"), minExperience: one("minExperience"), maxExperience: one("maxExperience"), tag: one("tag"), starred: one("starred"), archived: one("archived"),
  };

  const [{ rows, total, page, pageCount }, allJobs, staff] = await Promise.all([
    listApplications(filters),
    listAdminJobs({}),
    recruiterOptions(),
  ]);

  /** Preserves the current filters when moving between pages. */
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v && v !== "ALL" && k !== "page") params.set(k, String(v));
    }
    params.set("page", String(n));
    return `/admin/applications?${params}`;
  };

  return (
    <>
      <AdminHeader title="Applications" description={`${total} total across all positions.`} />

      <div className="p-5 sm:p-6 lg:p-8">
        <form method="get" className="rounded-[4px] border border-paper-300 bg-white p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1.6fr)_repeat(2,minmax(0,1fr))_auto_auto_auto] lg:items-end">
            <div>
              <label htmlFor="q" className="sr-only">Search applications</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graphite-400" aria-hidden="true" />
                <input id="q" name="q" type="search" defaultValue={filters.q ?? ""}
                  placeholder="Name, email, phone, job, skills or location"
                  className="w-full rounded-[3px] border border-paper-300 py-2.5 pl-9 pr-3 text-[0.875rem] focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30" />
              </div>
            </div>
            <div>
              <label htmlFor="status" className="sr-only">Status</label>
              <select id="status" name="status" defaultValue={filters.status}
                className="w-full rounded-[3px] border border-paper-300 bg-white px-3 py-2.5 text-[0.875rem] focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30">
                <option value="ALL">All statuses</option>
                {applicationStatuses.map((s) => (
                  <option key={s} value={s}>{applicationStatusLabel[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="jobId" className="sr-only">Job</label>
              <select id="jobId" name="jobId" defaultValue={filters.jobId}
                className="w-full rounded-[3px] border border-paper-300 bg-white px-3 py-2.5 text-[0.875rem] focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30">
                <option value="ALL">All jobs</option>
                {allJobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>
            <div className="lg:w-[9.5rem]">
              <label htmlFor="from" className="block text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-graphite-500">From</label>
              <input id="from" name="from" type="date" defaultValue={filters.from ?? ""}
                className="mt-1 w-full rounded-[3px] border border-paper-300 px-2.5 py-2 text-[0.8125rem] focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30" />
            </div>
            <div className="lg:w-[9.5rem]">
              <label htmlFor="to" className="block text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-graphite-500">To</label>
              <input id="to" name="to" type="date" defaultValue={filters.to ?? ""}
                className="mt-1 w-full rounded-[3px] border border-paper-300 px-2.5 py-2 text-[0.8125rem] focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30" />
            </div>
            <div className="sm:col-span-2 lg:col-span-1 lg:self-end">
              <button type="submit" className={`${adminButtonSecondary} w-full lg:w-auto`}>
                Apply
              </button>
            </div>
          </div>
          <details className="mt-4"><summary className="cursor-pointer text-xs font-medium text-ink-800">Advanced filters</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs">Location<input name="location" defaultValue={filters.location} className={control} /></label>
            <label className="text-xs">Source<select name="source" defaultValue={filters.source ?? ""} className={control}><option value="">All sources</option>{sources.map(source => <option key={source}>{source}</option>)}</select></label>
            <label className="text-xs">Minimum years experience<input name="minExperience" type="number" min="0" max="60" defaultValue={filters.minExperience} className={control} /></label>
            <label className="text-xs">Maximum years experience<input name="maxExperience" type="number" min="0" max="60" defaultValue={filters.maxExperience} className={control} /></label>
            <label className="text-xs">Tag<input name="tag" defaultValue={filters.tag} className={control} /></label>
            <label className="text-xs">Sort<select name="sort" defaultValue={filters.sort} className={control}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option></select></label>
            <label className="flex items-center gap-2 text-xs"><input name="starred" type="checkbox" value="1" defaultChecked={filters.starred === "1"} />Starred by me</label>
            <label className="flex items-center gap-2 text-xs"><input name="archived" type="checkbox" value="1" defaultChecked={filters.archived === "1"} />Archived applications</label>
          </div></details>
        </form>

        <div className="mt-5">
          {permits(admin.role, "candidates") && rows.length > 0 && <BulkCandidates rows={rows.map(({ application: a }) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }))} staff={staff.filter(s => permits(s.role, "candidates"))} canAssign={permits(admin.role, "manage")} />}
          {rows.length === 0 ? (
            <EmptyState title="No applications found" description="Try a different search, filter or date range." />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto rounded-[4px] border border-paper-300 bg-white lg:block">
                <table className="w-full min-w-[54rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-paper-300">
                      {["Applicant","Job","Location","Applied","Status"].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-graphite-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ application: a, jobTitle, jobLocation }) => (
                      <tr key={a.id} className="border-b border-paper-200 last:border-0 hover:bg-paper-50">
                        <th scope="row" className="px-3 py-2.5">
                          <Link href={`/admin/applications/${a.id}`} className="block">
                            <span className="block text-[0.8125rem] font-medium text-ink-900">{a.firstName} {a.lastName}</span>
                            <span className="block text-[0.75rem] text-graphite-600">{a.email}</span>
                          </Link>
                        </th>
                        <td className="px-3 py-2.5 text-[0.8125rem] text-graphite-700">{jobTitle}</td>
                        <td className="px-3 py-2.5 text-[0.8125rem] text-graphite-600">{jobLocation}</td>
                        <td className="px-3 py-2.5 text-[0.75rem] text-graphite-600">
                          <span title={formatDate(a.createdAt)}>{relativeTime(a.createdAt)}</span>
                        </td>
                        <td className="px-3 py-2.5"><StatusPill status={a.status} label={applicationStatusLabel[a.status]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="grid gap-3 lg:hidden">
                {rows.map(({ application: a, jobTitle }) => (
                  <li key={a.id}>
                    <Link href={`/admin/applications/${a.id}`} className="block rounded-[4px] border border-paper-300 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[0.8125rem] font-medium text-ink-900">{a.firstName} {a.lastName}</span>
                        <StatusPill status={a.status} label={applicationStatusLabel[a.status]} />
                      </div>
                      <p className="mt-0.5 truncate text-[0.75rem] text-graphite-600">{a.email}</p>
                      <p className="mt-2 border-t border-paper-200 pt-2 text-[0.8125rem] text-graphite-700">{jobTitle}</p>
                      <p className="mt-0.5 text-[0.75rem] text-graphite-500">{relativeTime(a.createdAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>

              {pageCount > 1 && (
                <nav className="mt-5 flex items-center justify-between gap-4" aria-label="Pagination">
                  <p className="text-[0.8125rem] text-graphite-600">Page {page} of {pageCount}</p>
                  <div className="flex gap-2">
                    {page > 1 && <Link href={pageHref(page - 1)} className={adminButtonSecondary}>Previous</Link>}
                    {page < pageCount && <Link href={pageHref(page + 1)} className={adminButtonSecondary}>Next</Link>}
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
