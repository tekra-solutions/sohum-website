import { requireApplication } from "@/lib/ats/access";
import { getApplicationDetail } from "@/lib/services/applications";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/ui";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import { managerOptions } from "@/lib/services/employees";
import { t } from "@/components/admin/form";
import { requirePermission } from "@/lib/ats/access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add employee" };

export default async function NewEmployeePage({ searchParams }: { searchParams: Promise<{ applicationId?: string }> }) {
  await requirePermission("employees");
  const { applicationId } = await searchParams;
  let candidate;
  if (applicationId) {
    await requireApplication(applicationId);
    candidate = await getApplicationDetail(applicationId);
    if (!candidate || candidate.status !== "HIRED") notFound();
  }
  const employee = candidate ? { firstName: candidate.firstName, lastName: candidate.lastName, workEmail: candidate.email, personalEmail: candidate.email, phone: candidate.phone, jobTitle: candidate.job.title, department: candidate.job.department, location: [candidate.city, candidate.state].filter(Boolean).join(", ") || candidate.job.location, employmentType: candidate.job.employmentType, sourceApplicationId: candidate.id } : undefined;
  const managers = await managerOptions();

  return (
    <>
      <AdminHeader title="Add employee" description="An employee ID is generated automatically." />
      <div className="p-5 sm:p-6 lg:p-8">
        <Link href="/admin/employees" className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All employees
        </Link>
        <div className="mt-4 max-w-2xl rounded-[4px] border border-paper-300 bg-white p-5 sm:p-6">
          <EmployeeForm managers={managers} employee={employee} />
        </div>
      </div>
    </>
  );
}
