import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AdminHeader, DataTable, EmptyState, Filter, PageBody, Pager, StatCard, StatusPill, Toolbar, td, tr } from "@/components/admin/ui";
import { btn, control, t } from "@/components/admin/form";
import { employeeDepartments, employeeStats, listEmployees } from "@/lib/services/employees";
import { employmentTypeLabel, shortDate } from "@/lib/format";
import { employmentStatuses } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/ats/access";

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
  await requirePermission("employees");
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

      <PageBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Active" value={stats.active} href="/admin/employees?status=ACTIVE" />
          <StatCard label="On leave" value={stats.onLeave} href="/admin/employees?status=ON_LEAVE" />
          <StatCard label="Terminated" value={stats.terminated} href="/admin/employees?status=TERMINATED" />
        </div>

        <Toolbar action="Apply">
          <Filter label="Search" wide>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graphite-400" aria-hidden="true" />
              <input name="q" type="search" defaultValue={filters.q ?? ""} placeholder="Name, email or employee ID" className={`${control} pl-9`} />
            </div>
          </Filter>
          <Filter label="Status">
            <select name="status" defaultValue={filters.status} className={control}>
              <option value="ALL">All statuses</option>
              {employmentStatuses.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </select>
          </Filter>
          <Filter label="Department">
            <select name="department" defaultValue={filters.department} className={control}>
              <option value="ALL">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Filter>
          <Filter label="Sort">
            <select name="sort" defaultValue={filters.sort} className={control}>
              <option value="name">Name</option>
              <option value="employeeId">Employee ID</option>
              <option value="newest">Newest</option>
            </select>
          </Filter>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState
            title="No employees found"
            description={filters.q || filters.status !== "ALL" ? "Try a different search or filter." : "Add your first employee to start building the directory."}
            action={<Link href="/admin/employees/new" className={btn}><Plus className="size-3.5" aria-hidden="true" />Add employee</Link>}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block">
              <DataTable headers={["Employee ID", "Name", "Job title", "Department", "Type", "Started", "Status"]} minWidth="50rem">
                {rows.map((emp) => (
                  <tr key={emp.id} className={tr}>
                    <td className={`${td} whitespace-nowrap font-mono text-[0.75rem] tabular-nums`}>{emp.employeeId}</td>
                    <th scope="row" className="px-4 py-2.5 text-left">
                      <Link href={`/admin/employees/${emp.id}`} className={`block ${t.body} font-medium text-ink-900 hover:underline underline-offset-4`}>
                        {emp.firstName} {emp.lastName}
                      </Link>
                      <span className={`block ${t.hint} font-normal text-graphite-600`}>{emp.workEmail}</span>
                    </th>
                    <td className={td}>{emp.jobTitle}</td>
                    <td className={`${td} text-graphite-600`}>{emp.department}</td>
                    <td className={`${td} whitespace-nowrap text-graphite-600`}>
                      {employmentTypeLabel[emp.employmentType] ?? emp.employmentType}
                    </td>
                    <td className={`${td} whitespace-nowrap text-graphite-600`}>{emp.startDate ? shortDate(emp.startDate) : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <StatusPill status={emp.status} label={statusLabel[emp.status]} />
                    </td>
                  </tr>
                ))}
              </DataTable>
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

            <Pager page={page} pageCount={pageCount} href={pageHref} />
          </>
        )}
      </PageBody>
    </>
  );
}
