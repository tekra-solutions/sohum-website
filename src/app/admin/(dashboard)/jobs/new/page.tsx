import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/ui";
import { JobForm } from "@/components/admin/JobForm";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create job" };

export default async function NewJobPage() {
  await requireAdmin();
  return (
    <>
      <AdminHeader title="Create job" description="Save as a draft, or publish it straight to the careers page." />
      <div className="p-5 sm:p-8">
        <Link href="/admin/jobs" className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-graphite-700 hover:text-ink-900">
          <ArrowLeft className="size-4" aria-hidden="true" />
          All jobs
        </Link>
        <div className="mt-5 max-w-3xl rounded-[4px] border border-paper-300 bg-white p-6 sm:p-8">
          <JobForm />
        </div>
      </div>
    </>
  );
}
