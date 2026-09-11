import { db } from "@/db";
import { jobTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/ui";
import { JobForm } from "@/components/admin/JobForm";
import { requirePermission } from "@/lib/ats/access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create job" };

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  await requirePermission("manage");
  const { template } = await searchParams;
  const templates = await db.select({ id: jobTemplates.id, name: jobTemplates.name }).from(jobTemplates);
  const [selected] = template && z.uuid().safeParse(template).success ? await db.select().from(jobTemplates).where(eq(jobTemplates.id, template)) : [];
  return (
    <>
      <AdminHeader title="Create job" description="Save as a draft, or publish it straight to the careers page." />
      <div className="p-5 sm:p-6 lg:p-8">
        <Link href="/admin/jobs" className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-graphite-700 hover:text-ink-900">
          <ArrowLeft className="size-4" aria-hidden="true" />
          All jobs
        </Link>
        <div className="mt-5 max-w-3xl rounded-[4px] border border-paper-300 bg-white p-6 sm:p-8">
          <form className="mb-6 flex flex-wrap gap-3"><label className="text-xs">Create from template<select name="template" defaultValue={template ?? ""} className="ml-2 rounded border border-paper-300 p-2"><option value="">Blank job</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><button className="text-sm underline">Use template</button></form>
          <JobForm key={template ?? "blank"} job={selected ? { ...selected.content, status: "DRAFT" } : undefined} />
        </div>
      </div>
    </>
  );
}
