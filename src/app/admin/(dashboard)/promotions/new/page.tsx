import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { offerTemplates } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { getEmployeeById, managerOptions } from "@/lib/services/employees";
import { activePromotionFor, currentCompensation } from "@/lib/promotions/data";
import { AdminHeader, PageBody } from "@/components/admin/ui";
import { PromotionForm } from "@/components/admin/PromotionForm";
import { t } from "@/components/admin/form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promote employee" };

export default async function NewPromotionPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  await requirePermission("employees");
  const { employeeId } = await searchParams;
  if (!employeeId) notFound();

  const employee = await getEmployeeById(employeeId);
  if (!employee) notFound();

  const [managers, comp, active, templates, manager] = await Promise.all([
    managerOptions(employee.id),
    currentCompensation(employee.id),
    activePromotionFor(employee.id),
    db.select({ id: offerTemplates.id, name: offerTemplates.name })
      .from(offerTemplates).where(eq(offerTemplates.isActive, true)),
    employee.managerId ? getEmployeeById(employee.managerId) : Promise.resolve(undefined),
  ]);

  // One promotion in flight at a time — the database enforces this, but
  // sending the admin to the existing one is more useful than an error.
  if (active) {
    return (
      <>
        <AdminHeader title="Promote employee" description={`${employee.firstName} ${employee.lastName}`} />
        <PageBody>
          <div className="max-w-2xl rounded-[4px] border border-[#7a5c00]/30 bg-[#f0a93c]/[0.08] p-5">
            <p className={`${t.body} font-medium text-[#7a5c00]`}>
              This employee already has a promotion in progress.
            </p>
            <p className={`mt-1 ${t.hint} text-[#7a5c00]`}>
              Finish or withdraw it before starting another.
            </p>
            <Link href={`/admin/promotions/${active.promotion.id}`} className="mt-3 inline-block text-[0.8125rem] font-medium text-ink-900 underline underline-offset-4">
              Open the promotion in progress
            </Link>
          </div>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <AdminHeader
        title="Promote employee"
        description={`${employee.firstName} ${employee.lastName} · ${employee.jobTitle}`}
      />
      <PageBody>
        <Link href={`/admin/employees/${employee.id}`} className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Employee profile
        </Link>
        <div className="max-w-3xl rounded-[4px] border border-paper-300 bg-white p-5 sm:p-6">
          <PromotionForm
            employee={{
              id: employee.id,
              name: `${employee.firstName} ${employee.lastName}`,
              employeeNumber: employee.employeeId,
              jobTitle: employee.jobTitle,
              department: employee.department,
              location: employee.location,
              employmentType: employee.employmentType,
              managerId: employee.managerId,
              managerName: manager ? `${manager.firstName} ${manager.lastName}` : null,
              annualSalaryCents: comp.annualSalaryCents,
              hourlyRateCents: comp.hourlyRateCents,
            }}
            managers={managers.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}` }))}
            templates={templates}
          />
        </div>
      </PageBody>
    </>
  );
}
