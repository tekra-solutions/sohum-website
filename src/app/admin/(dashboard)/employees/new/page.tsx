import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/ui";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import { managerOptions } from "@/lib/services/employees";
import { t } from "@/components/admin/form";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add employee" };

export default async function NewEmployeePage() {
  await requireAdmin();
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
          <EmployeeForm managers={managers} />
        </div>
      </div>
    </>
  );
}
