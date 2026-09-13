import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { offerTemplates } from "@/db/schema";
import { requirePermission } from "@/lib/ats/access";
import { promotionDetail } from "@/lib/promotions/data";
import { canEditPromotion, type PromotionStatus } from "@/lib/promotions/policy";
import { managerOptions } from "@/lib/services/employees";
import { AdminHeader, PageBody } from "@/components/admin/ui";
import { PromotionForm } from "@/components/admin/PromotionForm";
import { t } from "@/components/admin/form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit promotion" };

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("employees");
  const { id } = await params;
  const detail = await promotionDetail(id);
  if (!detail?.version) notFound();
  if (!canEditPromotion(detail.promotion.status as PromotionStatus)) notFound();

  const { employee, version } = detail;
  const [managers, templates] = await Promise.all([
    managerOptions(employee.id),
    db.select({ id: offerTemplates.id, name: offerTemplates.name })
      .from(offerTemplates).where(eq(offerTemplates.isActive, true)),
  ]);

  return (
    <>
      <AdminHeader
        title="Edit promotion"
        description={`${employee.firstName} ${employee.lastName} · ${version.jobTitle}`}
      />
      <PageBody>
        <Link href={`/admin/promotions/${id}`} className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Promotion
        </Link>
        <p className={`max-w-3xl ${t.hint} text-graphite-500`}>
          Saving creates a new version. If the letter was already approved or sent it returns to
          draft, and any link already sent to the employee stops working.
        </p>
        <div className="max-w-3xl rounded-[4px] border border-paper-300 bg-white p-5 sm:p-6">
          <PromotionForm
            promotionId={id}
            employee={{
              id: employee.id,
              name: `${employee.firstName} ${employee.lastName}`,
              employeeNumber: employee.employeeId,
              // The version's frozen "previous" side is the comparison, not the
              // employee row — the row may have moved on for other reasons.
              jobTitle: version.previousJobTitle,
              department: version.previousDepartment,
              location: version.previousLocation,
              employmentType: version.previousEmploymentType,
              managerId: employee.managerId,
              managerName: version.previousManagerName,
              annualSalaryCents: version.previousAnnualSalaryCents,
              hourlyRateCents: version.previousHourlyRateCents,
            }}
            values={{
              jobTitle: version.jobTitle,
              department: version.department,
              location: version.location,
              employmentType: version.employmentType,
              remoteType: version.remoteType,
              managerId: version.managerId,
              effectiveDate: version.effectiveDate,
              expirationDate: version.expirationDate,
              annualSalaryCents: version.annualSalaryCents,
              hourlyRateCents: version.hourlyRateCents,
              bonusCents: version.bonusCents,
              otherCompensation: version.otherCompensation,
              additionalTerms: version.additionalTerms,
            }}
            managers={managers.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}` }))}
            templates={templates}
          />
        </div>
      </PageBody>
    </>
  );
}
