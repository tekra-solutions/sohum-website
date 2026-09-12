import Link from "next/link";
import { CandidateTable } from "@/components/admin/CandidateTable";
import { recruiterOptions } from "@/lib/ats/data";
import { permits, sources } from "@/lib/ats/policy";
import { btnSecondary, control, t } from "@/components/admin/form";
import { Search } from "lucide-react";
import { AdminHeader, EmptyState, Filter, PageBody, Pager } from "@/components/admin/ui";
import { listApplications } from "@/lib/services/applications";
import { listAdminJobs } from "@/lib/services/jobs";
import { applicationStatusLabel, formatDate, relativeTime } from "@/lib/format";
import { applicationStatuses } from "@/lib/validation/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Candidates" };

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
        <AdminHeader title="Candidates" />
        <PageBody>
          <EmptyState title="Database not configured" description="See docs/DEPLOYMENT.md to connect Supabase." />
        </PageBody>
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

  const filtered = Boolean(
    filters.q || filters.status !== "ALL" || filters.jobId !== "ALL" || filters.from || filters.to ||
    filters.location || filters.source || filters.minExperience || filters.maxExperience ||
    filters.tag || filters.starred || filters.archived,
  );

  return (
    <>
      <AdminHeader title="Candidates" description={`${total} application${total === 1 ? "" : "s"} across all positions.`} />

      <PageBody>
        <form method="get" className="rounded-[4px] border border-paper-300 bg-white p-3.5">
          <div className="flex flex-wrap items-end gap-2.5">
            <Filter label="Search" wide>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graphite-400" aria-hidden="true" />
                <input name="q" type="search" defaultValue={filters.q ?? ""}
                  placeholder="Name, email, phone, job, skills or location"
                  className={`${control} pl-9`} />
              </div>
            </Filter>
            <Filter label="Status">
              <select name="status" defaultValue={filters.status} className={control}>
                <option value="ALL">All statuses</option>
                {applicationStatuses.map((s) => (
                  <option key={s} value={s}>{applicationStatusLabel[s]}</option>
                ))}
              </select>
            </Filter>
            <Filter label="Job">
              <select name="jobId" defaultValue={filters.jobId} className={control}>
                <option value="ALL">All jobs</option>
                {allJobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </Filter>
            <Filter label="Sort">
              <select name="sort" defaultValue={filters.sort} className={control}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
              </select>
            </Filter>
            <button type="submit" className={btnSecondary}>Filter</button>
          </div>

          {/* Everything below is for narrowing a large pool — rare enough that
              it should not occupy the top of the screen on every visit, common
              enough to keep one click away. */}
          <details className="mt-3 border-t border-paper-200 pt-3" open={Boolean(filters.location || filters.source || filters.minExperience || filters.maxExperience || filters.tag || filters.starred || filters.archived)}>
            <summary className={`cursor-pointer ${t.label} font-medium text-graphite-700`}>More filters</summary>
            <div className="mt-3 flex flex-wrap items-end gap-2.5">
              <Filter label="Location">
                <input name="location" defaultValue={filters.location} className={control} />
              </Filter>
              <Filter label="Source">
                <select name="source" defaultValue={filters.source ?? ""} className={control}>
                  <option value="">All sources</option>
                  {sources.map(source => <option key={source}>{source}</option>)}
                </select>
              </Filter>
              <Filter label="Tag">
                <input name="tag" defaultValue={filters.tag} className={control} />
              </Filter>
              <Filter label="Experience (min)">
                <input name="minExperience" type="number" min="0" max="60" defaultValue={filters.minExperience} className={control} />
              </Filter>
              <Filter label="Experience (max)">
                <input name="maxExperience" type="number" min="0" max="60" defaultValue={filters.maxExperience} className={control} />
              </Filter>
              <Filter label="Applied from">
                <input name="from" type="date" defaultValue={filters.from ?? ""} className={control} />
              </Filter>
              <Filter label="Applied to">
                <input name="to" type="date" defaultValue={filters.to ?? ""} className={control} />
              </Filter>
              <label className={`flex items-center gap-2 pb-2 ${t.body} text-graphite-700`}>
                <input name="starred" type="checkbox" value="1" defaultChecked={filters.starred === "1"} className="size-3.5 accent-ink-900" />
                Starred by me
              </label>
              <label className={`flex items-center gap-2 pb-2 ${t.body} text-graphite-700`}>
                <input name="archived" type="checkbox" value="1" defaultChecked={filters.archived === "1"} className="size-3.5 accent-ink-900" />
                Archived
              </label>
            </div>
          </details>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            title={filtered ? "No matching candidates" : "No applications yet"}
            description={filtered
              ? "Try a broader search, or clear the filters to see every application."
              : "Applications appear here as soon as candidates apply to a published position."}
            action={filtered
              ? <Link href="/admin/applications" className={btnSecondary}>Clear filters</Link>
              : <Link href="/admin/jobs" className={btnSecondary}>Manage jobs</Link>}
          />
        ) : (
          <CandidateTable
            rows={rows.map(({ application: a, jobTitle, jobLocation }) => ({
              id: a.id,
              name: `${a.firstName} ${a.lastName}`,
              email: a.email,
              jobTitle,
              jobLocation,
              status: a.status,
              statusLabel: applicationStatusLabel[a.status],
              applied: relativeTime(a.createdAt),
              appliedTitle: formatDate(a.createdAt),
            }))}
            staff={staff.filter(s => permits(s.role, "candidates")).map(({ id, name }) => ({ id, name }))}
            canBulk={permits(admin.role, "candidates")}
            canAssign={permits(admin.role, "manage")}
          />
        )}

        <Pager page={page} pageCount={pageCount} href={pageHref} />
      </PageBody>
    </>
  );
}
