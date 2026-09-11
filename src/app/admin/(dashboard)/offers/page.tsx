import Link from "next/link";
import { Search } from "lucide-react";
import { listOffers } from "@/lib/offers/data";
import { listAdminJobs } from "@/lib/services/jobs";
import { recruiterOptions } from "@/lib/ats/data";
import { offerStatuses } from "@/lib/offers/policy";
import { offerStatusLabel, formatCurrency, shortDate } from "@/lib/format";
import { AdminHeader, EmptyState, StatusPill, adminButtonSecondary } from "@/components/admin/ui";
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
        <div className="p-5 sm:p-6 lg:p-8">
          <EmptyState title="Database not configured" description="See docs/DEPLOYMENT.md to connect Supabase." />
        </div>
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
      <div className="space-y-5 p-5 sm:p-6 lg:p-8">
        <form className="grid gap-3 rounded-[4px] border border-paper-300 bg-white p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graphite-400" aria-hidden="true" />
            <input name="q" type="search" defaultValue={filters.q} placeholder="Candidate, email or job title" className={`${control} pl-9`} />
          </div>
          <select name="status" defaultValue={filters.status} className={control}>
            <option value="ALL">All statuses</option>
            {offerStatuses.map(s => <option key={s} value={s}>{offerStatusLabel[s]}</option>)}
          </select>
          <select name="jobId" defaultValue={filters.jobId ?? ""} className={control}>
            <option value="">All jobs</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <select name="recruiterId" defaultValue={filters.recruiterId ?? ""} className={control}>
            <option value="">All recruiters</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className={adminButtonSecondary}>Filter</button>
        </form>

        {rows.length === 0 ? (
          <EmptyState title="No offers found" description="Create an offer from a candidate's profile once they reach the Offer stage." />
        ) : (
          <div className="overflow-x-auto rounded-[4px] border border-paper-300 bg-white">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr>
                  {["Candidate", "Position", "Salary", "Start date", "Status", "Created", "Expires", "Created by"].map(h => (
                    <th key={h} className="border-b border-paper-300 p-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ offer, version, application, jobTitle, creatorName }) => (
                  <tr key={offer.id} className="border-b border-paper-200 last:border-0">
                    <td className="p-3">
                      <Link href={`/admin/offers/${offer.id}`} className="font-medium text-ink-900 underline-offset-4 hover:underline">
                        {application.firstName} {application.lastName}
                      </Link>
                    </td>
                    <td className="p-3 text-graphite-600">{version?.jobTitle ?? jobTitle}</td>
                    <td className="p-3 tabular-nums text-graphite-700">
                      {version?.annualSalaryCents != null ? formatCurrency(version.annualSalaryCents) : version?.hourlyRateCents != null ? `${formatCurrency(version.hourlyRateCents)}/hr` : "—"}
                    </td>
                    <td className="p-3 text-graphite-600">{version ? shortDate(version.startDate) : "—"}</td>
                    <td className="p-3"><StatusPill status={offer.status} label={offerStatusLabel[offer.status]} /></td>
                    <td className="p-3 text-graphite-500">{shortDate(offer.createdAt)}</td>
                    <td className="p-3 text-graphite-500">{version ? shortDate(version.expirationDate) : "—"}</td>
                    <td className="p-3 text-graphite-500">{creatorName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <nav className="flex gap-3" aria-label="Offers pagination">
          {page > 1 && <Link className={adminButtonSecondary} href={pageHref(page - 1)}>Previous</Link>}
          {page * pageSize < total && <Link className={adminButtonSecondary} href={pageHref(page + 1)}>Next</Link>}
        </nav>
      </div>
    </>
  );
}
