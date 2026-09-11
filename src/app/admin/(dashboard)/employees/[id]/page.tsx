import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Mail, Phone } from "lucide-react";
import { AdminHeader, StatusPill } from "@/components/admin/ui";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import { getEmployeeById, managerOptions } from "@/lib/services/employees";
import { setEmployeeStatusAction } from "@/lib/services/employee-actions";
import { btnSecondary, t } from "@/components/admin/form";
import { employmentTypeLabel, formatDateTime, shortDate } from "@/lib/format";
import { requirePermission } from "@/lib/ats/access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Employee" };

const statusLabel: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  TERMINATED: "Terminated",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-paper-200 py-2 last:border-0">
      <dt className={`${t.hint} text-graphite-500`}>{label}</dt>
      <dd className={`text-right ${t.body} text-ink-900`}>{children}</dd>
    </div>
  );
}

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("employees");
  const { id } = await params;
  const sp = await searchParams;

  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const [managers, manager] = await Promise.all([
    managerOptions(employee.id),
    employee.managerId ? getEmployeeById(employee.managerId) : Promise.resolve(undefined),
  ]);

  return (
    <>
      <AdminHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={`${employee.employeeId} · ${employee.jobTitle}`}
        action={<StatusPill status={employee.status} label={statusLabel[employee.status]} />}
      />

      <div className="p-5 sm:p-6 lg:p-8">
        <Link href="/admin/employees" className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All employees
        </Link>

        {sp.saved === "1" && (
          <div role="status" className="mt-4 flex max-w-2xl gap-2.5 rounded-[3px] border border-[#1e7a4d]/30 bg-[#1e7a4d]/[0.06] p-3">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#1e7a4d]" aria-hidden="true" />
            <p className={`${t.body} text-[#14603b]`}>Changes saved.</p>
          </div>
        )}

        <div className="mt-4 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[4px] border border-paper-300 bg-white p-5 sm:p-6">
            <EmployeeForm employee={employee} managers={managers} />
          </div>

          <div className="space-y-5">
            <section className="rounded-[4px] border border-paper-300 bg-white p-5">
              <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Record</h2>
              <dl className="mt-3">
                <Row label="Employee ID">
                  <span className="font-mono tabular-nums">{employee.employeeId}</span>
                </Row>
                <Row label="Work email">
                  <a href={`mailto:${employee.workEmail}`} className="inline-flex items-center gap-1.5 underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500">
                    <Mail className="size-3 text-graphite-400" aria-hidden="true" />
                    {employee.workEmail}
                  </a>
                </Row>
                {employee.phone && (
                  <Row label="Phone">
                    <a href={`tel:${employee.phone}`} className="inline-flex items-center gap-1.5">
                      <Phone className="size-3 text-graphite-400" aria-hidden="true" />
                      {employee.phone}
                    </a>
                  </Row>
                )}
                <Row label="Department">{employee.department}</Row>
                {employee.location && <Row label="Location">{employee.location}</Row>}
                <Row label="Type">{employmentTypeLabel[employee.employmentType] ?? employee.employmentType}</Row>
                {manager && (
                  <Row label="Reports to">
                    <Link href={`/admin/employees/${manager.id}`} className="underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500">
                      {manager.firstName} {manager.lastName}
                    </Link>
                  </Row>
                )}
                {employee.startDate && <Row label="Started">{shortDate(employee.startDate)}</Row>}
                {employee.endDate && <Row label="Ended">{shortDate(employee.endDate)}</Row>}
                <Row label="Created">{formatDateTime(employee.createdAt)}</Row>
              </dl>
            </section>

            <section className="rounded-[4px] border border-paper-300 bg-white p-5">
              <h2 className={`${t.sectionTitle} font-medium text-ink-900`}>Status</h2>
              <p className={`mt-1 ${t.hint} text-graphite-600`}>
                Terminating stamps an end date if one is not already set.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["ACTIVE", "ON_LEAVE", "TERMINATED"] as const)
                  .filter((s) => s !== employee.status)
                  .map((s) => (
                    <form key={s} action={setEmployeeStatusAction}>
                      <input type="hidden" name="id" value={employee.id} />
                      <input type="hidden" name="status" value={s} />
                      <button type="submit" className={btnSecondary}>
                        Mark {statusLabel[s].toLowerCase()}
                      </button>
                    </form>
                  ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
