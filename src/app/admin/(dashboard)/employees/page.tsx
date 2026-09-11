import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AdminHeader, EmptyState, StatCard, StatusPill } from "@/components/admin/ui";
import { btn, btnSecondary, control, t } from "@/components/admin/form";
import { employeeDepartments, employeeStats, listEmployees } from "@/lib/services/employees";
import { employmentTypeLabel, shortDate } from "@/lib/format";
import { employmentStatuses } from "@/lib/validation/schemas";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Employees" };

const statusLabel: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  TERMINATED: "Terminated",
};

export default async function EmployeesPage({
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

  const filters = {
    q: one("q"),
    status: one("status") ?? "ALL",
    department: one("department") ?? "ALL",
    sort: (one("sort") ?? "name") as "name" | "newest" | "employeeId",
    page: Number(one("page") ?? 1),
  };

  const [{ rows, total, page, pageCount }, stats, departments] = await Promise.all([
    listEmployees(filters),
    employeeStats(),
    employeeDepartments(),
  ]);

  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v && v !== "ALL" && k !== "page") params.set(k, String(v));
    }
    params.set("page", String(n));
    return `/admin/employees?${params}`;
  };

  return (
    <>
      <AdminHeader
        title="Employees"
        description={`${total} on record.`}
        action={
          <Link href="/admin/employees/new" className={btn}>
            <Plus className="size-3.5" aria-hidden="true" />
            Add employee
          </Link>
        }
      />

      <div className="space-y-5 p-5 sm:p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Active" value={stats.active} href="/admin/employees?status=ACTIVE" />
          <StatCard label="On leave" value={stats.onLeave} href="/admin/employees?status=ON_LEAVE" />
          <StatCard label="Terminated" value={stats.terminated} href="/admin/employees?status=TERMINATED" />
        </div>

        <form method="get" className="rounded-[4px] border border-paper-300 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.6fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end">
            <div>
              <label htmlFor="q" className="sr-only">Search employees</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-graphite-400" aria-hidden="true" />
                <input
                  id="q" name="q" type="search" defaultValue={filters.q ?? ""}
                  placeholder="Name, email or employee ID"
                  className={`${control} border-paper-300 pl-8`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="status" className="sr-only">Status</label>
              <select id="status" name="status" defaultValue={filters.status} className={`${control} border-paper-300`}>
                <option value="ALL">All statuses</option>
                {employmentStatuses.map((s) => (
                  <option key={s} value={s}>{statusLabel[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="department" className="sr-only">Department</label>
              <select id="department" name="department" defaultValue={filters.department} className={`${control} border-paper-300`}>
                <option value="ALL">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sort" className="sr-only">Sort</label>
              <select id="sort" name="sort" defaultValue={filters.sort} className={`${control} border-paper-300`}>
                <option value="name">Name</option>
                <option value="employeeId">Employee ID</option>
                <option value="newest">Newest</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <button type="submit" className={`${btnSecondary} w-full lg:w-auto`}>Apply</button>
            </div>
          </div>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            title="No employees found"
            description={filters.q || filters.status !== "ALL" ? "Try a different search or filter." : "Add your first employee to start building the directory."}
            action={<Link href="/admin/employees/new" className={btn}><Plus className="size-3.5" aria-hidden="true" />Add employee</Link>}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-[4px] border border-paper-300 bg-white lg:block">
              <table className="w-full min-w-[50rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-paper-300">
                    {["Employee ID","Name","Job title","Department","Type","Started","Status"].map((h) => (
                      <th key={h} scope="col" className={`whitespace-nowrap px-3 py-2.5 ${t.hint} font-semibold uppercase tracking-[0.08em] text-graphite-500`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((emp) => (
                    <tr key={emp.id} className="border-b border-paper-200 last:border-0 hover:bg-paper-50">
                      <td className={`whitespace-nowrap px-3 py-2.5 font-mono ${t.hint} tabular-nums text-graphite-700`}>
                        {emp.employeeId}
                      </td>
                      <th scope="row" className="px-3 py-2.5">
                        <Link href={`/admin/employees/${emp.id}`} className={`block ${t.body} font-medium text-ink-900 hover:underline underline-offset-4`}>
                          {emp.firstName} {emp.lastName}
                        </Link>
                        <span className={`block ${t.hint} text-graphite-600`}>{emp.workEmail}</span>
                      </th>
                      <td className={`px-3 py-2.5 ${t.body} text-graphite-700`}>{emp.jobTitle}</td>
                      <td className={`px-3 py-2.5 ${t.body} text-graphite-600`}>{emp.department}</td>
                      <td className={`whitespace-nowrap px-3 py-2.5 ${t.body} text-graphite-600`}>
                        {employmentTypeLabel[emp.employmentType] ?? emp.employmentType}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2.5 ${t.hint} text-graphite-600`}>
                        {emp.startDate ? shortDate(emp.startDate) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <StatusPill status={emp.status} label={statusLabel[emp.status]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="grid gap-2.5 lg:hidden">
              {rows.map((emp) => (
                <li key={emp.id}>
                  <Link href={`/admin/employees/${emp.id}`} className="block rounded-[4px] border border-paper-300 bg-white p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`${t.body} font-medium text-ink-900`}>{emp.firstName} {emp.lastName}</span>
                      <StatusPill status={emp.status} label={statusLabel[emp.status]} />
                    </div>
                    <p className={`mt-0.5 font-mono ${t.hint} text-graphite-600`}>{emp.employeeId}</p>
                    <p className={`mt-1.5 border-t border-paper-200 pt-1.5 ${t.body} text-graphite-700`}>
                      {emp.jobTitle} · {emp.department}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            {pageCount > 1 && (
              <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
                <p className={`${t.body} text-graphite-600`}>Page {page} of {pageCount}</p>
                <div className="flex gap-2">
                  {page > 1 && <Link href={pageHref(page - 1)} className={btnSecondary}>Previous</Link>}
                  {page < pageCount && <Link href={pageHref(page + 1)} className={btnSecondary}>Next</Link>}
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </>
  );
}
