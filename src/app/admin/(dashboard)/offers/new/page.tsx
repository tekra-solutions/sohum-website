import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { offerTemplates } from "@/db/schema";
import { requireApplication } from "@/lib/ats/access";
import { getApplicationDetail } from "@/lib/services/applications";
import { AdminHeader } from "@/components/admin/ui";
import { OfferForm } from "@/components/admin/OfferForm";
import { t } from "@/components/admin/form";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create offer" };

export default async function NewOfferPage({ searchParams }: { searchParams: Promise<{ applicationId?: string }> }) {
  const { applicationId } = await searchParams;
  if (!applicationId) notFound();
  await requireApplication(applicationId, "candidates");

  const candidate = await getApplicationDetail(applicationId);
  if (!candidate || candidate.status !== "OFFER") notFound();

  const templates = await db.select({ id: offerTemplates.id, name: offerTemplates.name })
    .from(offerTemplates).where(eq(offerTemplates.isActive, true));

  return (
    <>
      <AdminHeader title="Create offer letter" description={`${candidate.firstName} ${candidate.lastName} · ${candidate.job.title}`} />
      <div className="p-5 sm:p-6 lg:p-8">
        <Link href={`/admin/applications/${applicationId}`} className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Candidate profile
        </Link>
        <div className="mt-4 max-w-3xl rounded-[4px] border border-paper-300 bg-white p-5 sm:p-6">
          <OfferForm
            applicationId={applicationId}
            candidate={{
              fullName: `${candidate.firstName} ${candidate.lastName}`,
              email: candidate.email,
              address: [candidate.address, [candidate.city, candidate.state, candidate.zipCode].filter(Boolean).join(", ")].filter(Boolean).join(", ") || null,
              phone: candidate.phone,
            }}
            version={{
              jobTitle: candidate.job.title,
              department: candidate.job.department,
              location: candidate.job.location,
              employmentType: candidate.job.employmentType,
              remoteType: candidate.job.remoteType,
            }}
            templates={templates}
          />
        </div>
      </div>
    </>
  );
}
