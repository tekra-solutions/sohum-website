import Link from "next/link";
import { Search } from "lucide-react";
import { listOffers } from "@/lib/offers/data";
import { listAdminJobs } from "@/lib/services/jobs";
import { recruiterOptions } from "@/lib/ats/data";
import { offerStatuses } from "@/lib/offers/policy";
import { offerStatusLabel, formatCurrency } from "@/lib/format";
import { AdminHeader, DataTable, EmptyState, Filter, PageBody, Pager, StatusPill, Toolbar, td, tr } from "@/components/admin/ui";
import { control } from "@/components/admin/form";
import { requirePermission } from "@/lib/ats/access";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Offers" };

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("offers");
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminHeader title="Offers" />
        <PageBody>
          <EmptyState title="Database not configured" description="See docs/DEPLOYMENT.md to connect Supabase." />
        </PageBody>
      </>
    );
  }

  const filters = {
    q: one("q"), status: one("status") ?? "ALL", jobId: one("jobId"),
    recruiterId: one("recruiterId"), from: one("from"), to: one("to"),
    page: Number(one("page") ?? 1),
  };

  const [{ rows, total, page, pageSize }, jobs, staff] = await Promise.all([
    listOffers(filters),
    listAdminJobs({}),
    recruiterOptions(),
  ]);

  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v && k !== "page") params.set(k, String(v));
    params.set("page", String(n));
    return `/admin/offers?${params}`;
  };

  return (
    <>
      <AdminHeader title="Offers" description={`${total} offer${total === 1 ? "" : "s"}.`} />
      <PageBody>
        <Toolbar>
          <Filter label="Search" wide>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graphite-400" aria-hidden="true" />
              <input name="q" type="search" defaultValue={filters.q} placeholder="Candidate, email or job title" className={`${control} pl-9`} />
            </div>
          </Filter>
          <Filter label="Status">
            <select name="status" defaultValue={filters.status} className={control}>
              <option value="ALL">All statuses</option>
              <option value="AWAITING_RESPONSE">Awaiting response</option>
              {offerStatuses.map(s => <option key={s} value={s}>{offerStatusLabel[s]}</option>)}
            </select>
          </Filter>
          <Filter label="Job">
            <select name="jobId" defaultValue={filters.jobId ?? ""} className={control}>
              <option value="">All jobs</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </Filter>
          <Filter label="Recruiter">
            <select name="recruiterId" defaultValue={filters.recruiterId ?? ""} className={control}>
              <option value="">All recruiters</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Filter>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState title="No offers found" description="Create an offer from a candidate's profile once they reach the Offer stage." />
        ) : (
          <DataTable headers={["Candidate", "Position", "Salary", "Start date", "Status", "Expires", "Created by"]} minWidth="52rem">
            {rows.map(({ offer, version, application, jobTitle, creatorName }) => (
              <tr key={offer.id} className={tr}>
                <th scope="row" className="px-4 py-2.5 text-left">
                  <Link href={`/admin/offers/${offer.id}`} className="text-[0.8125rem] font-medium text-ink-900 underline-offset-4 hover:underline">
                    {application.firstName} {application.lastName}
                  </Link>
                </th>
                <td className={td}>{version?.jobTitle ?? jobTitle}</td>
                <td className={`${td} tabular-nums`}>
                  {version?.annualSalaryCents != null
                    ? formatCurrency(version.annualSalaryCents)
                    : version?.hourlyRateCents != null
                      ? `${formatCurrency(version.hourlyRateCents)}/hr`
                      : "—"}
                </td>
                <td className={`${td} whitespace-nowrap text-graphite-600`}>
                  {version ? version.startDate.toLocaleDateString("en-US", { timeZone: "UTC" }) : "—"}
                </td>
                <td className="px-4 py-2.5"><StatusPill status={offer.status} label={offerStatusLabel[offer.status]} /></td>
                <td className={`${td} whitespace-nowrap text-graphite-600`}>
                  {version ? version.expirationDate.toLocaleDateString("en-US", { timeZone: "UTC" }) : "—"}
                </td>
                <td className={`${td} text-graphite-500`}>{creatorName ?? "—"}</td>
              </tr>
            ))}
          </DataTable>
        )}

        <Pager page={page} pageCount={Math.ceil(total / pageSize)} href={pageHref} />
      </PageBody>
    </>
  );
}
